/** Historial LIFO de pantallas visitadas; push/pop O(1) amortizado. */
export class Stack<T> {
  private values: T[] = [];
  push(value: T): void { this.values.push(value); }
  pop(): T | undefined { return this.values.pop(); }
  get size(): number { return this.values.length; }
}
