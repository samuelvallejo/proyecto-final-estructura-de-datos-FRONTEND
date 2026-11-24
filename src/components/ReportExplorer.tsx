import { useState } from 'react';
import '../trees.css';
import { Download, MapPin, Search, Star } from 'lucide-react';
import type { Report } from '../types';
import { ReportTools } from '../services/reportTools';
import { ReportRiskIndex } from '../services/reportTree';
import { Formatter } from '../services/format';
import { SearchView } from '../services/search';
import useReportSearch from '../hooks/useReportSearch';

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
  const [treeOrder, setTreeOrder] = useState<'original' | 'ascending' | 'descending'>('original');
  const search = useReportSearch(query);
  // With a server answer the text filter already ran on the whole platform; the other filters still apply.
  const base = SearchView.searchBase(reports, query, search.response ? { query: search.query, reports: search.response.reports } : null);
  const visible = ReportRiskIndex.orderReports(ReportTools.filterReports(base.reports, { query: base.fromServer ? '' : query, risk, damage, favoritesOnly }, favorites), treeOrder);
  const filtered = Boolean(query || risk || damage || favoritesOnly);
  function reset() { setQuery(''); setRisk(''); setDamage(''); setFavoritesOnly(false); }
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setNotice('Favoritos guardados en este navegador.'); }
    catch { setNotice('Favoritos disponibles durante esta sesión; el navegador no permite guardarlos.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([ReportTools.reportsCsv(visible)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `bachescan-reportes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`CSV generado con ${visible.length} reportes filtrados.`);
  }
  return <section className="report-explorer" aria-label="Explorar reportes">
    <div className="explorer-controls">
      <label className="search-control"><span><Search size={15} /> Buscar reportes</span>
        <input type="search" maxLength={120} aria-describedby="report-search-help" list="report-place-suggestions" value={query} onChange={event => setQuery(event.target.value.slice(0,120))} placeholder="Calle, barrio, ciudad o daño" />
        <datalist id="report-place-suggestions">{search.suggestions.map(item => <option key={`${item.kind}-${item.label}`} value={item.label}>{`${SearchView.placeKindText[item.kind]} · ${item.count} ${item.count === 1 ? 'reporte' : 'reportes'}`}</option>)}</datalist></label>
      <div className="explorer-selects">
        <label>Nivel de riesgo<select value={risk} onChange={event => setRisk(event.target.value)}><option value="">Todos los niveles</option>{Object.entries(ReportTools.riskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Tipo de daño<select value={damage} onChange={event => setDamage(event.target.value)}><option value="">Todos los daños</option>{Object.entries(ReportTools.damageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className="tree-order">Ordenar los reportes cargados<select value={treeOrder} onChange={event => setTreeOrder(event.target.value as typeof treeOrder)}><option value="original">Conservar orden de la consulta</option><option value="descending">Mayor riesgo primero (árbol binario)</option><option value="ascending">Menor riesgo primero (árbol binario)</option></select></label>
      <label className="favorite-filter"><input type="checkbox" checked={favoritesOnly} onChange={event => setFavoritesOnly(event.target.checked)} /> Solo favoritos de este navegador</label>
      <div className="explorer-actions"><button className="button-secondary" disabled={!filtered} onClick={reset}>Limpiar filtros</button><button className="button-primary" disabled={!visible.length || loading} onClick={download}><Download size={15} /> Exportar CSV</button></div>
    </div>
    <p className="form-help" id="report-search-help">Busca por calle, barrio, ciudad o daño: máximo 120 caracteres. Desde dos letras la búsqueda recorre todos los reportes activos de la plataforma. Elige un riesgo o tipo de daño para reducir los resultados; «Limpiar filtros» vuelve a mostrarlos todos.</p>
    <p className="explorer-count" role="status">{loading ? 'Actualizando reportes…' : search.searching ? 'Buscando en toda la plataforma…'
      : base.fromServer && search.response ? `${visible.length} resultados · ${search.response.total} coincidencias en toda la plataforma (${search.response.tookMs.toLocaleString('es-CO')} ms en el servidor)`
        : `${visible.length} resultados de ${reports.length} cargados · ${total} en plataforma`}</p>
    {search.error && <p className="explorer-help" role="status">No se pudo buscar en el servidor ({search.error}). Se muestran coincidencias entre los reportes cargados.</p>}
    {!base.fromServer && total > reports.length && <p className="explorer-help">Sin texto de búsqueda, los filtros y el CSV usan los reportes cargados. Usa «Cargar más reportes» para ampliarlos.</p>}
    {notice && <p className="explorer-help" role="status">{notice}</p>}
    {!loading && !search.searching && !visible.length && (reports.length > 0 || base.fromServer) && <div className="empty-state"><Search size={26} /><strong>No hay coincidencias</strong><p>Prueba otra búsqueda o limpia los filtros.</p><button className="button-secondary" onClick={reset}>Mostrar todos</button></div>}
    {visible.map(report => <article key={report.id} className="explorer-report">
      <div className="report-title"><strong>{ReportTools.damageLabels[report.potholeType || 'OTRO_DANO']}</strong><span className={`risk-label risk-${report.hazardLevel.toLowerCase()}`}>{ReportTools.riskLabels[report.hazardLevel]}</span>
        <button className="favorite-button" aria-label={`${favorites.includes(report.id) ? 'Quitar de' : 'Añadir a'} favoritos: ${report.id}`} aria-pressed={favorites.includes(report.id)} onClick={() => toggleFavorite(report.id)}><Star size={20} fill={favorites.includes(report.id) ? 'currentColor' : 'none'} /></button></div>
      <p>{[report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', ') || 'Dirección no disponible'}</p>
      <small>{new Date(report.timestamp).toLocaleString('es-CO')} · Riesgo {report.hazardScore}/100 · {Formatter.statusText[report.status] || Formatter.statusText.UNVERIFIED}</small>
      <details><summary>Ver detalles del reporte</summary><p>{report.aiDescription || 'Sin descripción disponible.'}</p>
        {report.riskFactors.length > 0 && <ul>{report.riskFactors.map((factor, index) => <li key={index}>{factor}</li>)}</ul>}
        <p>GPS: {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)} · ±{Math.round(report.location.accuracy)} m</p></details>
      <button className="button-secondary" onClick={() => onMap(report)}><MapPin size={15} /> Ver ubicación en mapa</button>
    </article>)}
  </section>;
}
