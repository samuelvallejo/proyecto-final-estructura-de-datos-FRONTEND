import type { Report } from '../types';
import { riskLabels } from '../services/reportTools';
export default function ReportSummary({ reports, total }: { reports: Report[]; total: number }) {
  const levels = Object.keys(riskLabels) as (keyof typeof riskLabels)[];
  return <section className="risk-overview" aria-label="Resumen de reportes cargados">
    <div className="section-row"><h2>Panorama de riesgo</h2><span>{reports.length} de {total} cargados</span></div>
    <div className="risk-overview-grid">{levels.map(level => {
      const count = reports.filter(report => report.hazardLevel === level).length;
      return <div key={level} className={`risk-stat risk-${level.toLowerCase()}`}><span>{riskLabels[level]}</span><strong>{count}</strong><small>{reports.length ? Math.round(count / reports.length * 100) : 0}% de los cargados</small></div>;
    })}</div>
  </section>;
}
