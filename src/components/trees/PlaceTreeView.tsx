import { useMemo, useState } from 'react';
import type { PlaceReportNode, PlaceReportTree } from '../../types/trees';
interface Props { tree: PlaceReportTree; onReport: (id: string) => void }
function Branch({ node, nodes, onReport }: { node: PlaceReportNode; nodes: Map<string, PlaceReportNode>; onReport: Props['onReport'] }) {
  const [open, setOpen] = useState(false);
  if (node.kind === 'report') return <li className="place-report"><button className="button-secondary" onClick={() => node.reportId && onReport(node.reportId)}>{node.label} · Ver en mapa</button></li>;
  return <li><details onToggle={event => setOpen(event.currentTarget.open)}><summary><span>{node.label}</span><small>{node.reportCount} {node.reportCount === 1 ? 'bache' : 'baches'} · Riesgo máximo {node.highestScore}/100</small></summary>{open && <ul>{node.childIds.map(id => { const child = nodes.get(id); return child ? <Branch key={id} node={child} nodes={nodes} onReport={onReport} /> : null; })}</ul>}</details></li>;
}
export default function PlaceTreeView({ tree, onReport }: Props) {
  const nodes = useMemo(() => new Map(tree.nodes.map(node => [node.id, node])), [tree]);
  const root = nodes.get(tree.rootId);
  return <section className="place-tree" aria-label="Reportes organizados por ubicación"><h3>Ciudad → barrio → vía → bache</h3><p className="tree-help">Abre una ubicación para consultar sus ramas. Los nombres sin identificar conservan los reportes con GPS cuya dirección aún no está disponible.</p>{!root?.reportCount ? <p className="tree-empty">No hay ubicaciones para mostrar.</p> : <ul>{root.childIds.map(id => { const node = nodes.get(id); return node ? <Branch key={id} node={node} nodes={nodes} onReport={onReport} /> : null; })}</ul>}</section>;
}
