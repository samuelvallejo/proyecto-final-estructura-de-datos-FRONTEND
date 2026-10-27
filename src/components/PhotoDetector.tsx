import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload, ScanLine, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiError, detectPotholes } from '../services/api';
import type { PhotoDetections } from '../types';
import LoadingIndicator from './LoadingIndicator';
import '../photo-detector.css';

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
type Selection = { file: File; url: string; width: number; height: number };

export default function PhotoDetector() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [result, setResult] = useState<PhotoDetections | null>(null);
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const previewUrl = selection?.url;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);
  async function choose(file?: File) {
    if (!file || busy) return;
    const current = ++sequence.current;
    setResult(null); setError(''); setSelection(null); setValidating(false);
    if (!TYPES.includes(file.type)) { setError('Selecciona una fotografía JPEG, PNG o WebP.'); return; }
    if (!file.size || file.size > MAX_BYTES) { setError('La imagen debe pesar entre 1 byte y 4 MB.'); return; }
    setValidating(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (current !== sequence.current) { URL.revokeObjectURL(url); return; }
      const width = image.naturalWidth, height = image.naturalHeight;
      if (Math.min(width, height) < 32 || Math.max(width, height) > 8192 || width * height > 16_000_000) {
        throw new Error('La foto debe tener lados de 32 a 8192 píxeles y como máximo 16 megapíxeles.');
      }
      setSelection({ file, url, width, height });
    } catch (cause) {
      URL.revokeObjectURL(url);
      if (current === sequence.current) setError(cause instanceof Error && cause.message.startsWith('La foto') ? cause.message : 'No se pudo leer la imagen. Selecciona otro archivo válido.');
    } finally { if (current === sequence.current) setValidating(false); }
  }
  async function detect() {
    if (!selection || busy || validating) return;
    const current = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setResult(null); setError('');
    try {
      const response = await detectPotholes(selection.file, abort.signal);
      if (current === sequence.current) setResult(response);
    } catch (cause) {
      if (current !== sequence.current || abort.signal.aborted) return;
      const status = cause instanceof ApiError ? cause.status : 0;
      setError(status === 503 ? 'El modelo de detección no está disponible en este momento. Inténtalo más tarde.'
        : status === 413 ? 'La imagen excede el límite de 4 MB.'
        : status === 415 ? 'Selecciona una fotografía JPEG, PNG o WebP.'
        : status === 400 || status === 422 ? 'No se pudo leer la imagen. Revisa el formato, tamaño y dimensiones indicados debajo.'
        : status === 429 ? 'Hay varios análisis en proceso. Espera unos segundos e inténtalo de nuevo.'
        : 'No se pudo analizar la imagen. Comprueba tu conexión e inténtalo de nuevo.');
    } finally { if (current === sequence.current) setBusy(false); }
  }
  function clear() { if (busy) return; sequence.current++; setSelection(null); setResult(null); setError(''); if (input.current) input.current.value = ''; }
  return <section className="photo-detector" aria-label="Detección de baches en fotografías" aria-busy={busy || validating}>
    <input ref={input} className="sr-only" id="road-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label="Seleccionar imagen de la carretera" aria-describedby="photo-requirements" onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
    <div className={`photo-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) { if (event.dataTransfer.files.length !== 1) setError('Selecciona una sola imagen a la vez.'); else void choose(event.dataTransfer.files[0]); } }}>
      <span className="photo-upload-icon"><ImagePlus size={30} /></span>
      <h2>{dragging ? 'Suelta aquí tu fotografía' : 'Una foto puede mostrar dónde mejorar'}</h2>
      <p>Selecciona o arrastra una imagen de una carretera para buscar posibles baches.</p>
      <button type="button" className="button-secondary" onClick={() => input.current?.click()} disabled={busy || validating}><Upload size={17} />{selection ? 'Elegir otra imagen' : 'Seleccionar imagen'}</button>
    </div>
    <aside className="form-guidance" id="photo-requirements"><strong>Antes de analizar tu fotografía</strong><p>Una imagen JPEG, PNG o WebP estática, de hasta 4 MB. Lados de 32 a 8192 píxeles y máximo 16 megapíxeles. Procura que la carretera se vea con buena luz y sin movimiento.</p><p>Esta opción analiza la foto; no identifica su ubicación geográfica ni crea un reporte en el mapa. Para registrar baches con GPS, usa la cámara en vivo y los recorridos de A a B.</p></aside>
    {validating && <div className="photo-progress"><LoadingIndicator label="Preparando imagen…" /></div>}
    {selection && <>
      <div className="photo-preview-heading"><div><strong>Vista previa</strong><span>{selection.width} × {selection.height} píxeles · {(selection.file.size / 1024 / 1024).toFixed(2)} MB</span></div><button type="button" className="button-secondary" disabled={busy} onClick={clear}><Trash2 size={16} /> Quitar imagen</button></div>
      <div className="photo-image-container" data-testid="photo-image-container">
        <img src={selection.url} alt="Fotografía de la carretera seleccionada" className="photo-source-image" />
        {result?.detecciones.map((detection, index) => {
          const [x1, y1, x2, y2] = detection.bbox;
          return <div key={index} className="photo-bbox" data-testid="photo-bbox" style={{ left: `${x1 / result.ancho * 100}%`, top: `${y1 / result.alto * 100}%`, width: `${(x2 - x1) / result.ancho * 100}%`, height: `${(y2 - y1) / result.alto * 100}%` }} aria-label={`Bache ${index + 1}, confianza ${Math.round(detection.confianza * 100)} por ciento`}><span>{index + 1} · Bache {Math.round(detection.confianza * 100)}%</span></div>;
        })}
      </div>
      <button type="button" className="button-primary photo-detect-button" disabled={busy || validating} onClick={() => void detect()}>{busy ? <LoadingIndicator label="Detectando baches…" /> : <><ScanLine size={21} /> Detectar baches</>}</button>
    </>}
    {error && <p className="photo-message error" role="alert"><AlertTriangle size={19} />{error}</p>}
    {result && <section className="photo-results" aria-labelledby="photo-result-title"><div className="photo-result-summary" role="status"><CheckCircle2 size={23} /><div><h2 id="photo-result-title">{result.total_baches ? `${result.total_baches} ${result.total_baches === 1 ? 'bache detectado' : 'baches detectados'}` : 'No se detectaron baches'}</h2><p>{result.total_baches ? 'Los recuadros señalan los posibles baches y su confianza.' : 'El modelo no encontró baches por encima del umbral configurado en esta imagen.'}</p></div></div>{result.detecciones.length > 0 && <ol className="photo-detection-list">{result.detecciones.map((detection, index) => <li key={index}><span>Bache {index + 1}</span><strong>{Math.round(detection.confianza * 100)}% de confianza</strong></li>)}</ol>}<p className="form-help">La confianza describe la predicción del modelo; no equivale a la profundidad ni al peligro del bache. Los resultados requieren verificación.</p></section>}
  </section>;
}
