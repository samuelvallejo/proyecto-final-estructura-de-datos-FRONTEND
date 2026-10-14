import { request } from './api';
import type { Position, Trip } from '../types';
const jsonPost = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const coordinates = ({ lat, lng, accuracy }: Position) => ({ lat, lng, accuracy });
export const loadTrips = () => request<{ trips: Trip[] }>('/trips');
export const loadTrip = (id: string) => request<Trip>(`/trips/${encodeURIComponent(id)}`);
export const createTrip = (name: string, pointA: string, pointB: string, position: Position) => request<Trip>('/trips', jsonPost({ name, pointA, pointB, position: coordinates(position) }));
export const addTripSample = (id: string, position: Position) => request(`/trips/${encodeURIComponent(id)}/samples`, jsonPost({ position: coordinates(position) }));
export const finishTrip = (id: string, position: Position | null) => request<Trip>(`/trips/${encodeURIComponent(id)}/finish`, jsonPost({ position: position && coordinates(position) }));
