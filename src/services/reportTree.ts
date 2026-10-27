import { BinarySearchTree } from '../data-structures/BinarySearchTree.ts';
import type { Traversal } from '../data-structures/BinarySearchTree.ts';
import type { Report } from '../types';
export type RiskKey = [number, number, string];
export function compareRisk(a: RiskKey, b: RiskKey): number {
  return a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0);
}

export function reportKey(report: Report): RiskKey {
  if (!Number.isFinite(report.hazardScore) || report.hazardScore < 0 || report.hazardScore > 100
    || !Number.isFinite(report.timestamp) || report.timestamp < 0 || !report.id) throw new Error('Reporte inválido');
  return [report.hazardScore, report.timestamp, report.id];
}

export class ReportRiskIndex {
  readonly byId: Map<string, Report>;
  readonly tree: BinarySearchTree<RiskKey, Report>;
  constructor(reports: Report[]) {
    this.byId = new Map(reports.map(report => [report.id, report]));
    this.tree = BinarySearchTree.fromItems([...this.byId.values()].map(report => [reportKey(report), report]), compareRisk);
  }

  upsert(report: Report): void {
    const key = reportKey(report); const previous = this.byId.get(report.id);
    if (previous) this.tree.remove(reportKey(previous));
    this.byId.set(report.id, report); this.tree.insert(key, report);
  }

  remove(id: string): boolean {
    const previous = this.byId.get(id); if (!previous) return false;
    this.byId.delete(id); return this.tree.remove(reportKey(previous));
  }

  ordered(order: Traversal = 'descending'): Report[] { return [...this.tree.traverse(order)].map(node => node.value); }
