/**
 * Pending stops of a day route as a doubly linked list.
 *
 * In the field the operator marks stops as visited or leaves one for the end.
 * Each node knows its previous and next stop, and a hash map finds a node by
 * id, so both actions are O(1): unlink the node and fix the neighbours' links.
 * The remaining distance is also updated in O(1): only the legs around the node
 * change (prev -> node -> next becomes prev -> next), so nothing is recomputed
 * from the beginning of the route.
 *
 * Design patterns: Observer (extends Observable and notifies after each change)
 * and Iterator (``for (const entry of route)`` walks the pending stops in order).
 */
import { Observable } from '../patterns/Observable.ts';

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

export class RouteList<T> extends Observable implements Iterable<RouteEntry<T>> {
  private head: StopNode<T> | null = null;
  private tail: StopNode<T> | null = null;
  private readonly nodes = new Map<string, StopNode<T>>();
  private remaining = 0;
  private readonly start: RoutePoint | null;
  private readonly distance: DistanceFn;
  private visitedCount = 0;

  constructor(start: RoutePoint | null, items: RouteItem<T>[], distance: DistanceFn) {
    super();
    this.start = start;
    this.distance = distance;
    for (const item of items) this.append(new StopNode(item));
  }

  get size(): number { return this.nodes.size; }
  /** Distance still to travel along the pending stops, in meters. */
  get remainingMeters(): number { return this.remaining; }
  get visited(): number { return this.visitedCount; }
  /** Next stop to visit. */
  get current(): T | null { return this.head?.value ?? null; }
  isLast(id: string): boolean { return this.tail?.id === id; }
  has(id: string): boolean { return this.nodes.has(id); }
  /** Id of the stop before ``id`` (null when it is the first one or unknown). */
  previousIdOf(id: string): string | null { return this.nodes.get(id)?.previous?.id ?? null; }

  /** Stop visited: it leaves the pending route. */
  complete(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.unlink(node);
    this.nodes.delete(id);
    this.visitedCount++;
    this.notify();
    return true;
  }

  /** Reverse of complete: put a visited stop back after ``afterId`` (null = first). O(1). */
  restore(item: RouteItem<T>, afterId: string | null): boolean {
    if (this.nodes.has(item.id) || (afterId !== null && !this.nodes.has(afterId))) return false;
    this.insertAfter(new StopNode(item), afterId === null ? null : this.nodes.get(afterId)!);
    this.visitedCount = Math.max(0, this.visitedCount - 1);
    this.notify();
    return true;
  }

  /** Leave a stop for the end of the route. */
  postpone(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node || node === this.tail) return false;
    this.unlink(node);
    this.append(node);
    this.notify();
    return true;
  }

  /** Move a stop right after ``afterId`` (null = first); used to undo a postponement. O(1). */
  moveAfter(id: string, afterId: string | null): boolean {
    const node = this.nodes.get(id);
    const anchor = afterId === null ? null : this.nodes.get(afterId);
    if (!node || anchor === undefined || anchor === node) return false;
    this.unlink(node);
    this.insertAfter(node, anchor);
    this.notify();
    return true;
  }

  /** Item data of a pending stop, to remember it before it is removed. */
  itemOf(id: string): RouteItem<T> | null {
    const node = this.nodes.get(id);
    return node ? { id: node.id, value: node.value, point: node.point } : null;
  }

  *[Symbol.iterator](): Iterator<RouteEntry<T>> {
    for (let node = this.head; node; node = node.next) {
      const from = this.pointBefore(node);
      yield { id: node.id, value: node.value, legMeters: from ? this.distance(from, node.point) : null };
    }
  }

  /** Pending stops in order, each with the distance from the previous stop (or the start). */
  toArray(): RouteEntry<T>[] { return [...this]; }

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
    this.insertAfter(node, this.tail);
  }

  /** Link ``node`` after ``anchor`` (null = at the front), adjusting only the changed legs. */
  private insertAfter(node: StopNode<T>, anchor: StopNode<T> | null): void {
    const before = anchor ? anchor.point : this.start;
    const after = anchor ? anchor.next : this.head;
    if (before && after) this.remaining -= this.distance(before, after.point);
    if (before) this.remaining += this.distance(before, node.point);
    if (after) this.remaining += this.distance(node.point, after.point);
    node.previous = anchor;
    node.next = after;
    if (anchor) anchor.next = node; else this.head = node;
    if (after) after.previous = node; else this.tail = node;
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
