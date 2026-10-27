import type { Report } from '../types';
export type GraphOrder = 'bfs' | 'dfs';
export interface GraphEdge { source: string; target: string; distanceMeters: number }
export interface GraphNode { id: string; degree: number; component: number }
export interface GraphSnapshot {
  generatedAt: number;
  scope: { totalReports: number; loaded: number; limit: number; hasMore: boolean; excluded: number;
    selection: 'highest-risk'; radiusMeters: number; edgeMeaning: 'geographic-proximity' };
  reports: Report[];
  graph: { directed: false; weighted: true; representation: 'adjacency-list'; nodes: GraphNode[]; edges: GraphEdge[];
    components: string[][]; metrics: { vertices: number; edges: number; components: number; isolated: number; maxDegree: number };
    traversal: { order: GraphOrder; startId: string | null; reportIds: string[] };
    path: { reachable: boolean; reportIds: string[]; distanceMeters: number | null; settledIds: string[] } | null };
}
