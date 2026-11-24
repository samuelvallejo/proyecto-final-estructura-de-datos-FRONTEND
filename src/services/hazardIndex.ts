import type { Report } from '../types';
import { KdTree } from '../data-structures/KdTree.ts';
import { HashSet } from '../data-structures/HashSet.ts';

/** Spatial helpers for the potholes shown while driving or with alerts on. */
export class HazardIndex {
  static readonly INACTIVE = HashSet.from<string>(['REPAIRED', 'REJECTED']);

  /** k-d tree of the potholes that can still hurt someone (repaired or rejected ones are left out). */
  static build(reports: Report[]): KdTree<Report> {
    return new KdTree(reports.filter(report => !HazardIndex.INACTIVE.has(report.status)).map(report => ({ point: report.location, value: report })));
  }

  /** Reports of ``extra`` that are not in ``base``; a hash set makes it O(n + m) instead of O(n · m). */
  static missingFrom(base: Report[], extra: Report[]): Report[] {
    const known = HashSet.from(base.map(report => report.id));
    return extra.filter(report => !known.has(report.id));
  }
}
