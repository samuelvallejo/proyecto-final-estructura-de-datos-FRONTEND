import test from 'node:test';
import assert from 'node:assert/strict';
import { Formatter } from '../src/services/format.ts';
import { FrameSampler } from '../src/services/frames.ts';

test('avatar initials from the name', () => {
  assert.equal(Formatter.initialsOf('Ana María Pérez'), 'AM');
  assert.equal(Formatter.initialsOf('  samuel  '), 'S');
  assert.equal(Formatter.initialsOf('J. Rodríguez'), 'JR');
  assert.equal(Formatter.initialsOf(''), 'BS');
  assert.equal(Formatter.initialsOf(null), 'BS');
});

test('avatar color is stable for the same person', () => {
  assert.equal(Formatter.avatarColor('Ana María'), Formatter.avatarColor('Ana María'));
  assert.match(Formatter.avatarColor('Otra persona'), /^#[0-9a-f]{6}$/);
});

test('readable duration and distance', () => {
  assert.equal(Formatter.durationText(0), '0 s');
  assert.equal(Formatter.durationText(45_400), '45 s');
  assert.equal(Formatter.durationText(12 * 60_000 + 5_000), '12 min 5 s');
  assert.equal(Formatter.durationText(2 * 3_600_000 + 3 * 60_000), '2 h 03 min');
  assert.equal(Formatter.durationText(-5), '0 s');
  assert.equal(Formatter.distanceText(340.4), '340 m');
  assert.equal(Formatter.distanceText(2450), '2.5 km');
});

test('text for people who passed over a pothole', () => {
  assert.equal(Formatter.peopleText(0), 'Nadie ha pasado todavía');
  assert.equal(Formatter.peopleText(1), '1 persona ha pasado por aquí');
  assert.equal(Formatter.peopleText(7), '7 personas han pasado por aquí');
});

test('frame fingerprint and mean difference', () => {
  const black = FrameSampler.luminance(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]));
  const white = FrameSampler.luminance(new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]));
  assert.deepEqual([...black], [0, 0]);
  assert.equal(FrameSampler.signatureDifference(black, black), 0);
  assert.equal(FrameSampler.signatureDifference(black, white), 255);
  assert.equal(FrameSampler.signatureDifference(null, black), Infinity);
  assert.equal(FrameSampler.signatureDifference(black, new Uint8Array(3)), Infinity);
});

test('skips nearly identical frames without losing the scan', () => {
  assert.equal(FrameSampler.shouldSend(Infinity, 0), true);
  assert.equal(FrameSampler.shouldSend(10, 0), true);
  assert.equal(FrameSampler.shouldSend(1, 0), false);
  assert.equal(FrameSampler.shouldSend(1, 3), true); // After three skips the frame is sent anyway.
});

test('the next analysis discounts the previous latency', () => {
  assert.equal(FrameSampler.nextDelay(450, 300), 150);
  assert.equal(FrameSampler.nextDelay(450, 900), 120);
  assert.equal(FrameSampler.nextDelay(undefined, 0), 1500);
});
