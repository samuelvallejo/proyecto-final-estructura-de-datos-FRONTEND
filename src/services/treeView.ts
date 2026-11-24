import type { BinaryReportNode, BinaryReportTree, PlaceReportNode, PlaceReportTree, TreeSnapshot } from '../types/trees';
import type { Report } from '../types';
import { HashMap } from '../data-structures/HashMap.ts';
import { HashSet } from '../data-structures/HashSet.ts';
import { LinkedList } from '../data-structures/LinkedList.ts';
import { Stack } from '../data-structures/Stack.ts';

/** Client-side view of the report trees: paths, layout, labels and response validation. */
export class TreeView {
  static readonly traversalText = {
    inorder: { label: 'En orden: menor a mayor riesgo', help: 'Visita el hijo izquierdo, el nodo y el hijo derecho.' },
    descending: { label: 'Mayor a menor riesgo', help: 'Visita el hijo derecho, el nodo y el hijo izquierdo.' },
    preorder: { label: 'Preorden: raíz primero', help: 'Visita el nodo antes de sus hijos izquierdo y derecho.' },
    postorder: { label: 'Postorden: raíz al final', help: 'Visita los hijos izquierdo y derecho antes del nodo.' },
    level: { label: 'Por niveles: de arriba hacia abajo', help: 'Una cola visita primero los nodos más cercanos a la raíz.' },
  };

  /** Keeps up to three digits and caps the value at 100. */
  static scoreInput(value: string): string {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 3);
    return digits ? String(Math.min(100, Number(digits))) : '';
  }

  private static index<T extends { id: string }>(nodes: T[]): HashMap<string, T> {
    const result = new HashMap<string, T>();
    for (const node of nodes) result.set(node.id, node);
    return result;
  }

  /** Root-to-node path following parent links; empty when a link is broken or cyclic. */
  static binaryPath(tree: BinaryReportTree, id: string, nodes: HashMap<string, BinaryReportNode> = TreeView.index(tree.nodes)): string[] {
    const reversed = new Stack<string>(); const visited = new HashSet<string>();
    let current: string | null = id;
    while (current !== null) {
      const node = nodes.get(current);
      if (!node || visited.has(current)) return [];
      visited.add(current); reversed.push(current); current = node.parentId;
    }
    const result: string[] = [];
    while (!reversed.isEmpty()) result.push(reversed.pop()!);
    return result;
  }

  /** Reports under a place node, depth first and in child order. */
  static placeReports(tree: PlaceReportTree, id: string): string[] {
    const nodes: HashMap<string, PlaceReportNode> = TreeView.index(tree.nodes);
    const pending = new Stack<string>(); const result = new LinkedList<string>(); const seen = new HashSet<string>();
    pending.push(id);
    while (!pending.isEmpty()) {
      const current = pending.pop()!; if (seen.has(current)) continue;
      seen.add(current); const node = nodes.get(current); if (!node) continue;
      if (node.reportId) result.append(node.reportId);
      for (let index = node.childIds.length - 1; index >= 0; index--) pending.push(node.childIds[index]);
    }
    return result.toArray();
  }

  /** Positions of the first `maxLevels` levels: each child takes half of its parent's horizontal span. */
  static binaryLayout(tree: BinaryReportTree, maxLevels = 4) {
    const nodes = TreeView.index(tree.nodes);
    const result = new LinkedList<{ id: string; x: number; y: number; parentId: string | null }>();
    const pending = new Stack<[string, number, number, number]>();
    if (tree.rootId) pending.push([tree.rootId, 0, 100, 1]);
    const seen = new HashSet<string>();
    while (!pending.isEmpty()) {
      const [id, left, right, level] = pending.pop()!;
      const node = nodes.get(id); if (!node || seen.has(id) || level > maxLevels) continue;
      seen.add(id); const x = (left + right) / 2;
      result.append({ id, x, y: (level - 1) * 92 + 24, parentId: node.parentId });
      if (node.rightId) pending.push([node.rightId, x, right, level + 1]);
      if (node.leftId) pending.push([node.leftId, left, x, level + 1]);
    }
    return result.toArray();
  }

  static treeReportLabel(report: Report): string {
    const place = [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', ');
    return `Riesgo ${report.hazardScore}/100 · ${place || 'Ubicación GPS sin dirección'}`;
  }

  static validateTreeSnapshot(value: TreeSnapshot): TreeSnapshot {
    const invalid = (): never => { throw new Error('No se pudo interpretar el árbol de reportes.'); };
    if (!value || !value.scope || !value.binary || !value.geography || !Array.isArray(value.reports)
      || !Array.isArray(value.binary.nodes) || !Array.isArray(value.geography.nodes)
      || value.reports.length > 200 || value.binary.nodes.length !== value.reports.length
      || value.geography.nodes.length > 801 || value.scope.loaded !== value.reports.length) invalid();
    if (!Number.isFinite(value.generatedAt) || !Number.isInteger(value.scope.loaded)
      || value.scope.totalMatched < value.scope.loaded || value.scope.totalReports < value.scope.totalMatched
      || value.scope.minScore < 0 || value.scope.maxScore > 100 || value.scope.minScore > value.scope.maxScore
      || !Object.hasOwn(TreeView.traversalText, value.binary.traversal.order)) invalid();
    const ids = HashSet.from(value.reports.map(report => report.id));
    const nodes = TreeView.index(value.binary.nodes);
    const traversed = HashSet.from(value.binary.traversal.reportIds);
    if (ids.size !== value.reports.length || nodes.size !== ids.size
      || value.binary.metrics.weight !== nodes.size
      || value.binary.traversal.reportIds.length !== ids.size || traversed.size !== ids.size
      || value.binary.traversal.reportIds.some(id => !ids.has(id))
      || (value.binary.rootId === null) !== (nodes.size === 0)
      || value.binary.rootId !== null && !nodes.has(value.binary.rootId)) invalid();
    for (const node of value.binary.nodes) {
      const path = TreeView.binaryPath(value.binary, node.id, nodes);
      if (!ids.has(node.id) || !Number.isFinite(node.score) || node.score < 0 || node.score > 100
        || !Number.isInteger(node.level) || node.level < 1 || node.level > 200
        || [node.leftId, node.rightId, node.parentId].some(id => id !== null && !nodes.has(id))
        || path.length !== node.level || path[0] !== value.binary.rootId
        || node.leftId !== null && nodes.get(node.leftId)?.parentId !== node.id
        || node.rightId !== null && nodes.get(node.rightId)?.parentId !== node.id) invalid();
    }
    const places = TreeView.index(value.geography.nodes);
    if (places.size !== value.geography.nodes.length || !places.has(value.geography.rootId)) invalid();
    for (const node of value.geography.nodes) {
      if (!Array.isArray(node.childIds) || node.childIds.some(id => !places.has(id)
        || places.get(id)?.parentId !== node.id || places.get(id)?.level !== node.level + 1)
        || node.reportId !== null && !ids.has(node.reportId) || node.level < 1 || node.level > 5) invalid();
    }
    return value;
  }
}
