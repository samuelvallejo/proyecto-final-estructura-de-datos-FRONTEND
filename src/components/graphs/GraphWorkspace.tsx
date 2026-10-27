import { lazy, Suspense, useMemo, useState } from 'react';
import type { Report } from '../../types';
import type { GraphOrder, GraphSnapshot } from '../../types/graphs';
import useReportGraph from '../../hooks/useReportGraph';
import { adjacency } from '../../services/graphView';
import LoadingIndicator from '../LoadingIndicator';
import GraphDiagram from './GraphDiagram';
const ReportMap = lazy(() => import('../ReportMap'));

export default function GraphWorkspace({ onMap }: { onMap: (report: Report) => void }) {
  const [radius, setRadius] = useState(250);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState({ radius: 250, order: 'bfs' as GraphOrder, start: '', end: '' });
  const { snapshot, loading, error } = useReportGraph(query.radius, query.order, query.start, query.end, revision);
  return <div className="graph-workspace">
    <p className="graph-note">Cada bache es un vértice. Una línea une dos reportes cuando están dentro de la distancia elegida. Son distancias geográficas aproximadas: las líneas no indican calles ni rutas para conducir.</p>
    <form className="graph-filters" onSubmit={event => { event.preventDefault(); setQuery({ ...query, radius, start: '', end: '' }); setRevision(value => value + 1); }}>
      <label>Distancia máxima por conexión<select aria-label="Distancia máxima por conexión" value={radius} onChange={event => setRadius(Number(event.target.value))}>{[50, 100, 250, 500, 1000, 2000].map(n => <option key={n} value={n}>{n} metros</option>)}</select><small>Entre 50 y 2000 metros. Actualiza para aplicar el cambio.</small></label>
      <button className="button-primary" disabled={loading}>Actualizar grafo</button>
    </form>
    {loading && <LoadingIndicator label="Calculando conexiones y recorridos…" />}
    {error && <div role="alert" className="graph-error"><p>No se pudo cargar el grafo. Comprueba tu conexión y actualiza la consulta.</p><button className="button-secondary" onClick={() => { setQuery({ ...query, start: '', end: '' }); setRevision(value => value + 1); }}>Reintentar grafo</button></div>}
    {snapshot && <GraphResults key={`${query.radius}|${query.order}|${query.start}|${query.end}|${revision}`} snapshot={snapshot} requestedEnd={query.end} onMap={onMap} onQuery={(start, end, order) => setQuery({ ...query, start, end, order })} />}
  </div>;
}

function GraphResults({ snapshot, requestedEnd, onMap, onQuery }: { snapshot: GraphSnapshot; requestedEnd: string; onMap: (report: Report) => void; onQuery: (start: string, end: string, order: GraphOrder) => void }) {
  const { graph, reports, scope } = snapshot;
  const [start, setStart] = useState(graph.traversal.startId || '');
  const [end, setEnd] = useState(requestedEnd || reports.find(r => r.id !== start)?.id || start);
  const [order, setOrder] = useState<GraphOrder>(graph.traversal.order);
  const [selected, setSelected] = useState(start);
  const [step, setStep] = useState(0);
  const [view, setView] = useState<'diagram' | 'map'>('diagram');
  const neighbors = useMemo(() => adjacency(snapshot), [snapshot]);
  const byId = useMemo(() => new Map(reports.map((report, i) => [report.id, { report, label: `Bache ${i + 1}` }])), [reports]);
  const current = byId.get(selected);
  const label = (id: string) => byId.get(id)?.label || 'Bache';
  function visit(index: number) { setStep(index); setSelected(graph.traversal.reportIds[index]); }
  return <>
    <p className="graph-scope">{scope.loaded} de {scope.totalReports} reportes activos · Hasta 80 de mayor riesgo · Conexiones de hasta {scope.radiusMeters} m.{scope.hasMore ? ' La muestra no incluye todos los reportes de la plataforma.' : ''}{scope.excluded ? ` ${scope.excluded} omitidos por coordenadas inválidas.` : ''}</p>
    <dl className="graph-metrics" aria-label="Métricas del grafo">{[['Vértices', graph.metrics.vertices], ['Aristas', graph.metrics.edges], ['Grupos conectados', graph.metrics.components], ['Baches aislados', graph.metrics.isolated]].map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl>
    {!reports.length ? <p role="status">Aún no hay reportes con ubicación. Registra un bache con GPS y actualiza el grafo.</p> : <>
      <form className="graph-query" onSubmit={event => { event.preventDefault(); onQuery(start, end, order); }}>
        <label>Origen del grafo<select aria-label="Origen del grafo" value={start} onChange={event => setStart(event.target.value)}>{reports.map(r => <option key={r.id} value={r.id}>{label(r.id)} · Riesgo {r.hazardScore}/100</option>)}</select></label>
        <label>Destino del grafo<select aria-label="Destino del grafo" value={end} onChange={event => setEnd(event.target.value)}>{reports.map(r => <option key={r.id} value={r.id}>{label(r.id)} · Riesgo {r.hazardScore}/100</option>)}</select></label>
        <label>Recorrido del grafo<select aria-label="Recorrido del grafo" value={order} onChange={event => setOrder(event.target.value as GraphOrder)}><option value="bfs">BFS · Por cercanía de conexiones</option><option value="dfs">DFS · En profundidad</option></select></label>
        <p>BFS usa una cola; DFS usa una pila. Dijkstra calcula el camino de menor distancia acumulada entre el origen y el destino elegidos.</p>
        <button className="button-primary">Calcular camino y recorrido</button>
      </form>
      {graph.path && <div className="graph-path" role="status">{graph.path.reachable ? <><strong>Camino calculado con Dijkstra · {Math.round(graph.path.distanceMeters!)} m</strong><p>{graph.path.reportIds.map(label).join(' → ')}</p></> : <><strong>No hay conexión entre esos reportes en esta muestra.</strong><p>Prueba con otro destino o aumenta la distancia máxima por conexión.</p></>}</div>}
      <div className="graph-switch"><button className="button-secondary" aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>Diagrama del grafo</button><button className="button-secondary" aria-pressed={view === 'map'} onClick={() => setView('map')}>Grafo sobre el mapa</button></div>
      {view === 'diagram' ? <GraphDiagram snapshot={snapshot} selected={selected} onSelect={setSelected} /> : <div className="map-frame"><Suspense fallback={<LoadingIndicator label="Preparando mapa del grafo…" />}><ReportMap reports={reports} location={null} connections={graph.edges} connectionPath={graph.path?.reportIds} onSelect={report => setSelected(report.id)} /></Suspense></div>}
      <p className="graph-note">La línea verde destaca el camino calculado. Su longitud suma conexiones de cercanía; no mide una ruta por carretera.</p>
      <div className="graph-steps"><button className="button-secondary" disabled={step === 0} onClick={() => visit(step - 1)}>Paso anterior del grafo</button><span aria-live="polite">Paso {step + 1} de {graph.traversal.reportIds.length}</span><button className="button-secondary" disabled={step + 1 >= graph.traversal.reportIds.length} onClick={() => visit(step + 1)}>Paso siguiente del grafo</button></div>
      <p>Recorrido aplicado: {graph.traversal.order.toUpperCase()} desde {label(graph.traversal.startId!)}. Visita {graph.traversal.reportIds.length} vértices del grupo de origen.</p>
      <label className="graph-inspect">Inspeccionar bache<select aria-label="Inspeccionar bache" value={selected} onChange={event => setSelected(event.target.value)}>{reports.map(r => <option key={r.id} value={r.id}>{label(r.id)}</option>)}</select></label>
      {current && <article className="graph-detail"><h3>{current.label} · Riesgo {current.report.hazardScore}/100</h3><p>{[current.report.zone.street, current.report.zone.neighborhood, current.report.zone.city].filter(Boolean).join(', ') || 'Ubicación registrada por GPS'}</p><p>{current.report.location.lat.toFixed(6)}, {current.report.location.lng.toFixed(6)} · Grupo {graph.nodes.find(n => n.id === selected)?.component}</p><button className="button-secondary" onClick={() => onMap(current.report)}>Ver este bache en el mapa</button><h4>Lista de adyacencia: conexiones directas</h4>{neighbors.get(selected)?.size ? <ul>{[...neighbors.get(selected)!].map(([id, meters]) => <li key={id}><button onClick={() => setSelected(id)}>{label(id)} · {Math.round(meters)} m</button></li>)}</ul> : <p>Este bache está aislado con la distancia seleccionada.</p>}</article>}
    </>}
    <details className="graph-glossary"><summary>¿Cómo funciona un grafo?</summary><dl><dt>Vértice</dt><dd>Un punto de la red: aquí, un reporte de bache.</dd><dt>Arista y peso</dt><dd>Una conexión y su distancia en metros. La red permite recorrer cada conexión en ambos sentidos.</dd><dt>Grado y componente</dt><dd>El grado cuenta conexiones directas. Una componente es un grupo de vértices unidos por uno o varios enlaces.</dd><dt>BFS, DFS y Dijkstra</dt><dd>BFS explora por niveles; DFS profundiza por una rama; Dijkstra busca el menor peso acumulado con pesos no negativos.</dd></dl><p>El grafo se construye al consultar los reportes guardados en PostgreSQL. Pulsa Actualizar grafo para incorporar cambios.</p></details>
  </>;
}
