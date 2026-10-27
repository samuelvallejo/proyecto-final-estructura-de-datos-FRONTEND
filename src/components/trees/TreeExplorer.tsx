import { lazy, Suspense, useState } from 'react';
import { GitBranch } from 'lucide-react';
import type { Report } from '../../types';
import LoadingIndicator from '../LoadingIndicator';
import '../../trees.css';
const TreeWorkspace = lazy(() => import('./TreeWorkspace'));
export default function TreeExplorer({ onMap, defaultOpen = false }: { onMap: (report: Report) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="tree-explorer" aria-label="Explorador de árboles de reportes"><div className="tree-heading"><GitBranch size={27} /><div><h2>Explora los baches en un árbol</h2><p>Consulta el riesgo de los reportes y abre las ubicaciones como ramas.</p></div></div><button className="button-secondary" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Cerrar explorador de árboles' : 'Abrir explorador de árboles'}</button>{open && <Suspense fallback={<LoadingIndicator label="Preparando explorador de árboles…" />}><TreeWorkspace onMap={onMap} /></Suspense>}</section>;
}
