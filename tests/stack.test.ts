import test from 'node:test';
import assert from 'node:assert/strict';
import { Stack } from '../src/data-structures/Stack.ts';

test('stack starts empty', () => {
  const stack = new Stack<number>();
  assert.equal(stack.size, 0);
  assert.equal(stack.pop(), undefined);
});

test('push and pop in LIFO order', () => {
  const stack = new Stack<string>();
  stack.push('inicio');
  stack.push('escaneo');
  assert.equal(stack.size, 2);
  assert.equal(stack.pop(), 'escaneo');
  assert.equal(stack.pop(), 'inicio');
  assert.equal(stack.size, 0);
});

test('stack keeps the reverse insertion order', () => {
  const stack = new Stack<number>();
  for (const value of [1, 2, 3]) stack.push(value);
  assert.deepEqual([stack.pop(), stack.pop(), stack.pop()], [3, 2, 1]);
});
