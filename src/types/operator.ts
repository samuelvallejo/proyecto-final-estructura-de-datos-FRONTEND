import type { Report, ReportStatus } from '../types';

export type PriorityComponent = 'hazard' | 'exposure' | 'traffic' | 'waiting' | 'status';
export interface PriorityBreakdown { score: number; components: Record<PriorityComponent, number> }
export interface QueueItem { rank: number; report: Report; priority: PriorityBreakdown; allowedTransitions: ReportStatus[] }
export interface WorkQueue {
  items: QueueItem[]; total: number; generatedAt: number;
  structure: { name: 'indexed-binary-max-heap'; size: number; height: number; heapifyComparisons: number };
}
export interface PlanStop { step: number; report: Report; priorityScore: number; legMeters: number | null }
export interface DayPlan {
  start: { lat: number; lng: number } | null; stops: PlanStop[]; totalMeters: number; priorityOrderMeters: number;
  savedPercent: number; improvements: number; generatedAt: number; algorithm: string; algorithms?: string[]; tookMs?: number;
}
export interface TransitionResult { report: Report; allowedTransitions: ReportStatus[] }
export interface StatusEvent { id: string; at: number; from: string; to: ReportStatus; reason: string; actorName: string }
export interface DuplicateCluster { canonical: Report; duplicates: Report[]; size: number; maxSpanMeters: number }
export interface DuplicateReview {
  clusters: DuplicateCluster[]; generatedAt: number;
  stats: { potholes: number; indexed: number; skipped: number; closePairs: number; candidateChecks: number; bruteForceChecks: number;
    clusters: number; duplicates: number; estimatedPhysicalPotholes: number; radiusMeters: number; method?: string };
}
export interface MergeResult { report: Report; merged: number; passesMoved: number }
