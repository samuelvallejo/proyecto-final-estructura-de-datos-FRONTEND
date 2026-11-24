import { ApiClient } from './api.ts';
import type { AuditEvent, DemoAccount, Me, Position, PotholeHistoryItem, Report, ReportStatus, Role, SessionSummary, Trip, Vehicle } from '../types';

export type DashboardSection = 'totals' | 'series' | 'risk' | 'top' | 'pipeline';
export interface DashboardResponse<T> { section: DashboardSection; data: T; serverMs: number; generatedAt: number }

/** Signed-in user's profile, passes over known potholes, general map, driving sessions and dashboard. */
export class ProfileApi {
  static loadDemoAccounts() { return ApiClient.request<{ enabled: boolean; accounts: DemoAccount[] }>('/auth/demo'); }

  static loadMe() { return ApiClient.request<Me>('/me'); }

  static loadMySessions() { return ApiClient.request<{ sessions: SessionSummary[] }>('/me/sessions'); }

  static loadMyPotholes() { return ApiClient.request<{ history: PotholeHistoryItem[]; detected: number; passed: number }>('/me/potholes'); }

  static recordPass(position: Position, tripId?: string) {
    return ApiClient.request<{ passed: number; nearby: number; radiusMeters: number }>('/passes',
      ApiClient.jsonPost({ position: ApiClient.coordinates(position), tripId: tripId || null }));
  }

  static loadGeneralMap(include: 'all' | 'active' = 'all') {
    return ApiClient.request<{ potholes: Report[]; total: number; loaded: number; peopleTotal: number; passesTotal: number; generatedAt: number }>(`/map/potholes?include=${include}`);
  }

  static startDrivingTrip(vehicle: Vehicle, position: Position) {
    return ApiClient.request<Trip>('/trips', ApiClient.jsonPost({
      name: `Sesión en ${vehicle} · ${new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      pointA: 'Ubicación de inicio', pointB: 'Destino libre', position: ApiClient.coordinates(position), vehicle,
    }));
  }

  static loadDashboard<T>(section: DashboardSection, signal?: AbortSignal) {
    return ApiClient.request<DashboardResponse<T>>(`/dashboard?section=${section}`, { signal });
  }
}

export interface AdminOverview {
  users: number; inactiveUsers: number; roles: Record<Role, number>; activeSessions: number; sessions24h: number;
  statuses: Record<ReportStatus, number>; reports: number; scans24h: number; failedScans24h: number; passes: number;
  activeTrips: number; auditEvents24h: number; generatedAt: number;
}
export interface AdminUser {
  id: string; displayName: string; initials: string; email: string; role: Role; active: boolean; createdAt: number;
  lastSeenAt: number | null; sessions: number; reports: number; passes: number; trips: number;
}
export interface AdminTrip extends Omit<Trip, 'start' | 'end'> { userId: string; userName: string }

/** Administrator-only endpoints: accounts, roles, report status, sessions, audit trail and trips. */
export class AdminApi {
  static adminOverview() { return ApiClient.request<AdminOverview>('/admin/overview'); }

  static adminUsers() { return ApiClient.request<{ users: AdminUser[] }>('/admin/users'); }

  static adminSetRole(id: string, role: Role) {
    return ApiClient.request<{ id: string; role: Role }>(`/admin/users/${encodeURIComponent(id)}/role`, ApiClient.jsonPost({ role }));
  }

  static adminSetActive(id: string, active: boolean) {
    return ApiClient.request<{ id: string; active: boolean }>(`/admin/users/${encodeURIComponent(id)}/active`, ApiClient.jsonPost({ active }));
  }

  static adminReports(status: ReportStatus | 'all', offset = 0) {
    return ApiClient.request<{ reports: Report[]; total: number; hasMore: boolean }>(`/admin/reports?status=${status}&limit=100&offset=${offset}`);
  }

  static adminSetStatus(reportId: string, status: ReportStatus, reason = '') {
    return ApiClient.request<Report>(`/admin/reports/${encodeURIComponent(reportId)}/status`, ApiClient.jsonPost({ status, reason }));
  }

  static adminSessions() { return ApiClient.request<{ sessions: SessionSummary[] }>('/admin/sessions'); }

  static adminAudit() { return ApiClient.request<{ events: AuditEvent[] }>('/admin/audit'); }

  static adminTrips() { return ApiClient.request<{ trips: AdminTrip[] }>('/admin/trips'); }
}
