import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportTools } from '../src/services/reportTools.ts';
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

test('risk and damage-type labels in Spanish', () => {
  assert.equal(ReportTools.riskLabels.LOW, 'Bajo');
  assert.equal(ReportTools.riskLabels.MEDIUM, 'Moderado');
  assert.equal(ReportTools.riskLabels.HIGH, 'Alto');
  assert.equal(ReportTools.riskLabels.CRITICAL, 'Crítico');
  assert.equal(ReportTools.damageLabels.BACHE, 'Bache');
  assert.equal(ReportTools.damageLabels.HUNDIMIENTO, 'Hundimiento');
});

test('normalize removes accents, capitals and extra spaces', () => {
  assert.equal(ReportTools.normalize('  Bache '), 'bache');
  assert.equal(ReportTools.normalize('HUNDIMIENTO'), 'hundimiento');
  assert.equal(ReportTools.normalize('Daño Vial'), 'dano vial');
  assert.equal(ReportTools.normalize('  Grieta   de Asfalto '), 'grieta de asfalto');
});

test('filters by risk level', () => {
  const items = [report({ id: 'a', hazardLevel: 'HIGH', hazardScore: 80 }),
    report({ id: 'b', hazardLevel: 'LOW', hazardScore: 20 })];
  assert.deepEqual(ReportTools.filterReports(items, { query: '', risk: 'HIGH', damage: '', favoritesOnly: false }, []).map(item => item.id), ['a']);
  assert.deepEqual(ReportTools.filterReports(items, { query: '', risk: 'LOW', damage: '', favoritesOnly: false }, []).map(item => item.id), ['b']);
});

test('filters by damage type and favorites', () => {
  const items = [report({ id: 'a', potholeType: 'BACHE' }), report({ id: 'b', potholeType: 'GRIETA' })];
  assert.deepEqual(ReportTools.filterReports(items, { query: '', risk: '', damage: 'GRIETA', favoritesOnly: false }, []).map(item => item.id), ['b']);
  assert.deepEqual(ReportTools.filterReports(items, { query: '', risk: '', damage: '', favoritesOnly: true }, ['a']).map(item => item.id), ['a']);
});

test('filters by normalized text without modifying the original array', () => {
  const items = [report({ id: 'a', aiDescription: 'Hundimiento en la calzada central' }),
    report({ id: 'b', potholeType: 'GRIETA', aiDescription: 'Grieta en la acera norte' })];
  assert.deepEqual(ReportTools.filterReports(items, { query: 'bache', risk: '', damage: '', favoritesOnly: false }, []).map(item => item.id), ['a']);
  const original = [report({ id: 'a' }), report({ id: 'b' })];
  assert.deepEqual(ReportTools.filterReports(original, { query: '', risk: '', damage: '', favoritesOnly: false }, []), original);
});

test('exports reports to CSV with BOM, separator and formula escaping', () => {
  const csv = ReportTools.reportsCsv([report({ id: 'a', hazardScore: 80, hazardLevel: 'HIGH', potholeType: 'BACHE', zone: { street: 'Calle 1', neighborhood: 'Centro', city: 'Cali', fullAddress: 'Calle 1, Centro, Cali' }, aiDescription: 'Hundimiento en la calzada' })]);
  assert.ok(csv.startsWith('\uFEFF'));
  const rows = csv.split('\r\n');
  assert.equal(rows.length, 2);
  const header = rows[0].replace(/^\uFEFF/, '').split(';').map(cell => cell.replace(/^"|"$/g, '')).join(';');
  assert.equal(header, 'Fecha ISO;Tipo;Riesgo;Puntuación;Dirección;Latitud;Longitud;Precisión (m);Descripción;Estado');
  const dataRow = rows[1].replace(/^\uFEFF/, '').split(';').map(cell => cell.replace(/^"|"$/g, '')).join(';');
  assert.equal(dataRow.split(';')[2], 'Alto');
  assert.equal(dataRow.split(';')[9], 'Sin verificar');
  const repaired = ReportTools.reportsCsv([report({ id: 'r', status: 'REPAIRED' })]).split('\r\n')[1].split(';').map(cell => cell.replace(/^"|"$/g, ''));
  assert.equal(repaired[9], 'Reparado');
  const dangerous = ReportTools.reportsCsv([report({ id: 'x', aiDescription: '=SUMA(1+1)' })]);
  assert.ok(dangerous.includes("'=SUMA(1+1)"));
});
