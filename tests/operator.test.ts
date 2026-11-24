import test from 'node:test';
import assert from 'node:assert/strict';
import { OperatorView } from '../src/services/operator.ts';
import type { Report } from '../src/types.ts';

const stopReport = (id: string) => ({ id } as Report);

test('only operators and administrators use the maintenance workspace', () => {
  assert.equal(OperatorView.canUseMaintenance({ role: 'Operario' }), true);
  assert.equal(OperatorView.canUseMaintenance({ role: 'Administrador' }), true);
  assert.equal(OperatorView.canUseMaintenance({ role: 'Conductor' }), false);
  assert.equal(OperatorView.canUseMaintenance(null), false);
});

test('score segments keep only positive components in a fixed order', () => {
  const segments = OperatorView.scoreSegments({ score: 70, components: { hazard: 55, exposure: 0, traffic: 3.5, waiting: 6.5, status: 5 } });
  assert.deepEqual(segments.map(segment => segment.key), ['hazard', 'traffic', 'waiting', 'status']);
  assert.equal(segments.reduce((total, segment) => total + segment.value, 0), 70);
  assert.equal(segments[0].label, 'Riesgo');
});

test('plan edges connect consecutive stops in the planned order', () => {
  const plan = { stops: [
    { step: 1, report: stopReport('a'), priorityScore: 90, legMeters: null },
    { step: 2, report: stopReport('b'), priorityScore: 80, legMeters: 120 },
    { step: 3, report: stopReport('c'), priorityScore: 70, legMeters: 45.5 },
  ] };
  assert.deepEqual(OperatorView.planEdges(plan), [
    { source: 'a', target: 'b', distanceMeters: 120 },
    { source: 'b', target: 'c', distanceMeters: 45.5 },
  ]);
  assert.deepEqual(OperatorView.planEdges({ stops: [] }), []);
});

test('saving sentence explains when the priority order is already optimal', () => {
  assert.match(OperatorView.savingText({ savedPercent: 0, priorityOrderMeters: 900, totalMeters: 900 }), /ya es el recorrido más corto/);
  assert.match(OperatorView.savingText({ savedPercent: 37.5, priorityOrderMeters: 1600, totalMeters: 1000 }), /37,5 % menos distancia/);
});
