import { BinarySearchTree } from '../data-structures/BinarySearchTree.ts';
import type { Traversal } from '../data-structures/BinarySearchTree.ts';
import { HashMap } from '../data-structures/HashMap.ts';
import { LinkedList } from '../data-structures/LinkedList.ts';
import type { Report } from '../types';

export type RiskKey = [number, number, string];

/** Risk index: reports by id in a HashMap and ordered by (risk, date, id) in a binary search tree. */
export class ReportRiskIndex {
  readonly byId: HashMap<string, Report>;
  readonly tree: BinarySearchTree<RiskKey, Report>;

  constructor(reports: Report[]) {
    this.byId = new HashMap();
    for (const report of reports) this.byId.set(report.id, report);
    const pairs = new LinkedList<[RiskKey, Report]>();
    for (const report of this.byId.values()) pairs.append([ReportRiskIndex.reportKey(report), report]);
    this.tree = BinarySearchTree.fromItems(pairs, ReportRiskIndex.compareRisk);
  }

  static compareRisk(a: RiskKey, b: RiskKey): number {
    return a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0);
  }

  /** The tree key; the date and id break ties between reports with the same risk. */
  static reportKey(report: Report): RiskKey {
    if (!Number.isFinite(report.hazardScore) || report.hazardScore < 0 || report.hazardScore > 100
      || !Number.isFinite(report.timestamp) || report.timestamp < 0 || !report.id) throw new Error('Reporte inválido');
    return [report.hazardScore, report.timestamp, report.id];
  }

  static orderReports(reports: Report[], order: 'original' | 'ascending' | 'descending'): Report[] {
    if (order === 'original') return [...reports];
    return new ReportRiskIndex(reports).ordered(order === 'ascending' ? 'inorder' : 'descending');
  }

  upsert(report: Report): void {
    const key = ReportRiskIndex.reportKey(report); const previous = this.byId.get(report.id);
    if (previous) this.tree.remove(ReportRiskIndex.reportKey(previous));
    this.byId.set(report.id, report); this.tree.insert(key, report);
  }

  remove(id: string): boolean {
    const previous = this.byId.get(id); if (!previous) return false;
    this.byId.delete(id); return this.tree.remove(ReportRiskIndex.reportKey(previous));
  }

  ordered(order: Traversal = 'descending'): Report[] {
    const result = new LinkedList<Report>();
    for (const node of this.tree.traverse(order)) result.append(node.value);
    return result.toArray();
  }

  inRange(minimum = 0, maximum = 100): Report[] {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum > 100 || minimum > maximum) throw new Error('Rango inválido');
    const result = new LinkedList<Report>();
    for (const node of this.tree.between([minimum, -Infinity, ''], [maximum, Infinity, String.fromCodePoint(0x10ffff)])) result.append(node.value);
    return result.toArray();
  }

  searchPath(id: string): string[] {
    const report = this.byId.get(id);
    return report ? this.tree.trace(ReportRiskIndex.reportKey(report)).map(node => node.value.id).toArray() : [];
  }
}
