import type { GraphOrder, GraphSnapshot } from '../types/graphs';
import { request } from './api';
import { validateGraphSnapshot } from './graphView';
export async function loadReportGraph(radius: number, order: GraphOrder, start: string, end: string, signal: AbortSignal) {
  const query = new URLSearchParams({ radius: String(radius), order, limit: '80' });
  if (start) query.set('start', start);
  if (end) query.set('end', end);
  return validateGraphSnapshot(await request<GraphSnapshot>(`/data-structures/graphs/reports?${query}`, { signal }));
}
