/**
 * Least-recently-used cache: a hash map for O(1) lookup plus a doubly linked
 * list that keeps entries from most to least recently used.
 *
 * get, set, delete and eviction are O(1): the map finds the node and the list
 * moves or unlinks it without searching. Entries older than ttlMs are treated
 * as missing so cached server answers cannot become stale for long.
 *
 * Design pattern: Iterator. ``for (const [key, value] of cache)`` walks the
 * entries from most to least recently used without exposing the nodes.
 */
class CacheNode<K, V> {
  key: K;
  value: V;
  storedAt: number;
  previous: CacheNode<K, V> | null = null;
  next: CacheNode<K, V> | null = null;
  constructor(key: K, value: V, storedAt: number) { this.key = key; this.value = value; this.storedAt = storedAt; }
}

export class LruCache<K, V> implements Iterable<[K, V]> {
  readonly capacity: number;
  readonly ttlMs: number;
  private readonly nodes = new Map<K, CacheNode<K, V>>();
  private head: CacheNode<K, V> | null = null; // Most recently used.
  private tail: CacheNode<K, V> | null = null; // Least recently used; evicted first.
  private readonly clock: () => number;
  hits = 0;
  misses = 0;
  evictions = 0;

  constructor(capacity: number, ttlMs = Infinity, clock: () => number = Date.now) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Capacity must be a positive integer');
    if (!(ttlMs > 0)) throw new RangeError('TTL must be positive');
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    this.clock = clock;
  }

  get size(): number { return this.nodes.size; }

  /** Value without changing the recency order or the statistics (safe during render). */
  peek(key: K): V | undefined {
    const node = this.nodes.get(key);
    return node && !this.expired(node) ? node.value : undefined;
  }

  has(key: K): boolean { return this.peek(key) !== undefined; }

  /** Value and mark it as most recently used; expired entries are removed. */
  get(key: K): V | undefined {
    const node = this.nodes.get(key);
    if (!node || this.expired(node)) {
      if (node) this.remove(node);
      this.misses++;
      return undefined;
    }
    this.moveToFront(node);
    this.hits++;
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.nodes.get(key);
    if (existing) {
      existing.value = value;
      existing.storedAt = this.clock();
      this.moveToFront(existing);
      return;
    }
    const node = new CacheNode(key, value, this.clock());
    this.nodes.set(key, node);
    this.linkFront(node);
    if (this.nodes.size > this.capacity && this.tail) {
      this.remove(this.tail);
      this.evictions++;
    }
  }

  delete(key: K): boolean {
    const node = this.nodes.get(key);
    if (!node) return false;
    this.remove(node);
    return true;
  }

  clear(): void {
    this.nodes.clear();
    this.head = this.tail = null;
  }

  *[Symbol.iterator](): Iterator<[K, V]> {
    for (let node = this.head; node; node = node.next) yield [node.key, node.value];
  }

  /** Keys from most to least recently used (expired ones included until touched). */
  keys(): K[] { return [...this].map(([key]) => key); }

  /** Links in both directions agree with the map; used by the tests. */
  validate(): boolean {
    let count = 0;
    let previous: CacheNode<K, V> | null = null;
    for (let node = this.head; node; node = node.next) {
      if (node.previous !== previous || this.nodes.get(node.key) !== node) return false;
      previous = node;
      count++;
    }
    return previous === this.tail && count === this.nodes.size && count <= this.capacity;
  }

  private expired(node: CacheNode<K, V>): boolean { return this.clock() - node.storedAt > this.ttlMs; }

  private linkFront(node: CacheNode<K, V>): void {
    node.previous = null;
    node.next = this.head;
    if (this.head) this.head.previous = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private unlink(node: CacheNode<K, V>): void {
    if (node.previous) node.previous.next = node.next; else this.head = node.next;
    if (node.next) node.next.previous = node.previous; else this.tail = node.previous;
    node.previous = node.next = null;
  }

  private moveToFront(node: CacheNode<K, V>): void {
    if (this.head === node) return;
    this.unlink(node);
    this.linkFront(node);
  }

  private remove(node: CacheNode<K, V>): void {
    this.unlink(node);
    this.nodes.delete(node.key);
  }
}
