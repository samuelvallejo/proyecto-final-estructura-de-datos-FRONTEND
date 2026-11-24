/** Frame capture for live scanning: fast, light and without repeated uploads. */
export class FrameSampler {
  /** Longest side sent to the server; matches live inference (448 px) with some margin. */
  static readonly LIVE_FRAME_WIDTH = 512;
  private static readonly SIGNATURE_WIDTH = 32;
  private static readonly SIGNATURE_HEIGHT = 18;
  private static frameCanvas: HTMLCanvasElement | null = null;
  private static signatureCanvas: HTMLCanvasElement | null = null;

  private static canvas(kind: 'frame' | 'signature'): HTMLCanvasElement {
    if (kind === 'frame') return FrameSampler.frameCanvas ??= document.createElement('canvas');
    return FrameSampler.signatureCanvas ??= document.createElement('canvas');
  }

  /** Crops exactly what the user sees (object-fit: cover) and compresses it to JPEG. */
  static frameFromVideo(video: HTMLVideoElement, maxWidth = FrameSampler.LIVE_FRAME_WIDTH, quality = .7): Promise<Blob> {
    const stage = video.getBoundingClientRect();
    const scale = Math.max(stage.width / video.videoWidth, stage.height / video.videoHeight);
    const sourceWidth = stage.width / scale;
    const sourceHeight = stage.height / scale;
    const width = Math.min(maxWidth, Math.round(sourceWidth));
    const height = Math.round(width * sourceHeight / sourceWidth);
    const target = FrameSampler.canvas('frame');
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    const ctx = target.getContext('2d');
    if (!ctx) return Promise.reject(new Error('No se pudo leer la cámara.'));
    ctx.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
      sourceWidth, sourceHeight, 0, 0, width, height);
    return new Promise((resolve, reject) =>
      target.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el fotograma.')), 'image/jpeg', quality));
  }

  /** 32×18 grayscale fingerprint used to know whether the image changed. */
  static frameSignature(video: HTMLVideoElement): Uint8Array | null {
    const target = FrameSampler.canvas('signature');
    target.width = FrameSampler.SIGNATURE_WIDTH;
    target.height = FrameSampler.SIGNATURE_HEIGHT;
    const ctx = target.getContext('2d', { willReadFrequently: true });
    if (!ctx || !video.videoWidth) return null;
    ctx.drawImage(video, 0, 0, FrameSampler.SIGNATURE_WIDTH, FrameSampler.SIGNATURE_HEIGHT);
    return FrameSampler.luminance(ctx.getImageData(0, 0, FrameSampler.SIGNATURE_WIDTH, FrameSampler.SIGNATURE_HEIGHT).data);
  }

  static luminance(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
    const values = new Uint8Array(rgba.length / 4);
    for (let index = 0; index < values.length; index++) {
      const offset = index * 4;
      values[index] = Math.round(.299 * rgba[offset] + .587 * rgba[offset + 1] + .114 * rgba[offset + 2]);
    }
    return values;
  }

  /** Mean absolute difference (0–255) between two fingerprints of the same size. */
  static signatureDifference(a: Uint8Array | null, b: Uint8Array | null): number {
    if (!a || !b || a.length !== b.length || !a.length) return Infinity;
    let total = 0;
    for (let index = 0; index < a.length; index++) total += Math.abs(a[index] - b[index]);
    return total / a.length;
  }

  /**
   * Decides whether the frame is worth sending. With the vehicle stopped the image barely changes:
   * up to `maxSkips` consecutive uploads are skipped to avoid repeated analyses.
   */
  static shouldSend(difference: number, skipped: number, maxSkips = 3, threshold = 2.5): boolean {
    return difference >= threshold || skipped >= maxSkips;
  }

  /** Waits until the next analysis, discounting what the previous request already took. */
  static nextDelay(nextScanMs: number | undefined, elapsedMs: number, minimum = 120): number {
    return Math.max(minimum, (nextScanMs ?? 1500) - Math.max(0, elapsedMs));
  }
}
