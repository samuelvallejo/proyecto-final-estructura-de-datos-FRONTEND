import { ApiClient } from './api.ts';
import type { Me, Position, ReportStatus, Role } from '../types';
import type { DayPlan, DuplicateReview, MergeResult, PriorityBreakdown, PriorityComponent, StatusEvent, TransitionResult, WorkQueue } from '../types/operator';
import type { GraphEdge } from '../types/graphs';

/** HTTP client of the maintenance workspace (/api/operator). */
export class OperatorApi {
  static loadWorkQueue(limit = 20, signal?: AbortSignal): Promise<WorkQueue> {
    return ApiClient.request<WorkQueue>(`/operator/queue?limit=${limit}`, { signal });
  }

  static loadDayPlan(limit: number, start: Position | null, signal?: AbortSignal): Promise<DayPlan> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (start) { params.set('lat', String(start.lat)); params.set('lng', String(start.lng)); }
    return ApiClient.request<DayPlan>(`/operator/plan?${params}`, { signal });
  }

  static changeReportStatus(reportId: string, status: ReportStatus, reason = ''): Promise<TransitionResult> {
    return ApiClient.request<TransitionResult>(`/operator/reports/${encodeURIComponent(reportId)}/transition`, ApiClient.jsonPost({ status, reason }));
  }

  static loadStatusTimeline(reportId: string): Promise<{ events: StatusEvent[] }> {
    return ApiClient.request<{ events: StatusEvent[] }>(`/operator/reports/${encodeURIComponent(reportId)}/timeline`);
  }

  static loadDuplicates(radius: number, signal?: AbortSignal): Promise<DuplicateReview> {
    return ApiClient.request<DuplicateReview>(`/operator/duplicates?radius=${radius}`, { signal });
  }

  static mergeDuplicates(canonicalReportId: string, duplicateReportIds: string[]): Promise<MergeResult> {
    return ApiClient.request<MergeResult>('/operator/duplicates/merge', ApiClient.jsonPost({ canonicalReportId, duplicateReportIds }));
  }
}

/** Pure presentation rules of the maintenance workspace (no network, easy to test). */
export class OperatorView {
  /** Roles allowed to use the maintenance workspace; mirrors the backend rule. */
  static readonly FIELD_ROLES: readonly Role[] = ['Operario', 'Administrador'];

  static readonly transitionText: Record<ReportStatus, string> = {
    UNVERIFIED: 'Marcar sin verificar', CONFIRMED: 'Confirmar bache', IN_PROGRESS: 'Iniciar reparación',
    REPAIRED: 'Marcar reparado', REJECTED: 'Rechazar reporte',
  };

  static readonly componentText: Record<PriorityComponent, string> = {
    hazard: 'Riesgo', exposure: 'Personas expuestas', traffic: 'Pasos registrados', waiting: 'Tiempo de espera', status: 'Estado validado',
  };

  static readonly DEMO_READ_ONLY_NOTICE = 'Cuenta de demostración: puedes consultar todo, pero los cambios de estado, roles y fusiones están desactivados para proteger los datos reales.';

  /** Message shown instead of the write controls for a read-only demo session. */
  static readOnlyNotice(me: Pick<Me, 'readOnly'> | null | undefined): string {
    return me?.readOnly ? OperatorView.DEMO_READ_ONLY_NOTICE : '';
  }

  static canUseMaintenance(me: Pick<Me, 'role'> | null | undefined): boolean {
    return Boolean(me && OperatorView.FIELD_ROLES.includes(me.role));
  }

  /** Share of pair checks avoided by the spatial grid compared with comparing every pair. */
  static checksAvoidedPercent(stats: Pick<DuplicateReview['stats'], 'candidateChecks' | 'bruteForceChecks'>): number {
    if (stats.bruteForceChecks <= 0) return 0;
    return Math.round(1000 * (1 - stats.candidateChecks / stats.bruteForceChecks)) / 10;
  }

  /** Width percentage of each score component for a stacked bar (sums to the score). */
  static scoreSegments(priority: PriorityBreakdown): { key: PriorityComponent; label: string; value: number; percent: number }[] {
    return (Object.keys(OperatorView.componentText) as PriorityComponent[])
      .map(key => ({ key, label: OperatorView.componentText[key], value: priority.components[key] ?? 0,
        percent: Math.max(0, Math.min(100, priority.components[key] ?? 0)) }))
      .filter(segment => segment.value > 0);
  }

  /** Consecutive stops as map edges, so the existing map can draw the planned order. */
  static planEdges(plan: Pick<DayPlan, 'stops'>): GraphEdge[] {
    return plan.stops.slice(1).map((stop, index) => ({
      source: plan.stops[index].report.id, target: stop.report.id, distanceMeters: stop.legMeters ?? 0,
    }));
  }

  /** Short sentence comparing the planned route against visiting the stops by priority. */
  static savingText(plan: Pick<DayPlan, 'savedPercent' | 'priorityOrderMeters' | 'totalMeters'>): string {
    if (plan.savedPercent <= 0 || plan.priorityOrderMeters <= 0) return 'El orden de prioridad ya es el recorrido más corto encontrado.';
    return `${plan.savedPercent.toLocaleString('es-CO')} % menos distancia que visitarlos por orden de prioridad.`;
  }
}
