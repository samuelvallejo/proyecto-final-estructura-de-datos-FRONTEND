import type { Traversal } from '../data-structures/BinarySearchTree.ts';
import type { TreeSnapshot } from '../types/trees';
import { ApiClient } from './api';
import { TreeView } from './treeView';

/** Loads the risk BST and the place tree for a score range and validates the snapshot. */
export class TreeApi {
  static async loadReportTree(minimum: number, maximum: number, order: Traversal, signal: AbortSignal): Promise<TreeSnapshot> {
    const query = new URLSearchParams({ minScore: String(minimum), maxScore: String(maximum), order, limit: '200' });
    return TreeView.validateTreeSnapshot(await ApiClient.request<TreeSnapshot>(`/data-structures/trees/reports?${query}`, { signal }));
  }
}
