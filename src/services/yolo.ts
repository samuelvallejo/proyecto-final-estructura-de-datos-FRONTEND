/** YOLOv8 pre- and post-processing to detect potholes on the device itself. Pure, tested functions. */
import { LinkedList } from '../data-structures/LinkedList.ts';
import { Sorter } from '../data-structures/Sorter.ts';

export interface LocalBox { x1: number; y1: number; x2: number; y2: number; score: number }
export interface Letterbox { size: number; scaleX: number; scaleY: number; padX: number; padY: number; width: number; height: number }
/** How the frame is brought to the square input: grey padding (Ultralytics) or stretched (Roboflow "Stretch"). */
export type ResizeMode = 'letterbox' | 'stretch';
export interface TrackedBox extends LocalBox { id: number; hits: number }

export class YoloCodec {
  /** Scale and padding to fit an image in a `size` square without distorting it (same as Ultralytics). */
  static letterbox(width: number, height: number, size: number): Letterbox {
    const scale = Math.min(size / width, size / height);
    const padX = Math.floor((size - Math.round(width * scale)) / 2);
    const padY = Math.floor((size - Math.round(height * scale)) / 2);
    return { size, scaleX: scale, scaleY: scale, padX, padY, width, height };
  }

  /** Stretches the image over the whole square; the preprocessing of models trained on stretched images. */
  static stretch(width: number, height: number, size: number): Letterbox {
    return { size, scaleX: size / width, scaleY: size / height, padX: 0, padY: 0, width, height };
  }

  static fitInput(width: number, height: number, size: number, mode: ResizeMode): Letterbox {
    return mode === 'stretch' ? YoloCodec.stretch(width, height, size) : YoloCodec.letterbox(width, height, size);
  }

  /** Interleaved RGBA (ImageData) → CHW tensor normalized to [0, 1]. */
  static toTensor(rgba: Uint8ClampedArray, size: number, target?: Float32Array): Float32Array {
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

  static iou(a: LocalBox, b: LocalBox): number {
    const width = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
    const height = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
    const inter = width * height;
    const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
    return union > 0 ? inter / union : 0;
  }

  /**
   * YOLOv8 detect output: [1, 4 + classes, anchors] with (cx, cy, w, h) in pixels of the input square.
   * Returns boxes normalized to 0–1 of the original image, after the threshold and non-maximum suppression.
   */
  static decode(output: Float32Array, dims: readonly number[], box: Letterbox, threshold = .25,
    classId = 0, iouThreshold = .45, maxBoxes = 30): LocalBox[] {
    const [, channels, anchors] = dims;
    if (!channels || !anchors || channels < 5 || output.length < channels * anchors) return [];
    const classes = channels - 4;
    const candidates = new LinkedList<LocalBox>();
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
      if (clipped.x2 - clipped.x1 > .004 && clipped.y2 - clipped.y1 > .004) candidates.append(clipped);
    }
    const kept = new LinkedList<LocalBox>();
    for (const candidate of Sorter.mergeSort(candidates, (a, b) => b.score - a.score)) {
      if (kept.every(other => YoloCodec.iou(candidate, other) < iouThreshold)) kept.append(candidate);
      if (kept.size >= maxBoxes) break;
    }
    return kept.toArray();
  }

  /** Visual risk from the relative box size, with the same cut points as the server. */
  static hazardFromArea(box: LocalBox): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
    const area = (box.x2 - box.x1) * (box.y2 - box.y1);
    const score = area >= .35 ? 85 : area >= .18 ? 70 : area >= .06 ? 50 : 35;
    return { score, level: score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW' };
  }
}

/**
 * Smooths boxes between frames: each new detection takes the identifier of the most similar previous one.
 * This keeps boxes from flickering and lets a trip count distinct potholes.
 */
export class BoxTracker {
  static track(previous: TrackedBox[], current: LocalBox[], nextId: () => number, minIou = .2, smoothing = .5): TrackedBox[] {
    const free = LinkedList.from(previous);
    const mix = (a: number, b: number) => a * smoothing + b * (1 - smoothing);
    return current.map(box => {
      let best: TrackedBox | undefined, bestOverlap = minIou;
      for (const old of free) {
        const overlap = YoloCodec.iou(old, box);
        if (overlap > bestOverlap) { bestOverlap = overlap; best = old; }
      }
      if (!best) return { ...box, id: nextId(), hits: 1 };
      const old = best;
      free.removeFirst(item => item === old);
      return { x1: mix(old.x1, box.x1), y1: mix(old.y1, box.y1), x2: mix(old.x2, box.x2), y2: mix(old.y2, box.y2), score: box.score, id: old.id, hits: old.hits + 1 };
    });
  }
}
