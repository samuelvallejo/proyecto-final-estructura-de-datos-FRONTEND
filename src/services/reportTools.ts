import type { Report } from '../types';
import { HashSet } from '../data-structures/HashSet.ts';
import { LinkedList } from '../data-structures/LinkedList.ts';
import { Formatter } from './format.ts';

export interface Filters { query: string; risk: string; damage: string; favoritesOnly: boolean }

/** Searching, filtering and CSV export of report lists. */
export class ReportTools {
  static readonly riskLabels = { LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto', CRITICAL: 'Crítico' };
  static readonly damageLabels = { BACHE: 'Bache', HUNDIMIENTO: 'Hundimiento', GRIETA: 'Grieta', OTRO_DANO: 'Daño vial' };

  /** Lowercase, no accents and single spaces, so "Bogotá  Norte" matches "bogota norte". */
  static normalize(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ');
  }

  private static searchableText(report: Report): string {
    const parts = new LinkedList<string>();
    for (const value of [report.id, ...Object.values(report.zone), report.aiDescription,
      ReportTools.damageLabels[report.potholeType || 'OTRO_DANO']]) if (value) parts.append(String(value));
    return ReportTools.normalize(parts.toArray().join(' '));
  }

  static filterReports(reports: Report[], filters: Filters, favorites: string[]): Report[] {
    const query = ReportTools.normalize(filters.query);
    const saved = HashSet.from(favorites);
    return reports.filter(report => (!filters.risk || report.hazardLevel === filters.risk)
      && (!filters.damage || report.potholeType === filters.damage)
      && (!filters.favoritesOnly || saved.has(report.id))
      && (!query || ReportTools.searchableText(report).includes(query)));
  }

  private static csvCell(value: unknown): string {
    const text = String(value ?? '');
    // Keep spreadsheet programs from interpreting report data as formulas.
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  }

  static reportsCsv(reports: Report[]): string {
    const rows = new LinkedList<unknown[]>();
    rows.append(['Fecha ISO', 'Tipo', 'Riesgo', 'Puntuación', 'Dirección', 'Latitud', 'Longitud', 'Precisión (m)', 'Descripción', 'Estado']);
    for (const report of reports) rows.append([new Date(report.timestamp).toISOString(),
      ReportTools.damageLabels[report.potholeType || 'OTRO_DANO'], ReportTools.riskLabels[report.hazardLevel], report.hazardScore,
      report.zone.fullAddress || [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', '),
      report.location.lat, report.location.lng, report.location.accuracy, report.aiDescription,
      Formatter.statusText[report.status] || Formatter.statusText.UNVERIFIED]);
    return '﻿' + rows.map(row => row.map(ReportTools.csvCell).join(';')).toArray().join('\r\n');
  }
}
