import { lazy, Suspense, useEffect, useState } from 'react';
import { Bike, Car, Clock3, Footprints, MapPinned, Route } from 'lucide-react';
import type { Trip } from '../types';
import { loadTrip, loadTrips } from '../services/trips';
import { distanceText, durationText } from '../services/format';
import LoadingIndicator from './LoadingIndicator';
const ReportMap = lazy(() => import('./ReportMap'));

export function TripMetrics({ trip }: { trip: Trip }) {
  return <div className="session-metrics">
    <span><Clock3 size={14} /><b>{durationText(trip.durationMs)}</b>duración</span>
    <span><MapPinned size={14} /><b>{trip.potholeCount ?? trip.reportCount}</b>baches en el trayecto</span>
    <span><Footprints size={14} /><b>{trip.passCount ?? 0}</b>baches conocidos</span>
    {trip.distanceMeters != null && <span><Route size={14} /><b>{distanceText(trip.distanceMeters)}</b>distancia</span>}
  </div>;
}

export default function TripHistory() {
  const [trips, setTrips] = useState<Trip[]>([]); const [selected, setSelected] = useState<Trip | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let cancelled = false; void loadTrips().then(data => { if (!cancelled) setTrips(data.trips); }).catch(() => { if (!cancelled) setError('No se pudieron cargar tus recorridos. Inténtalo de nuevo.'); }).finally(() => { if (!cancelled) setBusy(false); }); return () => { cancelled = true; }; }, []);
  async function select(id: string) { if (busy) return; setBusy(true); setError(''); try { setSelected(await loadTrip(id)); } catch { setError('No se pudo completar la operación. Inténtalo de nuevo.'); } finally { setBusy(false); } }
  return <>{busy && <LoadingIndicator label="Cargando recorridos…" />}{error && <p className="message error" role="alert">{error}</p>}
    {selected && <section className="journey-preview"><h2>{selected.name}</h2><p className="section-description">{selected.pointA} → {selected.pointB}</p><TripMetrics trip={selected} /><div className="map-frame"><Suspense fallback={<LoadingIndicator label="Preparando mapa…" />}><ReportMap reports={selected.reports || []} location={null} trip={selected} /></Suspense></div><p className="form-help">Línea: posiciones GPS registradas. A: inicio real. B: última posición al finalizar. Los marcadores muestran el riesgo visual de cada bache.</p></section>}
    {!busy && trips.length === 0 && <div className="empty-state"><strong>Aún no tienes recorridos</strong><p>Inicia el modo conducción o completa el formulario de A a B en Escanear.</p></div>}
    <div className="journey-history">{trips.map(trip => <article className="journey-panel" key={trip.id}>
      <h2>{trip.vehicle === 'moto' ? <Bike size={18} /> : trip.vehicle === 'carro' ? <Car size={18} /> : <Route size={18} />} {trip.name}</h2>
      <p>{trip.pointA} → {trip.pointB}</p>
      <p className="form-help">{new Date(trip.startedAt).toLocaleString('es-CO')} · {trip.endedAt ? 'Finalizado' : 'Activo'}</p>
      <TripMetrics trip={trip} />
      <button disabled={busy} className="button-secondary" onClick={() => void select(trip.id)}>Ver recorrido en el mapa</button>
    </article>)}</div></>;
}
