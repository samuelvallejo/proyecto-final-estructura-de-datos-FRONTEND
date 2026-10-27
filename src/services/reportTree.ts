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
