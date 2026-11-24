import { LinkedList } from './LinkedList.ts';

/** FIFO queue on a linked list: enqueue at the tail and dequeue at the head, both O(1). */
export class Queue<T> implements Iterable<T> {
  private items = new LinkedList<T>();

  get size(): number { return this.items.size; }

  isEmpty(): boolean { return this.items.isEmpty(); }

  enqueue(value: T): void { this.items.append(value); }

  dequeue(): T | undefined { return this.items.shift(); }

  /** Oldest value, the next one to leave. */
  peek(): T | undefined { return this.items.first(); }

  clear(): void { this.items.clear(); }

  [Symbol.iterator](): Iterator<T> { return this.items[Symbol.iterator](); }
}
