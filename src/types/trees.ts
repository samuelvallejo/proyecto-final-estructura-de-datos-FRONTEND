import type { Report } from '../types';
import type { Traversal } from '../data-structures/BinarySearchTree.ts';
export interface TreeMetrics { weight: number; height: number; levels: number; leaves: number; branches: number; maxDegree: number; internalNodes?: number; order?: number; reports?: number }

export interface BinaryReportNode { id: string; score: number; leftId: string | null; rightId: string | null; parentId: string | null; level: number; degree: number; isLeaf: boolean }
export interface BinaryReportTree { rootId: string | null; nodes: BinaryReportNode[]; metrics: TreeMetrics; traversal: { order: Traversal; reportIds: string[] } }

export interface PlaceReportNode { id: string; label: string; kind: 'root' | 'city' | 'neighborhood' | 'street' | 'report'; level: number; parentId: string | null; childIds: string[]; reportId: string | null; reportCount: number; highestScore: number }
export interface PlaceReportTree { rootId: string; nodes: PlaceReportNode[]; metrics: TreeMetrics }

export interface TreeSnapshot {
  generatedAt: number;
  scope: { totalReports: number; totalMatched: number; loaded: number; limit: number; hasMore: boolean; minScore: number; maxScore: number; selection: 'highest-risk' };
  binary: BinaryReportTree; geography: PlaceReportTree; reports: Report[];
}
