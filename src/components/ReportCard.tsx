import { MapPin, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Report } from '../types';
import { riskText, statusText, timeText, typeText } from '../services/format';

export default function ReportCard({ report, onMap, children }: { report: Report; onMap?: (report: Report) => void; children?: ReactNode }) {
  const address = [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', ');
  return <article className="report-card">
    <div className={`report-icon risk-${report.hazardLevel.toLowerCase()}`}><MapPin size={20} /></div>
    <div className="report-content">
      <div className="report-title"><strong>{typeText[report.potholeType || 'OTRO_DANO']}</strong><span className={`risk-label risk-${report.hazardLevel.toLowerCase()}`}>{riskText[report.hazardLevel]}</span></div>
      <p>{address || `GPS ${report.location.lat.toFixed(5)}, ${report.location.lng.toFixed(5)}`}</p>
      <small>{timeText(report.timestamp)} · {report.source === 'COMMUNITY' ? 'Comunidad' : 'YOLO'} · {statusText[report.status] || 'Sin verificar'}</small>
      {(report.peopleCount ?? 0) > 0 && <small className="people-line"><Users size={12} /> {report.peopleCount} {report.peopleCount === 1 ? 'persona' : 'personas'} · {report.passCount} {report.passCount === 1 ? 'paso' : 'pasos'}</small>}
      {(onMap || children) && <div className="report-card-actions">{onMap && <button className="button-secondary" onClick={() => onMap(report)}><MapPin size={14} /> Ver en el mapa</button>}{children}</div>}
    </div>
  </article>;
}
