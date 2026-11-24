/**
 * Pending stops of a day route as a doubly linked list.
 *
 * In the field the operator marks stops as visited or leaves one for the end.
 * Each node knows its previous and next stop, and a hash map finds a node by
 * id, so both actions are O(1): unlink the node and fix the neighbours' links.
 * The remaining distance is also updated in O(1): only the legs around the node
 * change (prev -> node -> next becomes prev -> next), so nothing is recomputed
 * from the beginning of the route.
 */
export interface RoutePoint { lat: number; lng: number }
export type DistanceFn = (a: RoutePoint, b: RoutePoint) => number;
export interface RouteItem<T> { id: string; value: T; point: RoutePoint }
export interface RouteEntry<T> { id: string; value: T; legMeters: number | null }

class StopNode<T> {
  readonly id: string;
  readonly value: T;
  readonly point: RoutePoint;
  previous: StopNode<T> | null = null;
  next: StopNode<T> | null = null;
  constructor(item: RouteItem<T>) { this.id = item.id; this.value = item.value; this.point = item.point; }
}

export class RouteList<T> {
  private head: StopNode<T> | null = null;
  private tail: StopNode<T> | null = null;
  private readonly nodes = new Map<string, StopNode<T>>();
  private remaining = 0;
  private readonly start: RoutePoint | null;
  private readonly distance: DistanceFn;
  visited = 0;

  constructor(start: RoutePoint | null, items: RouteItem<T>[], distance: DistanceFn) {
    this.start = start;
    this.distance = distance;
    for (const item of items) this.append(new StopNode(item));
  }

  get size(): number { return this.nodes.size; }
  /** Distance still to travel along the pending stops, in meters. */
  get remainingMeters(): number { return this.remaining; }
  /** Next stop to visit. */
  get current(): T | null { return this.head?.value ?? null; }
  isLast(id: string): boolean { return this.tail?.id === id; }
  has(id: string): boolean { return this.nodes.has(id); }

  /** Stop visited: it leaves the pending route. */
  complete(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.unlink(node);
    this.nodes.delete(id);
    this.visited++;
    return true;
  }

  /** Leave a stop for the end of the route. */
  postpone(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node || node === this.tail) return false;
    this.unlink(node);
    this.append(node);
    return true;
  }

  /** Pending stops in order, each with the distance from the previous stop (or the start). */
  toArray(): RouteEntry<T>[] {
    const result: RouteEntry<T>[] = [];
    for (let node = this.head; node; node = node.next) {
      const from = this.pointBefore(node);
      result.push({ id: node.id, value: node.value, legMeters: from ? this.distance(from, node.point) : null });
    }
    return result;
  }

  /** Links in both directions, the map and the cached distance agree; used by the tests. */
  validate(): boolean {
    let previous: StopNode<T> | null = null;
    let count = 0;
    let meters = 0;
    for (let node = this.head; node; node = node.next) {
      if (node.previous !== previous || this.nodes.get(node.id) !== node) return false;
      const from = this.pointBefore(node);
      if (from) meters += this.distance(from, node.point);
      previous = node;
      count++;
    }
    return previous === this.tail && count === this.nodes.size && Math.abs(meters - this.remaining) <= 1e-6 * Math.max(1, meters);
  }

  private pointBefore(node: StopNode<T>): RoutePoint | null {
    return node.previous?.point ?? this.start;
  }

  private append(node: StopNode<T>): void {
    node.previous = this.tail;
    node.next = null;
    const from = this.tail?.point ?? this.start;
    if (from) this.remaining += this.distance(from, node.point);
    if (this.tail) this.tail.next = node; else this.head = node;
    this.tail = node;
    this.nodes.set(node.id, node);
  }

  private unlink(node: StopNode<T>): void {
    const before = this.pointBefore(node);
    const after = node.next;
    // Only the legs touching this node change.
    if (before) this.remaining -= this.distance(before, node.point);
    if (after) this.remaining -= this.distance(node.point, after.point);
    if (before && after) this.remaining += this.distance(before, after.point);
    if (node.previous) node.previous.next = node.next; else this.head = node.next;
    if (node.next) node.next.previous = node.previous; else this.tail = node.previous;
    node.previous = node.next = null;
    if (!this.head) this.remaining = 0; // Avoid floating point leftovers on an empty route.
  }
}
