import { useState } from 'react';
import { Combine, ListOrdered, Route, Wrench } from 'lucide-react';
import '../../operator.css';
import type { Me, Position, Report } from '../../types';
import { OperatorView } from '../../services/operator';
import WorkQueue from './WorkQueue';
import DayPlan from './DayPlan';
import DuplicateReview from './DuplicateReview';

type Section = 'queue' | 'plan' | 'duplicates';
interface Props { me: Me | null; location: Position | null; onMap: (report: Report) => void }

/** Workspace for field staff (Operator and Administrator roles). */
export default function OperatorPanel({ me, location, onMap }: Props) {
  const [section, setSection] = useState<Section>('queue');
  if (me && !OperatorView.canUseMaintenance(me)) return <div className="page"><div className="empty-state"><Wrench size={30} /><strong>Solo para operarios</strong><p>Tu cuenta no tiene permisos para esta sección.</p></div></div>;
  const tabs: [Section, string, typeof Wrench][] = [['queue', 'Cola de trabajo', ListOrdered], ['plan', 'Plan de jornada', Route], ['duplicates', 'Duplicados', Combine]];
  return <div className="page operator-page">
    <div className="page-heading"><div><span className="eyebrow"><Wrench size={13} /> MANTENIMIENTO VIAL</span><h1>Primero lo <em>más urgente.</em></h1></div></div>
    <div className="segmented scrollable" role="tablist" aria-label="Secciones de mantenimiento">
      {tabs.map(([key, label, Icon]) => <button key={key} role="tab" aria-selected={section === key} onClick={() => setSection(key)}><Icon size={15} /> {label}</button>)}
    </div>
    {section === 'queue' && <WorkQueue onMap={onMap} />}
    {section === 'plan' && <DayPlan location={location} onMap={onMap} />}
    {section === 'duplicates' && <DuplicateReview onMap={onMap} />}
  </div>;
}
