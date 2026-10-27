import { useEffect, useMemo, useRef } from 'react';
import type { GraphSnapshot } from '../../types/graphs';
import { edgeKey, graphPoint, pathEdges } from '../../services/graphView';
export default function GraphDiagram({ snapshot, selected, onSelect }: { snapshot: GraphSnapshot; selected: string; onSelect: (id: string) => void }) {
  const { nodes, edges, path } = snapshot.graph;
  const positions = useMemo(() => new Map(nodes.map((n, i) => [n.id, graphPoint(i, nodes.length)])), [nodes]);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scroll.current, point = positions.get(selected);
    if (!element || !point) return;
    const scale = Math.max(nodes.length <= 12 ? 360 : 720, element.clientWidth) / 800;
    element.scrollLeft = point.x * scale - element.clientWidth / 2;
    element.scrollTop = point.y * scale - element.clientHeight / 2;
  }, [positions, selected, nodes.length]);
  const highlighted = pathEdges(path?.reportIds || []);
  return <div ref={scroll} className="graph-scroll" tabIndex={0} aria-label="Diagrama del grafo; desplaza para explorar">
    <svg viewBox="0 0 800 720" className={`graph-diagram ${nodes.length <= 12 ? 'compact' : ''}`} role="group" aria-label="Vértices y aristas de cercanía">
      <title>Grafo de cercanía. El dibujo es esquemático; los números identifican reportes.</title>
      {edges.map(e => { const a = positions.get(e.source)!, b = positions.get(e.target)!; return <line key={edgeKey(e.source, e.target)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={highlighted.has(edgeKey(e.source, e.target)) ? 'graph-edge chosen' : 'graph-edge'} />; })}
      {nodes.map((node, i) => { const p = positions.get(node.id)!; return <g key={node.id} role="button" tabIndex={0} aria-label={`Bache ${i + 1}, ${node.degree} conexiones, grupo ${node.component}`} aria-pressed={selected === node.id} className={`graph-node ${selected === node.id ? 'chosen' : ''}`} onClick={() => onSelect(node.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); } }}>
        <circle cx={p.x} cy={p.y} r={nodes.length <= 12 ? 48 : nodes.length > 40 ? 11 : 19} /><text x={p.x} y={p.y} dy=".35em" textAnchor="middle" fontSize={nodes.length <= 12 ? 27 : nodes.length > 40 ? 10 : 13}>{i + 1}</text>
      </g>; })}
    </svg>
  </div>;
}
