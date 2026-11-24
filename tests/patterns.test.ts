import test from 'node:test';
import assert from 'node:assert/strict';
import { Observable } from '../src/patterns/Observable.ts';
import { CommandHistory } from '../src/patterns/CommandHistory.ts';
import type { Command } from '../src/patterns/CommandHistory.ts';
import { RouteList } from '../src/data-structures/RouteList.ts';
import type { RoutePoint } from '../src/data-structures/RouteList.ts';
import { LruCache } from '../src/data-structures/LruCache.ts';
import { PostponeStopCommand, VisitStopCommand } from '../src/services/routeCommands.ts';
import { OperatorView } from '../src/services/operator.ts';
import type { PlanStop } from '../src/types/operator.ts';

const line = (a: RoutePoint, b: RoutePoint) => Math.abs(a.lng - b.lng);
const stop = (id: string, x: number) => ({ id, value: id, point: { lat: 0, lng: x } });

class Counter extends Observable { bump() { this.notify(); } }

test('observer: listeners are notified and can unsubscribe', () => {
  const subject = new Counter();
  const calls: string[] = [];
  const stopFirst = subject.subscribe(() => calls.push('first'));
  subject.subscribe(() => calls.push('second'));
  subject.bump();
  stopFirst();
  subject.bump();
  assert.deepEqual(calls, ['first', 'second', 'second']);
  assert.equal(subject.version, 2);
  assert.equal(subject.listenerCount, 1);
});

test('the route list notifies after each change', () => {
  const route = new RouteList(null, [stop('a', 1), stop('b', 2), stop('c', 3)], line);
  let notified = 0;
  route.subscribe(() => notified++);
  route.complete('a'); route.postpone('b'); route.complete('missing');
  assert.equal(notified, 2);
});

test('command history undoes in LIFO order using the project stack', () => {
  const log: string[] = [];
  const command = (name: string, ok = true): Command<string[]> => ({
    label: name, execute: target => { if (ok) target.push(name); return ok; }, undo: target => { target.pop(); },
  });
  const history = new CommandHistory(log);
  assert.equal(history.run(command('a')), true);
  assert.equal(history.run(command('b')), true);
  assert.equal(history.run(command('ignored', false)), false);
  assert.equal(history.size, 2);
  assert.equal(history.lastLabel, 'b');
  history.undo();
  assert.deepEqual(log, ['a']);
  assert.equal(history.lastLabel, 'a');
  history.undo();
  assert.equal(history.undo(), false);
  assert.equal(history.canUndo, false);
});

test('undoing visits and postponements restores the exact route', () => {
  const items = Array.from({ length: 12 }, (_, index) => stop(`s${index}`, (index * 37) % 23));
  const route = new RouteList({ lat: 0, lng: 5 }, items, line);
  const history = new CommandHistory(route);
  const original = { order: [...route].map(entry => entry.id), meters: route.remainingMeters };
  let seed = 3;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let step = 0; step < 30 && route.size; step++) {
    const ids = [...route].map(entry => entry.id);
    const id = ids[Math.floor(random() * ids.length)];
    history.run(random() < 0.5 ? new VisitStopCommand(id, `visit ${id}`) : new PostponeStopCommand(id, `postpone ${id}`));
    assert.ok(route.validate());
  }
  while (history.undo()) assert.ok(route.validate());
  assert.deepEqual([...route].map(entry => entry.id), original.order);
  assert.ok(Math.abs(route.remainingMeters - original.meters) < 1e-9);
  assert.equal(route.visited, 0);
});

test('undo puts a visited first stop back at the front', () => {
  const route = new RouteList({ lat: 0, lng: 0 }, [stop('a', 1), stop('b', 2)], line);
  const history = new CommandHistory(route);
  history.run(new VisitStopCommand('a', 'visit a'));
  assert.equal(route.current, 'b');
  history.undo();
  assert.equal(route.current, 'a');
  assert.equal(route.remainingMeters, 2);
});

test('iterators walk the route and the cache without exposing nodes', () => {
  const route = new RouteList(null, [stop('a', 1), stop('b', 4)], line);
  assert.deepEqual([...route], [{ id: 'a', value: 'a', legMeters: null }, { id: 'b', value: 'b', legMeters: 3 }]);
  const cache = new LruCache<string, number>(3);
  cache.set('x', 1); cache.set('y', 2); cache.get('x');
  assert.deepEqual([...cache], [['x', 1], ['y', 2]]);
});

test('adapter turns API plan stops into route items', () => {
  const planStop = { step: 1, priorityScore: 70, legMeters: null,
    report: { id: 'r1', location: { lat: 1.2, lng: -77.29, accuracy: 8 } } } as unknown as PlanStop;
  assert.deepEqual(OperatorView.planToRouteItems({ stops: [planStop] }), [{ id: 'r1', value: planStop, point: { lat: 1.2, lng: -77.29 } }]);
});
