import type { Health, Position, Report, ReportsPage, ScanResponse, StructureStats, PhotoDetections } from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** HTTP client for the BacheScan API: same-origin cookies, no cache and uniform error messages. */
export class ApiClient {
  static async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try { response = await fetch(`/api${path}`, { ...init, credentials: 'include', cache: 'no-store' }); }
    catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
      throw new Error('No se puede conectar con el servidor. Comprueba tu conexión.');
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('No se pudo completar la operación. Inténtalo de nuevo.');
    }
    // The body can only be read once: it is reused for the server error message.
    const body = await response.json().catch(() => ({})) as { error?: unknown };
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('bachescan-session-expired'));
      throw new ApiError((typeof body.error === 'string' && body.error) || (response.status === 429 ? 'No se pudo completar la operación. Espera un momento e inténtalo de nuevo.' : 'No se pudo completar la operación. Revisa los requisitos e inténtalo de nuevo.'), response.status);
    }
    return body as T;
  }

  static jsonPost(body: unknown): RequestInit {
    return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  }

  static coordinates({ lat, lng, accuracy }: Position) { return { lat, lng, accuracy }; }

  static authStatus() { return ApiClient.request<{ authenticated: boolean }>('/auth/session'); }

  static authenticate(email: string, password: string) { return ApiClient.request('/auth/login', ApiClient.jsonPost({ email, password })); }

  static registerAccount(displayName: string, email: string, password: string, confirmPassword: string) {
    return ApiClient.request('/auth/register', ApiClient.jsonPost({ displayName, email, password, confirmPassword }));
  }

  static endSession() { return ApiClient.request('/auth/logout', { method: 'POST' }); }

  /** Rejects any response whose boxes fall outside the image or whose counts do not match. */
  static validPhotoDetections(response: PhotoDetections): boolean {
    return Number.isInteger(response.width) && Number.isInteger(response.height) && response.width >= 32 && response.height >= 32
      && Array.isArray(response.detections) && response.count === response.detections.length
      && response.detections.every(item => item.label === 'pothole' && Number.isFinite(item.confidence)
        && item.confidence >= 0 && item.confidence <= 1 && Array.isArray(item.bbox) && item.bbox.length === 4
        && item.bbox.every(value => Number.isFinite(value)) && item.bbox[0] >= 0 && item.bbox[1] >= 0
        && item.bbox[2] <= response.width && item.bbox[3] <= response.height
        && item.bbox[0] < item.bbox[2] && item.bbox[1] < item.bbox[3]);
  }

  static async detectPotholes(image: File, signal: AbortSignal): Promise<PhotoDetections> {
    const form = new FormData(); form.append('image', image);
    const response = await ApiClient.request<PhotoDetections>('/detect/potholes', { method: 'POST', body: form, signal });
    if (!ApiClient.validPhotoDetections(response)) throw new Error('No se pudo interpretar el resultado. Inténtalo de nuevo.');
    return response;
  }

  static async scanFrame(frame: Blob, location: Position | null, signal: AbortSignal, tripId?: string, mode: 'live' | 'still' = 'live'): Promise<ScanResponse> {
    const form = new FormData();
    form.append('frame', frame, 'frame.jpg');
    form.append('mode', mode);
    if (tripId) form.append('tripId', tripId);
    if (location && (!location.capturedAt || Date.now() - location.capturedAt < 15000)) {
      form.append('lat', String(location.lat));
      form.append('lng', String(location.lng));
      form.append('accuracy', String(location.accuracy));
    }
    return ApiClient.request<ScanResponse>('/scan', { method: 'POST', body: form, signal });
  }

  static loadReports(mode: 'recent' | 'priority' = 'recent', offset = 0): Promise<ReportsPage> {
    return ApiClient.request<ReportsPage>(`/reports${mode === 'priority' ? '/priority' : ''}?limit=100&offset=${offset}`);
  }

  static loadHealth() { return ApiClient.request<Health>('/health'); }

  static loadStructures() { return ApiClient.request<StructureStats>('/data-structures/stats'); }

  static loadNearby(position: Position, signal?: AbortSignal) {
    return ApiClient.request<ReportsPage>(`/reports/nearby?lat=${position.lat}&lng=${position.lng}&radiusKm=5&limit=200`, { signal });
  }

  static patrolReport(current?: string, direction: 'next' | 'previous' = 'next') {
    return ApiClient.request<{ report: Report | null; size: number }>(`/reports/patrol?direction=${direction}${current ? `&current=${encodeURIComponent(current)}` : ''}`);
  }
}
