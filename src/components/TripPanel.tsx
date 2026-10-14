import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Flag, LocateFixed, Route, CheckCircle2 } from 'lucide-react';
import type { Position, Trip } from '../types';
import { addTripSample, createTrip, finishTrip, loadTrip, loadTrips } from '../services/trips';
import LoadingIndicator from './LoadingIndicator';

interface Props { position: Position | null; trip: Trip | null; onUpdate: (trip: Trip) => void; onStart: () => void; onStop: () => void; onGps: () => void; gpsBusy: boolean; analyzing: boolean; scanning: boolean }
export default function TripPanel({ position, trip, onUpdate, onStart, onStop, onGps, gpsBusy, analyzing, scanning }: Props) {
  const [name, setName] = useState(''); const [pointA, setPointA] = useState('Ubicación actual'); const [pointB, setPointB] = useState('');
  const [busy, setBusy] = useState(false); const [syncing, setSyncing] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const lastSample = useRef(0); const active = Boolean(trip && !trip.endedAt); const tripId = active ? trip?.id : undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const validGps = Boolean(position && position.accuracy <= 100 && (!position.capturedAt || now - position.capturedAt < 15000));
  useEffect(() => { let cancelled = false; void loadTrips().then(async data => { const current = data.trips.find(item => !item.endedAt); if (current) { const detail = await loadTrip(current.id); if (!cancelled) onUpdate(detail); } }).catch(() => { if (!cancelled) setError('No se pudieron cargar los recorridos. Reintenta.'); }); return () => { cancelled = true; }; }, [onUpdate]);
  useEffect(() => {
    if (!tripId) return; let cancelled = false; let running = false;
    const timer = setInterval(async () => { if (running) return; running = true; setSyncing(true); try { const data = await loadTrip(tripId); if (!cancelled) { onUpdate(data); setError(''); } } catch { if (!cancelled) setError('No se pudo sincronizar el recorrido. Comprueba tu conexión.'); } finally { running = false; if (!cancelled) setSyncing(false); } }, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [tripId, onUpdate]);
  useEffect(() => {
    if (!tripId || !scanning || !position || !validGps || Date.now() - lastSample.current < 3000) return;
    lastSample.current = Date.now(); void addTripSample(tripId, position).catch(() => setError('No se guardó una posición GPS. Comprueba tu conexión; el recorrido permanece abierto.'));
  }, [tripId, position, validGps, scanning]);
  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!position || !validGps || busy) return;
    if ([name, pointA, pointB].some(value => value.trim().length < 2)) { setError('Completa los campos siguiendo los requisitos.'); return; }
    setBusy(true); setError(''); try { const data = await createTrip(name.trim(), pointA.trim(), pointB.trim(), position); onUpdate(data); setNotice('Todo se ejecutó correctamente.'); onStart(); } catch { setError('No se pudo completar la operación. Revisa los requisitos e inténtalo de nuevo.'); } finally { setBusy(false); }
  }
  async function finish() {
    if (!trip || busy || analyzing) return; setBusy(true); setError('');
    try { const data = await finishTrip(trip.id, validGps ? position : null); onUpdate(data); onStop(); setNotice('Todo se ejecutó correctamente.'); setName(''); setPointB(''); }
    catch { setError('No se pudo completar la operación. Inténtalo de nuevo.'); } finally { setBusy(false); }
  }
  return <section className="journey-panel" aria-labelledby="journey-title"><div className="section-row"><h2 id="journey-title"><Route size={20} /> {active ? 'Tu recorrido está activo' : 'Registra un recorrido de A a B'}</h2>{active && <span className="journey-live">{scanning ? 'EN RECORRIDO' : 'EN PAUSA'}</span>}</div>
    <p className="section-description">Inicia en A, recorre la vía y finaliza al llegar a B. Los baches detectados con GPS se asocian a este recorrido mientras escaneas.</p>
    {active && trip ? <><div className="journey-points"><span><b>A</b>{trip.pointA}</span><span><Flag size={18} />{trip.pointB}</span></div><div className="journey-status"><strong>{trip.name}</strong><span>{trip.reportCount} baches registrados · {(trip.path || []).length} posiciones GPS</span>{syncing && <LoadingIndicator compact label="Sincronizando…" />}</div><div className="action-row"><button type="button" className="button-secondary" disabled={busy || analyzing} onClick={() => scanning ? onStop() : onStart()}>{scanning ? 'Pausar cámara' : 'Continuar escaneo'}</button><button type="button" className="button-primary" disabled={busy || analyzing} onClick={() => void finish()}>{busy ? <LoadingIndicator compact label="Guardando recorrido…" /> : <><CheckCircle2 size={17} /> Llegué a B: finalizar</>}</button></div><p className="form-help">Finaliza cuando llegues a B. Se guarda tu última posición GPS válida; el destino escrito es una referencia, no una ruta calculada. Pausar la cámara no termina el recorrido.</p></> : <form onSubmit={begin} aria-describedby="journey-help" aria-busy={busy}><fieldset disabled={busy} className="journey-fields"><label>Nombre del recorrido<input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value.slice(0,80))} placeholder="Por ejemplo: revisión de mi barrio" /></label><label>Punto A: lugar de salida<input required minLength={2} maxLength={120} value={pointA} onChange={e => setPointA(e.target.value.slice(0,120))} placeholder="Dónde empiezas" /></label><label>Punto B: lugar de llegada<input required minLength={2} maxLength={120} value={pointB} onChange={e => setPointB(e.target.value.slice(0,120))} placeholder="Por ejemplo: parque principal" /></label><button type="submit" className="button-primary" disabled={!validGps}>{busy ? <LoadingIndicator compact label="Preparando recorrido…" /> : <><Route size={17} /> Iniciar recorrido y escaneo</>}</button></fieldset><aside className="form-guidance" id="journey-help"><strong>Qué debes completar</strong><p>Nombre: 2–80 caracteres. Lugares A y B: 2–120 caracteres cada uno. El formulario no permite superar el máximo. Necesitas cámara, internet y GPS reciente con precisión de hasta ±100 m.</p><p>Se guardan hasta 10.000 posiciones por recorrido; se omiten posiciones casi idénticas. Configura el teléfono y fíjalo antes de conducir. Mantén la app abierta y no manipules el celular en movimiento.</p></aside></form>}
    {!validGps && <button type="button" className="button-secondary gps-retry" disabled={gpsBusy} onClick={onGps}>{gpsBusy ? <LoadingIndicator compact label="Obteniendo GPS…" /> : <><LocateFixed size={17} /> Activar ubicación precisa</>}</button>}
    {notice && <p className="form-help" role="status">{notice}</p>}{error && <p className="message error" role="alert">{error}</p>}
  </section>;
}
