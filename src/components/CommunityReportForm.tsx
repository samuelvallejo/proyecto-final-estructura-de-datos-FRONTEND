import { useEffect, useRef, useState } from 'react';
import type { Position, Report } from '../types';
import { ApiError } from '../services/api';
import { publishCommunityReport, usableGPS } from '../services/community';
import LoadingIndicator from './LoadingIndicator';
import PotholeSymbol from './PotholeSymbol';
import '../community.css';

interface Props { location: Position | null; requestingLocation: boolean; onLocate: () => void; onPublished: (report: Report) => void }
export default function CommunityReportForm({ location, requestingLocation, onLocate, onPublished }: Props) {
  const [open, setOpen] = useState(false);
  const [risk, setRisk] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (operation.current) return;
    if (!usableGPS(location)) { setFailed(true); setMessage('Actualiza tu ubicación antes de publicar. Se necesita GPS de hasta ±100 m y menos de 30 segundos de antigüedad.'); return; }
    const text = description.trim();
    if (text.length < 10 || text.length > 280) { setFailed(true); setMessage('Describe el hueco con entre 10 y 280 caracteres.'); return; }
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setMessage('');
    try {
      const result = await publishCommunityReport(location, risk, text, controller.signal);
      if (controller.signal.aborted) return;
      setFailed(false); setMessage(result.existing ? 'Este lugar ya tenía un aviso. Puedes verlo en el mapa.' : 'Aviso publicado. Otras personas podrán verlo en el mapa.');
      setDescription(''); onPublished(result.report);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setFailed(true);
        setMessage(cause instanceof ApiError && cause.status === 429 ? 'Alcanzaste el límite de publicaciones. Espera unos minutos.' : 'No se pudo publicar el aviso. Comprueba tu GPS, conexión y los requisitos del formulario.');
      }
    } finally { if (!controller.signal.aborted) { setBusy(false); operation.current = null; } }
  }
  return <section className="community-publish" aria-label="Publicar un aviso comunitario">
    <div className="community-heading"><PotholeSymbol /><div><h2>Avísale a la comunidad</h2><p>¿Ves un hueco? Comparte un símbolo en tu ubicación actual.</p></div></div>
    <button className="button-primary" aria-expanded={open} onClick={() => setOpen(value => !value)} disabled={busy}>{open ? 'Cerrar formulario' : 'Reportar un hueco aquí'}</button>
    {open && <form onSubmit={publish} className="community-form">
      <div className="community-gps"><strong>Ubicación del aviso</strong><p>{location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} · GPS ±${Math.round(location.accuracy)} m` : 'Aún no hay una ubicación GPS.'}</p><button type="button" className="button-secondary" onClick={onLocate} disabled={requestingLocation || busy}>{requestingLocation ? <LoadingIndicator compact label="Obteniendo GPS…" /> : 'Actualizar mi ubicación'}</button></div>
      <label>¿Qué tan peligroso te parece?<select value={risk} onChange={event => setRisk(event.target.value)} disabled={busy}><option value="MEDIUM">Moderado · Hay que prestar atención</option><option value="HIGH">Alto · Puede causar un accidente</option><option value="CRITICAL">Crítico · Daño muy peligroso</option></select></label>
      <label>Describe el hueco<textarea value={description} onChange={event => setDescription(event.target.value)} minLength={10} maxLength={280} required rows={3} disabled={busy} aria-describedby="community-requirements" placeholder="Por ejemplo: hueco grande en el carril derecho, junto al cruce." /></label>
      <small className="community-counter">{description.length}/280 caracteres</small>
      <p id="community-requirements" className="precision-note">Escribe entre 10 y 280 caracteres sin datos personales. El símbolo se publica con el GPS actual del celular (hasta ±100 m), actualizado en los últimos 30 segundos. El riesgo lo indicas tú y queda sin verificar. Máximo 10 publicaciones en 10 minutos; un punto a menos de 20 m reutiliza el aviso existente.</p>
      <button className="button-primary" type="submit" disabled={busy || requestingLocation || !location || description.trim().length < 10}>{busy ? <LoadingIndicator compact label="Publicando aviso…" /> : 'Publicar aviso para todos'}</button>
    </form>}
    {message && <p className={failed ? 'message error' : 'community-success'} role={failed ? 'alert' : 'status'}>{message}</p>}
  </section>;
}
