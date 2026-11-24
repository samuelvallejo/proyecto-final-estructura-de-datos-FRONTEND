import { ListNode } from './LinkedList.ts';

/** LIFO stack on linked nodes: push, pop and peek are O(1) and never shift an array. */
export class Stack<T> implements Iterable<T> {
  private top: ListNode<T> | null = null;
  private count = 0;

  get size(): number { return this.count; }

  isEmpty(): boolean { return this.count === 0; }

  push(value: T): void {
    const node = new ListNode(value);
    node.next = this.top;
    this.top = node;
    this.count++;
  }

  pop(): T | undefined {
    const node = this.top;
    if (!node) return undefined;
    this.top = node.next;
    this.count--;
    return node.value;
  }

  peek(): T | undefined { return this.top?.value; }

  clear(): void { this.top = null; this.count = 0; }

  /** Walks from the top (most recent) to the bottom. */
  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.top; node; node = node.next) yield node.value;
  }
}
