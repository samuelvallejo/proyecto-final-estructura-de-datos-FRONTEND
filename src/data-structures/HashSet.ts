import { HashMap } from './HashMap.ts';
import type { HashKey } from './HashMap.ts';

/** Set of unique keys stored in the hand-written HashMap (value ignored). */
export class HashSet<T extends HashKey> implements Iterable<T> {
  private map = new HashMap<T, true>();

  static from<T extends HashKey>(values: Iterable<T>): HashSet<T> {
    const set = new HashSet<T>();
    for (const value of values) set.add(value);
    return set;
  }

  get size(): number { return this.map.size; }

  add(value: T): this { this.map.set(value, true); return this; }

  has(value: T): boolean { return this.map.has(value); }

  delete(value: T): boolean { return this.map.delete(value); }

  [Symbol.iterator](): Iterator<T> { return this.map.keys(); }
}
