import test from 'node:test';
import assert from 'node:assert/strict';
import { LinkedList } from '../src/data-structures/LinkedList.ts';
import { Queue } from '../src/data-structures/Queue.ts';
import { Stack } from '../src/data-structures/Stack.ts';
import { HashMap } from '../src/data-structures/HashMap.ts';
import { HashSet } from '../src/data-structures/HashSet.ts';
import { Sorter } from '../src/data-structures/Sorter.ts';

test('linked list appends, prepends, shifts and removes by predicate', () => {
  const list = LinkedList.from([2, 3]);
  list.prepend(1); list.append(4);
  assert.deepEqual(list.toArray(), [1, 2, 3, 4]);
  assert.equal(list.shift(), 1);
  assert.equal(list.removeFirst(value => value === 4), 4);
  list.append(5);
  assert.deepEqual([...list], [2, 3, 5]);
  assert.equal(list.last(), 5);
  list.replaceLast(6);
  assert.deepEqual(list.map(value => value * 10).toArray(), [20, 30, 60]);
  assert.equal(list.size, 3);
});

test('stack peeks and iterates from top to bottom', () => {
  const stack = new Stack<string>();
  for (const value of ['a', 'b', 'c']) stack.push(value);
  assert.equal(stack.peek(), 'c');
  assert.deepEqual([...stack], ['c', 'b', 'a']);
  stack.clear();
  assert.equal(stack.isEmpty(), true);
});

test('queue serves values in FIFO order', () => {
  const queue = new Queue<number>();
  assert.equal(queue.dequeue(), undefined);
  for (const value of [1, 2, 3]) queue.enqueue(value);
  assert.equal(queue.peek(), 1);
  assert.deepEqual([queue.dequeue(), queue.dequeue()], [1, 2]);
  queue.enqueue(4);
  assert.deepEqual([...queue], [3, 4]);
  assert.equal(queue.size, 2);
});

test('hash map keeps every key through resizes and tells numbers from strings', () => {
  const map = new HashMap<string | number, number>(2);
  for (let index = 0; index < 500; index++) map.set(`key-${index}`, index);
  map.set(7, 70); map.set('7', 700);
  assert.equal(map.size, 502);
  assert.equal(map.get('key-321'), 321);
  assert.equal(map.get(7), 70);
  assert.equal(map.get('7'), 700);
  map.set('key-1', -1);
  assert.equal(map.get('key-1'), -1);
  assert.equal(map.size, 502);
  assert.equal(map.delete('key-1'), true);
  assert.equal(map.delete('key-1'), false);
  assert.equal(map.has('key-1'), false);
  assert.equal([...map.keys()].length, 501);
  const missing: string[] = [];
  assert.equal(map.get(missing[0]), undefined);
  assert.equal(map.has(missing[0]), false);
});

test('hash set stores unique values', () => {
  const set = HashSet.from(['a', 'b', 'a']);
  assert.equal(set.size, 2);
  assert.equal(set.has('a'), true);
  set.delete('a');
  assert.deepEqual([...set], ['b']);
});

test('merge sort is stable and does not mutate its input', () => {
  const input = [{ key: 2, tag: 'a' }, { key: 1, tag: 'b' }, { key: 2, tag: 'c' }, { key: 0, tag: 'd' }];
  const sorted = Sorter.mergeSort(input, (a, b) => a.key - b.key).toArray();
  assert.deepEqual(sorted.map(item => item.tag), ['d', 'b', 'a', 'c']);
  assert.deepEqual(input.map(item => item.tag), ['a', 'b', 'c', 'd']);
  assert.equal(Sorter.min([5, 3, 9], (a, b) => a - b), 3);
  assert.equal(Sorter.min([], (a: number, b: number) => a - b), undefined);
});
