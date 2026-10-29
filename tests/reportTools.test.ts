import test from 'node:test';
import assert from 'node:assert/strict';
import { damageLabels, filterReports, normalize, reportsCsv, riskLabels } from '../src/services/reportTools.ts';
import type { Report } from '../src/types.ts';

function report(overrides: Partial<Report> = {}): Report {
  return {
    id: 'rep-1',
    timestamp: 1762000000000,
    location: { lat: 4.63, lng: -74.06, accuracy: 12 },
    zone: { street: 'Calle 1', neighborhood: 'Centro', city: 'Cali', fullAddress: 'Calle 1, Centro, Cali' },
    isPothole: true,
    potholeType: 'BACHE',
    hazardScore: 70,
    hazardLevel: 'HIGH',
    aiDescription: 'Hundimiento en la calzada central',
    riskFactors: ['Desgaste del asfalto'],
    status: 'UNVERIFIED',
    ...overrides,
  };
}

test('etiquetas de riesgo y tipo de daño en español', () => {
  assert.equal(riskLabels.LOW, 'Bajo');
  assert.equal(riskLabels.MEDIUM, 'Moderado');
  assert.equal(riskLabels.HIGH, 'Alto');
  assert.equal(riskLabels.CRITICAL, 'Crítico');
  assert.equal(damageLabels.BACHE, 'Bache');
  assert.equal(damageLabels.HUNDIMIENTO, 'Hundimiento');
});

test('normalizar quita acentos, mayúsculas y espacios', () => {
  assert.equal(normalize('  Bache '), 'bache');
  assert.equal(normalize('HUNDIMIENTO'), 'hundimiento');
  assert.equal(normalize('Daño Vial'), 'danio vial');
  assert.equal(normalize('  Grieta   de Asfalto '), 'grieta de asfalto');
});

test('filtrar por nivel de riesgo', () => {
  const items = [report({ id: 'a', hazardLevel: 'HIGH', hazardScore: 80 }),
    report({ id: 'b', hazardLevel: 'LOW', hazardScore: 20 })];
  assert.deepEqual(filterReports(items, { query: '', risk: 'HIGH', damage: '', favoritesOnly: false }, []).map(item => item.id), ['a']);
  assert.deepEqual(filterReports(items, { query: '', risk: 'LOW', damage: '', favoritesOnly: false }, []).map(item => item.id), ['b']);
});

test('filtrar por tipo de daño y favoritos', () => {
  const items = [report({ id: 'a', potholeType: 'BACHE' }), report({ id: 'b', potholeType: 'GRIETA' })];
  assert.deepEqual(filterReports(items, { query: '', risk: '', damage: 'GRIETA', favoritesOnly: false }, []).map(item => item.id), ['b']);
  assert.deepEqual(filterReports(items, { query: '', risk: '', damage: '', favoritesOnly: true }, ['a']).map(item => item.id), ['a']);
});

test('filtrar por texto normalizado sin modificar el arreglo original', () => {
  const items = [report({ id: 'a', aiDescription: 'Hundimiento en la calzada central' }),
    report({ id: 'b', aiDescription: 'Grieta en la acera norte' })];
  assert.deepEqual(filterReports(items, { query: 'bache', risk: '', damage: '', favoritesOnly: false }, []).map(item => item.id), ['a']);
  const original = [report({ id: 'a' }), report({ id: 'b' })];
  assert.deepEqual(filterReports(original, { query: '', risk: '', damage: '', favoritesOnly: false }, []), original);
});

test('exportar reportes a CSV con BOM, separador y escape de formulas', () => {
  const csv = reportsCsv([report({ id: 'a', hazardScore: 80, hazardLevel: 'HIGH', potholeType: 'BACHE', zone: { street: 'Calle 1', neighborhood: 'Centro', city: 'Cali', fullAddress: 'Calle 1, Centro, Cali' }, aiDescription: 'Hundimiento en la calzada' })]);
  assert.ok(csv.startsWith('\uFEFF'));
  const rows = csv.split('\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0], 'Fecha ISO;Tipo;Riesgo;Puntuación;Dirección;Latitud;Longitud;Precisión (m);Descripción;Estado');
  assert.equal(rows[1].split(';')[2], 'Alto');
  const dangerous = reportsCsv([report({ id: 'x', aiDescription: '=SUMA(1+1)' })]);
  assert.ok(!dangerous.includes('=SUMA(1+1)'));
});
