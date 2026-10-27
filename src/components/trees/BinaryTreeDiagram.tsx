import { useEffect, useMemo, useRef } from 'react';
import type { BinaryReportTree } from '../../types/trees';
import { binaryLayout } from '../../services/treeView';
interface Props { tree: BinaryReportTree; selectedId: string | null; path: string[]; onSelect: (id: string) => void }
export default function BinaryTreeDiagram({ tree, selectedId, path, onSelect }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => binaryLayout(tree), [tree]);
  useEffect(() => {
    const container = viewport.current;
    if (container) container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
  }, [tree.rootId]);
  const positions = new Map(layout.map(node => [node.id, node]));
  const nodes = new Map(tree.nodes.map(node => [node.id, node]));
  if (!tree.rootId) return <p className="tree-empty">No hay nodos en este intervalo de riesgo.</p>;
  const height = Math.max(...layout.map(node => node.y)) + 78;
  return <div className="binary-scroll" ref={viewport} tabIndex={0} aria-label="Diagrama del árbol binario. Desplaza horizontalmente para ver las ramas.">
    <div className="binary-stage" style={{ height }}>
      <svg className="binary-links" width="100%" height={height} aria-hidden="true">{layout.map(node => {
        const parent = node.parentId ? positions.get(node.parentId) : null;
        return parent ? <line key={node.id} x1={`${parent.x}%`} y1={parent.y + 27} x2={`${node.x}%`} y2={node.y + 27} className={path.includes(node.id) ? 'active-link' : ''} /> : null;
      })}</svg>
      {layout.map(item => { const node = nodes.get(item.id)!; return <button key={node.id} className={`binary-node ${selectedId === node.id ? 'selected' : ''} ${path.includes(node.id) ? 'on-path' : ''}`} style={{ left: `${item.x}%`, top: item.y }} onClick={() => onSelect(node.id)} aria-label={`Riesgo ${node.score}, nivel ${node.level}${node.isLeaf ? ', hoja' : ', nodo padre'}`} aria-pressed={selectedId === node.id}><strong>{node.score}</strong><small>{node.level === 1 ? 'Raíz' : node.isLeaf ? 'Hoja' : 'Rama'}</small></button>; })}
    </div>
    <button className="button-secondary" onClick={() => { const container = viewport.current; if (container) container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2; }}>Centrar raíz</button>
    {tree.nodes.length > layout.length && <p className="tree-help">Se dibujan {layout.length} de {tree.nodes.length} nodos, hasta el nivel 4. Todos participan en los recorridos y búsquedas.</p>}
  </div>;
}
