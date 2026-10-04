import type { Report } from '../types';

export const riskLabels = { LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto', CRITICAL: 'Crítico' };
export const damageLabels = { BACHE: 'Bache', HUNDIMIENTO: 'Hundimiento', GRIETA: 'Grieta', OTRO_DANO: 'Daño vial' };
export interface Filters { query: string; risk: string; damage: string; favoritesOnly: boolean }
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}
export function filterReports(reports: Report[], filters: Filters, favorites: string[]): Report[] {
  const query = normalize(filters.query);
  const saved = new Set(favorites);
  return reports.filter(report => (!filters.risk || report.hazardLevel === filters.risk)
    && (!filters.damage || report.potholeType === filters.damage)
    && (!filters.favoritesOnly || saved.has(report.id))
    && (!query || normalize([report.id, ...Object.values(report.zone), report.aiDescription,
      damageLabels[report.potholeType || 'OTRO_DANO']].filter(Boolean).join(' ')).includes(query)));
}
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  // Evitar que Excel interprete datos de reportes como fórmulas.
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
}
export function reportsCsv(reports: Report[]): string {
  const rows: unknown[][] = [['ID', 'Fecha ISO', 'Tipo', 'Riesgo', 'Puntuación', 'Dirección', 'Latitud', 'Longitud', 'Precisión (m)', 'Descripción', 'Estado']];
  for (const report of reports) rows.push([report.id, new Date(report.timestamp).toISOString(),
    damageLabels[report.potholeType || 'OTRO_DANO'], riskLabels[report.hazardLevel], report.hazardScore,
    report.zone.fullAddress || [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', '),
    report.location.lat, report.location.lng, report.location.accuracy, report.aiDescription, 'Sin verificar']);
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
