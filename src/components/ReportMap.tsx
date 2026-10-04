import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Position, Report } from '../types';
import { LocateFixed, Maximize2 } from 'lucide-react';

interface Props { reports: Report[]; location: Position | null; focus?: Report | null; onSelect?: (report: Report) => void }
export default function ReportMap({ reports, location, focus, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fittedReportIds = useRef('');
  const centeredLocation = useRef(false);
  const [tileError, setTileError] = useState(false);
  const [initialView] = useState(() => ({
    center: (location
      ? [location.lat, location.lng]
      : reports.length ? [reports[0].location.lat, reports[0].location.lng] : [8.2362, -73.356]) as L.LatLngExpression,
    zoom: location || reports.length ? 15 : 12,
  }));
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: false })
      .setView(initialView.center, initialView.zoom);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(instance);
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('load', () => setTileError(false));
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    map.current = instance;
    layer.current = L.layerGroup().addTo(instance);
    const timer = setTimeout(() => instance.invalidateSize(), 150);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { clearTimeout(timer); observer.disconnect(); instance.remove(); map.current = null; layer.current = null; };
  }, [initialView]);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const visibleReports = focus && !reports.some(report => report.id === focus.id) ? [...reports, focus] : reports;
    for (const report of visibleReports) {
      const color = report.hazardScore >= 80 ? '#ff5f49' : report.hazardScore >= 60 ? '#ffad4f' : '#c8ed60';
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = report.potholeType === 'BACHE' ? 'Posible bache' : report.potholeType || 'Daño vial';
      popup.append(title);
      const levels = { LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto', CRITICAL: 'Crítico' };
      for (const text of [
        `Riesgo ${levels[report.hazardLevel]}: ${report.hazardScore}/100`,
        [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', '),
        `${report.location.lat.toFixed(6)}, ${report.location.lng.toFixed(6)}`,
        `GPS del celular ±${Math.round(report.location.accuracy)} m`,
        'Evaluación visual de IA pendiente de verificación',
      ].filter(Boolean)) { const line = document.createElement('div'); line.textContent = text; popup.append(line); }
      const marker = L.circleMarker([report.location.lat, report.location.lng], {
        radius: 10, color: '#10271f', weight: 3, fillColor: color, fillOpacity: 1,
      }).addTo(layer.current).bindPopup(popup);
      marker.on('click', () => onSelect?.(report));
      if (focus?.id === report.id) marker.openPopup();
    }
    if (location) {
      L.circle([location.lat, location.lng], {
        radius: Math.min(location.accuracy, 500), color: '#2563eb', weight: 1,
        fillColor: '#2563eb', fillOpacity: .12,
      }).addTo(layer.current);
      L.circleMarker([location.lat, location.lng], {
        radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
      }).addTo(layer.current).bindPopup('Ubicación aproximada de tu celular');
    }
    const reportIds = reports.map(report => report.id).join('|');
    if (!focus && reports.length > 0 && fittedReportIds.current !== reportIds) {
      map.current.fitBounds(reports.map(item => [item.location.lat, item.location.lng] as L.LatLngTuple), {
        padding: [28, 28], maxZoom: 15,
      });
      fittedReportIds.current = reportIds;
    }
    if (!focus && location && !reports.length && !centeredLocation.current) { map.current.setView([location.lat, location.lng], 16); centeredLocation.current = true; }
  }, [reports, location, focus, onSelect]);
  useEffect(() => {
    if (focus) map.current?.setView([focus.location.lat, focus.location.lng], 17);
  }, [focus]);
  function fitReports() {
    if (!map.current || !reports.length) return;
    map.current.fitBounds(reports.map(report => [report.location.lat, report.location.lng] as L.LatLngTuple), { padding: [28, 28], maxZoom: 15 });
  }
  return <div className="map-wrapper">
    <div ref={container} className="report-map" aria-label="Mapa de reportes viales" />
    <div className="map-tools" aria-label="Controles del mapa">
      <button onClick={() => location && map.current?.setView([location.lat, location.lng], 16)} disabled={!location}><LocateFixed size={16} /> Mi ubicación</button>
      <button onClick={fitReports} disabled={!reports.length}><Maximize2 size={16} /> Ver todos</button>
    </div>
    {tileError && <p className="map-tile-warning" role="status">No se pudo cargar parte del mapa. Comprueba tu conexión; los puntos cargados siguen disponibles.</p>}
  </div>;
}
