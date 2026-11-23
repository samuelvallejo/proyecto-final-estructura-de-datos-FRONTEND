import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { LocalBox } from '../services/yolo';

/**
 * Modelo YOLO exportado a ONNX que se ejecuta en el teléfono (mismo entrenamiento que el servidor).
 * pothole-live.json indica el tamaño de entrada, el preprocesado y el umbral con que se exportó.
 */
export const LOCAL_MODEL_CONFIG = '/models/pothole-live.json';
interface ModelConfig { model: string; size: number; resize: 'letterbox' | 'stretch'; threshold: number }

type Status = 'idle' | 'loading' | 'ready' | 'failed';
interface Pending { resolve: (value: { boxes: LocalBox[]; inferenceMs: number }) => void; reject: (cause: Error) => void }

/** Carga el detector en un Web Worker solo cuando se necesita y lo mantiene listo mientras la app está abierta. */
export function useLocalDetector(enabled: boolean) {
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const sequence = useRef(0);
  const [status, setStatus] = useState<Status>('idle');
  const [backend, setBackend] = useState('');
  const [error, setError] = useState('');
  const [threshold, setThreshold] = useState(.25);

  useEffect(() => {
    if (!enabled || worker.current) return;
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
      queueMicrotask(() => { setStatus('failed'); setError('Este navegador no permite detectar en el dispositivo.'); });
      return;
    }
    const instance = new Worker(new URL('../workers/detector.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    queueMicrotask(() => setStatus('loading'));
    instance.onmessage = event => {
      const message = event.data as { type: string; id?: number; backend?: string; boxes?: LocalBox[]; inferenceMs?: number; message?: string };
      if (message.type === 'ready') { setBackend(message.backend || ''); setStatus('ready'); return; }
      const waiting = message.id !== undefined ? pending.current.get(message.id) : undefined;
      if (message.type === 'result' && waiting) {
        pending.current.delete(message.id!);
        waiting.resolve({ boxes: message.boxes || [], inferenceMs: message.inferenceMs || 0 });
      } else if (message.type === 'error') {
        if (waiting) { pending.current.delete(message.id!); waiting.reject(new Error(message.message)); }
        else { setStatus('failed'); setError(message.message || 'No se pudo cargar el detector.'); }
      }
    };
    instance.onerror = () => { setStatus('failed'); setError('No se pudo iniciar el detector en el dispositivo.'); };
    void fetch(LOCAL_MODEL_CONFIG, { cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error('Sin configuración del modelo');
      return response.json() as Promise<ModelConfig>;
    }).then(config => {
      setThreshold(config.threshold);
      instance.postMessage({ type: 'load', url: new URL(config.model, new URL(LOCAL_MODEL_CONFIG, location.href)).href,
        size: config.size, resize: config.resize });
    }).catch(() => { setStatus('failed'); setError('No se encontró el modelo para el dispositivo.'); });
  }, [enabled]);

  useEffect(() => () => {
    worker.current?.terminate();
    worker.current = null;
    for (const waiting of pending.current.values()) waiting.reject(new Error('Detector cerrado'));
    pending.current.clear();
  }, []);

  const detect = useCallback((bitmap: ImageBitmap, threshold: number) => new Promise<{ boxes: LocalBox[]; inferenceMs: number }>((resolve, reject) => {
    if (!worker.current) { bitmap.close(); reject(new Error('Detector no disponible')); return; }
    const id = ++sequence.current;
    pending.current.set(id, { resolve, reject });
    worker.current.postMessage({ type: 'detect', id, bitmap, threshold }, [bitmap]);
  }), []);

  return { status, backend, error, detect, threshold };
}

/** Recorte visible del video (object-fit: cover), para que las cajas coincidan con lo que ve el usuario. */
export function visibleRegion(video: HTMLVideoElement) {
  const stage = video.getBoundingClientRect();
  const scale = Math.max(stage.width / video.videoWidth, stage.height / video.videoHeight);
  const width = Math.min(video.videoWidth, stage.width / scale);
  const height = Math.min(video.videoHeight, stage.height / scale);
  return { x: (video.videoWidth - width) / 2, y: (video.videoHeight - height) / 2, width, height };
}

interface LoopOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  detect: (bitmap: ImageBitmap, threshold: number) => Promise<{ boxes: LocalBox[]; inferenceMs: number }>;
  threshold: number;
  onResult: (boxes: LocalBox[], stats: { inferenceMs: number; fps: number }) => void;
  onError: (cause: Error) => void;
}

/** Bucle continuo: en cuanto termina un fotograma se analiza el siguiente; nunca hay dos en curso. */
export function useLocalScanLoop({ videoRef, active, detect, threshold, onResult, onError }: LoopOptions) {
  const callbacks = useRef({ onResult, onError });
  useEffect(() => { callbacks.current = { onResult, onError }; }, [onResult, onError]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let failures = 0;
    const times: number[] = [];
    type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (callback: () => void) => number };
    const nextFrame = (run: () => void) => {
      const video = videoRef.current as FrameVideo | null;
      if (video?.requestVideoFrameCallback && !video.paused) video.requestVideoFrameCallback(run);
      else setTimeout(run, 30);
    };
    async function step() {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) { setTimeout(step, 200); return; }
      try {
        const region = visibleRegion(video);
        const bitmap = await createImageBitmap(video, region.x, region.y, region.width, region.height);
        if (cancelled) { bitmap.close(); return; }
        const result = await detect(bitmap, threshold);
        if (cancelled) return;
        const now = performance.now();
        times.push(now);
        while (times.length > 1 && now - times[0] > 2000) times.shift();
        const fps = times.length > 1 ? (times.length - 1) / ((now - times[0]) / 1000) : 0;
        failures = 0;
        callbacks.current.onResult(result.boxes, { inferenceMs: result.inferenceMs, fps });
      } catch (cause) {
        failures += 1;
        if (failures >= 3) { callbacks.current.onError(cause as Error); return; }
      }
      nextFrame(() => void step());
    }
    void step();
    return () => { cancelled = true; };
  }, [active, videoRef, detect, threshold]);
}
