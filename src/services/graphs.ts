import type { GraphOrder, GraphSnapshot } from '../types/graphs';
import { ApiClient } from './api';
import { GraphView } from './graphView';

/** Loads the proximity graph of the riskiest reports and validates it before use. */
export class GraphApi {
  static async loadReportGraph(radius: number, order: GraphOrder, start: string, end: string, signal: AbortSignal) {
    const query = new URLSearchParams({ radius: String(radius), order, limit: '80' });
    if (start) query.set('start', start);
    if (end) query.set('end', end);
    return GraphView.validateGraphSnapshot(await ApiClient.request<GraphSnapshot>(`/data-structures/graphs/reports?${query}`, { signal }));
  }
}
