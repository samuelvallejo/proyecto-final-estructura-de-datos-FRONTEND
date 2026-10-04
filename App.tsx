import { useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, Camera, Check, CirclePause, Compass,
  Crosshair, LocateFixed, MapPin, Radar, RefreshCw, Route, ScanLine,
  ShieldAlert, Sparkles, Square, X, Code2, ArrowLeft,
} from 'lucide-react';
import { ApiError, loadHealth, loadNearby, loadReports, loadStructures, patrolReport, scanFrame } from './services/api';
import type { Health, Position, Report, ScanResponse, StructureStats } from './types';
import { Stack } from './data-structures/Stack';
import ReportMap from './components/ReportMap';
import ReportExplorer from './components/ReportExplorer';

type Tab = 'scan' | 'map' | 'reports' | 'structures';
const structureLabels: Record<string, string> = {
  array: 'Arrays', singlyLinkedList: 'Lista simple', doublyLinkedList: 'Lista doble',
  circularSinglyLinkedList: 'Lista circular simple', circularDoublyLinkedList: 'Lista circular doble',
  queue: 'Colas FIFO', deque: 'Cola de doble extremo', stack: 'Pila LIFO',
};
const riskText: Record<string, string> = {
  LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto', CRITICAL: 'Crítico',
};
const typeText: Record<string, string> = {
  BACHE: 'Bache', HUNDIMIENTO: 'Hundimiento', GRIETA: 'Grieta', OTRO_DANO: 'Daño vial',
};
const timeText = (time: number) => new Date(time).toLocaleString('es-CO', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

function frameFromVideo(video: HTMLVideoElement): Promise<Blob> {
  // Analizar exactamente el recorte que ve el usuario (object-fit: cover).
  const stage = video.getBoundingClientRect();
  const scale = Math.max(stage.width / video.videoWidth, stage.height / video.videoHeight);
  const sourceWidth = stage.width / scale;
  const sourceHeight = stage.height / scale;
  const width = Math.min(960, Math.round(sourceWidth));
  const height = Math.round(width * sourceHeight / sourceWidth);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No se pudo leer la cámara.'));
  ctx.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el fotograma.')),
      'image/jpeg', 0.85));
}

export default function App() {
  const [tab, setTab] = useState<Tab>('scan');
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [finding, setFinding] = useState<ScanResponse | null>(null);
  const [location, setLocation] = useState<Position | null>(null);
  const [locationError, setLocationError] = useState('');
  const [error, setError] = useState('');
  const [lastCheck, setLastCheck] = useState('');
  const [lastScan, setLastScan] = useState<ScanResponse | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [mapFocus, setMapFocus] = useState<Report | null>(null);
  const [gpsRetry, setGpsRetry] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [totalReports, setTotalReports] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<'recent' | 'priority'>('recent');
  const [health, setHealth] = useState<Health | null>(null);
  const [structures, setStructures] = useState<StructureStats | null>(null);
  const [nearby, setNearby] = useState<Report[]>([]);
  const [patrol, setPatrol] = useState<Report | null>(null);
  const [patrolBusy, setPatrolBusy] = useState(false);
  const history = useRef(new Stack<Tab>());
  const [historySize, setHistorySize] = useState(0);
  const refreshSequence = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const locationRef = useRef<Position | null>(null);
  const locationDenied = useRef(false);

  async function refreshReports(mode: 'recent' | 'priority' = sort, append = false) {
    const sequence = ++refreshSequence.current;
    setLoadingReports(true);
    try {
      const page = await loadReports(mode, append ? reports.length : 0);
      if (sequence !== refreshSequence.current) return;
      setReports(current => append ? [...current, ...page.reports.filter(item => !current.some(old => old.id === item.id))] : page.reports);
      setTotalReports(page.total); setHasMore(page.hasMore);
    }
    catch (cause) { if (sequence === refreshSequence.current) setError((cause as Error).message); }
    finally { if (sequence === refreshSequence.current) setLoadingReports(false); }
  }
  useEffect(() => {
    void refreshReports();
    void loadHealth().then(setHealth).catch(() => {});
  }, []);
  useEffect(() => {
    if (tab !== 'structures') return;
    const controller = new AbortController();
    void loadStructures().then(data => { if (!controller.signal.aborted) setStructures(data); })
      .catch(cause => { if (!controller.signal.aborted) setError((cause as Error).message); });
    return () => controller.abort();
  }, [tab]);
  useEffect(() => {
    if (tab !== 'map' || !location) return;
    let cancelled = false;
    void loadNearby(location).then(page => { if (!cancelled) setNearby(page.reports); })
      .catch(cause => { if (!cancelled) setError((cause as Error).message); });
    return () => { cancelled = true; };
  }, [tab, location]);

  useEffect(() => {
    if (!scanning && tab !== 'map') return;
    if (!navigator.geolocation) {
      setLocationError('Este navegador no permite obtener la ubicación.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      pos => {
        const nextPosition = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: pos.timestamp,
        };
        locationRef.current = nextPosition;
        locationDenied.current = false;
        setLocation(nextPosition);
        setLocationError(pos.coords.accuracy > 100 ? 'La ubicación aún es imprecisa. Sal a un lugar abierto para obtener GPS de hasta ±100 m.' : '');
      },
      cause => {
        locationDenied.current = cause.code === 1;
        if (cause.code === 1) { locationRef.current = null; setLocation(null); }
        setLocationError(cause.code === 1
          ? 'Ubicación bloqueada. En Safari, abre el menú de la página → Configuración del sitio web → Ubicación → Permitir. También activa Localización en Ajustes del iPhone.'
          : 'Esperando señal GPS. Comprueba que la ubicación esté activada y prueba en un lugar abierto.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [scanning, tab, gpsRetry]);

  useEffect(() => {
    if (!scanning || tab !== 'scan') { setCameraReady(false); return; }
    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('La cámara requiere HTTPS o localhost y un navegador compatible.');
      setScanning(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    }).then(async media => {
      if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
      stream = media;
      if (video) {
        video.srcObject = media;
        await video.play();
        if (!cancelled) setCameraReady(true);
      }
    }).catch(() => {
      if (!cancelled) {
        setError('No se pudo abrir la cámara. Revisa los permisos del navegador.');
        setScanning(false);
      }
    });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
      if (video) video.srcObject = null;
    };
  }, [scanning, tab]);

  useEffect(() => {
    if (!scanning || !cameraReady || tab !== 'scan') return;
    let cancelled = false;
    let firstFrame = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function analyze() {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) {
        timer = setTimeout(analyze, 500);
        return;
      }
      setAnalyzing(true);
      try {
        // Esperar el GPS inicial antes de enviar; no perder una detección por el permiso pendiente.
        if (!locationRef.current && !locationDenied.current && firstFrame) {
          setLocationError('Obteniendo tu ubicación. Acepta el permiso para guardar los hallazgos en el mapa.');
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (cancelled) return;
        }
        const frame = await frameFromVideo(video);
        if (cancelled) return;
        const response = await scanFrame(frame, locationRef.current, controller.signal);
        if (cancelled) return;
        firstFrame = false;
        setError('');
        setLastScan(response);
        setScanCount(current => current + 1);
        setLastCheck(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (response.result.isPothole) {
          setFinding(response);
          if (response.report && !response.existing) {
            setReports(current => current.some(item => item.id === response.report!.id)
              ? current : [response.report!, ...current]);
            setTotalReports(current => current + 1);
          }
        }
        timer = setTimeout(analyze, response.nextScanMs || 2500);
      } catch (cause) {
        if (!cancelled) {
          setError((cause as Error).message);
          if (cause instanceof ApiError && [401, 429, 502, 503].includes(cause.status)) {
            timer = setTimeout(analyze, cause.status === 429 ? 15000 : 6000);
          } else setScanning(false);
        }
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }
    timer = setTimeout(analyze, 700);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); setAnalyzing(false); };
  }, [scanning, cameraReady, tab]);

  function start() {
    setError('');
    setFinding(null);
    setLastScan(null); setScanCount(0); setLastCheck('');
    setScanning(true);
    setTab('scan');
  }
  function stop() {
    setScanning(false);
    setAnalyzing(false);
    setFinding(null);
  }
  function navigate(next: Tab) {
    if (next !== tab) { history.current.push(tab); setHistorySize(history.current.size); }
    if (next !== 'scan' && scanning) stop();
    setTab(next);
    setError('');
    if (next === 'map' || next === 'reports') void refreshReports();
  }
  function goBack() {
    const previous = history.current.pop();
    setHistorySize(history.current.size);
    if (previous) { stop(); setTab(previous); setError(''); }
  }
  async function patrolStep(direction: 'next' | 'previous') {
    setPatrolBusy(true);
    try { const nextReport = (await patrolReport(patrol?.id, direction)).report; setPatrol(nextReport); setMapFocus(nextReport); }
    catch (cause) { setError((cause as Error).message); }
    finally { setPatrolBusy(false); }
  }
  function showOnMap(report: Report) {
    setMapFocus(report);
    navigate('map');
  }

  return (
    <div className="app-shell">
      <div className="desktop-glow" aria-hidden="true" />
      <main className="phone-app">
        <header className="app-header">
          <div className="brand-mark"><ScanLine size={21} strokeWidth={2.5} /></div>
          <div className="brand-name">BACHE<span>SCAN</span><i>AI</i></div>
          <span className="header-pill"><span className="green-dot" /> VÍAS MÁS SEGURAS</span>
        </header>
        {historySize > 0 && <button className="back-link" onClick={goBack}><ArrowLeft size={15} /> Volver</button>}

        {tab === 'scan' && (
          <div className="page scan-page">
            <section className="intro">
              <div className="eyebrow"><span className="eyebrow-line" /> MONITOREO VIAL INTELIGENTE</div>
              <h1>La calle habla.<br /><em>Nosotros escuchamos.</em></h1>
              <p>Apunta la cámara a la vía. La IA analiza el video y registra los posibles daños en el mapa automáticamente.</p>
            </section>

            <section className={`camera-stage ${scanning ? 'is-live' : ''}`}>
              <video ref={videoRef} playsInline muted autoPlay className="camera-video" />
              {!scanning && (
                <div className="camera-placeholder">
                  <div className="road-lines" aria-hidden="true"><span /><span /><span /></div>
                  <div className="placeholder-icon"><Camera size={25} /></div>
                  <strong>Tu cámara, tu ciudad.</strong>
                  <small>Escaneo automático de la vía</small>
                </div>
              )}
              <div className="scan-corner top-left" /><div className="scan-corner top-right" />
              <div className="scan-corner bottom-left" /><div className="scan-corner bottom-right" />
              {scanning && <div className="scan-beam" />}
              {scanning && lastScan?.result.isPothole && lastScan.result.boundingBox && <div className="detection-box" style={{
                left: `${lastScan.result.boundingBox.xmin / 10}%`, top: `${lastScan.result.boundingBox.ymin / 10}%`,
                width: `${(lastScan.result.boundingBox.xmax - lastScan.result.boundingBox.xmin) / 10}%`,
                height: `${(lastScan.result.boundingBox.ymax - lastScan.result.boundingBox.ymin) / 10}%`,
              }}><span>POSIBLE BACHE · {riskText[lastScan.result.hazardLevel]}</span></div>}
              <div className="stage-top">
                <span className={`live-tag ${scanning ? 'active' : ''}`}>
                  <span className="live-dot" /> {scanning ? 'EN VIVO' : 'CÁMARA LISTA'}
                </span>
                <span className="stage-gps"><MapPin size={12} /> {location ? `GPS ±${Math.round(location.accuracy)} m` : 'GPS pendiente'}</span>
              </div>
              {scanning && (
                <div className="stage-bottom"><Activity size={15} /> {analyzing ? 'Analizando fotograma con IA…' : lastCheck ? `Último análisis: ${lastCheck}` : 'Buscando daños en la vía…'}</div>
              )}
            </section>

            {error && <div className="message error"><AlertTriangle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar"><X size={16} /></button></div>}
            {locationError && scanning && <div className="message warning"><LocateFixed size={17} /><span>{locationError}</span></div>}
            {locationError && scanning && <button className="button-secondary gps-retry" onClick={() => setGpsRetry(current => current + 1)}><LocateFixed size={16} /> Reintentar ubicación</button>}
            {scanning && <div className="scan-feedback" role="status" aria-live="polite">
              <strong>{analyzing ? 'Analizando la imagen…' : lastScan?.result.isPothole ? 'Daño detectado' : lastScan ? 'No se detectó daño en este fotograma' : 'Preparando cámara y GPS…'}</strong>
              <span>{scanCount} fotogramas analizados{lastCheck ? ` · ${lastCheck}` : ''}</span>
              {lastScan && !lastScan.result.isPothole && <p>Enfoca la vía, acerca el hueco y mantén el celular quieto. El escaneo continúa.</p>}
            </div>}

            {finding && (
              <section className="detection-card">
                <div className="detection-top">
                  <span className="section-kicker"><Sparkles size={14} /> {finding.provider === 'gemini' ? 'GEMINI' : 'IA LOCAL'} · POSIBLE DAÑO</span>
                  <span className={`risk-chip risk-${finding.result.hazardLevel.toLowerCase()}`}>{riskText[finding.result.hazardLevel]}</span>
                </div>
                <h2>{typeText[finding.result.potholeType || 'OTRO_DANO']} detectado</h2>
                <p>{finding.result.aiDescription}</p>
                {finding.fallback && <p className="precision-note">Gemini no disponible. Se utilizó el detector local gratuito.</p>}
                <div className="risk-meter"><span style={{ width: `${finding.result.hazardScore}%` }} /></div>
                <div className="risk-caption"><span>Riesgo visual orientativo</span><strong>{finding.result.hazardScore}/100</strong></div>
                {finding.result.riskFactors.length > 0 && <div className="factors">{finding.result.riskFactors.map((factor, i) => <span key={i}>{factor}</span>)}</div>}
                <p className="precision-note"><Crosshair size={14} /> {finding.report
                  ? finding.existing ? 'Este punto ya estaba registrado. El escaneo continúa.' : 'Registrado automáticamente con el GPS del celular. Pendiente de verificación.'
                  : finding.locationNote || 'No se pudo ubicar este daño en el mapa.'}</p>
                {finding.report && <p className="precision-note">{[finding.report.zone.street, finding.report.zone.neighborhood, finding.report.zone.city].filter(Boolean).join(', ') || 'Ubicación del celular'} · {finding.report.location.lat.toFixed(6)}, {finding.report.location.lng.toFixed(6)} · ±{Math.round(finding.report.location.accuracy)} m</p>}
                {!finding.report && <p className="precision-note">La detección funciona sin GPS; para guardar el punto debes permitir la ubicación. Una foto de otro lugar no proporciona las coordenadas reales del hueco.</p>}
                <div className="action-row">
                  <button className="button-secondary" onClick={() => setFinding(null)}><X size={17} /> Cerrar aviso</button>
                  <button className="button-primary" onClick={() => finding.report && showOnMap(finding.report)} disabled={!finding.report}><Check size={17} /> Ver en mapa</button>
                </div>
              </section>
            )}
            <section className="scan-controls">
              <button className={scanning ? 'stop-button' : 'start-button'} onClick={scanning ? stop : start}>
                {scanning ? <Square size={19} fill="currentColor" /> : <Radar size={22} />}
                <span>{scanning ? 'Detener escaneo' : 'Iniciar escaneo en vivo'}</span>
                {!scanning && <ArrowRight size={19} />}
              </button>
              <div className="scan-note"><CirclePause size={15} /> {scanning ? 'La IA analiza el video continuamente y registra hallazgos.' : 'Sin fotos manuales. Necesitas internet, cámara y GPS.'}</div>
            </section>

            <div className="feature-strip">
              <div><span className="feature-icon"><Radar size={17} /></span><strong>Detección</strong><small>Automática</small></div>
              <div><span className="feature-icon"><ShieldAlert size={17} /></span><strong>Riesgo</strong><small>Orientativo</small></div>
              <div><span className="feature-icon"><Compass size={17} /></span><strong>Zona</strong><small>Por GPS</small></div>
            </div>
            <p className="safety-copy">Usa la aplicación desde un lugar seguro. No manipules el celular mientras conduces.</p>
            {health && <p className="service-status">{health.geminiConfigured ? 'Gemini + respaldo local' : 'Detector local gratuito'} · PostgreSQL · {health.tables} tablas</p>}
          </div>
        )}

        {tab === 'map' && (
          <div className="page map-page">
            <div className="page-heading"><div><span className="eyebrow">MAPA COMUNITARIO</span><h1>El estado de <em>nuestras vías.</em></h1></div><button className="icon-button" onClick={() => void refreshReports()} aria-label="Actualizar reportes"><RefreshCw size={19} /></button></div>
            <div className="map-frame"><ReportMap reports={reports} location={location} focus={mapFocus || patrol} /></div>
            {mapFocus && <ReportCard report={mapFocus} />}
            {locationError && <div className="message warning"><LocateFixed size={17} /><span>{locationError}</span></div>}
            <div className="map-legend"><span><i className="legend-dot critical" /> Crítico</span><span><i className="legend-dot high" /> Alto</span><span><i className="legend-dot low" /> Menor</span><span><i className="legend-dot you" /> Tú</span></div>
            <div className="patrol-controls"><button className="button-secondary" disabled={patrolBusy || !reports.length} onClick={() => void patrolStep('previous')}>Anterior</button><span>Recorrido por prioridad</span><button className="button-secondary" disabled={patrolBusy || !reports.length} onClick={() => void patrolStep('next')}>Siguiente</button></div>
            {patrol && <ReportCard report={patrol} />}
            <div className="section-row"><h2>{location ? 'A menos de 5 km' : 'Reportes registrados'}</h2><span>{totalReports} en plataforma</span></div>
            {error && <div className="message error"><AlertTriangle size={17} />{error}</div>}
            {!loadingReports && reports.length === 0 && <div className="empty-state"><Route size={31} /><strong>Aún no hay reportes</strong><p>Los posibles daños detectados con GPS aparecerán aquí automáticamente.</p></div>}
            {(location ? nearby : reports).slice(0, 10).map(item => <ReportCard key={item.id} report={item} />)}
            {location && nearby.length === 0 && reports.length > 0 && <p className="precision-note">No hay reportes a menos de 5 km de tu ubicación.</p>}
            <p className="precision-note">Mapa: {reports.length} de {totalReports} reportes cargados.</p>
            {hasMore && <button className="button-secondary" disabled={loadingReports} onClick={() => void refreshReports(sort, true)}>Cargar más puntos</button>}
          </div>
        )}

        {tab === 'reports' && (
          <div className="page reports-page">
            <div className="page-heading"><div><span className="eyebrow">REGISTRO CIUDADANO</span><h1>Cada reporte <em>cuenta.</em></h1></div><button className="icon-button" onClick={() => void refreshReports()} aria-label="Actualizar reportes"><RefreshCw size={19} /></button></div>
            <div className="summary-card"><div className="summary-art"><Activity size={40} /></div><div><small>REPORTES EN LA PLATAFORMA</small><strong>{totalReports}</strong><span>Visibles para la comunidad</span></div></div>
            <div className="report-filter"><button className={sort === 'recent' ? 'button-primary' : 'button-secondary'} onClick={() => { setSort('recent'); void refreshReports('recent'); }}>Recientes</button><button className={sort === 'priority' ? 'button-primary' : 'button-secondary'} onClick={() => { setSort('priority'); void refreshReports('priority'); }}>Mayor riesgo</button></div>
            <div className="section-row"><h2>Actividad registrada</h2><span>{loadingReports ? 'Actualizando…' : `${reports.length} cargados`}</span></div>
            {error && <div className="message error"><AlertTriangle size={17} />{error}</div>}
            {!loadingReports && reports.length === 0 && <div className="empty-state"><Route size={31} /><strong>No hay reportes todavía</strong><p>Tu primer hallazgo puede ayudar a identificar una vía que necesita atención.</p><button className="button-primary" onClick={() => navigate('scan')}>Empezar a escanear <ArrowRight size={17} /></button></div>}
            <ReportExplorer reports={reports} total={totalReports} loading={loadingReports} onMap={showOnMap} />
            {hasMore && <button className="button-secondary" disabled={loadingReports} onClick={() => void refreshReports(sort, true)}>Cargar más reportes</button>}
          </div>
        )}
        {tab === 'structures' && <div className="page structures-page">
          <div className="page-heading"><div><span className="eyebrow">ESTRUCTURAS DE DATOS</span><h1>Así funciona <em>BacheScan.</em></h1></div></div>
          <p className="precision-note">TypeScript en el celular · API Python · PostgreSQL con 43 tablas. Los datos se guardan en la base; estas estructuras organizan el trabajo en ejecución.</p>
          {error && <div className="message error"><AlertTriangle size={17} />{error}</div>}
          {!structures && !error && <p className="precision-note">Cargando estadísticas…</p>}
          {structures && Object.entries(structures).filter(([, value]) => typeof value !== 'string').map(([key, value]) => {
            const stat = value as { size?: number; use: string };
            return <article className="structure-card" key={key}><Code2 size={20} /><div><strong>{structureLabels[key] || key}</strong><p>{stat.use}</p></div><span>{key === 'stack' ? historySize : stat.size ?? '↔'}</span></article>;
          })}
        </div>}

        <nav className="bottom-nav" aria-label="Navegación principal">
          <button className={tab === 'scan' ? 'selected' : ''} onClick={() => navigate('scan')}><ScanLine size={22} /><span>Escanear</span></button>
          <button className={tab === 'map' ? 'selected' : ''} onClick={() => navigate('map')}><MapPin size={22} /><span>Mapa</span></button>
          <button className={tab === 'reports' ? 'selected' : ''} onClick={() => navigate('reports')}><Route size={22} /><span>Reportes</span></button>
          <button className={tab === 'structures' ? 'selected' : ''} onClick={() => navigate('structures')}><Code2 size={22} /><span>Estructuras</span></button>
        </nav>
      </main>
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const address = [report.zone.street, report.zone.neighborhood, report.zone.city].filter(Boolean).join(', ');
  return <article className="report-card">
    <div className={`report-icon risk-${report.hazardLevel.toLowerCase()}`}><MapPin size={20} /></div>
    <div className="report-content">
      <div className="report-title"><strong>{typeText[report.potholeType || 'OTRO_DANO']}</strong><span className={`risk-label risk-${report.hazardLevel.toLowerCase()}`}>{riskText[report.hazardLevel]}</span></div>
      <p>{address || `GPS ${report.location.lat.toFixed(5)}, ${report.location.lng.toFixed(5)}`}</p>
      <small>{timeText(report.timestamp)} · Riesgo {report.hazardScore}/100 · Sin verificar</small>
    </div>
  </article>;
}
