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
