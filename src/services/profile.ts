import { request } from './api.ts';
import type { AuditEvent, DemoAccount, Me, Position, PotholeHistoryItem, Report, ReportStatus, Role, SessionSummary, Trip, Vehicle } from '../types';

const jsonPost = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const coordinates = ({ lat, lng, accuracy }: Position) => ({ lat, lng, accuracy });

export const loadDemoAccounts = () => request<{ enabled: boolean; accounts: DemoAccount[] }>('/auth/demo');
export const loadMe = () => request<Me>('/me');
export const loadMySessions = () => request<{ sessions: SessionSummary[] }>('/me/sessions');
export const loadMyPotholes = () => request<{ history: PotholeHistoryItem[]; detected: number; passed: number }>('/me/potholes');
export const recordPass = (position: Position, tripId?: string) =>
  request<{ passed: number; nearby: number; radiusMeters: number }>('/passes', jsonPost({ position: coordinates(position), tripId: tripId || null }));
export const loadGeneralMap = (include: 'all' | 'active' = 'all') =>
  request<{ potholes: Report[]; total: number; loaded: number; peopleTotal: number; passesTotal: number; generatedAt: number }>(`/map/potholes?include=${include}`);
export const startDrivingTrip = (vehicle: Vehicle, position: Position) => request<Trip>('/trips', jsonPost({
  name: `Sesión en ${vehicle} · ${new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
  pointA: 'Ubicación de inicio', pointB: 'Destino libre', position: coordinates(position), vehicle,
}));

export type DashboardSection = 'totals' | 'series' | 'risk' | 'top' | 'pipeline';
export interface DashboardResponse<T> { section: DashboardSection; data: T; serverMs: number; generatedAt: number }
export const loadDashboard = <T,>(section: DashboardSection, signal?: AbortSignal) =>
  request<DashboardResponse<T>>(`/dashboard?section=${section}`, { signal });

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
export const adminOverview = () => request<AdminOverview>('/admin/overview');
export const adminUsers = () => request<{ users: AdminUser[] }>('/admin/users');
export const adminSetRole = (id: string, role: Role) => request<{ id: string; role: Role }>(`/admin/users/${encodeURIComponent(id)}/role`, jsonPost({ role }));
export const adminSetActive = (id: string, active: boolean) => request<{ id: string; active: boolean }>(`/admin/users/${encodeURIComponent(id)}/active`, jsonPost({ active }));
export const adminReports = (status: ReportStatus | 'all', offset = 0) =>
  request<{ reports: Report[]; total: number; hasMore: boolean }>(`/admin/reports?status=${status}&limit=100&offset=${offset}`);
export const adminSetStatus = (reportId: string, status: ReportStatus, reason = '') =>
  request<Report>(`/admin/reports/${encodeURIComponent(reportId)}/status`, jsonPost({ status, reason }));
export const adminSessions = () => request<{ sessions: SessionSummary[] }>('/admin/sessions');
export const adminAudit = () => request<{ events: AuditEvent[] }>('/admin/audit');
export const adminTrips = () => request<{ trips: AdminTrip[] }>('/admin/trips');
