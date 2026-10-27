import type { Report } from '../types';
import type { Traversal } from '../data-structures/BinarySearchTree.ts';
export interface TreeMetrics { weight: number; height: number; levels: number; leaves: number; branches: number; maxDegree: number; internalNodes?: number; order?: number; reports?: number }
