/**
 * 2-d tree (k-d tree with k = 2) for nearest-pothole queries while driving.
 *
 * Points are projected to local meters (equirectangular projection around the
 * mean latitude, accurate to a fraction of a percent at city scale). The tree
 * splits alternately by x and y at the median, so it is balanced: height
 * O(log n). A nearest query descends to the query's region first and only
 * visits the other side of a split when the splitting line is closer than the
 * best distance found so far, so most of the tree is pruned.
 *
 * Build O(n log² n); nearest O(log n) on average instead of O(n) for a scan.
 */
export interface GeoPoint { lat: number; lng: number }
export interface KdItem<T> { point: GeoPoint; value: T }
export interface KdHit<T> { value: T; meters: number }

const METERS_PER_DEGREE_LAT = 110_574;
const METERS_PER_DEGREE_LNG = 111_320;

class KdNode<T> {
  readonly x: number;
  readonly y: number;
  readonly item: KdItem<T>;
  readonly axis: 0 | 1;
  left: KdNode<T> | null = null;
  right: KdNode<T> | null = null;
  constructor(x: number, y: number, item: KdItem<T>, axis: 0 | 1) { this.x = x; this.y = y; this.item = item; this.axis = axis; }
}

export class KdTree<T> {
  private readonly root: KdNode<T> | null;
  private readonly lngScale: number;
  readonly size: number;
  /** Nodes visited by the last query; shows how much the tree pruned. */
  lastVisited = 0;

  constructor(items: KdItem<T>[]) {
    const valid = items.filter(item => Number.isFinite(item.point.lat) && Number.isFinite(item.point.lng));
    const meanLat = valid.length ? valid.reduce((total, item) => total + item.point.lat, 0) / valid.length : 0;
    this.lngScale = METERS_PER_DEGREE_LNG * Math.cos(meanLat * Math.PI / 180);
    this.size = valid.length;
    const projected = valid.map(item => ({ ...this.project(item.point), item }));
    this.root = this.build(projected, 0);
  }

  /** Edges on the longest root-to-leaf path (-1 when empty). */
  get height(): number {
    const depth = (node: KdNode<T> | null): number => node ? 1 + Math.max(depth(node.left), depth(node.right)) : 0;
    return depth(this.root) - 1;
  }

  /** Closest accepted item within ``maxMeters``, or null. */
  nearest(point: GeoPoint, maxMeters = Infinity, accept: (value: T) => boolean = () => true): KdHit<T> | null {
    const target = this.project(point);
    let best: KdNode<T> | null = null;
    let bestSquared = maxMeters * maxMeters;
    this.lastVisited = 0;
    const visit = (node: KdNode<T> | null) => {
      if (!node) return;
      this.lastVisited++;
      const dx = node.x - target.x, dy = node.y - target.y;
      const squared = dx * dx + dy * dy;
      if (squared <= bestSquared && accept(node.item.value)) { best = node; bestSquared = squared; }
      const delta = node.axis === 0 ? target.x - node.x : target.y - node.y;
      const [near, far] = delta < 0 ? [node.left, node.right] : [node.right, node.left];
      visit(near);
      // The other half can only hold a closer point if the splitting line is closer than the best one.
      if (delta * delta <= bestSquared) visit(far);
    };
    visit(this.root);
    const found = best as KdNode<T> | null;
    return found ? { value: found.item.value, meters: Math.sqrt(bestSquared) } : null;
  }

  /** Every item within ``meters``, closest first. */
  within(point: GeoPoint, meters: number): KdHit<T>[] {
    const target = this.project(point);
    const limit = meters * meters;
    const hits: KdHit<T>[] = [];
    const visit = (node: KdNode<T> | null) => {
      if (!node) return;
      const dx = node.x - target.x, dy = node.y - target.y;
      if (dx * dx + dy * dy <= limit) hits.push({ value: node.item.value, meters: Math.hypot(dx, dy) });
      const delta = node.axis === 0 ? target.x - node.x : target.y - node.y;
      if (delta < 0 || delta * delta <= limit) visit(node.left);
      if (delta >= 0 || delta * delta <= limit) visit(node.right);
    };
    visit(this.root);
    return hits.sort((a, b) => a.meters - b.meters);
  }

  private project(point: GeoPoint): { x: number; y: number } {
    return { x: point.lng * this.lngScale, y: point.lat * METERS_PER_DEGREE_LAT };
  }

  private build(points: { x: number; y: number; item: KdItem<T> }[], depth: number): KdNode<T> | null {
    if (!points.length) return null;
    const axis = (depth % 2) as 0 | 1;
    const sorted = [...points].sort((a, b) => axis === 0 ? a.x - b.x : a.y - b.y);
    const middle = sorted.length >> 1;
    const median = sorted[middle];
    const node = new KdNode(median.x, median.y, median.item, axis);
    node.left = this.build(sorted.slice(0, middle), depth + 1);
    node.right = this.build(sorted.slice(middle + 1), depth + 1);
    return node;
  }
}
