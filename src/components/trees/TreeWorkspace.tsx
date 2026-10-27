import { useId, useMemo, useState } from 'react';
import type { Report } from '../../types';
import type { Traversal } from '../../data-structures/BinarySearchTree.ts';
import { ReportRiskIndex } from '../../services/reportTree';
import { scoreInput, traversalText, treeReportLabel } from '../../services/treeView';
import useReportTree from '../../hooks/useReportTree';
import LoadingIndicator from '../LoadingIndicator';
import BinaryTreeDiagram from './BinaryTreeDiagram';
import PlaceTreeView from './PlaceTreeView';
import TreeMetricsView from './TreeMetricsView';
import TreeGlossary from './TreeGlossary';
export default function TreeWorkspace({ onMap }: { onMap: (report: Report) => void }) {
  const helpId = useId();
  const [minimum, setMinimum] = useState('0'); const [maximum, setMaximum] = useState('100');
  const [applied, setApplied] = useState({ minimum: 0, maximum: 100 });
  const [order, setOrder] = useState<Traversal>('inorder'); const [revision, setRevision] = useState(0);
  const [view, setView] = useState<'risk' | 'place'>('risk'); const [step, setStep] = useState(0);
  const [score, setScore] = useState(''); const [matches, setMatches] = useState<string[] | null>(null);
  const [formError, setFormError] = useState('');
  const { snapshot, loading, error } = useReportTree(applied.minimum, applied.maximum, order, revision);
  const index = useMemo(() => new ReportRiskIndex(snapshot?.reports || []), [snapshot]);
  const ids = snapshot?.binary.traversal.reportIds || [];
  const safeStep = Math.min(step, Math.max(0, ids.length - 1));
  const selected = index.byId.get(ids[safeStep]); const path = selected ? index.searchPath(selected.id) : [];
  function choose(id: string) { const next = ids.indexOf(id); if (next >= 0) setStep(next); }
  function apply(event: React.FormEvent) {
    event.preventDefault();
    if (minimum === '' || maximum === '' || Number(minimum) > Number(maximum)) { setFormError('Indica un mínimo y un máximo entre 0 y 100. El mínimo no puede superar al máximo.'); return; }
    setFormError(''); setMatches(null); setStep(0); setApplied({ minimum: Number(minimum), maximum: Number(maximum) }); setRevision(value => value + 1);
  }
  function search(event: React.FormEvent) {
    event.preventDefault(); if (score === '') return;
    const found = index.inRange(Number(score), Number(score)).map(report => report.id);
    setMatches(found); if (found[0]) choose(found[0]);
  }
  return <div className="tree-workspace">
    <form className="tree-filters" onSubmit={apply}><label>Riesgo mínimo<input value={minimum} onChange={event => setMinimum(scoreInput(event.target.value))} inputMode="numeric" maxLength={3} required pattern="[0-9]{1,3}" aria-describedby={helpId} /></label><label>Riesgo máximo<input value={maximum} onChange={event => setMaximum(scoreInput(event.target.value))} inputMode="numeric" maxLength={3} required pattern="[0-9]{1,3}" aria-describedby={helpId} /></label><button className="button-primary" type="submit" disabled={loading}>Consultar árbol</button><p id={helpId} className="tree-help">Usa valores de 0 a 100. El mínimo debe ser menor o igual al máximo. Se incluyen hasta 200 reportes activos de mayor riesgo; las métricas corresponden a esa muestra.</p></form>
    {formError && <p className="message error" role="alert">{formError}</p>}
    {loading && <LoadingIndicator label="Construyendo árboles con los reportes…" />}
    {error && <div className="message error" role="alert"><span>No se pudieron cargar los árboles. Revisa la conexión e inténtalo de nuevo.</span><button className="button-secondary" onClick={() => setRevision(value => value + 1)}>Reintentar árboles</button></div>}
    {snapshot && <>
      <p className="tree-scope" role="status">{snapshot.scope.loaded} de {snapshot.scope.totalMatched} reportes del intervalo · {snapshot.scope.totalReports} activos en plataforma{snapshot.scope.hasMore ? ' · Muestra de los 200 de mayor riesgo' : ''}</p>
      <div className="tree-switch" aria-label="Tipo de árbol"><button className={view === 'risk' ? 'button-primary' : 'button-secondary'} aria-pressed={view === 'risk'} onClick={() => setView('risk')}>Árbol por riesgo</button><button className={view === 'place' ? 'button-primary' : 'button-secondary'} aria-pressed={view === 'place'} onClick={() => setView('place')}>Árbol por ubicación</button></div>
      <TreeMetricsView metrics={view === 'risk' ? snapshot.binary.metrics : snapshot.geography.metrics} />
      {view === 'place' ? <PlaceTreeView tree={snapshot.geography} onReport={id => { const report = index.byId.get(id); if (report) onMap(report); }} /> : <>
        <p className="tree-help">Cada círculo representa un bache. Tócalo para seleccionarlo. La clave usa riesgo, fecha e identificador; los empates no se pierden.</p>
        <BinaryTreeDiagram tree={snapshot.binary} selectedId={selected?.id || null} path={path} onSelect={choose} />
        <label className="tree-order">Recorrido del árbol<select value={order} onChange={event => { setOrder(event.target.value as Traversal); setStep(0); setMatches(null); }}>{Object.entries(traversalText).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><p className="tree-help">{traversalText[order].help}</p>
        <div className="tree-step-controls"><button className="button-secondary" disabled={safeStep === 0 || !ids.length} onClick={() => setStep(safeStep - 1)}>Paso anterior</button><span aria-live="polite">{ids.length ? `Paso ${safeStep + 1} de ${ids.length}` : 'Sin pasos'}</span><button className="button-secondary" disabled={safeStep >= ids.length - 1} onClick={() => setStep(safeStep + 1)}>Paso siguiente</button></div>
        {selected && <article className="tree-selection"><strong>{treeReportLabel(selected)}</strong><p>{selected.source === 'COMMUNITY' ? 'Aviso comunitario' : 'Detección de YOLO'} · Riesgo sin verificar</p><p className="tree-help">La búsqueda de este nodo visita {path.length} {path.length === 1 ? 'nodo' : 'nodos'} desde la raíz.</p><button className="button-primary" onClick={() => onMap(selected)}>Ver bache seleccionado en mapa</button></article>}
        <form className="tree-search" onSubmit={search}><label>Buscar puntuación exacta<input value={score} onChange={event => { setScore(scoreInput(event.target.value)); setMatches(null); }} inputMode="numeric" maxLength={3} required pattern="[0-9]{1,3}" /></label><button className="button-secondary" disabled={!ids.length || score === ''}>Buscar en el árbol</button><p className="tree-help">Indica un valor de 0 a 100. Busca únicamente dentro de la muestra cargada.</p></form>
        {matches !== null && <div className="tree-matches" role="status"><p>{matches.length ? `${matches.length} baches con esa puntuación` : 'No hay baches con esa puntuación en esta muestra.'}</p>{matches.map(id => <button className="button-secondary" key={id} onClick={() => choose(id)}>{treeReportLabel(index.byId.get(id)!)}</button>)}</div>}
      </>}
      <TreeGlossary />
    </>}
  </div>;
}
