import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../community.css';
import type { Position, Report, Trip } from '../types';
import { LocateFixed, Maximize2 } from 'lucide-react';

interface Props { reports: Report[]; location: Position | null; focus?: Report | null; onSelect?: (report: Report) => void; trip?: Trip | null }
export default function ReportMap({ reports, location, focus, onSelect, trip }: Props) {
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
    const instance = L.map(container.current, { zoomControl: false, zoomAnimation: false,
      fadeAnimation: false, markerZoomAnimation: false, inertia: false })
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
    if (trip) {
      const path = (trip.path || []).map(point => [point.lat, point.lng] as L.LatLngTuple);
      if (path.length > 1) L.polyline(path, { color: '#3d7951', weight: 5, opacity: .85 }).addTo(layer.current);
      const pointA = L.circleMarker([trip.start.lat, trip.start.lng], { radius: 11, color: '#fff', weight: 3, fillColor: '#2b7044', fillOpacity: 1 }).addTo(layer.current);
      const startLabel = document.createElement('span'); startLabel.textContent = `A · ${trip.pointA}`; pointA.bindPopup(startLabel);
      if (trip.end) { const endLabel = document.createElement('span'); endLabel.textContent = `B · ${trip.pointB}`; L.circleMarker([trip.end.lat, trip.end.lng], { radius: 11, color: '#fff', weight: 3, fillColor: '#ca7b19', fillOpacity: 1 }).addTo(layer.current).bindPopup(endLabel); }
      if (!focus && path.length > 1) map.current.fitBounds(path, { padding: [35, 35], maxZoom: 17, animate: false });
    }
    const visibleReports = focus && !reports.some(report => report.id === focus.id) ? [...reports, focus] : reports;
    for (const report of visibleReports) {
      const icon = L.divIcon({ className: 'pothole-map-icon', iconSize: [44, 44], iconAnchor: [22, 40], popupAnchor: [0, -35], html: `<span class="pothole-marker ${report.hazardLevel.toLowerCase()}"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 3 45 40a3 3 0 0 1-2.6 4.5H5.6A3 3 0 0 1 3 40L24 3Z" fill="#ffdc65" stroke="#773b16" stroke-width="2.5" stroke-linejoin="round"/><path d="m12 32 6-3 4 2 5-4 7 3 3 5-7 4-11-1-7-6Z" fill="#49372e"/><path d="m12 32 8 1 7-2 10 4M24 14v7" stroke="#fff9dc" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="25" r="1.5" fill="#773b16"/></svg></span>` });
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = 'Este hueco es peligroso, cuidado';
      popup.append(title);
      const levels = { LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto', CRITICAL: 'Crítico' };
      for (const text of [
        `Riesgo ${levels[report.hazardLevel]}: ${report.hazardScore}/100`,
        [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', '),
        `${report.location.lat.toFixed(6)}, ${report.location.lng.toFixed(6)}`,
        `GPS del celular ±${Math.round(report.location.accuracy)} m`,
        report.source === 'COMMUNITY' ? 'Aviso comunitario · Riesgo indicado por un usuario, sin verificar' : 'Detección YOLO · Riesgo visual sin verificar',
        report.aiDescription,
      ].filter(Boolean)) { const line = document.createElement('div'); line.textContent = text; popup.append(line); }
      const marker = L.marker([report.location.lat, report.location.lng], { icon,
        title: 'Hueco reportado. Cuidado. Toca para ver detalles.', alt: 'Símbolo de hueco reportado',
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
    if (!trip && !focus && !location && reports.length > 0 && fittedReportIds.current !== reportIds) {
      map.current.fitBounds(reports.map(item => [item.location.lat, item.location.lng] as L.LatLngTuple), {
        padding: [28, 28], maxZoom: 15, animate: false,
      });
      fittedReportIds.current = reportIds;
    }
    if (!trip && !focus && location && !centeredLocation.current) { map.current.setView([location.lat, location.lng], 16, { animate: false }); centeredLocation.current = true; }
  }, [reports, location, focus, onSelect, trip]);
  useEffect(() => {
    if (focus) map.current?.setView([focus.location.lat, focus.location.lng], 17, { animate: false });
  }, [focus]);
  function fitReports() {
    if (!map.current || !reports.length) return;
    map.current.fitBounds(reports.map(report => [report.location.lat, report.location.lng] as L.LatLngTuple), { padding: [28, 28], maxZoom: 15, animate: false });
  }
  return <div className="map-wrapper">
    <div ref={container} className="report-map" aria-label="Mapa de reportes viales" />
    <div className="map-tools" aria-label="Controles del mapa">
      <button onClick={() => location && map.current?.setView([location.lat, location.lng], 16, { animate: false })} disabled={!location}><LocateFixed size={16} /> Mi ubicación</button>
      <button onClick={fitReports} disabled={!reports.length}><Maximize2 size={16} /> Ver todos</button>
    </div>
    {tileError && <p className="map-tile-warning" role="status">No se pudo cargar parte del mapa. Comprueba tu conexión; los puntos cargados siguen disponibles.</p>}
  </div>;
}
