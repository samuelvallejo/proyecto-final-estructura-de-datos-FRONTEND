import test from 'node:test';
import assert from 'node:assert/strict';
import { GpsTools } from '../src/services/community.ts';
import type { Position } from '../src/types.ts';

function position(overrides: Partial<Position> = {}): Position {
  return { lat: 4.63, lng: -74.06, accuracy: 12, capturedAt: Date.now(), ...overrides };
}

test('measures the distance between two GPS points', () => {
  const origin = position({ lat: 4.63, lng: -74.06, accuracy: 12, capturedAt: 1000 });
  const other = position({ lat: 4.63, lng: -74.05, accuracy: 12, capturedAt: 1000 });
  assert.ok(GpsTools.metersBetween(origin, other) > 800 && GpsTools.metersBetween(origin, other) < 1200);
  assert.equal(GpsTools.metersBetween(origin, origin), 0);
  const north = { ...origin, lat: origin.lat + 0.05 };
  assert.equal(GpsTools.metersBetween(origin, north), GpsTools.metersBetween(north, origin));
});

test('accepts a fresh GPS fix inside the useful window and rejects a stale one', () => {
  const now = Date.now();
  assert.equal(GpsTools.usableGPS(position(), now), true);
  assert.equal(GpsTools.usableGPS(position({ capturedAt: now - 10_000 }), now), true);
  assert.equal(GpsTools.usableGPS(position({ capturedAt: now - 31_000 }), now), false);
  assert.equal(GpsTools.usableGPS(position({ accuracy: 250 }), now), false);
  assert.equal(GpsTools.usableGPS(position({ lat: Number.NaN }), now), false);
  assert.equal(GpsTools.usableGPS(null, now), false);
});
