import test from 'node:test';
import assert from 'node:assert/strict';
import { LruCache } from '../src/data-structures/LruCache.ts';

test('the least recently used entry is evicted first', () => {
  const cache = new LruCache<string, number>(3);
  cache.set('a', 1); cache.set('b', 2); cache.set('c', 3);
  assert.equal(cache.get('a'), 1); // a becomes the most recent.
  cache.set('d', 4); // b is now the least recent.
  assert.deepEqual(cache.keys(), ['d', 'a', 'c']);
  assert.equal(cache.peek('b'), undefined);
  assert.equal(cache.evictions, 1);
  assert.ok(cache.validate());
});

test('peek does not change order or statistics; get counts hits and misses', () => {
  const cache = new LruCache<string, string>(2);
  cache.set('x', 'uno'); cache.set('y', 'dos');
  assert.equal(cache.peek('x'), 'uno');
  assert.deepEqual(cache.keys(), ['y', 'x']);
  assert.equal(cache.hits + cache.misses, 0);
  assert.equal(cache.get('x'), 'uno');
  assert.equal(cache.get('missing'), undefined);
  assert.deepEqual([cache.hits, cache.misses], [1, 1]);
});

test('updating a key keeps one entry and moves it to the front', () => {
  const cache = new LruCache<string, number>(2);
  cache.set('a', 1); cache.set('b', 2); cache.set('a', 10);
  assert.equal(cache.size, 2);
  assert.deepEqual(cache.keys(), ['a', 'b']);
  assert.equal(cache.peek('a'), 10);
});

test('entries expire after the time to live', () => {
  let now = 1000;
  const cache = new LruCache<string, number>(5, 500, () => now);
  cache.set('a', 1);
  now = 1400;
  assert.equal(cache.has('a'), true);
  now = 1600;
  assert.equal(cache.has('a'), false);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.size, 0);
  assert.ok(cache.validate());
});

test('delete, clear and invalid capacities', () => {
  const cache = new LruCache<number, number>(3);
  cache.set(1, 1); cache.set(2, 2); cache.set(3, 3);
  assert.equal(cache.delete(2), true);
  assert.equal(cache.delete(2), false);
  assert.deepEqual(cache.keys(), [3, 1]);
  assert.ok(cache.validate());
  cache.clear();
  assert.equal(cache.size, 0);
  assert.deepEqual(cache.keys(), []);
  assert.throws(() => new LruCache(0));
  assert.throws(() => new LruCache(2, 0));
});

test('random operations agree with a reference model', () => {
  const capacity = 8;
  const cache = new LruCache<number, number>(capacity);
  let model: number[] = []; // Keys from most to least recent.
  const values = new Map<number, number>();
  let seed = 42;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let step = 0; step < 2000; step++) {
    const key = Math.floor(random() * 20);
    if (random() < 0.5) {
      const value = step;
      cache.set(key, value);
      values.set(key, value);
      model = [key, ...model.filter(item => item !== key)];
      if (model.length > capacity) values.delete(model.pop()!);
    } else {
      const expected = model.includes(key) ? values.get(key) : undefined;
      assert.equal(cache.get(key), expected);
      if (expected !== undefined) model = [key, ...model.filter(item => item !== key)];
    }
    assert.deepEqual(cache.keys(), model);
  }
  assert.ok(cache.validate());
});
