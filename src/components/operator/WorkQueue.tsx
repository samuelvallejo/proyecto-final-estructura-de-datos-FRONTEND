import { useCallback, useEffect, useState } from 'react';
import { History, Layers } from 'lucide-react';
import type { Report, ReportStatus } from '../../types';
import type { QueueItem, WorkQueue as WorkQueueData } from '../../types/operator';
import { OperatorApi, OperatorView } from '../../services/operator';
import { Formatter } from '../../services/format';
import ReportCard from '../ReportCard';
import LoadingIndicator from '../LoadingIndicator';
import StatusTimeline from './StatusTimeline';

interface Props { onMap: (report: Report) => void; readOnlyReason?: string }

function ScoreBar({ item }: { item: QueueItem }) {
  const segments = OperatorView.scoreSegments(item.priority);
  return <div className="score-block">
    <div className="score-head"><span>Prioridad</span><strong>{item.priority.score.toLocaleString('es-CO')}/100</strong></div>
    <div className="score-bar" role="img" aria-label={`Prioridad ${item.priority.score} de 100`}>
      {segments.map(segment => <span key={segment.key} className={`score-${segment.key}`} style={{ width: `${segment.percent}%` }} title={`${segment.label}: ${segment.value}`} />)}
    </div>
    <ul className="score-legend">{segments.map(segment => <li key={segment.key}><i className={`score-${segment.key}`} />{segment.label} {segment.value.toLocaleString('es-CO')}</li>)}</ul>
  </div>;
}

/** Open potholes ranked by the backend indexed max-heap, with workflow actions. */
export default function WorkQueue({ onMap, readOnlyReason }: Props) {
  const [queue, setQueue] = useState<WorkQueueData | null>(null);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    OperatorApi.loadWorkQueue(limit, controller.signal)
      .then(data => { setQueue(data); setError(''); })
      .catch((cause: Error) => { if (cause.name !== 'AbortError') setError(cause.message); });
    return () => controller.abort();
  }, [limit, revision]);

  async function move(item: QueueItem, status: ReportStatus) {
    setBusy(item.report.id); setError(''); setNotice('');
    try {
      await OperatorApi.changeReportStatus(item.report.id, status, reasons[item.report.id] || '');
      setNotice(`${OperatorView.transitionText[status]}: listo. La cola se recalculó.`);
      setReasons(current => ({ ...current, [item.report.id]: '' }));
      refresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  }

  return <section className="operator-section" aria-labelledby="queue-title">
    <header className="operator-header">
      <div><h2 id="queue-title">Cola de mantenimiento</h2>
        <p className="form-help">Baches abiertos ordenados por prioridad: riesgo, personas expuestas, pasos y días de espera.</p></div>
      <label className="compact-select">Mostrar<select value={limit} onChange={event => setLimit(Number(event.target.value))}>
        {[10, 20, 50].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </header>
    {queue && <p className="structure-note" role="status"><Layers size={14} /> Montículo binario indexado: {queue.structure.size} baches, altura {queue.structure.height}, construido con {queue.structure.heapifyComparisons} comparaciones · {Formatter.timeText(queue.generatedAt)}</p>}
    {readOnlyReason && <p className="message info" role="note">{readOnlyReason}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}
    {!queue && !error && <LoadingIndicator label="Calculando prioridades…" />}
    {queue && !queue.items.length && <div className="empty-state"><strong>No hay baches abiertos</strong><p>Todo está reparado o descartado.</p></div>}
    {queue?.items.map(item => <div className="queue-item" key={item.report.id}>
      <span className="queue-rank" aria-label={`Puesto ${item.rank}`}>{item.rank}</span>
      <ReportCard report={item.report} onMap={onMap}>
        <button className="button-secondary" aria-expanded={open === item.report.id} onClick={() => setOpen(current => current === item.report.id ? '' : item.report.id)}><History size={14} /> Historial</button>
      </ReportCard>
      <ScoreBar item={item} />
      {item.allowedTransitions.length > 0 && <div className="transition-row">
        <label className="sr-only" htmlFor={`reason-${item.report.id}`}>Motivo del cambio</label>
        <input id={`reason-${item.report.id}`} maxLength={280} placeholder="Motivo (opcional)" value={reasons[item.report.id] || ''}
          disabled={Boolean(readOnlyReason)} onChange={event => setReasons(current => ({ ...current, [item.report.id]: event.target.value }))} />
        {item.allowedTransitions.map(status => <button key={status} className={status === 'REJECTED' ? 'button-secondary danger' : 'button-primary'}
          disabled={busy === item.report.id || Boolean(readOnlyReason)} onClick={() => void move(item, status)}>{OperatorView.transitionText[status]}</button>)}
      </div>}
      {open === item.report.id && <StatusTimeline reportId={item.report.id} revision={revision} />}
    </div>)}
    {queue && queue.total > queue.items.length && <p className="form-help">Se muestran {queue.items.length} de {queue.total} baches abiertos.</p>}
  </section>;
}
