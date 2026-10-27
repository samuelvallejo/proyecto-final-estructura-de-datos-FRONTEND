import { lazy, Suspense, useState } from 'react';
import { Network } from 'lucide-react';
import type { Report } from '../../types';
import LoadingIndicator from '../LoadingIndicator';
import '../../graphs.css';
const GraphWorkspace = lazy(() => import('./GraphWorkspace'));
export default function GraphExplorer({ onMap, defaultOpen = false }: { onMap: (report: Report) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="graph-explorer" aria-label="Explorador de grafos de baches">
    <div className="graph-heading"><Network size={28} /><div><h2>Conecta los baches cercanos</h2><p>Descubre grupos de reportes y explora cómo se relacionan por su distancia.</p></div></div>
    <button className="button-secondary" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Cerrar explorador de grafos' : 'Abrir explorador de grafos'}</button>
    {open && <Suspense fallback={<LoadingIndicator label="Preparando explorador de grafos…" />}><GraphWorkspace onMap={onMap} /></Suspense>}
  </section>;
}
