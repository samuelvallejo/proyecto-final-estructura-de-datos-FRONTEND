import { LinkedList } from './LinkedList.ts';

export type HashKey = string | number;

class Entry<K, V> {
  key: K;
  value: V;
  constructor(key: K, value: V) { this.key = key; this.value = value; }
}

/**
 * Hash table with separate chaining: a fixed array of buckets, each bucket a linked list of entries.
 * The table doubles its buckets when the load factor passes 0.75, so lookups stay O(1) on average.
 */
export class HashMap<K extends HashKey, V> implements Iterable<[K, V]> {
  private buckets: (LinkedList<Entry<K, V>> | null)[];
  private count = 0;

  constructor(capacity = 16) {
    this.buckets = new Array<LinkedList<Entry<K, V>> | null>(Math.max(1, capacity)).fill(null);
  }

  static from<K extends HashKey, V>(entries: Iterable<readonly [K, V]>): HashMap<K, V> {
    const map = new HashMap<K, V>();
    for (const [key, value] of entries) map.set(key, value);
    return map;
  }

  /**
   * FNV-1a over the key text; numbers and strings with the same text share a bucket but not an entry.
   * A missing key (e.g. `get(list[outOfRange])`) hashes like any other value and simply finds nothing, as with `Map`.
   */
  static hash(key: HashKey | null | undefined): number {
    const text = typeof key === 'number' ? `#${key}` : String(key);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
  }

  get size(): number { return this.count; }

  private bucketOf(key: K): LinkedList<Entry<K, V>> | null {
    return this.buckets[HashMap.hash(key) % this.buckets.length];
  }

  private entry(key: K): Entry<K, V> | undefined {
    return this.bucketOf(key)?.find(item => item.key === key);
  }

  get(key: K): V | undefined { return this.entry(key)?.value; }

  has(key: K): boolean { return this.entry(key) !== undefined; }

  set(key: K, value: V): this {
    const existing = this.entry(key);
    if (existing) { existing.value = value; return this; }
    if ((this.count + 1) / this.buckets.length > .75) this.resize(this.buckets.length * 2);
    const index = HashMap.hash(key) % this.buckets.length;
    (this.buckets[index] ??= new LinkedList<Entry<K, V>>()).append(new Entry(key, value));
    this.count++;
    return this;
  }

  delete(key: K): boolean {
    const removed = this.bucketOf(key)?.removeFirst(item => item.key === key);
    if (!removed) return false;
    this.count--;
    return true;
  }

  clear(): void {
    this.buckets = new Array<LinkedList<Entry<K, V>> | null>(this.buckets.length).fill(null);
    this.count = 0;
  }

  private resize(capacity: number): void {
    const previous = this.buckets;
    this.buckets = new Array<LinkedList<Entry<K, V>> | null>(capacity).fill(null);
    for (const bucket of previous) {
      if (!bucket) continue;
      for (const item of bucket) (this.buckets[HashMap.hash(item.key) % capacity] ??= new LinkedList()).append(item);
    }
  }

  *entries(): Generator<[K, V]> {
    for (const bucket of this.buckets) {
      if (!bucket) continue;
      for (const item of bucket) yield [item.key, item.value];
    }
  }

  *keys(): Generator<K> { for (const [key] of this.entries()) yield key; }

  *values(): Generator<V> { for (const [, value] of this.entries()) yield value; }

  [Symbol.iterator](): Iterator<[K, V]> { return this.entries(); }
}
