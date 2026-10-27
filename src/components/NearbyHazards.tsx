import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import type { Position, Report } from '../types';
import { metersBetween, usableGPS } from '../services/community';
import PotholeSymbol from './PotholeSymbol';
import '../community.css';

interface Props { enabled: boolean; onToggle: () => void; location: Position | null; reports: Report[]; updatedAt: number; feedError: boolean; onMap: (report: Report) => void }
export default function NearbyHazards({ enabled, onToggle, location, reports, updatedAt, feedError, onMap }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [enabled]);
  const gpsReady = usableGPS(location, now);
  const feedReady = updatedAt > 0 && now - updatedAt < 30000 && !feedError;
  const nearby = enabled && gpsReady && feedReady ? reports
    .filter(report => !dismissed.has(report.id) && !['REPAIRED', 'REJECTED'].includes(report.status))
    .map(report => ({ report, meters: metersBetween(location, report.location) }))
    .filter(item => item.meters <= 200).sort((a, b) => a.meters - b.meters)[0] : undefined;
  return <>
    <section className="community-alert-control" aria-label="Alertas de huecos cercanos">
      <div>{enabled ? <Bell size={19} /> : <BellOff size={19} />}<div><strong>Alertas de huecos cercanos</strong><p>{!enabled ? 'Actívalas para ver avisos a menos de 200 m mientras usas la app.' : !gpsReady ? 'Esperando GPS reciente y preciso. Permite la ubicación del celular.' : !feedReady ? 'Actualizando avisos. Comprueba tu conexión si tarda.' : 'Activas · Avisos comunitarios y detecciones · Se actualizan cada 15 s.'}</p></div></div>
      <button className="button-secondary" aria-pressed={enabled} onClick={() => { setDismissed(new Set()); setNow(Date.now()); onToggle(); }}>{enabled ? 'Desactivar alertas' : 'Activar alertas'}</button>
    </section>
    {nearby && <aside className="nearby-hazard" role="alert" aria-live="assertive" aria-atomic="true">
      <PotholeSymbol size={60} /><div><strong>Este hueco es peligroso, cuidado</strong><p>A unos {Math.max(1, Math.round(nearby.meters / 10) * 10)} m · Distancia aproximada</p><small>{nearby.report.source === 'COMMUNITY' ? 'Aviso de la comunidad' : 'Detección de YOLO'} · Riesgo sin verificar</small><button className="button-secondary" onClick={() => onMap(nearby.report)}>Ver hueco en el mapa</button></div>
      <button className="nearby-dismiss" aria-label="Cerrar aviso de hueco cercano" onClick={() => setDismissed(current => new Set(current).add(nearby.report.id))}><X size={20} /></button>
    </aside>}
  </>;
}
