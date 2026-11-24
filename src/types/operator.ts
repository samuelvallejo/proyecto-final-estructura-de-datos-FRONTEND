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
  savedPercent: number; improvements: number; generatedAt: number; algorithm: string;
}
export interface TransitionResult { report: Report; allowedTransitions: ReportStatus[] }
export interface StatusEvent { id: string; at: number; from: string; to: ReportStatus; reason: string; actorName: string }
