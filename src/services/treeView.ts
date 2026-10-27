import type { BinaryReportTree, PlaceReportTree, TreeSnapshot } from '../types/trees';
import type { Report } from '../types';
export const traversalText = {
  inorder: { label: 'En orden: menor a mayor riesgo', help: 'Visita el hijo izquierdo, el nodo y el hijo derecho.' },
  descending: { label: 'Mayor a menor riesgo', help: 'Visita el hijo derecho, el nodo y el hijo izquierdo.' },
  preorder: { label: 'Preorden: raíz primero', help: 'Visita el nodo antes de sus hijos izquierdo y derecho.' },
  postorder: { label: 'Postorden: raíz al final', help: 'Visita los hijos izquierdo y derecho antes del nodo.' },
  level: { label: 'Por niveles: de arriba hacia abajo', help: 'Una cola visita primero los nodos más cercanos a la raíz.' },
};

export function scoreInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 3);
  return digits ? String(Math.min(100, Number(digits))) : '';
}

export function binaryPath(tree: BinaryReportTree, id: string): string[] {
  const nodes = new Map(tree.nodes.map(node => [node.id, node]));
  const result: string[] = []; const visited = new Set<string>();
  let current: string | null = id;
  while (current !== null) {
    const node = nodes.get(current);
    if (!node || visited.has(current)) return [];
    visited.add(current); result.push(current); current = node.parentId;
  }
  return result.reverse();
}

export function placeReports(tree: PlaceReportTree, id: string): string[] {
  const nodes = new Map(tree.nodes.map(node => [node.id, node]));
  const pending = [id]; const result: string[] = []; const seen = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!; if (seen.has(current)) continue;
    seen.add(current); const node = nodes.get(current); if (!node) continue;
    if (node.reportId) result.push(node.reportId);
    pending.push(...node.childIds.slice().reverse());
  }
  return result;
}

export function binaryLayout(tree: BinaryReportTree, maxLevels = 4) {
  const nodes = new Map(tree.nodes.map(node => [node.id, node]));
  const result: { id: string; x: number; y: number; parentId: string | null }[] = [];
  const pending: [string, number, number, number][] = tree.rootId ? [[tree.rootId, 0, 100, 1]] : [];
  const seen = new Set<string>();
  while (pending.length) {
    const [id, left, right, level] = pending.pop()!;
    const node = nodes.get(id); if (!node || seen.has(id) || level > maxLevels) continue;
    seen.add(id); const x = (left + right) / 2;
    result.push({ id, x, y: (level - 1) * 92 + 24, parentId: node.parentId });
    if (node.rightId) pending.push([node.rightId, x, right, level + 1]);
    if (node.leftId) pending.push([node.leftId, left, x, level + 1]);
  }
  return result;
}

export function treeReportLabel(report: Report): string {
  const place = [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', ');
  return `Riesgo ${report.hazardScore}/100 · ${place || 'Ubicación GPS sin dirección'}`;
}

export function validateTreeSnapshot(value: TreeSnapshot): TreeSnapshot {
  const invalid = () => { throw new Error('No se pudo interpretar el árbol de reportes.'); };
  if (!value || !value.scope || !value.binary || !value.geography || !Array.isArray(value.reports)
    || !Array.isArray(value.binary.nodes) || !Array.isArray(value.geography.nodes)
    || value.reports.length > 200 || value.binary.nodes.length !== value.reports.length
    || value.geography.nodes.length > 801 || value.scope.loaded !== value.reports.length) invalid();
  const ids = new Set(value.reports.map(report => report.id));
  const nodes = new Map(value.binary.nodes.map(node => [node.id, node]));
  if (ids.size !== value.reports.length || nodes.size !== ids.size
    || value.binary.metrics.weight !== nodes.size
    || value.binary.traversal.reportIds.length !== ids.size
    || new Set(value.binary.traversal.reportIds).size !== ids.size
    || value.binary.traversal.reportIds.some(id => !ids.has(id))
    || (value.binary.rootId === null) !== (nodes.size === 0)
    || value.binary.rootId !== null && !nodes.has(value.binary.rootId)) invalid();
  for (const node of value.binary.nodes) {
    if (!ids.has(node.id) || !Number.isFinite(node.score) || node.score < 0 || node.score > 100
      || !Number.isInteger(node.level) || node.level < 1 || node.level > 200
      || [node.leftId, node.rightId, node.parentId].some(id => id !== null && !nodes.has(id))
      || binaryPath(value.binary, node.id).length !== node.level
      || binaryPath(value.binary, node.id)[0] !== value.binary.rootId
      || node.leftId !== null && nodes.get(node.leftId)?.parentId !== node.id
      || node.rightId !== null && nodes.get(node.rightId)?.parentId !== node.id) invalid();
  }
  const places = new Map(value.geography.nodes.map(node => [node.id, node]));
  if (places.size !== value.geography.nodes.length || !places.has(value.geography.rootId)) invalid();
  for (const node of value.geography.nodes) {
    if (!Array.isArray(node.childIds) || node.childIds.some(id => !places.has(id))
      || node.reportId !== null && !ids.has(node.reportId) || node.level < 1 || node.level > 5) invalid();
  }
  return value;
}
