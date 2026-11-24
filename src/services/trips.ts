import { ApiClient } from './api';
import type { Position, Trip } from '../types';

/** Trips from point A to point B with their GPS samples and linked potholes. */
export class TripApi {
  static loadTrips() { return ApiClient.request<{ trips: Trip[] }>('/trips'); }

  static loadTrip(id: string) { return ApiClient.request<Trip>(`/trips/${encodeURIComponent(id)}`); }

  static createTrip(name: string, pointA: string, pointB: string, position: Position) {
    return ApiClient.request<Trip>('/trips', ApiClient.jsonPost({ name, pointA, pointB, position: ApiClient.coordinates(position) }));
  }

  static addTripSample(id: string, position: Position) {
    return ApiClient.request(`/trips/${encodeURIComponent(id)}/samples`, ApiClient.jsonPost({ position: ApiClient.coordinates(position) }));
  }

  static finishTrip(id: string, position: Position | null) {
    return ApiClient.request<Trip>(`/trips/${encodeURIComponent(id)}/finish`, ApiClient.jsonPost({ position: position && ApiClient.coordinates(position) }));
  }
}
