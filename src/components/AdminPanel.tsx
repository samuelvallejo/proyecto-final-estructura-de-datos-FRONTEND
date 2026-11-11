import { useCallback, useEffect, useState } from 'react';
import { Activity, FileClock, History, LayoutDashboard, MapPinned, RefreshCw, Route, ShieldCheck, Users } from 'lucide-react';
import type { AuditEvent, Me, Report, ReportStatus, Role, SessionSummary } from '../types';
import {
  adminAudit, adminOverview, adminReports, adminSessions, adminSetActive, adminSetRole, adminSetStatus, adminTrips, adminUsers,
} from '../services/profile';
import type { AdminOverview, AdminTrip, AdminUser } from '../services/profile';
import { actionText, statusText, timeText } from '../services/format';
import { Avatar } from './ProfileAvatar';
import { SessionCard } from './ProfilePage';
import { TripMetrics } from './TripHistory';
import ReportCard from './ReportCard';
import LoadingIndicator from './LoadingIndicator';

type Section = 'overview' | 'users' | 'reports' | 'sessions' | 'trips' | 'audit';
const ROLES: Role[] = ['Administrador', 'Operario', 'Conductor'];
const STATUSES = Object.keys(statusText) as ReportStatus[];

export default function AdminPanel({ me, onMap }: { me: Me | null; onMap: (report: Report) => void }) {
  const [section, setSection] = useState<Section>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [reports, setReports] = useState<{ items: Report[]; total: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [trips, setTrips] = useState<AdminTrip[] | null>(null);
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const fail = useCallback((cause: unknown) => setError((cause as Error).message), []);

  useEffect(() => {
    if (section === 'overview') void adminOverview().then(setOverview).catch(fail);
    if (section === 'users') void adminUsers().then(data => setUsers(data.users)).catch(fail);
    if (section === 'reports') void adminReports(statusFilter).then(data => setReports({ items: data.reports, total: data.total })).catch(fail);
    if (section === 'sessions') void adminSessions().then(data => setSessions(data.sessions)).catch(fail);
    if (section === 'trips') void adminTrips().then(data => setTrips(data.trips)).catch(fail);
    if (section === 'audit') void adminAudit().then(data => setEvents(data.events)).catch(fail);
  }, [section, statusFilter, revision, fail]);

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key); setError(''); setNotice('');
    try { await action(); setNotice(message); setRevision(value => value + 1); }
    catch (cause) { fail(cause); }
    finally { setBusy(''); }
  }

  if (me && !me.isAdmin) return <div className="page"><div className="empty-state"><ShieldCheck size={30} /><strong>Solo para administradores</strong><p>Tu cuenta no tiene permisos para esta sección.</p></div></div>;
  const tabs: [Section, string, typeof Users][] = [['overview', 'Resumen', LayoutDashboard], ['users', 'Usuarios', Users], ['reports', 'Baches', MapPinned],
    ['sessions', 'Sesiones', History], ['trips', 'Recorridos', Route], ['audit', 'Huella', FileClock]];
  return <div className="page admin-page">
    <div className="page-heading"><div><span className="eyebrow"><ShieldCheck size={13} /> MODO ADMINISTRADOR</span><h1>Todo bajo <em>control.</em></h1></div>
      <button className="icon-button" aria-label="Actualizar" onClick={() => setRevision(value => value + 1)}><RefreshCw size={18} /></button></div>
    <div className="segmented scrollable" role="tablist" aria-label="Secciones de administración">
      {tabs.map(([key, label, Icon]) => <button key={key} role="tab" aria-selected={section === key} onClick={() => { setError(''); setNotice(''); setSection(key); }}><Icon size={15} /> {label}</button>)}
    </div>
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}

    {section === 'overview' && (overview ? <>
      <div className="stat-grid">{([
        ['Usuarios', overview.users], ['Cuentas desactivadas', overview.inactiveUsers], ['Sesiones activas (15 min)', overview.activeSessions],
        ['Sesiones en 24 h', overview.sessions24h], ['Reportes', overview.reports], ['Análisis en 24 h', overview.scans24h],
        ['Análisis fallidos 24 h', overview.failedScans24h], ['Pasos por baches', overview.passes], ['Recorridos activos', overview.activeTrips],
        ['Eventos de huella 24 h', overview.auditEvents24h],
      ] as const).map(([label, value]) => <div className="stat-tile" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <section className="dash-card"><header><h2>Roles</h2></header><div className="chip-row">{ROLES.map(role => <span key={role} className={`role-chip role-${role.toLowerCase()}`}>{role}: {overview.roles[role] ?? 0}</span>)}</div></section>
      <section className="dash-card"><header><h2>Estados de los baches</h2></header><div className="chip-row">{STATUSES.map(status => <span key={status} className="status-chip">{statusText[status]}: {overview.statuses[status] ?? 0}</span>)}</div></section>
      <p className="form-help"><Activity size={13} /> Generado {timeText(overview.generatedAt)}</p>
    </> : <LoadingIndicator label="Cargando resumen…" />)}

    {section === 'users' && (users ? <div className="admin-list">{users.map(user => <article className={`admin-user ${user.active ? '' : 'inactive'}`} key={user.id}>
      <Avatar name={user.displayName} initials={user.initials} size={40} />
      <div className="admin-user-info"><strong>{user.displayName || 'Sin nombre'}{user.id === me?.id ? ' (tú)' : ''}</strong><small>{user.email}</small>
        <small>Alta {timeText(user.createdAt)} · Última actividad {user.lastSeenAt ? timeText(user.lastSeenAt) : '—'}</small>
        <small>{user.sessions} sesiones · {user.reports} reportes · {user.passes} pasos · {user.trips} recorridos</small></div>
      <div className="admin-user-actions">
        <label className="sr-only" htmlFor={`role-${user.id}`}>Rol de {user.displayName}</label>
        <select id={`role-${user.id}`} value={user.role} disabled={busy === user.id} onChange={event => void run(user.id, () => adminSetRole(user.id, event.target.value as Role), 'Rol actualizado.')}>
          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
        <button className="button-secondary" disabled={busy === user.id || user.id === me?.id} onClick={() => void run(user.id, () => adminSetActive(user.id, !user.active), user.active ? 'Cuenta desactivada y sesiones cerradas.' : 'Cuenta activada.')}>{user.active ? 'Desactivar' : 'Activar'}</button>
      </div>
    </article>)}</div> : <LoadingIndicator label="Cargando usuarios…" />)}

    {section === 'reports' && <>
      <label className="map-risk-filter">Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as ReportStatus | 'all')}>
        <option value="all">Todos</option>{STATUSES.map(status => <option key={status} value={status}>{statusText[status]}</option>)}</select></label>
      {reports ? <><p className="form-help">{reports.items.length} de {reports.total} reportes</p>{reports.items.map(report => <ReportCard key={report.id} report={report} onMap={onMap}>
        <select aria-label="Cambiar estado del bache" value={report.status} disabled={busy === report.id} onChange={event => void run(report.id, () => adminSetStatus(report.id, event.target.value as ReportStatus), 'Estado del bache actualizado.')}>
          {STATUSES.map(status => <option key={status} value={status}>{statusText[status]}</option>)}
        </select>
      </ReportCard>)}</> : <LoadingIndicator label="Cargando reportes…" />}
    </>}

    {section === 'sessions' && (sessions ? sessions.map(session => <SessionCard key={session.id} session={session} showUser />) : <LoadingIndicator label="Cargando sesiones…" />)}

    {section === 'trips' && (trips ? trips.length ? trips.map(trip => <article className="journey-panel" key={trip.id}>
      <h2>{trip.name}</h2><p>{trip.userName} · {trip.pointA} → {trip.pointB}{trip.vehicle ? ` · ${trip.vehicle}` : ''}</p>
      <p className="form-help">{timeText(trip.startedAt)} · {trip.endedAt ? 'Finalizado' : 'Activo'}</p>
      <TripMetrics trip={{ ...trip, start: { lat: 0, lng: 0, accuracy: 0 }, end: null }} />
    </article>) : <div className="empty-state"><strong>Sin recorridos</strong></div> : <LoadingIndicator label="Cargando recorridos…" />)}

    {section === 'audit' && (events ? <ol className="audit-list">{events.map(event => <li key={event.id}>
      <time>{timeText(event.at)}</time><strong>{event.userName || 'Sistema'}</strong><span>{actionText[event.action] || event.action}</span>
    </li>)}</ol> : <LoadingIndicator label="Cargando huella…" />)}
  </div>;
}
