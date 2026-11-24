import { lazy, Suspense, useState } from 'react';
import { Navigation, Route } from 'lucide-react';
import type { Position, Report } from '../../types';
import type { DayPlan as DayPlanData } from '../../types/operator';
import { OperatorApi, OperatorView } from '../../services/operator';
import { Formatter } from '../../services/format';
import ReportCard from '../ReportCard';
import LoadingIndicator from '../LoadingIndicator';

const ReportMap = lazy(() => import('../ReportMap'));

interface Props { location: Position | null; onMap: (report: Report) => void }

/** Most urgent potholes ordered by the backend (heap top-k + nearest neighbour + 2-opt). */
export default function DayPlan({ location, onMap }: Props) {
  const [limit, setLimit] = useState(8);
  const [fromHere, setFromHere] = useState(Boolean(location));
  const [plan, setPlan] = useState<DayPlanData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function calculate() {
    setBusy(true); setError('');
    try { setPlan(await OperatorApi.loadDayPlan(limit, fromHere ? location : null)); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const reports = plan?.stops.map(stop => stop.report) ?? [];
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
    {plan && <>
      <div className="stat-grid">
        <div className="stat-tile"><strong>{Formatter.distanceText(plan.totalMeters)}</strong><span>Recorrido planificado</span></div>
        <div className="stat-tile"><strong>{Formatter.distanceText(plan.priorityOrderMeters)}</strong><span>Visitando por orden de prioridad</span></div>
      </div>
      <p className="message success" role="status"><Navigation size={15} /> {OperatorView.savingText(plan)}</p>
      <p className="form-help">Distancias en línea recta entre baches; no son rutas por calles.</p>
      {plan.stops.length > 0 && <div className="map-frame"><Suspense fallback={<LoadingIndicator label="Preparando mapa…" />}>
        <ReportMap reports={reports} location={plan.start ? location : null} connections={OperatorView.planEdges(plan)} connectionPath={reports.map(report => report.id)} onSelect={onMap} />
      </Suspense></div>}
      <ol className="plan-stops">{plan.stops.map(stop => <li key={stop.report.id}>
        <span className="queue-rank">{stop.step}</span>
        <div><p className="form-help">{stop.legMeters === null ? 'Punto de partida' : `${Formatter.distanceText(stop.legMeters)} desde la parada anterior`} · prioridad {stop.priorityScore}</p>
          <ReportCard report={stop.report} onMap={onMap} /></div>
      </li>)}</ol>
      {!plan.stops.length && <div className="empty-state"><strong>No hay baches abiertos para planificar</strong></div>}
    </>}
  </section>;
}
