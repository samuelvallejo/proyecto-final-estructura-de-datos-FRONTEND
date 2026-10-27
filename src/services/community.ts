import type { Position, Report } from '../types';
import { request } from './api';

export const publishCommunityReport = (position: Position, risk: string, description: string, signal: AbortSignal) =>
  request<{ report: Report; existing: boolean; message: string }>('/community/reports', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ position: { lat: position.lat, lng: position.lng, accuracy: position.accuracy },
      capturedAt: position.capturedAt, risk, description }),
  });

export function metersBetween(a: Position, b: Position): number {
  const radians = (value: number) => value * Math.PI / 180;
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function usableGPS(position: Position | null, now = Date.now()): position is Position {
  return Boolean(position && Number.isFinite(position.lat) && Number.isFinite(position.lng)
    && Number.isFinite(position.accuracy) && position.accuracy >= 0 && position.accuracy <= 100
    && position.capturedAt && now - position.capturedAt <= 30000 && now >= position.capturedAt - 5000);
}
