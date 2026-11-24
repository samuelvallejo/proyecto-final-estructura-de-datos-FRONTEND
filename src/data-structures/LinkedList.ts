/** Singly linked list built from explicit nodes; the base of the other hand-written structures. */
export class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;
  constructor(value: T) { this.value = value; }
}

export class LinkedList<T> implements Iterable<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private count = 0;

  static from<T>(values: Iterable<T>): LinkedList<T> {
    const list = new LinkedList<T>();
    for (const value of values) list.append(value);
    return list;
  }

  get size(): number { return this.count; }

  isEmpty(): boolean { return this.count === 0; }

  /** Adds at the end in O(1) thanks to the tail pointer. */
  append(value: T): void {
    const node = new ListNode(value);
    if (this.tail) this.tail.next = node; else this.head = node;
    this.tail = node;
    this.count++;
  }

  /** Adds at the beginning in O(1). */
  prepend(value: T): void {
    const node = new ListNode(value);
    node.next = this.head;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.count++;
  }

  /** Removes and returns the first value in O(1). */
  shift(): T | undefined {
    const node = this.head;
    if (!node) return undefined;
    this.head = node.next;
    if (!this.head) this.tail = null;
    this.count--;
    return node.value;
  }

  first(): T | undefined { return this.head?.value; }

  last(): T | undefined { return this.tail?.value; }

  /** Replaces the value stored in the last node. */
  replaceLast(value: T): void {
    if (!this.tail) throw new Error('Empty list');
    this.tail.value = value;
  }

  /** First value that matches the predicate, walking node by node. */
  find(predicate: (value: T) => boolean): T | undefined {
    for (let node = this.head; node; node = node.next) if (predicate(node.value)) return node.value;
    return undefined;
  }

  some(predicate: (value: T) => boolean): boolean {
    for (let node = this.head; node; node = node.next) if (predicate(node.value)) return true;
    return false;
  }

  every(predicate: (value: T) => boolean): boolean {
    for (let node = this.head; node; node = node.next) if (!predicate(node.value)) return false;
    return true;
  }

  /** Unlinks the first node whose value matches; returns that value. */
  removeFirst(predicate: (value: T) => boolean): T | undefined {
    let previous: ListNode<T> | null = null;
    for (let node = this.head; node; previous = node, node = node.next) {
      if (!predicate(node.value)) continue;
      if (previous) previous.next = node.next; else this.head = node.next;
      if (node === this.tail) this.tail = previous;
      this.count--;
      return node.value;
    }
    return undefined;
  }

  map<U>(transform: (value: T) => U): LinkedList<U> {
    const result = new LinkedList<U>();
    for (let node = this.head; node; node = node.next) result.append(transform(node.value));
    return result;
  }

  filter(predicate: (value: T) => boolean): LinkedList<T> {
    const result = new LinkedList<T>();
    for (let node = this.head; node; node = node.next) if (predicate(node.value)) result.append(node.value);
    return result;
  }

  /** Copies the values into a plain array, e.g. for React rendering or JSON. */
  toArray(): T[] {
    const result: T[] = [];
    for (let node = this.head; node; node = node.next) result.push(node.value);
    return result;
  }

  clear(): void { this.head = this.tail = null; this.count = 0; }

  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.head; node; node = node.next) yield node.value;
  }
}
