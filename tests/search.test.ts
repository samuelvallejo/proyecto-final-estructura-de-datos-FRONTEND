import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchView } from '../src/services/search.ts';
import type { Report } from '../src/types.ts';

const item = (id: string) => ({ id } as Report);

test('server query needs two letters or digits after normalizing', () => {
  assert.equal(SearchView.serverQuery('  Á  '), '');
  assert.equal(SearchView.serverQuery('--'), '');
  assert.equal(SearchView.serverQuery('  Avenida   PANAMÁ '), 'avenida panama');
  assert.equal(SearchView.serverQuery('18'), '18');
});

test('server results are used only for the query they answer', () => {
  const loaded = [item('local')];
  const server = { query: 'calle 18', reports: [item('a'), item('b')] };
  assert.deepEqual(SearchView.searchBase(loaded, 'Calle  18', server), { reports: server.reports, fromServer: true });
  assert.deepEqual(SearchView.searchBase(loaded, 'calle 1', server), { reports: loaded, fromServer: false });
  assert.deepEqual(SearchView.searchBase(loaded, 'x', server), { reports: loaded, fromServer: false });
  assert.deepEqual(SearchView.searchBase(loaded, 'calle 18', null), { reports: loaded, fromServer: false });
});
