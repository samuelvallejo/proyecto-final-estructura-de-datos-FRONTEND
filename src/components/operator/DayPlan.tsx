import { lazy, Suspense, useState } from 'react';
import { CheckCircle2, Navigation, Route, SkipForward } from 'lucide-react';
import type { Position, Report } from '../../types';
import type { DayPlan as DayPlanData, PlanStop } from '../../types/operator';
import { OperatorApi, OperatorView } from '../../services/operator';
import { GpsTools } from '../../services/community';
import { Formatter } from '../../services/format';
import { RouteList } from '../../data-structures/RouteList';
import ReportCard from '../ReportCard';
import LoadingIndicator from '../LoadingIndicator';

const ReportMap = lazy(() => import('../ReportMap'));

interface Props { location: Position | null; onMap: (report: Report) => void }

const routeDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  GpsTools.metersBetween({ ...a, accuracy: 0 }, { ...b, accuracy: 0 });

/** Builds the pending route of a plan as a doubly linked list of stops. */
function pendingRoute(plan: DayPlanData): RouteList<PlanStop> {
  return new RouteList(plan.start, plan.stops.map(stop => ({ id: stop.report.id, value: stop, point: stop.report.location })), routeDistance);
}

/** Most urgent potholes ordered by the backend (heap top-k + nearest neighbour + 2-opt). */
export default function DayPlan({ location, onMap }: Props) {
  const [limit, setLimit] = useState(8);
  const [fromHere, setFromHere] = useState(Boolean(location));
  const [plan, setPlan] = useState<DayPlanData | null>(null);
  // The list is mutated in place (O(1) per action); the counter re-renders after each change.
  const [route, setRoute] = useState<RouteList<PlanStop> | null>(null);
  const [, setChanges] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function calculate() {
    setBusy(true); setError('');
    try {
      const next = await OperatorApi.loadDayPlan(limit, fromHere ? location : null);
      setPlan(next);
      setRoute(pendingRoute(next));
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function update(action: (list: RouteList<PlanStop>) => boolean) {
    if (route && action(route)) setChanges(value => value + 1);
  }

  const pending = route?.toArray() ?? [];
  const reports = pending.map(entry => entry.value.report);
  const remainingPlan = { stops: pending.map(entry => ({ ...entry.value, legMeters: entry.legMeters })) };
  return <section className="operator-section" aria-labelledby="plan-title">
    <header className="operator-header"><div><h2 id="plan-title">Plan de la jornada</h2>
      <p className="form-help">Elige cuántos baches atenderás. Se toman los más urgentes y se ordenan para recorrer menos distancia.</p></div></header>
    <div className="plan-controls">
      <label className="compact-select">Baches<select value={limit} onChange={event => setLimit(Number(event.target.value))}>
        {[5, 8, 12, 20].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="check-control"><input type="checkbox" checked={fromHere && Boolean(location)} disabled={!location} onChange={event => setFromHere(event.target.checked)} /> Salir desde mi ubicación</label>
      <button className="button-primary" disabled={busy} onClick={() => void calculate()}><Route size={16} /> Calcular plan</button>
    </div>
    {!location && <p className="form-help">Activa el GPS para que el plan empiece donde estás; sin GPS, empieza en el primer bache.</p>}
    {busy && <LoadingIndicator label="Ordenando la ruta…" />}
    {error && <p className="message error" role="alert">{error}</p>}
    {plan && route && <>
      <div className="stat-grid">
        <div className="stat-tile"><strong>{Formatter.distanceText(plan.totalMeters)}</strong><span>Recorrido planificado</span></div>
        <div className="stat-tile"><strong>{Formatter.distanceText(plan.priorityOrderMeters)}</strong><span>Visitando por orden de prioridad</span></div>
      </div>
      <p className="message success" role="status"><Navigation size={15} /> {OperatorView.savingText(plan)}</p>
      <p className="route-progress" role="status" aria-live="polite">
        {route.size ? `Quedan ${route.size} ${route.size === 1 ? 'parada' : 'paradas'} · ${Formatter.distanceText(route.remainingMeters)} por recorrer · ${route.visited} ${route.visited === 1 ? 'visitada' : 'visitadas'}`
          : `Jornada completa: ${route.visited} ${route.visited === 1 ? 'parada visitada' : 'paradas visitadas'}.`}
      </p>
      <p className="form-help">Distancias en línea recta entre baches; no son rutas por calles.</p>
      {pending.length > 0 && <div className="map-frame"><Suspense fallback={<LoadingIndicator label="Preparando mapa…" />}>
        <ReportMap reports={reports} location={plan.start ? location : null} connections={OperatorView.planEdges(remainingPlan)} connectionPath={reports.map(report => report.id)} onSelect={onMap} />
      </Suspense></div>}
      <ol className="plan-stops">{pending.map((entry, index) => <li key={entry.id} className={index === 0 ? 'next-stop' : ''}>
        <span className="queue-rank">{index + 1}</span>
        <div><p className="form-help">{index === 0 ? 'Siguiente parada · ' : ''}{entry.legMeters === null ? 'Punto de partida' : `${Formatter.distanceText(entry.legMeters)} desde la parada anterior`} · prioridad {entry.value.priorityScore}</p>
          <ReportCard report={entry.value.report} onMap={onMap}>
            <button className="button-primary" onClick={() => update(list => list.complete(entry.id))}><CheckCircle2 size={14} /> Visitado</button>
            <button className="button-secondary" disabled={route.isLast(entry.id)} onClick={() => update(list => list.postpone(entry.id))}><SkipForward size={14} /> Dejar para el final</button>
          </ReportCard></div>
      </li>)}</ol>
      {!plan.stops.length && <div className="empty-state"><strong>No hay baches abiertos para planificar</strong></div>}
    </>}
  </section>;
}
