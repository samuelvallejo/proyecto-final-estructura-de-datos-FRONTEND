import { useEffect, useState } from 'react';
import { Combine, Grid3x3 } from 'lucide-react';
import type { Report } from '../../types';
import type { DuplicateCluster, DuplicateReview as DuplicateReviewData } from '../../types/operator';
import type { NeighbourMethod } from '../../services/operator';
import { OperatorApi, OperatorView } from '../../services/operator';
import { Formatter } from '../../services/format';
import ReportCard from '../ReportCard';
import LoadingIndicator from '../LoadingIndicator';

interface Props { onMap: (report: Report) => void; readOnlyReason?: string }

/** Groups of reports that probably describe the same pothole, for human review and merge. */
export default function DuplicateReview({ onMap, readOnlyReason }: Props) {
  const [radius, setRadius] = useState(15);
  const [method, setMethod] = useState<NeighbourMethod>('grid');
  const [loaded, setLoaded] = useState<{ key: string; data: DuplicateReviewData } | null>(null);
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [revision, setRevision] = useState(0);

  const key = `${radius}:${method}:${revision}`;
  // Results of another radius are hidden while the new ones load.
  const review = loaded?.key === key ? loaded.data : null;
  useEffect(() => {
    const controller = new AbortController();
    OperatorApi.loadDuplicates(radius, controller.signal, method)
      .then(data => { setLoaded({ key: `${radius}:${method}:${revision}`, data }); setError(''); setExcluded({}); })
      .catch((cause: Error) => { if (cause.name !== 'AbortError') setError(cause.message); });
    return () => controller.abort();
  }, [radius, method, revision]);

  async function merge(cluster: DuplicateCluster) {
    const ids = cluster.duplicates.map(report => report.id).filter(id => !excluded[id]);
    if (!ids.length) return;
    setBusy(cluster.canonical.id); setError(''); setNotice('');
    try {
      const result = await OperatorApi.mergeDuplicates(cluster.canonical.id, ids);
      setNotice(`${result.merged} ${result.merged === 1 ? 'reporte fusionado' : 'reportes fusionados'}; ${result.passesMoved} pasos trasladados al bache principal.`);
      setRevision(value => value + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  }

  const stats = review?.stats;
  return <section className="operator-section" aria-labelledby="duplicates-title">
    <header className="operator-header"><div><h2 id="duplicates-title">Baches duplicados</h2>
      <p className="form-help">Reportes abiertos tan cercanos que probablemente son el mismo hueco. Revisa cada grupo antes de fusionarlo.</p></div>
      <label className="compact-select">Radio<select value={radius} onChange={event => setRadius(Number(event.target.value))}>
        {[5, 10, 15, 25, 50].map(value => <option key={value} value={value}>{value} m</option>)}</select></label>
    </header>
    <label className="compact-select">Estrategia de búsqueda de vecinos<select value={method} onChange={event => setMethod(event.target.value as NeighbourMethod)}>
      {(Object.keys(OperatorView.neighbourMethodText) as NeighbourMethod[]).map(value => <option key={value} value={value}>{OperatorView.neighbourMethodText[value]}</option>)}</select></label>
    {stats && <p className="structure-note" role="status"><Grid3x3 size={14} /> {OperatorView.neighbourMethodText[method]} + unión-búsqueda: {stats.candidateChecks} comparaciones medidas de {stats.bruteForceChecks} posibles ({OperatorView.checksAvoidedPercent(stats).toLocaleString('es-CO')} % evitadas). {stats.potholes} baches abiertos ≈ {stats.estimatedPhysicalPotholes} huecos físicos.</p>}
    {readOnlyReason && <p className="message info" role="note">{readOnlyReason}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}
    {!review && !error && <LoadingIndicator label="Buscando duplicados…" />}
    {review && !review.clusters.length && <div className="empty-state"><strong>Sin duplicados a {radius} m</strong><p>Cada bache abierto está separado de los demás.</p></div>}
    {review?.clusters.map(cluster => <article className="duplicate-cluster" key={cluster.canonical.id}>
      <h3>{cluster.size} reportes · separación máxima {Formatter.distanceText(cluster.maxSpanMeters)}</h3>
      <p className="form-help">Principal (primer registro): conserva el historial y recibe los pasos.</p>
      <ReportCard report={cluster.canonical} onMap={onMap} />
      <p className="form-help">Duplicados propuestos: desmarca los que sean huecos distintos.</p>
      {cluster.duplicates.map(report => <label className="duplicate-option" key={report.id}>
        <input type="checkbox" checked={!excluded[report.id]} disabled={Boolean(readOnlyReason)}
          onChange={event => setExcluded(current => ({ ...current, [report.id]: !event.target.checked }))} />
        <ReportCard report={report} />
      </label>)}
      <button className="button-primary" disabled={busy === cluster.canonical.id || Boolean(readOnlyReason)
        || cluster.duplicates.every(report => excluded[report.id])} onClick={() => void merge(cluster)}><Combine size={16} /> Fusionar seleccionados</button>
    </article>)}
  </section>;
}
