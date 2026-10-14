import type { Health, Position, Report, ReportsPage, ScanResponse, StructureStats } from '../types';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...init, credentials: 'include', cache: 'no-store' }); }
  catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new Error('No se puede conectar con el servidor. Comprueba tu conexión.');
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('No se pudo completar la operación. Inténtalo de nuevo.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('bachescan-session-expired'));
    throw new ApiError(response.status === 429 ? 'No se pudo completar la operación. Espera un momento e inténtalo de nuevo.' : 'No se pudo completar la operación. Revisa los requisitos e inténtalo de nuevo.', response.status);
  }
  return body as T;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export const authStatus = () => request<{ authenticated: boolean }>('/auth/session');
export const authenticate = (email: string, password: string) => request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
export const registerAccount = (displayName: string, email: string, password: string, confirmPassword: string) => request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, email, password, confirmPassword }) });
export const endSession = () => request('/auth/logout', { method: 'POST' });
export async function scanFrame(frame: Blob, location: Position | null, signal: AbortSignal, tripId?: string): Promise<ScanResponse> {
  const form = new FormData();
  form.append('frame', frame, 'fotograma.jpg');
  if (tripId) form.append('tripId', tripId);
  if (location && (!location.capturedAt || Date.now() - location.capturedAt < 15000)) {
    form.append('lat', String(location.lat));
    form.append('lng', String(location.lng));
    form.append('accuracy', String(location.accuracy));
  }
  return request<ScanResponse>('/scan', { method: 'POST', body: form, signal });
}
export async function loadReports(mode: 'recent' | 'priority' = 'recent', offset = 0): Promise<ReportsPage> {
  return request<ReportsPage>(`/reports${mode === 'priority' ? '/priority' : ''}?limit=100&offset=${offset}`);
}
export const loadHealth = () => request<Health>('/health');
export const loadStructures = () => request<StructureStats>('/data-structures/stats');
export const loadNearby = (position: Position) => request<ReportsPage>(`/reports/nearby?lat=${position.lat}&lng=${position.lng}&radiusKm=5`);
export const patrolReport = (current?: string, direction: 'next' | 'previous' = 'next') =>
  request<{ report: Report | null; size: number }>(`/reports/patrol?direction=${direction}${current ? `&current=${encodeURIComponent(current)}` : ''}`);
