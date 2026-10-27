import type { Traversal } from '../data-structures/BinarySearchTree.ts';
import type { TreeSnapshot } from '../types/trees';
import { request } from './api';
import { validateTreeSnapshot } from './treeView';
export async function loadReportTree(minimum: number, maximum: number, order: Traversal, signal: AbortSignal): Promise<TreeSnapshot> {
  const query = new URLSearchParams({ minScore: String(minimum), maxScore: String(maximum), order, limit: '200' });
  return validateTreeSnapshot(await request<TreeSnapshot>(`/data-structures/trees/reports?${query}`, { signal }));
}
