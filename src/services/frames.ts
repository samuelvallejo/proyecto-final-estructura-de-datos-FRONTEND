/** Captura de fotogramas para el escaneo en vivo: rápida, liviana y sin envíos repetidos. */

/** Lado mayor enviado al servidor; coincide con la inferencia en vivo (448 px) con margen. */
export const LIVE_FRAME_WIDTH = 512;
const SIGNATURE_WIDTH = 32;
const SIGNATURE_HEIGHT = 18;

let frameCanvas: HTMLCanvasElement | null = null;
let signatureCanvas: HTMLCanvasElement | null = null;

function canvas(kind: 'frame' | 'signature'): HTMLCanvasElement {
  if (kind === 'frame') return frameCanvas ??= document.createElement('canvas');
  return signatureCanvas ??= document.createElement('canvas');
}

/** Recorta exactamente lo que ve el usuario (object-fit: cover) y lo comprime a JPEG. */
export function frameFromVideo(video: HTMLVideoElement, maxWidth = LIVE_FRAME_WIDTH, quality = .7): Promise<Blob> {
  const stage = video.getBoundingClientRect();
  const scale = Math.max(stage.width / video.videoWidth, stage.height / video.videoHeight);
  const sourceWidth = stage.width / scale;
  const sourceHeight = stage.height / scale;
  const width = Math.min(maxWidth, Math.round(sourceWidth));
  const height = Math.round(width * sourceHeight / sourceWidth);
  const target = canvas('frame');
  if (target.width !== width) target.width = width;
  if (target.height !== height) target.height = height;
  const ctx = target.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No se pudo leer la cámara.'));
  ctx.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    target.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el fotograma.')), 'image/jpeg', quality));
}

/** Huella de 32×18 píxeles en escala de grises para saber si la imagen cambió. */
export function frameSignature(video: HTMLVideoElement): Uint8Array | null {
  const target = canvas('signature');
  target.width = SIGNATURE_WIDTH;
  target.height = SIGNATURE_HEIGHT;
  const ctx = target.getContext('2d', { willReadFrequently: true });
  if (!ctx || !video.videoWidth) return null;
  ctx.drawImage(video, 0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
  const pixels = ctx.getImageData(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT).data;
  return luminance(pixels);
}

export function luminance(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const values = new Uint8Array(rgba.length / 4);
  for (let index = 0; index < values.length; index++) {
    const offset = index * 4;
    values[index] = Math.round(.299 * rgba[offset] + .587 * rgba[offset + 1] + .114 * rgba[offset + 2]);
  }
  return values;
}

/** Diferencia media absoluta (0–255) entre dos huellas del mismo tamaño. */
export function signatureDifference(a: Uint8Array | null, b: Uint8Array | null): number {
  if (!a || !b || a.length !== b.length || !a.length) return Infinity;
  let total = 0;
  for (let index = 0; index < a.length; index++) total += Math.abs(a[index] - b[index]);
  return total / a.length;
}

/**
 * Decide si vale la pena enviar el fotograma. Con el vehículo detenido la imagen casi no cambia:
 * se omiten hasta `maxSkips` envíos seguidos para no gastar análisis repetidos.
 */
export function shouldSend(difference: number, skipped: number, maxSkips = 3, threshold = 2.5): boolean {
  return difference >= threshold || skipped >= maxSkips;
}

/** Espera hasta el siguiente análisis descontando lo que ya tardó la petición anterior. */
export function nextDelay(nextScanMs: number | undefined, elapsedMs: number, minimum = 120): number {
  return Math.max(minimum, (nextScanMs ?? 1500) - Math.max(0, elapsedMs));
}
