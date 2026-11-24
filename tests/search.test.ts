import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchView } from '../src/services/search.ts';
import type { Report } from '../src/types.ts';

const item = (id: string) => ({ id } as Report);
const none = { text: '', risk: '', damage: '', from: '', to: '' };

test('server query needs two letters or digits after normalizing', () => {
  assert.equal(SearchView.serverQuery('  Á  '), '');
  assert.equal(SearchView.serverQuery('--'), '');
  assert.equal(SearchView.serverQuery('  Avenida   PANAMÁ '), 'avenida panama');
  assert.equal(SearchView.serverQuery('18'), '18');
});

test('search key includes text, categories and day bounds in a fixed order', () => {
  assert.equal(SearchView.searchKey(none), '');
  assert.equal(SearchView.searchKey({ ...none, text: 'x' }), '');
  assert.equal(SearchView.searchKey({ ...none, text: 'Calle 18', risk: 'HIGH' }), 'q=calle+18&risk=HIGH');
  const key = new URLSearchParams(SearchView.searchKey({ ...none, damage: 'BACHE', from: '2026-11-01', to: '2026-11-02' }));
  assert.equal(key.get('damage'), 'BACHE');
  assert.equal(Number(key.get('to')) - Number(key.get('from')), 2 * 86_400_000 - 1);
});

test('day bounds and the local date fallback', () => {
  const { since, until } = SearchView.dayBounds('2026-11-10', '2026-11-10');
  assert.equal(until! - since!, 86_399_999);
  assert.deepEqual(SearchView.dayBounds('', 'bad'), { since: null, until: null });
  assert.equal(SearchView.withinDays({ timestamp: since! + 1000 }, '2026-11-10', ''), true);
  assert.equal(SearchView.withinDays({ timestamp: since! - 1 }, '2026-11-10', ''), false);
  assert.equal(SearchView.withinDays({ timestamp: 0 }, '', ''), true);
});

test('server results are used only for the filters they answer', () => {
  const loaded = [item('local')];
  const server = { key: 'q=calle+18', reports: [item('a'), item('b')] };
  assert.deepEqual(SearchView.searchBase(loaded, 'q=calle+18', server), { reports: server.reports, fromServer: true });
  assert.deepEqual(SearchView.searchBase(loaded, 'q=calle+18&risk=HIGH', server), { reports: loaded, fromServer: false });
  assert.deepEqual(SearchView.searchBase(loaded, '', server), { reports: loaded, fromServer: false });
  assert.deepEqual(SearchView.searchBase(loaded, 'q=calle+18', null), { reports: loaded, fromServer: false });
});
