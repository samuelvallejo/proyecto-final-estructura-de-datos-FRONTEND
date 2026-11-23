/** Pre y posprocesamiento de YOLOv8 para detectar baches en el propio dispositivo. Funciones puras y probadas. */

export interface LocalBox { x1: number; y1: number; x2: number; y2: number; score: number }
export interface Letterbox { size: number; scaleX: number; scaleY: number; padX: number; padY: number; width: number; height: number }
/** Cómo se lleva el fotograma al cuadrado de entrada: con bordes grises (Ultralytics) o estirado (Roboflow «Stretch»). */
export type ResizeMode = 'letterbox' | 'stretch';

/** Escala y bordes para encajar una imagen en un cuadrado de `size` sin deformarla (igual que Ultralytics). */
export function letterbox(width: number, height: number, size: number): Letterbox {
  const scale = Math.min(size / width, size / height);
  const padX = Math.floor((size - Math.round(width * scale)) / 2);
  const padY = Math.floor((size - Math.round(height * scale)) / 2);
  return { size, scaleX: scale, scaleY: scale, padX, padY, width, height };
}

/** Estira la imagen a todo el cuadrado; es el preprocesado de los modelos entrenados con imágenes estiradas. */
export function stretch(width: number, height: number, size: number): Letterbox {
  return { size, scaleX: size / width, scaleY: size / height, padX: 0, padY: 0, width, height };
}

export function fitInput(width: number, height: number, size: number, mode: ResizeMode): Letterbox {
  return mode === 'stretch' ? stretch(width, height, size) : letterbox(width, height, size);
}

/** RGBA intercalado (ImageData) → tensor CHW normalizado a [0, 1]. */
export function toTensor(rgba: Uint8ClampedArray, size: number, target?: Float32Array): Float32Array {
  const plane = size * size;
  const out = target && target.length === plane * 3 ? target : new Float32Array(plane * 3);
  for (let index = 0; index < plane; index++) {
    const offset = index * 4;
    out[index] = rgba[offset] / 255;
    out[plane + index] = rgba[offset + 1] / 255;
    out[2 * plane + index] = rgba[offset + 2] / 255;
  }
  return out;
}

export function iou(a: LocalBox, b: LocalBox): number {
  const width = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const height = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = width * height;
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Salida de YOLOv8 detect: [1, 4 + clases, anclas] con (cx, cy, w, h) en píxeles del cuadrado letterbox.
 * Devuelve cajas normalizadas 0–1 respecto a la imagen original, tras umbral y supresión de no máximos.
 */
export function decode(output: Float32Array, dims: readonly number[], box: Letterbox, threshold = .25,
  classId = 0, iouThreshold = .45, maxBoxes = 30): LocalBox[] {
  const [, channels, anchors] = dims;
  if (!channels || !anchors || channels < 5 || output.length < channels * anchors) return [];
  const classes = channels - 4;
  const candidates: LocalBox[] = [];
  for (let anchor = 0; anchor < anchors; anchor++) {
    let best = 0, bestClass = 0;
    for (let cls = 0; cls < classes; cls++) {
      const value = output[(4 + cls) * anchors + anchor];
      if (value > best) { best = value; bestClass = cls; }
    }
    if (best < threshold || bestClass !== classId) continue;
    const cx = output[anchor], cy = output[anchors + anchor];
    const w = output[2 * anchors + anchor], h = output[3 * anchors + anchor];
    const x1 = (cx - w / 2 - box.padX) / box.scaleX / box.width;
    const y1 = (cy - h / 2 - box.padY) / box.scaleY / box.height;
    const x2 = (cx + w / 2 - box.padX) / box.scaleX / box.width;
    const y2 = (cy + h / 2 - box.padY) / box.scaleY / box.height;
    const clipped = { x1: Math.max(0, x1), y1: Math.max(0, y1), x2: Math.min(1, x2), y2: Math.min(1, y2), score: best };
    if (clipped.x2 - clipped.x1 > .004 && clipped.y2 - clipped.y1 > .004) candidates.push(clipped);
  }
  candidates.sort((a, b) => b.score - a.score);
  const kept: LocalBox[] = [];
  for (const candidate of candidates) {
    if (kept.every(other => iou(candidate, other) < iouThreshold)) kept.push(candidate);
    if (kept.length >= maxBoxes) break;
  }
  return kept;
}

/**
 * Suaviza las cajas entre fotogramas: cada detección nueva toma el identificador de la anterior más parecida.
 * Así los recuadros no parpadean y se pueden contar baches distintos en un trayecto.
 */
export interface TrackedBox extends LocalBox { id: number; hits: number }
export function track(previous: TrackedBox[], current: LocalBox[], nextId: () => number, minIou = .2, smoothing = .5): TrackedBox[] {
  const free = [...previous];
  return current.map(box => {
    let bestIndex = -1, bestOverlap = minIou;
    free.forEach((old, index) => { const overlap = iou(old, box); if (overlap > bestOverlap) { bestOverlap = overlap; bestIndex = index; } });
    if (bestIndex < 0) return { ...box, id: nextId(), hits: 1 };
    const old = free.splice(bestIndex, 1)[0];
    const mix = (a: number, b: number) => a * smoothing + b * (1 - smoothing);
    return { x1: mix(old.x1, box.x1), y1: mix(old.y1, box.y1), x2: mix(old.x2, box.x2), y2: mix(old.y2, box.y2), score: box.score, id: old.id, hits: old.hits + 1 };
  });
}

/** Riesgo visual por tamaño relativo del recuadro, con los mismos cortes que el servidor. */
export function hazardFromArea(box: LocalBox): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  const area = (box.x2 - box.x1) * (box.y2 - box.y1);
  const score = area >= .35 ? 85 : area >= .18 ? 70 : area >= .06 ? 50 : 35;
  return { score, level: score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW' };
}
