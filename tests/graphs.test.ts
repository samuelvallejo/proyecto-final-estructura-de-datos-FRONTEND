import test from 'node:test';
import assert from 'node:assert/strict';
import type { GraphSnapshot } from '../src/types/graphs.ts';
import { adjacency, edgeKey, graphPoint, pathEdges, validateGraphSnapshot } from '../src/services/graphView.ts';

function snapshot(): GraphSnapshot {
  return {
    generatedAt: 100,
    scope: { totalReports: 2, loaded: 2, limit: 80, hasMore: false, excluded: 0, selection: 'highest-risk', radiusMeters: 250, edgeMeaning: 'geographic-proximity' },
    reports: ['a', 'b'].map(id => ({ id, timestamp: 100, hazardScore: 70, hazardLevel: 'HIGH', isPothole: true,
      potholeType: 'BACHE', aiDescription: 'Prueba local', riskFactors: [], status: 'UNVERIFIED',
      location: { lat: 3.45, lng: -76.53, accuracy: 8 }, zone: { city: 'Cali', neighborhood: null, street: null, fullAddress: null } })),
    graph: { directed: false, weighted: true, representation: 'adjacency-list',
      nodes: [{ id: 'a', degree: 1, component: 1 }, { id: 'b', degree: 1, component: 1 }],
      edges: [{ source: 'a', target: 'b', distanceMeters: 120 }], components: [['a', 'b']],
      metrics: { vertices: 2, edges: 1, components: 1, isolated: 0, maxDegree: 1 },
      traversal: { order: 'bfs', startId: 'a', reportIds: ['a', 'b'] },
      path: { reachable: true, reportIds: ['a', 'b'], distanceMeters: 120, settledIds: ['a', 'b'] } },
  };
}

test('adjacency is symmetric and preserves the original response', () => {
  const value = snapshot(), before = JSON.stringify(value), graph = adjacency(validateGraphSnapshot(value));
  assert.equal(graph.get('a')!.get('b'), 120);
  assert.equal(graph.get('b')!.get('a'), 120);
  assert.equal(JSON.stringify(value), before);
});

test('path highlighting includes only consecutive undirected edges', () => {
  const path = pathEdges(['a', 'b', 'c']);
  assert(path.has(edgeKey('b', 'a'))); assert(path.has(edgeKey('c', 'b')));
  assert(!path.has(edgeKey('a', 'c')));
  assert.notEqual(edgeKey('a|b', 'c'), edgeKey('a', 'b|c'));
});

test('diagram positions are finite and distinct through 80 vertices', () => {
  const points = Array.from({ length: 80 }, (_, i) => graphPoint(i, 80));
  assert.equal(new Set(points.map(p => `${p.x}|${p.y}`)).size, 80);
  assert(points.every(p => Number.isFinite(p.x) && p.x >= 100 && p.x <= 700 && p.y >= 75 && p.y <= 645));
});

test('malformed edges cannot enter diagram or adjacency lists', () => {
  for (const change of [
    (v: GraphSnapshot) => { v.graph.edges[0].target = 'missing'; },
    (v: GraphSnapshot) => { v.graph.edges[0].distanceMeters = -1; },
    (v: GraphSnapshot) => { v.graph.edges[0].distanceMeters = Infinity; },
    (v: GraphSnapshot) => { v.graph.edges[0].distanceMeters = 251; },
    (v: GraphSnapshot) => { v.graph.edges[0].target = 'a'; },
  ]) { const value = snapshot(); change(value); assert.throws(() => validateGraphSnapshot(value)); }
});

test('scope, coordinates, references and metrics have enforced bounds', () => {
  for (const change of [
    (v: GraphSnapshot) => { v.scope.loaded = 81; },
    (v: GraphSnapshot) => { v.reports[0].location.lat = 91; },
    (v: GraphSnapshot) => { v.graph.nodes[1].id = 'a'; },
    (v: GraphSnapshot) => { v.graph.metrics.edges = 9; },
    (v: GraphSnapshot) => { v.graph.nodes[1].degree = 0; },
    (v: GraphSnapshot) => { v.graph.components[0].push('a'); },
    (v: GraphSnapshot) => { v.graph.traversal.reportIds = ['a', 'a']; },
  ]) { const value = snapshot(); change(value); assert.throws(() => validateGraphSnapshot(value)); }
});

test('path cannot claim an incorrect accumulated distance or unknown report', () => {
  const value = snapshot(); value.graph.path!.distanceMeters = 5;
  assert.throws(() => validateGraphSnapshot(value));
  value.graph.path!.distanceMeters = 120; value.graph.path!.reportIds[1] = 'missing';
  assert.throws(() => validateGraphSnapshot(value));
});

test('empty snapshot is supported without inventing a start vertex', () => {
  const value = snapshot(); value.reports = []; value.scope.loaded = value.scope.totalReports = 0;
  value.graph.nodes = []; value.graph.edges = []; value.graph.components = [];
  value.graph.metrics = { vertices: 0, edges: 0, components: 0, isolated: 0, maxDegree: 0 };
  value.graph.traversal = { order: 'bfs', startId: null, reportIds: [] }; value.graph.path = null;
  assert.equal(validateGraphSnapshot(value).graph.traversal.startId, null);
});
