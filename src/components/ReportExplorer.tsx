import { useState } from 'react';
import { Download, MapPin, Search, Star } from 'lucide-react';
import type { Report } from '../types';
import { damageLabels, filterReports, reportsCsv, riskLabels } from '../services/reportTools';

interface Props { reports: Report[]; total: number; loading: boolean; onMap: (report: Report) => void }
const storageKey = 'bachescan-favorites-v1';
function readFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}
export default function ReportExplorer({ reports, total, loading, onMap }: Props) {
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState('');
  const [damage, setDamage] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);
  const [notice, setNotice] = useState('');
  const visible = filterReports(reports, { query, risk, damage, favoritesOnly }, favorites);
  const filtered = Boolean(query || risk || damage || favoritesOnly);
  function reset() { setQuery(''); setRisk(''); setDamage(''); setFavoritesOnly(false); }
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setNotice('Favoritos guardados en este navegador.'); }
    catch { setNotice('Favoritos disponibles durante esta sesión; el navegador no permite guardarlos.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([reportsCsv(visible)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `bachescan-reportes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`CSV generado con ${visible.length} reportes filtrados.`);
  }
  return <section className="report-explorer" aria-label="Explorar reportes">
    <div className="explorer-controls">
      <label className="search-control"><span><Search size={15} /> Buscar reportes</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Calle, barrio, ciudad, daño o ID" /></label>
      <div className="explorer-selects">
        <label>Nivel de riesgo<select value={risk} onChange={event => setRisk(event.target.value)}><option value="">Todos los niveles</option>{Object.entries(riskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Tipo de daño<select value={damage} onChange={event => setDamage(event.target.value)}><option value="">Todos los daños</option>{Object.entries(damageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className="favorite-filter"><input type="checkbox" checked={favoritesOnly} onChange={event => setFavoritesOnly(event.target.checked)} /> Solo favoritos de este navegador</label>
      <div className="explorer-actions"><button className="button-secondary" disabled={!filtered} onClick={reset}>Limpiar filtros</button><button className="button-primary" disabled={!visible.length || loading} onClick={download}><Download size={15} /> Exportar CSV</button></div>
    </div>
    <p className="explorer-count" role="status">{loading ? 'Actualizando reportes…' : `${visible.length} resultados de ${reports.length} cargados · ${total} en plataforma`}</p>
    {total > reports.length && <p className="explorer-help">Los filtros y el CSV incluyen los reportes cargados. Usa «Cargar más reportes» para ampliar la búsqueda.</p>}
    {notice && <p className="explorer-help" role="status">{notice}</p>}
    {!loading && !visible.length && reports.length > 0 && <div className="empty-state"><Search size={26} /><strong>No hay coincidencias</strong><p>Prueba otra búsqueda o limpia los filtros.</p><button className="button-secondary" onClick={reset}>Mostrar todos</button></div>}
    {visible.map(report => <article key={report.id} className="explorer-report">
      <div className="report-title"><strong>{damageLabels[report.potholeType || 'OTRO_DANO']}</strong><span className={`risk-label risk-${report.hazardLevel.toLowerCase()}`}>{riskLabels[report.hazardLevel]}</span>
        <button className="favorite-button" aria-label={`${favorites.includes(report.id) ? 'Quitar de' : 'Añadir a'} favoritos: ${report.id}`} aria-pressed={favorites.includes(report.id)} onClick={() => toggleFavorite(report.id)}><Star size={20} fill={favorites.includes(report.id) ? 'currentColor' : 'none'} /></button></div>
      <p>{[report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', ') || 'Dirección no disponible'}</p>
      <small>{new Date(report.timestamp).toLocaleString('es-CO')} · Riesgo {report.hazardScore}/100 · Sin verificar</small>
      <details><summary>Ver detalles del reporte</summary><p>{report.aiDescription || 'Sin descripción disponible.'}</p>
        {report.riskFactors.length > 0 && <ul>{report.riskFactors.map((factor, index) => <li key={index}>{factor}</li>)}</ul>}
        <p>GPS: {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)} · ±{Math.round(report.location.accuracy)} m</p><p className="report-id">ID: {report.id}</p></details>
      <button className="button-secondary" onClick={() => onMap(report)}><MapPin size={15} /> Ver ubicación en mapa</button>
    </article>)}
  </section>;
}
