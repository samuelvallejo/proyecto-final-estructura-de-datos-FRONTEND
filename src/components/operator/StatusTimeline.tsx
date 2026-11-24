import { useEffect, useState } from 'react';
import { OperatorApi } from '../../services/operator';
import { Formatter } from '../../services/format';
import type { StatusEvent } from '../../types/operator';
import LoadingIndicator from '../LoadingIndicator';

/** Status history of one pothole, oldest first, as recorded in status_events. */
export default function StatusTimeline({ reportId, revision }: { reportId: string; revision: number }) {
  const [events, setEvents] = useState<StatusEvent[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    OperatorApi.loadStatusTimeline(reportId)
      .then(data => { if (active) { setEvents(data.events); setError(''); } })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [reportId, revision]);
  if (error) return <p className="message error" role="alert">{error}</p>;
  if (!events) return <LoadingIndicator compact label="Cargando historial…" />;
  return <ol className="status-timeline" aria-label="Historial de estados">
    {events.map(event => <li key={event.id}>
      <time>{Formatter.timeText(event.at)}</time>
      <strong>{Formatter.statusText[event.from] || 'Registro'} → {Formatter.statusText[event.to] || event.to}</strong>
      <span>{event.actorName} · {event.reason}</span>
    </li>)}
  </ol>;
}
