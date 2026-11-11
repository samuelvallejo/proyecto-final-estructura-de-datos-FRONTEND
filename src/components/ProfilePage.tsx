import { lazy, Suspense, useEffect, useState } from 'react';
import { Bike, Car, Clock3, Footprints, History, MapPinned, RefreshCw, Route, ScanLine, ShieldCheck } from 'lucide-react';
import type { Me, PotholeHistoryItem, Report, SessionSummary } from '../types';
import { loadMyPotholes, loadMySessions } from '../services/profile';
import { actionText, durationText, timeText } from '../services/format';
import { Avatar } from './ProfileAvatar';
import ReportCard from './ReportCard';
import LoadingIndicator from './LoadingIndicator';
const TripHistory = lazy(() => import('./TripHistory'));

type Section = 'sessions' | 'potholes' | 'trips';

export function SessionCard({ session, showUser = false }: { session: SessionSummary; showUser?: boolean }) {
  return <article className={`session-card ${session.current ? 'is-current' : ''}`}>
    <header>
      <div><strong>{showUser ? session.userName || 'Cuenta' : session.current ? 'Esta sesión' : timeText(session.startedAt)}</strong>
        <small>{timeText(session.startedAt)} → {session.endedAt ? timeText(session.endedAt) : session.active ? 'activa' : 'expirada'}</small></div>
      <span className={`session-state ${session.active ? 'live' : ''}`}>{session.active ? 'Activa' : 'Cerrada'}</span>
    </header>
    <div className="session-metrics">
      <span><Clock3 size={14} /><b>{durationText(session.durationMs)}</b>duración</span>
      <span><ScanLine size={14} /><b>{session.scans}</b>escaneos</span>
      <span><MapPinned size={14} /><b>{session.potholesDetected}</b>baches nuevos</span>
      <span><Footprints size={14} /><b>{session.potholesPassed}</b>pasos por baches</span>
    </div>
    {session.events.length > 0 && <details className="session-trail"><summary>Huella de la sesión ({session.events.length} eventos)</summary>
      <ol>{session.events.map((event, index) => <li key={index}><time>{new Date(event.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>{actionText[event.action] || event.action}{typeof event.details?.detections === 'number' ? ` · ${event.details.detections}` : ''}</li>)}</ol>
    </details>}
  </article>;
}

export default function ProfilePage({ me, onRefresh, onMap }: { me: Me | null; onRefresh: () => void; onMap: (report: Report) => void }) {
  const [section, setSection] = useState<Section>('sessions');
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [history, setHistory] = useState<PotholeHistoryItem[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    void loadMySessions().then(data => { if (alive) setSessions(data.sessions); }).catch(cause => { if (alive) setError((cause as Error).message); });
    void loadMyPotholes().then(data => { if (alive) setHistory(data.history); }).catch(cause => { if (alive) setError((cause as Error).message); });
    return () => { alive = false; };
  }, [revision]);
  const stats = me?.stats;
  const tiles = stats ? [
    ['Sesiones', stats.sessions], ['Escaneos', stats.scans], ['Baches detectados', stats.potholesDetected],
    ['Baches por los que pasaste', stats.potholesPassed], ['Recorridos', stats.trips], ['Tiempo conduciendo', durationText(stats.drivingMs)],
  ] as const : [];
  return <div className="page profile-page">
    <section className="profile-hero">
      <Avatar name={me?.displayName || 'Mi cuenta'} initials={me?.initials} size={68} />
      <div><span className="eyebrow">MI PERFIL</span><h1>{me?.displayName || 'Cargando…'}</h1><p>{me?.email}</p>
        <span className={`role-chip role-${(me?.role || 'Conductor').toLowerCase()}`}>{me?.isAdmin && <ShieldCheck size={12} />} {me?.role || 'Conductor'}</span></div>
      <button className="icon-button" aria-label="Actualizar perfil" onClick={() => { setError(''); onRefresh(); setRevision(value => value + 1); }}><RefreshCw size={18} /></button>
    </section>
    {!me && <LoadingIndicator label="Cargando perfil…" />}
    {stats && <div className="stat-grid">{tiles.map(([label, value]) => <div className="stat-tile" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}
    <div className="segmented" role="tablist" aria-label="Historial">
      <button role="tab" aria-selected={section === 'sessions'} onClick={() => setSection('sessions')}><History size={15} /> Por sesión</button>
      <button role="tab" aria-selected={section === 'potholes'} onClick={() => setSection('potholes')}><MapPinned size={15} /> Baches</button>
      <button role="tab" aria-selected={section === 'trips'} onClick={() => setSection('trips')}><Route size={15} /> Recorridos</button>
    </div>
    {error && <p className="message error" role="alert">{error}</p>}
    {section === 'sessions' && <section aria-label="Historial por sesión">
      <p className="section-description">Cada inicio de sesión deja una huella: cuánto duró, cuántos fotogramas analizaste y cuántos baches encontraste o pasaste.</p>
      {!sessions && <LoadingIndicator label="Cargando sesiones…" />}
      {sessions?.map(session => <SessionCard key={session.id} session={session} />)}
    </section>}
    {section === 'potholes' && <section aria-label="Historial de baches">
      <p className="section-description">Baches que detectaste y baches conocidos por los que pasaste. Se guardan en tu perfil.</p>
      {!history && <LoadingIndicator label="Cargando baches…" />}
      {history?.length === 0 && <div className="empty-state"><strong>Aún no hay baches en tu historial</strong><p>Usa el modo conducción o el escaneo para registrar los primeros.</p></div>}
      {history?.map((item, index) => <div className="history-item" key={`${item.kind}-${item.report.id}-${index}`}>
        <span className={`history-kind ${item.kind}`}>{item.kind === 'detected' ? <><ScanLine size={13} /> Detectado</> : <><Footprints size={13} /> Pasaste por aquí</>} · {timeText(item.at)}{item.distanceMeters != null ? ` · a ${Math.round(item.distanceMeters)} m` : ''}</span>
        <ReportCard report={item.report} onMap={onMap} />
      </div>)}
    </section>}
    {section === 'trips' && <section aria-label="Recorridos y sesiones de conducción">
      <p className="section-description"><Bike size={14} /> <Car size={14} /> Recorridos y sesiones de conducción con su duración y los baches del trayecto.</p>
      <Suspense fallback={<LoadingIndicator label="Cargando recorridos…" />}><TripHistory /></Suspense>
    </section>}
  </div>;
}
