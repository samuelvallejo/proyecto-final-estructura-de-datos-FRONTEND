import test from 'node:test';
import assert from 'node:assert/strict';
import { KdTree } from '../src/data-structures/KdTree.ts';
import { GpsTools } from '../src/services/community.ts';

let seed = 11;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const cityPoint = () => ({ lat: 1.20 + random() * 0.05, lng: -77.31 + random() * 0.05 });
const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => GpsTools.metersBetween({ ...a, accuracy: 0 }, { ...b, accuracy: 0 });

test('empty tree and radius limits', () => {
  const empty = new KdTree<string>([]);
  assert.equal(empty.nearest({ lat: 1.2, lng: -77.29 }), null);
  assert.equal(empty.height, -1);
  const tree = new KdTree([{ point: { lat: 1.2, lng: -77.29 }, value: 'a' }]);
  assert.equal(tree.nearest({ lat: 1.2009, lng: -77.29 }, 80), null); // About 100 m away.
  assert.equal(tree.nearest({ lat: 1.2005, lng: -77.29 }, 80)?.value, 'a');
});

test('nearest matches a linear scan and visits far fewer nodes', () => {
  const items = Array.from({ length: 2000 }, (_, index) => ({ point: cityPoint(), value: index }));
  const tree = new KdTree(items);
  assert.ok(tree.height <= 11); // Balanced: about log2(2000).
  let visited = 0;
  for (let query = 0; query < 200; query++) {
    const point = cityPoint();
    const expected = items.reduce((best, item) => meters(point, item.point) < meters(point, best.point) ? item : best);
    const hit = tree.nearest(point)!;
    assert.equal(hit.value, expected.value);
    assert.ok(Math.abs(hit.meters - meters(point, expected.point)) < 0.01 * Math.max(1, hit.meters));
    visited += tree.lastVisited;
  }
  assert.ok(visited / 200 < 100, `average visited ${visited / 200}`);
});

test('accept skips dismissed or repaired items', () => {
  const tree = new KdTree([
    { point: { lat: 1.2, lng: -77.29 }, value: 'repaired' },
    { point: { lat: 1.2003, lng: -77.29 }, value: 'active' },
  ]);
  assert.equal(tree.nearest({ lat: 1.2, lng: -77.29 }, 200, value => value !== 'repaired')?.value, 'active');
});

test('within returns every point in the radius, closest first', () => {
  const items = Array.from({ length: 500 }, (_, index) => ({ point: cityPoint(), value: index }));
  const tree = new KdTree(items);
  const center = { lat: 1.225, lng: -77.285 };
  const hits = tree.within(center, 600);
  const expected = items.filter(item => meters(center, item.point) <= 600 * 0.995).map(item => item.value);
  for (const value of expected) assert.ok(hits.some(hit => hit.value === value));
  assert.ok(hits.every((hit, index) => index === 0 || hits[index - 1].meters <= hit.meters));
});

test('hazard index ignores repaired potholes and the merge keeps unknown reports only', async () => {
  const { HazardIndex } = await import('../src/services/hazardIndex.ts');
  type R = import('../src/types.ts').Report;
  const report = (id: string, lat: number, status = 'UNVERIFIED') => ({ id, status, location: { lat, lng: -77.29, accuracy: 5 } } as R);
  const index = HazardIndex.build([report('fixed', 1.2, 'REPAIRED'), report('open', 1.2004)]);
  assert.equal(index.size, 1);
  assert.equal(index.nearest({ lat: 1.2, lng: -77.29 }, 80)?.value.id, 'open');
  assert.deepEqual(HazardIndex.missingFrom([report('a', 1), report('b', 1)], [report('b', 1), report('c', 1)]).map(item => item.id), ['c']);
});
