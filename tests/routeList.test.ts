import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteList } from '../src/data-structures/RouteList.ts';
import type { RoutePoint } from '../src/data-structures/RouteList.ts';

// Points on a line: distance is the difference in "lng", easy to check by hand.
const line = (a: RoutePoint, b: RoutePoint) => Math.abs(a.lng - b.lng);
const stop = (id: string, x: number) => ({ id, value: id.toUpperCase(), point: { lat: 0, lng: x } });

test('builds the route and its remaining distance from the start point', () => {
  const route = new RouteList({ lat: 0, lng: 0 }, [stop('a', 1), stop('b', 3), stop('c', 6)], line);
  assert.equal(route.size, 3);
  assert.equal(route.remainingMeters, 6);
  assert.equal(route.current, 'A');
  assert.deepEqual(route.toArray().map(entry => [entry.id, entry.legMeters]), [['a', 1], ['b', 2], ['c', 3]]);
  assert.ok(route.validate());
});

test('visiting a stop in the middle joins its neighbours in O(1)', () => {
  const route = new RouteList({ lat: 0, lng: 0 }, [stop('a', 1), stop('b', 5), stop('c', 2)], line);
  assert.equal(route.remainingMeters, 1 + 4 + 3);
  assert.equal(route.complete('b'), true);
  assert.equal(route.remainingMeters, 1 + 1);
  assert.deepEqual(route.toArray().map(entry => entry.id), ['a', 'c']);
  assert.equal(route.visited, 1);
  assert.equal(route.complete('b'), false);
  assert.ok(route.validate());
});

test('visiting the first and the last stops', () => {
  const route = new RouteList({ lat: 0, lng: 0 }, [stop('a', 2), stop('b', 4), stop('c', 7)], line);
  route.complete('a');
  assert.equal(route.current, 'B');
  assert.equal(route.remainingMeters, 4 + 3);
  route.complete('c');
  assert.equal(route.remainingMeters, 4);
  route.complete('b');
  assert.equal(route.size, 0);
  assert.equal(route.current, null);
  assert.equal(route.remainingMeters, 0);
  assert.ok(route.validate());
});

test('postponing moves a stop to the end and updates the distance', () => {
  const route = new RouteList({ lat: 0, lng: 0 }, [stop('a', 1), stop('b', 2), stop('c', 3)], line);
  assert.equal(route.postpone('a'), true);
  assert.deepEqual(route.toArray().map(entry => [entry.id, entry.legMeters]), [['b', 2], ['c', 1], ['a', 2]]);
  assert.equal(route.remainingMeters, 5);
  assert.equal(route.isLast('a'), true);
  assert.equal(route.postpone('a'), false); // Already the last stop.
  assert.ok(route.validate());
});

test('without a start point the first stop has no incoming leg', () => {
  const route = new RouteList(null, [stop('a', 10), stop('b', 4)], line);
  assert.equal(route.remainingMeters, 6);
  assert.equal(route.toArray()[0].legMeters, null);
  route.complete('a');
  assert.equal(route.remainingMeters, 0);
  assert.equal(route.toArray()[0].legMeters, null);
  assert.ok(route.validate());
});

test('random visits and postponements keep links and distance consistent', () => {
  let seed = 7;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const items = Array.from({ length: 40 }, (_, index) => stop(`s${index}`, Math.round(random() * 1000)));
  const route = new RouteList({ lat: 0, lng: 500 }, items, line);
  let order = items.map(item => item.id);
  while (order.length) {
    const id = order[Math.floor(random() * order.length)];
    if (random() < 0.4 && order[order.length - 1] !== id) {
      route.postpone(id);
      order = [...order.filter(item => item !== id), id];
    } else {
      route.complete(id);
      order = order.filter(item => item !== id);
    }
    assert.deepEqual(route.toArray().map(entry => entry.id), order);
    assert.ok(route.validate());
  }
  assert.equal(route.visited, 40);
});
