import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Timer } from 'lucide-react';
import type { Report } from '../types';
import { loadDashboard } from '../services/profile';
import type { DashboardSection } from '../services/profile';
import { peopleText, riskText, statusText } from '../services/format';
import ReportCard from './ReportCard';

interface Totals { potholesActive: number; potholesRepaired: number; reports: number; communityReports: number; users: number; people: number; passes: number; scans: number; scans24h: number; trips: number; activeSessions: number }
interface Series { days: string[]; reports: number[]; scans: number[]; passes: number[] }
interface Risk { levels: Record<string, number>; statuses: Record<string, number> }
interface Top { potholes: Report[] }
interface Latency { samples: number; p50: number | null; p95: number | null }
interface Pipeline { queue: { size: number; runningAndQueued: number }; latency: Latency | null; modelLatency: Latency | null; liveImageSize: number; photoImageSize: number; nextScanMs: number }
interface Load<T> { state: 'loading' | 'done' | 'error'; data?: T; serverMs?: number; clientMs?: number; arrivedAt?: number; error?: string }

const SECTIONS: { key: DashboardSection; label: string }[] = [
  { key: 'totals', label: 'Totales' }, { key: 'series', label: 'Actividad diaria' }, { key: 'risk', label: 'Riesgo y estados' },
  { key: 'top', label: 'Baches más transitados' }, { key: 'pipeline', label: 'Velocidad del escaneo' },
];

/** Una barra por día; una sola serie por gráfico (sin leyenda), con tooltip y tabla accesible. */
function DailyBars({ title, days, values }: { title: string; days: string[]; values: number[] }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const width = 300, height = 96, gap = 2, bar = (width - gap * (values.length - 1)) / Math.max(1, values.length);
  return <figure className="daily-chart">
    <figcaption><strong>{title}</strong><span>{total} en {days.length} días</span></figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${title}: ${total} en total`}>
      <line x1="0" x2={width} y1={height} y2={height} className="chart-baseline" />
      {values.map((value, index) => {
        const barHeight = value ? Math.max(3, value / max * (height - 6)) : 0;
        return <g key={days[index]} className="chart-bar">
          <rect x={index * (bar + gap)} y={0} width={bar} height={height} className="chart-hit"><title>{`${days[index]}: ${value}`}</title></rect>
          {value > 0 && <rect x={index * (bar + gap)} y={height - barHeight} width={bar} height={barHeight} rx={Math.min(4, bar / 2)} className="chart-fill" pointerEvents="none" />}
        </g>;
      })}
    </svg>
    <div className="chart-axis"><span>{days[0]?.slice(5)}</span><span>{days[days.length - 1]?.slice(5)}</span></div>
  </figure>;
}

function Breakdown({ entries, labels, total }: { entries: [string, number][]; labels: Record<string, string>; total: number }) {
  return <ul className="breakdown">{entries.map(([key, value]) => <li key={key}>
    <span className="breakdown-label">{labels[key] || key}</span>
    <span className="breakdown-track"><span className={`breakdown-fill level-${key.toLowerCase()}`} style={{ width: `${total ? value / total * 100 : 0}%` }} /></span>
    <b>{value}</b>
  </li>)}</ul>;
}

export default function Dashboard({ onMap }: { onMap: (report: Report) => void }) {
  const loading = () => Object.fromEntries(SECTIONS.map(section => [section.key, { state: 'loading' } as Load<unknown>]));
  const [loads, setLoads] = useState<Record<string, Load<unknown>>>(loading);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    setStartedAt(Date.now());
    setLoads(loading());
    setRevision(value => value + 1);
  }, []);
  useEffect(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const started = performance.now();
    // Las cinco secciones se piden en paralelo y cada una aparece en cuanto llega.
    for (const { key } of SECTIONS) {
      const sent = performance.now();
      void loadDashboard(key, current.signal).then(response => {
        if (current.signal.aborted) return;
        const now = performance.now();
        setLoads(previous => ({ ...previous, [key]: { state: 'done', data: response.data, serverMs: response.serverMs,
          clientMs: Math.round(now - sent), arrivedAt: Math.round(now - started) } }));
      }).catch(cause => {
        if (current.signal.aborted) return;
        setLoads(previous => ({ ...previous, [key]: { state: 'error', error: (cause as Error).message } }));
      });
    }
    return () => current.abort();
  }, [revision]);
  useEffect(() => {
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const get = <T,>(key: DashboardSection) => loads[key] as Load<T> | undefined;
  const totals = get<Totals>('totals'), series = get<Series>('series'), risk = get<Risk>('risk'), top = get<Top>('top'), pipeline = get<Pipeline>('pipeline');
  const slowest = Math.max(1, ...Object.values(loads).map(load => load.arrivedAt || 0));
  const timing = (load?: Load<unknown>) => load?.state === 'done'
    ? <small className="load-time"><Timer size={11} /> {load.clientMs} ms · servidor {load.serverMs} ms</small>
    : load?.state === 'error' ? <small className="load-time error">{load.error}</small> : <small className="load-time">Cargando…</small>;
  const skeleton = <div className="card-skeleton" aria-hidden="true"><span /><span /><span /></div>;
  return <div className="page dashboard-page">
    <div className="page-heading"><div><span className="eyebrow">PANEL DE DATOS</span><h1>Así cargan <em>los datos.</em></h1></div>
      <button className="icon-button" aria-label="Recargar panel" onClick={refresh}><RefreshCw size={18} /></button></div>
    <p className="section-description">Cada bloque se consulta por separado y aparece en cuanto llega. Debajo ves cuánto tardó cada uno (red + servidor). Se actualiza solo cada 30 s.</p>

    <section className="load-waterfall" aria-label="Orden de llegada de los datos">
      <strong>Línea de carga · {startedAt ? new Date(startedAt).toLocaleTimeString('es-CO') : ''}</strong>
      {SECTIONS.map(({ key, label }) => {
        const load = loads[key];
        return <div className="waterfall-row" key={key}>
          <span>{label}</span>
          <span className="waterfall-track">{load?.state === 'done'
            ? <span className="waterfall-bar" style={{ width: `${Math.max(4, (load.arrivedAt || 0) / slowest * 100)}%` }} />
            : <span className={`waterfall-bar ${load?.state === 'error' ? 'failed' : 'pending'}`} />}</span>
          <b>{load?.state === 'done' ? `${load.arrivedAt} ms` : load?.state === 'error' ? 'error' : '…'}</b>
        </div>;
      })}
    </section>

    <section className="dash-card"><header><h2>Totales</h2>{timing(totals)}</header>
      {totals?.data ? <div className="stat-grid">{([
        ['Baches activos', totals.data.potholesActive], ['Reparados', totals.data.potholesRepaired],
        ['Personas que pasaron por baches', totals.data.people], ['Pasos registrados', totals.data.passes],
        ['Fotogramas analizados', totals.data.scans], ['Análisis en 24 h', totals.data.scans24h],
        ['Avisos comunitarios', totals.data.communityReports], ['Recorridos', totals.data.trips],
        ['Usuarios', totals.data.users], ['Sesiones activas', totals.data.activeSessions],
      ] as const).map(([label, value]) => <div className="stat-tile" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div> : skeleton}
    </section>

    <section className="dash-card"><header><h2>Actividad de los últimos 14 días</h2>{timing(series)}</header>
      {series?.data ? <>
        <DailyBars title="Baches registrados" days={series.data.days} values={series.data.reports} />
        <DailyBars title="Fotogramas analizados" days={series.data.days} values={series.data.scans} />
        <DailyBars title="Pasos por baches conocidos" days={series.data.days} values={series.data.passes} />
        <details className="chart-table"><summary>Ver como tabla</summary><table><thead><tr><th>Día</th><th>Baches</th><th>Análisis</th><th>Pasos</th></tr></thead>
          <tbody>{series.data.days.map((day, index) => <tr key={day}><td>{day}</td><td>{series.data!.reports[index]}</td><td>{series.data!.scans[index]}</td><td>{series.data!.passes[index]}</td></tr>)}</tbody></table></details>
      </> : skeleton}
    </section>

    <section className="dash-card"><header><h2>Riesgo y estados</h2>{timing(risk)}</header>
      {risk?.data ? <>
        <h3>Nivel de riesgo (baches activos)</h3>
        <Breakdown entries={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => [level, risk.data!.levels[level] || 0])} labels={riskText}
          total={Object.values(risk.data.levels).reduce((sum, value) => sum + value, 0)} />
        <h3>Estado de atención</h3>
        <Breakdown entries={Object.keys(statusText).map(status => [status, risk.data!.statuses[status] || 0])} labels={statusText}
          total={Object.values(risk.data.statuses).reduce((sum, value) => sum + value, 0)} />
      </> : skeleton}
    </section>

    <section className="dash-card"><header><h2>Baches por los que más personas han pasado</h2>{timing(top)}</header>
      {top?.data ? top.data.potholes.length ? top.data.potholes.map(report => <div key={report.id}><p className="people-headline">{peopleText(report.peopleCount)}</p><ReportCard report={report} onMap={onMap} /></div>)
        : <p className="section-description">Todavía no hay pasos registrados. Se cuentan al conducir o recorrer cerca de un bache conocido.</p> : skeleton}
    </section>

    <section className="dash-card"><header><h2>Velocidad del escaneo</h2>{timing(pipeline)}</header>
      {pipeline?.data ? <div className="stat-grid">
        <div className="stat-tile"><strong>{pipeline.data.modelLatency?.p50 ?? '—'} ms</strong><span>Modelo YOLO (mediana)</span></div>
        <div className="stat-tile"><strong>{pipeline.data.latency?.p95 ?? '—'} ms</strong><span>Análisis completo (p95)</span></div>
        <div className="stat-tile"><strong>{pipeline.data.liveImageSize} px</strong><span>Resolución en vivo (fotos: {pipeline.data.photoImageSize} px)</span></div>
        <div className="stat-tile"><strong>{pipeline.data.nextScanMs} ms</strong><span>Intervalo mínimo entre fotogramas</span></div>
        <div className="stat-tile"><strong>{pipeline.data.queue.runningAndQueued}</strong><span>Análisis en cola ahora</span></div>
      </div> : skeleton}
    </section>
  </div>;
}
