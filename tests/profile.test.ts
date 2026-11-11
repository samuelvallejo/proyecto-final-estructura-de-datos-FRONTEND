import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarColor, distanceText, durationText, initialsOf, peopleText } from '../src/services/format.ts';
import { luminance, nextDelay, shouldSend, signatureDifference } from '../src/services/frames.ts';

test('iniciales del avatar a partir del nombre', () => {
  assert.equal(initialsOf('Ana María Pérez'), 'AM');
  assert.equal(initialsOf('  samuel  '), 'S');
  assert.equal(initialsOf('J. Rodríguez'), 'JR');
  assert.equal(initialsOf(''), 'BS');
  assert.equal(initialsOf(null), 'BS');
});

test('el color del avatar es estable para la misma persona', () => {
  assert.equal(avatarColor('Ana María'), avatarColor('Ana María'));
  assert.match(avatarColor('Otra persona'), /^#[0-9a-f]{6}$/);
});

test('duración y distancia legibles', () => {
  assert.equal(durationText(0), '0 s');
  assert.equal(durationText(45_400), '45 s');
  assert.equal(durationText(12 * 60_000 + 5_000), '12 min 5 s');
  assert.equal(durationText(2 * 3_600_000 + 3 * 60_000), '2 h 03 min');
  assert.equal(durationText(-5), '0 s');
  assert.equal(distanceText(340.4), '340 m');
  assert.equal(distanceText(2450), '2.5 km');
});

test('texto de personas que han pasado por un hueco', () => {
  assert.equal(peopleText(0), 'Nadie ha pasado todavía');
  assert.equal(peopleText(1), '1 persona ha pasado por aquí');
  assert.equal(peopleText(7), '7 personas han pasado por aquí');
});

test('huella de fotograma y diferencia media', () => {
  const black = luminance(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]));
  const white = luminance(new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]));
  assert.deepEqual([...black], [0, 0]);
  assert.equal(signatureDifference(black, black), 0);
  assert.equal(signatureDifference(black, white), 255);
  assert.equal(signatureDifference(null, black), Infinity);
  assert.equal(signatureDifference(black, new Uint8Array(3)), Infinity);
});

test('omitir fotogramas casi idénticos sin perder el escaneo', () => {
  assert.equal(shouldSend(Infinity, 0), true);
  assert.equal(shouldSend(10, 0), true);
  assert.equal(shouldSend(1, 0), false);
  assert.equal(shouldSend(1, 3), true); // Tras tres omisiones se envía de todos modos.
});

test('el siguiente análisis descuenta la latencia anterior', () => {
  assert.equal(nextDelay(450, 300), 150);
  assert.equal(nextDelay(450, 900), 120);
  assert.equal(nextDelay(undefined, 0), 1500);
});
