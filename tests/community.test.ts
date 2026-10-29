import test from 'node:test';
import assert from 'node:assert/strict';
import { metersBetween, usableGPS } from '../src/services/community.ts';
import type { Position } from '../src/types.ts';

function position(overrides: Partial<Position> = {}): Position {
  return { lat: 4.63, lng: -74.06, accuracy: 12, capturedAt: Date.now(), ...overrides };
}

test('medir la distancia entre dos puntos GPS', () => {
  const origin = position({ lat: 4.63, lng: -74.06, accuracy: 12, capturedAt: 1000 });
  const other = position({ lat: 4.63, lng: -74.05, accuracy: 12, capturedAt: 1000 });
  assert.ok(metersBetween(origin, other) > 800 && metersBetween(origin, other) < 1200);
  assert.equal(metersBetween(origin, origin), 0);
  const north = { ...origin, lat: origin.lat + 0.05 };
  assert.equal(metersBetween(origin, north), metersBetween(north, origin));
});

test('aceptar GPS fresco dentro de la ventana util y rechazar vencido', () => {
  const now = Date.now();
  assert.equal(usableGPS(position(), now), true);
  assert.equal(usableGPS(position({ capturedAt: now - 10_000 }), now), true);
  assert.equal(usableGPS(position({ capturedAt: now - 31_000 }), now), false);
  assert.equal(usableGPS(position({ accuracy: 250 }), now), false);
  assert.equal(usableGPS(position({ lat: Number.NaN }), now), false);
  assert.equal(usableGPS(null, now), false);
});
