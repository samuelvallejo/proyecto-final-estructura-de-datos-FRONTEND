import { BinarySearchTree } from '../data-structures/BinarySearchTree.ts';
import type { Traversal } from '../data-structures/BinarySearchTree.ts';
import type { Report } from '../types';
export type RiskKey = [number, number, string];
export function compareRisk(a: RiskKey, b: RiskKey): number {
  return a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0);
}
