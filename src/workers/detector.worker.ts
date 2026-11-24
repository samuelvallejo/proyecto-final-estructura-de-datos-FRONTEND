/// <reference lib="webworker" />
/**
 * On-device YOLO: receives frames as ImageBitmap and returns normalized boxes.
 * It runs in a Web Worker so the camera and the interface stay smooth during inference.
 */
import * as ort from 'onnxruntime-web/webgpu';
import { YoloCodec } from '../services/yolo';
import type { ResizeMode } from '../services/yolo';

// The WebAssembly binary is served by the app itself (/assets), without an external CDN.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;

let session: ort.InferenceSession | null = null;
let size = 416;
let resize: ResizeMode = 'letterbox';
let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
let buffer: Float32Array | undefined;

type Request =
  | { type: 'load'; url: string; size: number; resize: ResizeMode }
  | { type: 'detect'; id: number; bitmap: ImageBitmap; threshold: number };

async function load(url: string, inputSize: number, mode: ResizeMode) {
  size = inputSize;
  resize = mode;
  const providers: string[] = [];
  if ('gpu' in navigator) providers.push('webgpu');
  providers.push('wasm');
  let lastError: unknown;
  for (const provider of providers) {
    try {
      session = await ort.InferenceSession.create(url, { executionProviders: [provider], graphOptimizationLevel: 'all' });
      canvas = new OffscreenCanvas(size, size);
      context = canvas.getContext('2d', { willReadFrequently: true });
      // Warm up: the first inference compiles shaders or reserves memory.
      const warm = new ort.Tensor('float32', new Float32Array(3 * size * size), [1, 3, size, size]);
      await session.run({ [session.inputNames[0]]: warm });
      return provider;
    } catch (cause) { lastError = cause; session = null; }
  }
  throw lastError;
}

async function detect(bitmap: ImageBitmap, threshold: number) {
  if (!session || !context) throw new Error('Modelo no cargado');
  const box = YoloCodec.fitInput(bitmap.width, bitmap.height, size, resize);
  context.fillStyle = '#727272';
  context.fillRect(0, 0, size, size);
  context.drawImage(bitmap, box.padX, box.padY, Math.round(bitmap.width * box.scaleX), Math.round(bitmap.height * box.scaleY));
  bitmap.close();
  buffer = YoloCodec.toTensor(context.getImageData(0, 0, size, size).data, size, buffer);
  const started = performance.now();
  const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', buffer, [1, 3, size, size]) });
  const output = outputs[session.outputNames[0]];
  const boxes = YoloCodec.decode(output.data as Float32Array, output.dims, box, threshold);
  return { boxes, inferenceMs: Math.round(performance.now() - started) };
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;
  try {
    if (message.type === 'load') {
      const backend = await load(message.url, message.size, message.resize);
      self.postMessage({ type: 'ready', backend });
    } else {
      const result = await detect(message.bitmap, message.threshold);
      self.postMessage({ type: 'result', id: message.id, ...result });
    }
  } catch (cause) {
    if (message.type === 'detect') message.bitmap.close?.();
    self.postMessage({ type: 'error', id: message.type === 'detect' ? message.id : undefined, message: (cause as Error).message || 'Error del detector' });
  }
};
