import type { Health, Position, Report, ReportsPage, ScanResponse, StructureStats } from '../types';

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${base}/api${path}`, init); }
  catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new Error('No se puede conectar con el servidor. Comprueba tu conexión.');
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('La API respondió un contenido inesperado. Revisa VITE_API_URL y el despliegue del backend.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || body.detail || 'Ocurrió un error al procesar la solicitud.', response.status);
  return body as T;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
let tokenRequest: Promise<string> | null = null;
let memorySession: { token: string; expiresAt: number } | null = null;
function savedSession(): { token: string; expiresAt: number } | null {
  try { return JSON.parse(localStorage.getItem('bachescan-session') || 'null') || memorySession; } catch { return memorySession; }
}
async function sessionToken(signal: AbortSignal): Promise<string> {
  const saved = savedSession();
  if (saved && saved.expiresAt > Date.now() + 60000) return saved.token;
  if (!tokenRequest) {
    tokenRequest = request<{ token: string; expiresAt: number }>('/sessions', { method: 'POST', signal })
      .then(session => {
        memorySession = session;
        try { localStorage.setItem('bachescan-session', JSON.stringify(session)); } catch { /* Navegador privado */ }
        return session.token;
      }).finally(() => { tokenRequest = null; });
  }
  return tokenRequest;
}
export async function scanFrame(frame: Blob, location: Position | null, signal: AbortSignal): Promise<ScanResponse> {
  const form = new FormData();
  form.append('frame', frame, 'fotograma.jpg');
  if (location && (!location.capturedAt || Date.now() - location.capturedAt < 15000)) {
    form.append('lat', String(location.lat));
    form.append('lng', String(location.lng));
    form.append('accuracy', String(location.accuracy));
  }
  const token = await sessionToken(signal);
  try { return await request<ScanResponse>('/scan', { method: 'POST', body: form, signal, headers: { Authorization: `Bearer ${token}` } }); }
  catch (cause) {
    if (cause instanceof ApiError && cause.status === 401) {
      memorySession = null;
      try { localStorage.removeItem('bachescan-session'); } catch { /* Sin almacenamiento */ }
    }
    throw cause;
  }
}
export async function loadReports(mode: 'recent' | 'priority' = 'recent', offset = 0): Promise<ReportsPage> {
  return request<ReportsPage>(`/reports${mode === 'priority' ? '/priority' : ''}?limit=100&offset=${offset}`);
}
export const loadHealth = () => request<Health>('/health');
export const loadStructures = () => request<StructureStats>('/data-structures/stats');
export const loadNearby = (position: Position) => request<ReportsPage>(`/reports/nearby?lat=${position.lat}&lng=${position.lng}&radiusKm=5`);
export const patrolReport = (current?: string, direction: 'next' | 'previous' = 'next') =>
  request<{ report: Report | null; size: number }>(`/reports/patrol?direction=${direction}${current ? `&current=${encodeURIComponent(current)}` : ''}`);
