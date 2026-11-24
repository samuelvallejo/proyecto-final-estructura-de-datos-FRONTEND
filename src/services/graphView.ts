import type { GraphSnapshot } from '../types/graphs.ts';
import { HashMap } from '../data-structures/HashMap.ts';
import { HashSet } from '../data-structures/HashSet.ts';

export type AdjacencyLists = HashMap<string, HashMap<string, number>>;

/** Client-side view of the proximity graph: adjacency lists, layout and response validation. */
export class GraphView {
  /** Rebuilds the undirected adjacency lists (vertex → neighbor → meters) from the snapshot. */
  static adjacency(snapshot: GraphSnapshot): AdjacencyLists {
    const neighbors: AdjacencyLists = new HashMap();
    for (const node of snapshot.graph.nodes) neighbors.set(node.id, new HashMap());
    for (const edge of snapshot.graph.edges) {
      neighbors.get(edge.source)!.set(edge.target, edge.distanceMeters);
      neighbors.get(edge.target)!.set(edge.source, edge.distanceMeters);
    }
    return neighbors;
  }

  /** Places vertex `index` of `count` on a circle inside the 800×720 drawing. */
  static graphPoint(index: number, count: number) {
    const angle = -Math.PI / 2 + 2 * Math.PI * index / Math.max(1, count);
    return { x: 400 + 300 * Math.cos(angle), y: 360 + 285 * Math.sin(angle) };
  }

  static edgeKey(source: string, target: string): string {
    return JSON.stringify(source < target ? [source, target] : [target, source]);
  }

  /** Keys of the consecutive edges of a path. */
  static pathEdges(ids: string[]): HashSet<string> {
    const keys = new HashSet<string>();
    for (let index = 1; index < ids.length; index++) keys.add(GraphView.edgeKey(ids[index - 1], ids[index]));
    return keys;
  }

  private static uniqueIds(list: string[], known: HashSet<string>): boolean {
    const seen = new HashSet<string>();
    for (const id of list) {
      if (!known.has(id) || seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  }

  // Check limits and references before walking a network response.
  static validateGraphSnapshot(value: GraphSnapshot): GraphSnapshot {
    const fail = (): never => { throw new Error('No se pudo cargar el grafo. Inténtalo de nuevo.'); };
    const integer = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
    if (!value || !value.graph || !value.scope || !Array.isArray(value.reports) || !Array.isArray(value.graph.nodes)
      || !Array.isArray(value.graph.edges) || !Array.isArray(value.graph.components)) return fail();
    const { graph, scope, reports } = value;
    if (!integer(scope.loaded, 0, 80) || !integer(scope.limit, 1, 80) || scope.loaded > scope.limit
      || !integer(scope.totalReports, scope.loaded, Number.MAX_SAFE_INTEGER)
      || !integer(scope.radiusMeters, 50, 2000) || graph.nodes.length !== scope.loaded || reports.length !== scope.loaded
      || graph.edges.length > scope.loaded * (scope.loaded - 1) / 2 || graph.directed !== false || graph.weighted !== true
      || graph.representation !== 'adjacency-list' || scope.edgeMeaning !== 'geographic-proximity') return fail();
    const ids = new HashSet<string>();
    for (const node of graph.nodes) {
      if (typeof node.id !== 'string' || !node.id) return fail();
      ids.add(node.id);
    }
    const reportIds = new HashSet<string>();
    for (const r of reports) {
      if (!r || !ids.has(r.id) || !Number.isFinite(r.hazardScore) || !r.location || !Number.isFinite(r.location.lat)
        || Math.abs(r.location.lat) > 90 || !Number.isFinite(r.location.lng) || Math.abs(r.location.lng) > 180 || !r.zone) return fail();
      reportIds.add(r.id);
    }
    if (ids.size !== scope.loaded || reportIds.size !== scope.loaded) return fail();
    const keys = new HashSet<string>();
    for (const edge of graph.edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target
        || !Number.isFinite(edge.distanceMeters) || edge.distanceMeters < 0 || edge.distanceMeters > scope.radiusMeters) return fail();
      const key = GraphView.edgeKey(edge.source, edge.target);
      if (keys.has(key)) return fail();
      keys.add(key);
    }
    const lists = GraphView.adjacency(value);
    let isolated = 0, maxDegree = 0;
    for (const neighbors of lists.values()) {
      if (!neighbors.size) isolated++;
      maxDegree = Math.max(maxDegree, neighbors.size);
    }
    if (!graph.metrics || graph.metrics.vertices !== scope.loaded || graph.metrics.edges !== keys.size
      || graph.metrics.components !== graph.components.length
      || graph.metrics.isolated !== isolated || graph.metrics.maxDegree !== maxDegree) return fail();
    const componentOf = new HashMap<string, number>();
    for (const node of graph.nodes) componentOf.set(node.id, node.component);
    const grouped = new HashSet<string>();
    for (let index = 0; index < graph.components.length; index++) {
      const group = graph.components[index];
      if (!Array.isArray(group) || !group.length || !GraphView.uniqueIds(group, ids)) return fail();
      for (const id of group) {
        if (grouped.has(id) || componentOf.get(id) !== index + 1) return fail();
        grouped.add(id);
      }
    }
    if (grouped.size !== ids.size) return fail();
    for (const node of graph.nodes) if (node.degree !== lists.get(node.id)?.size) return fail();
    const validIds = (list: string[]) => Array.isArray(list) && list.length <= ids.size && GraphView.uniqueIds(list, ids);
    if (!graph.traversal || (graph.traversal.order !== 'bfs' && graph.traversal.order !== 'dfs') || !validIds(graph.traversal.reportIds)
      || (ids.size ? !ids.has(graph.traversal.startId!) || graph.traversal.reportIds[0] !== graph.traversal.startId
        : graph.traversal.startId !== null || graph.traversal.reportIds.length !== 0)) return fail();
    if (graph.path) {
      const path = graph.path;
      if (!validIds(path.reportIds) || !validIds(path.settledIds) || typeof path.reachable !== 'boolean') return fail();
      if (path.reachable) {
        if (!path.reportIds.length || path.reportIds[0] !== graph.traversal.startId || path.distanceMeters === null
          || !Number.isFinite(path.distanceMeters) || path.distanceMeters < 0) return fail();
        let cost = 0;
        for (let i = 1; i < path.reportIds.length; i++) {
          const weight = lists.get(path.reportIds[i - 1])!.get(path.reportIds[i]);
          if (weight === undefined) return fail();
          cost += weight;
        }
        if (Math.abs(cost - path.distanceMeters) > 0.001) return fail();
      } else if (path.reportIds.length || path.distanceMeters !== null) return fail();
    }
    return value;
  }
}
