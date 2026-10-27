import type { GraphSnapshot } from '../types/graphs.ts';

export function adjacency(snapshot: GraphSnapshot) {
  const neighbors = new Map(snapshot.graph.nodes.map(node => [node.id, new Map<string, number>()]));
  for (const edge of snapshot.graph.edges) {
    neighbors.get(edge.source)!.set(edge.target, edge.distanceMeters);
    neighbors.get(edge.target)!.set(edge.source, edge.distanceMeters);
  }
  return neighbors;
}

export function graphPoint(index: number, count: number) {
  const angle = -Math.PI / 2 + 2 * Math.PI * index / Math.max(1, count);
  return { x: 400 + 300 * Math.cos(angle), y: 360 + 285 * Math.sin(angle) };
}

export function pathEdges(ids: string[]) {
  return new Set(ids.slice(1).map((id, i) => JSON.stringify([ids[i], id].sort())));
}
export const edgeKey = (source: string, target: string) => JSON.stringify([source, target].sort());

// Comprobar límites y referencias antes de recorrer una respuesta de red.
export function validateGraphSnapshot(value: GraphSnapshot): GraphSnapshot {
  const fail = () => { throw new Error('No se pudo cargar el grafo. Inténtalo de nuevo.'); };
  const integer = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!value || !value.graph || !value.scope || !Array.isArray(value.reports) || !Array.isArray(value.graph.nodes)
    || !Array.isArray(value.graph.edges) || !Array.isArray(value.graph.components)) return fail();
  const { graph, scope, reports } = value;
  if (!integer(scope.loaded, 0, 80) || !integer(scope.limit, 1, 80) || scope.loaded > scope.limit
    || !integer(scope.totalReports, scope.loaded, Number.MAX_SAFE_INTEGER)
    || !integer(scope.radiusMeters, 50, 2000) || graph.nodes.length !== scope.loaded || reports.length !== scope.loaded
    || graph.edges.length > scope.loaded * (scope.loaded - 1) / 2 || graph.directed !== false || graph.weighted !== true
    || graph.representation !== 'adjacency-list' || scope.edgeMeaning !== 'geographic-proximity') return fail();
  const ids = new Set(graph.nodes.map(node => node.id));
  if (ids.size !== scope.loaded || [...ids].some(id => typeof id !== 'string' || !id) || reports.some(r => !r || !ids.has(r.id) || !Number.isFinite(r.hazardScore)
    || !r.location || !Number.isFinite(r.location.lat) || Math.abs(r.location.lat) > 90
    || !Number.isFinite(r.location.lng) || Math.abs(r.location.lng) > 180 || !r.zone)
    || new Set(reports.map(r => r.id)).size !== scope.loaded) return fail();
  const keys = new Set<string>();
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target
      || !Number.isFinite(edge.distanceMeters) || edge.distanceMeters < 0 || edge.distanceMeters > scope.radiusMeters) return fail();
    const key = edgeKey(edge.source, edge.target);
    if (keys.has(key)) return fail();
    keys.add(key);
  }
  const lists = adjacency(value);
  if (!graph.metrics || graph.metrics.vertices !== scope.loaded || graph.metrics.edges !== keys.size
    || graph.metrics.components !== graph.components.length
    || graph.metrics.isolated !== [...lists.values()].filter(n => !n.size).length
    || graph.metrics.maxDegree !== Math.max(0, ...[...lists.values()].map(n => n.size))) return fail();
  const grouped = new Set<string>();
  for (const [index, group] of graph.components.entries()) {
    if (!Array.isArray(group) || !group.length || new Set(group).size !== group.length || group.some(id => !ids.has(id) || grouped.has(id))) return fail();
    for (const id of group) {
      if (graph.nodes.find(node => node.id === id)?.component !== index + 1) return fail();
      grouped.add(id);
    }
  }
  if (grouped.size !== ids.size || graph.nodes.some(n => n.degree !== lists.get(n.id)?.size)) return fail();
  const validIds = (list: string[]) => Array.isArray(list) && list.length <= ids.size
    && new Set(list).size === list.length && list.every(id => ids.has(id));
  if (!graph.traversal || !['bfs', 'dfs'].includes(graph.traversal.order) || !validIds(graph.traversal.reportIds)
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
