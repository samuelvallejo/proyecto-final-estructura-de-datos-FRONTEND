import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, Camera, Check, CirclePause, Compass,
  Crosshair, LocateFixed, MapPin, Radar, RefreshCw, Route, ScanLine,
  ShieldAlert, Sparkles, Square, X, Code2, ArrowLeft, Home,
} from 'lucide-react';
import { ApiError, loadHealth, loadReports, loadStructures, patrolReport, scanFrame } from './services/api';
import type { Health, Position, Report, ScanResponse, StructureStats, Trip } from './types';
import { Stack } from './data-structures/Stack';
const ReportMap = lazy(() => import('./components/ReportMap'));
import ReportExplorer from './components/ReportExplorer';
import ReportSummary from './components/ReportSummary';
import ConnectionStatus from './components/ConnectionStatus';
import LoadingIndicator from './components/LoadingIndicator';
import TripPanel from './components/TripPanel';
import CommunityReportForm from './components/CommunityReportForm';
import NearbyHazards from './components/NearbyHazards';
import PotholeSymbol from './components/PotholeSymbol';
import useCommunityFeed from './hooks/useCommunityFeed';
const TripHistory = lazy(() => import('./components/TripHistory'));
const PhotoDetector = lazy(() => import('./components/PhotoDetector'));
const TreeExplorer = lazy(() => import('./components/trees/TreeExplorer'));

type Tab = 'home' | 'scan' | 'photo' | 'map' | 'reports' | 'structures' | 'trips';
const structureLabels: Record<string, string> = {
  array: 'Arrays', singlyLinkedList: 'Lista simple', doublyLinkedList: 'Lista doble',
  circularSinglyLinkedList: 'Lista circular simple', circularDoublyLinkedList: 'Lista circular doble',
  queue: 'Colas FIFO', deque: 'Cola de doble extremo', stack: 'Pila LIFO',
  binarySearchTree: 'Árbol binario de búsqueda', generalTree: 'Árbol de ubicaciones',
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

export default function App({ onLogout, logoutBusy }: { onLogout: () => void; logoutBusy: boolean }) {
  const [tab, setTab] = useState<Tab>('home');
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const tripIdRef = useRef<string | undefined>(undefined);
  const updateTrip = useCallback((trip: Trip) => { setActiveTrip(trip); tripIdRef.current = trip.endedAt ? undefined : trip.id; }, []);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [finding, setFinding] = useState<ScanResponse | null>(null);
  const [location, setLocation] = useState<Position | null>(null);
  const [locationError, setLocationError] = useState(() => navigator.geolocation ? '' : 'Este navegador no permite obtener la ubicación.');
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [error, setError] = useState('');
  const [lastCheck, setLastCheck] = useState('');
  const [lastScan, setLastScan] = useState<ScanResponse | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [mapRisk, setMapRisk] = useState('');
  const [mapFocus, setMapFocus] = useState<Report | null>(null);
  const [gpsRetry, setGpsRetry] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [totalReports, setTotalReports] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<'recent' | 'priority'>('recent');
  const [health, setHealth] = useState<Health | null>(null);
  const [structures, setStructures] = useState<StructureStats | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [communityRevision, setCommunityRevision] = useState(0);
  const { reports: nearby, updatedAt: nearbyUpdatedAt, feedError } = useCommunityFeed(location, tab === 'map' || alertsEnabled, communityRevision);
  const mapReports = [...reports, ...nearby.filter(item => !reports.some(report => report.id === item.id))];
  const [patrol, setPatrol] = useState<Report | null>(null);
  const [patrolBusy, setPatrolBusy] = useState(false);
  const history = useRef(new Stack<Tab>());
  const [historySize, setHistorySize] = useState(0);
  const refreshSequence = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const locationRef = useRef<Position | null>(null);
  const locationDenied = useRef(false);
  const pendingPotholeFrame = useRef<{ frame: Blob; capturedAt: number } | null>(null);

  async function refreshReports(mode: 'recent' | 'priority' = sort, append = false) {
    const sequence = ++refreshSequence.current;
    setLoadingReports(true);
    try {
      const page = await loadReports(mode, append ? reports.length : 0);
      if (sequence !== refreshSequence.current) return;
      setReports(current => append ? [...current, ...page.reports.filter(item => !current.some(old => old.id === item.id))] : page.reports);
      setTotalReports(page.total); setHasMore(page.hasMore);
      setError('');
    }
    catch (cause) { if (sequence === refreshSequence.current) setError((cause as Error).message); }
    finally { if (sequence === refreshSequence.current) setLoadingReports(false); }
  }

  function saveReportedFinding(response: ScanResponse) {
    setFinding(response);
    const additions = response.detections?.filter(item => item.report && !item.existing).map(item => item.report!)
      || (response.report && !response.existing ? [response.report] : []);
    setReports(current => [...additions.filter(item => !current.some(old => old.id === item.id)), ...current]);
    setTotalReports(current => current + additions.length);
  }

  async function attachLocationToPendingFrame(position: Position) {
    const pending = pendingPotholeFrame.current;
    if (!pending) return;
    if (Date.now() - pending.capturedAt > 15000) {
      pendingPotholeFrame.current = null;
      setLocationError('GPS listo. El fotograma ya es antiguo; vuelve a enfocar el bache para guardar su ubicación actual.');
      return;
    }
    if (position.accuracy > 100) return;

    // No enviar el mismo fotograma varias veces si el GPS emite actualizaciones seguidas.
    pendingPotholeFrame.current = null;
    try {
      const response = await scanFrame(pending.frame, position, new AbortController().signal, tripIdRef.current);
      saveReportedFinding(response);
      setLocationError('');
    } catch (cause) {
      pendingPotholeFrame.current = pending;
      setError((cause as Error).message);
    }
  }

  function retryLocation() {
    if (!navigator.geolocation) {
      setLocationError('Este navegador no permite obtener la ubicación. Abre la app en Safari y activa Localización en Ajustes del iPhone.');
      return;
    }
    setRequestingLocation(true);
    setLocationError('Solicitando ubicación precisa… Acepta el permiso del navegador y espera a que el GPS obtenga señal.');
    navigator.geolocation.getCurrentPosition(position => {
      const nextPosition: Position = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: position.timestamp,
      };
      locationRef.current = nextPosition;
      locationDenied.current = false;
      setLocation(nextPosition);
      setLocationError(nextPosition.accuracy > 100
        ? 'La ubicación aún es imprecisa. Sal a un lugar abierto para obtener GPS de hasta ±100 m.'
        : '');
      setGpsRetry(current => current + 1);
      void attachLocationToPendingFrame(nextPosition).finally(() => setRequestingLocation(false));
    }, cause => {
      locationDenied.current = cause.code === 1;
      if (cause.code === 1) {
        locationRef.current = null;
        setLocation(null);
        setLocationError('El navegador bloqueó la ubicación. Permítela en la configuración del sitio y activa Localización en los ajustes del dispositivo; luego toca Reintentar ubicación.');
      } else {
        setLocationError('No se obtuvo señal GPS. Activa Localización y prueba al aire libre; se requiere precisión de hasta ±100 m.');
      }
      setRequestingLocation(false);
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }

  useEffect(() => {
    let cancelled = false;
    const sequence = ++refreshSequence.current;
    void loadReports('recent').then(page => {
      if (cancelled || sequence !== refreshSequence.current) return;
      setReports(page.reports); setTotalReports(page.total); setHasMore(page.hasMore);
    }).catch(cause => { if (!cancelled && sequence === refreshSequence.current) setError((cause as Error).message); })
      .finally(() => { if (!cancelled && sequence === refreshSequence.current) setLoadingReports(false); });
    void loadHealth().then(data => { if (!cancelled) setHealth(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (tab !== 'structures') return;
    const controller = new AbortController();
    void loadStructures().then(data => { if (!controller.signal.aborted) setStructures(data); })
      .catch(cause => { if (!controller.signal.aborted) setError((cause as Error).message); });
    return () => controller.abort();
  }, [tab]);

  useEffect(() => {
    if (!scanning && tab !== 'map' && !alertsEnabled) return;
    if (!navigator.geolocation) return;
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
        void attachLocationToPendingFrame(nextPosition);
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
  }, [scanning, tab, gpsRetry, alertsEnabled]);

  useEffect(() => {
    if (!scanning || tab !== 'scan') return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
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
      setCameraReady(false);
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
        const response = await scanFrame(frame, locationRef.current, controller.signal, tripIdRef.current);
        if (cancelled) return;
        firstFrame = false;
        setError('');
        setLastScan(response);
        setScanCount(current => current + 1);
        setLastCheck(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (response.result.isPothole) {
          saveReportedFinding(response);
          if (response.report) pendingPotholeFrame.current = null;
          else {
            pendingPotholeFrame.current = { frame, capturedAt: Date.now() };
            if (locationRef.current?.accuracy !== undefined && locationRef.current.accuracy <= 100) {
              void attachLocationToPendingFrame(locationRef.current);
            }
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
    if (!navigator.mediaDevices?.getUserMedia) { setError('La cámara requiere HTTPS o localhost y un navegador compatible.'); return; }
    setError('');
    setFinding(null);
    pendingPotholeFrame.current = null;
    setLastScan(null); setScanCount(0); setLastCheck('');
    // Solicitar GPS durante el toque que inicia el escaneo mejora el permiso en Safari móvil.
    retryLocation();
    setScanning(true);
    setTab('scan');
  }
  function stop() {
    setCameraReady(false);
    setScanning(false);
    setAnalyzing(false);
    setFinding(null);
  }
  function navigate(next: Tab) {
    if (next !== tab) { history.current.push(tab); setHistorySize(history.current.size); }
    if (next !== 'scan' && scanning) stop();
    setTab(next);
    if (next === 'structures') setStructures(null);
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
    setMapRisk('');
    setMapFocus(report);
    navigate('map');
  }

  return (
    <div className="app-shell">
      <div className="desktop-glow" aria-hidden="true" />
      <a className="skip-link" href="#page-content">Saltar al contenido</a>
      <main className="phone-app" id="page-content" tabIndex={-1}>
        <header className="app-header">
          <div className="brand-mark"><ScanLine size={21} strokeWidth={2.5} /></div>
          <div className="brand-name">BACHE<span>SCAN</span><i>AI</i></div>
          <span className="header-pill"><span className="green-dot" /> VÍAS MÁS SEGURAS</span>
          <button className="session-logout" disabled={logoutBusy} onClick={() => { stop(); onLogout(); }}>Cerrar sesión</button>
        </header>
        <ConnectionStatus health={health} busy={loadingReports} onRetry={() => { void refreshReports(); void loadHealth().then(setHealth).catch(() => setHealth(null)); }} />
        <NearbyHazards enabled={alertsEnabled} onToggle={() => { if (!alertsEnabled) retryLocation(); setAlertsEnabled(value => !value); }} location={location} reports={nearby} updatedAt={nearbyUpdatedAt} feedError={feedError} onMap={showOnMap} />
        {historySize > 0 && <button className="back-link" onClick={goBack}><ArrowLeft size={15} /> Volver</button>}

        {tab === 'home' && <div className="page home-page"><section className="intro"><span className="eyebrow">TU COMUNIDAD, TU CAMINO</span><h1>Bienvenido a <em>BacheScan AI.</em></h1><p>Encuentra posibles baches con la cámara, ubícalos en el mapa y guarda tus recorridos. Elige qué quieres hacer.</p><p className="home-success" role="status">Todo se ejecutó correctamente.</p></section><div className="home-options"><button onClick={() => navigate('photo')}><Camera size={27} /><strong>Analizar una fotografía</strong><span>Carga una foto y mira los baches detectados, con recuadros y confianza.</span><ArrowRight size={20} /></button><button onClick={() => navigate('scan')}><Camera size={27} /><strong>Escanear una vía</strong><span>Abre la cámara para detectar daños y registrar un recorrido de A a B.</span><ArrowRight size={20} /></button><button onClick={() => navigate('map')}><MapPin size={27} /><strong>Consultar el mapa</strong><span>Revisa los lugares reportados y su nivel de riesgo visual.</span><ArrowRight size={20} /></button><button onClick={() => navigate('trips')}><Route size={27} /><strong>Mis recorridos</strong><span>Consulta tus caminos guardados y los baches encontrados.</span><ArrowRight size={20} /></button><button onClick={() => navigate('reports')}><ShieldAlert size={27} /><strong>Explorar reportes</strong><span>Busca por lugar o riesgo y consulta la información de cada hallazgo.</span><ArrowRight size={20} /></button></div><section className="getting-started"><h2>Tu primer recorrido, en tres pasos</h2><ol><li><b>Permite cámara y ubicación.</b> Acepta los permisos cuando el navegador los solicite.</li><li><b>Indica de dónde sales y a dónde vas.</b> Inicia el recorrido con buena señal GPS.</li><li><b>Finaliza al llegar.</b> El mapa conserva las posiciones y los hallazgos registrados.</li></ol><p className="form-help">La IA identifica posibles daños y estima su riesgo visual. Los reportes requieren verificación. Configura el teléfono antes de conducir y mantén la aplicación abierta.</p></section></div>}

        {tab === 'scan' && (
          <div className="page scan-page">
            <section className="intro">
              <div className="eyebrow"><span className="eyebrow-line" /> MONITOREO VIAL INTELIGENTE</div>
              <h1>La calle habla.<br /><em>Nosotros escuchamos.</em></h1>
              <p>Apunta la cámara a la vía. La IA analiza el video y registra los posibles daños en el mapa automáticamente.</p>
              <div className="detector-switch" aria-label="Tipo de análisis"><button className="button-primary" aria-pressed="true" onClick={() => navigate('scan')}>Cámara en vivo</button><button className="button-secondary" aria-pressed="false" onClick={() => navigate('photo')}>Analizar una fotografía</button></div>
            </section>
            <TripPanel position={location} trip={activeTrip} onUpdate={updateTrip} onStart={start} onStop={stop} onGps={retryLocation} gpsBusy={requestingLocation} analyzing={analyzing} scanning={scanning} />

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
              {scanning && (lastScan?.detections || (lastScan?.result.isPothole ? [lastScan.result] : [])).map((detection, index) => detection.boundingBox && <div key={index} className="detection-box" style={{
                left: `${detection.boundingBox.xmin / 10}%`, top: `${detection.boundingBox.ymin / 10}%`,
                width: `${(detection.boundingBox.xmax - detection.boundingBox.xmin) / 10}%`,
                height: `${(detection.boundingBox.ymax - detection.boundingBox.ymin) / 10}%`,
              }}><span>BACHE {index + 1}{detection.confidence ? ` · ${Math.round(detection.confidence * 100)}%` : ''} · {riskText[detection.hazardLevel]}</span></div>)}
              {scanning && !cameraReady && <div className="camera-preparing"><LoadingIndicator label="Preparando cámara…" /></div>}
              <div className="stage-top">
                <span className={`live-tag ${scanning ? 'active' : ''}`}>
                  <span className="live-dot" /> {scanning ? 'EN VIVO' : 'CÁMARA LISTA'}
                </span>
                <span className="stage-gps"><MapPin size={12} /> {location ? `GPS ±${Math.round(location.accuracy)} m` : 'GPS pendiente'}</span>
              </div>
              {scanning && (
                <div className="stage-bottom">{analyzing ? <LoadingIndicator compact label="Analizando fotograma…" /> : <><Activity size={15} />{lastCheck ? `Último análisis: ${lastCheck}` : 'Buscando daños en la vía…'}</>}</div>
              )}
            </section>

            {error && <div className="message error"><AlertTriangle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar"><X size={16} /></button></div>}
            {locationError && scanning && <div className="message warning"><LocateFixed size={17} /><span>{locationError}</span></div>}
            {locationError && scanning && <button className="button-secondary gps-retry" onClick={retryLocation} disabled={requestingLocation}>{requestingLocation ? <LoadingIndicator compact label="Solicitando ubicación…" /> : <><LocateFixed size={16} /> Reintentar ubicación</>}</button>}
            {scanning && <div className="scan-feedback" role="status" aria-live="polite">
              <strong>{analyzing ? 'Analizando la imagen…' : lastScan?.result.isPothole ? `${lastScan.detections?.length || 1} posibles daños detectados` : lastScan ? 'No se detectó daño en este fotograma' : 'Preparando cámara y GPS…'}</strong>
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
                {!finding.report && <p className="precision-note">Permite el GPS y toca “Reintentar ubicación”. Si el fotograma sigue reciente, se guardará con la posición actual; si ya pasó más tiempo, vuelve a enfocar el bache. La imagen por sí sola no revela dónde fue tomada.</p>}
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

            {activeTrip && !activeTrip.endedAt && <section className="journey-preview"><h2>Tu recorrido en vivo</h2><p className="section-description">La línea sigue el GPS y los marcadores muestran los baches guardados. Se actualiza durante el escaneo.</p><div className="map-frame"><Suspense fallback={<LoadingIndicator label="Preparando mapa…" />}><ReportMap reports={activeTrip.reports || []} location={location} trip={activeTrip} /></Suspense></div></section>}
            <div className="feature-strip">
              <div><span className="feature-icon"><Radar size={17} /></span><strong>Detección</strong><small>Automática</small></div>
              <div><span className="feature-icon"><ShieldAlert size={17} /></span><strong>Riesgo</strong><small>Orientativo</small></div>
              <div><span className="feature-icon"><Compass size={17} /></span><strong>Zona</strong><small>Por GPS</small></div>
            </div>
            <p className="safety-copy">Usa la aplicación desde un lugar seguro. No manipules el celular mientras conduces.</p>
            {health && <p className="service-status">Servicio disponible · Tu sesión está activa</p>}
          </div>
        )}

        {tab === 'photo' && <div className="page photos-page"><section className="intro"><span className="eyebrow">ANÁLISIS DE FOTOGRAFÍAS</span><h1>Encuentra baches <em>en una foto.</em></h1><p>Sube una imagen de la carretera. La inteligencia artificial marca los posibles baches y muestra su confianza.</p><div className="detector-switch" aria-label="Tipo de análisis"><button className="button-secondary" aria-pressed="false" onClick={() => navigate('scan')}>Cámara en vivo</button><button className="button-primary" aria-pressed="true" onClick={() => navigate('photo')}>Analizar una fotografía</button></div></section><Suspense fallback={<LoadingIndicator label="Preparando análisis de fotografías…" />}><PhotoDetector /></Suspense></div>}

        {tab === 'map' && (
          <div className="page map-page">
            <div className="page-heading"><div><span className="eyebrow">MAPA COMUNITARIO</span><h1>El estado de <em>nuestras vías.</em></h1></div><button className="icon-button" disabled={loadingReports} onClick={() => void refreshReports()} aria-label="Actualizar reportes"><RefreshCw size={19} /></button></div>
            <label className="map-risk-filter">Mostrar riesgo<select value={mapRisk} onChange={event => { setMapRisk(event.target.value); setMapFocus(null); setPatrol(null); }}><option value="">Todos los niveles</option>{Object.entries(riskText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <p className="section-description">Los símbolos de huecos incluyen avisos de otros usuarios y detecciones con GPS. Activa las alertas para recibir una advertencia de cercanía. Los marcadores muestran posibles daños registrados. Toca uno para ver su ubicación y riesgo. Puedes filtrar el riesgo, centrar tu ubicación o recorrer los reportes por prioridad.</p>
            <div className="map-frame"><Suspense fallback={<div className="map-loading"><LoadingIndicator label="Preparando mapa…" /></div>}><ReportMap reports={mapReports.filter(report => !mapRisk || report.hazardLevel === mapRisk)} location={location} focus={mapFocus || patrol} onSelect={setMapFocus} /></Suspense></div>
            <div className="community-map-key"><PotholeSymbol size={30} /><span>Hueco reportado · Toca el símbolo para ver el aviso y su origen.</span></div>
            <CommunityReportForm location={location} requestingLocation={requestingLocation} onLocate={retryLocation} onPublished={report => { setReports(current => [report, ...current.filter(item => item.id !== report.id)]); setMapFocus(report); setMapRisk(''); setCommunityRevision(value => value + 1); void refreshReports(); }} />
            {mapFocus && <ReportCard report={mapFocus} />}
            {locationError && <><div className="message warning"><LocateFixed size={17} /><span>{locationError}</span></div><button className="button-secondary gps-retry" onClick={retryLocation} disabled={requestingLocation}>{requestingLocation ? <LoadingIndicator compact label="Solicitando ubicación…" /> : <><LocateFixed size={16} /> Reintentar ubicación</>}</button></>}
            <div className="map-legend"><span><i className="legend-dot critical" /> Crítico</span><span><i className="legend-dot high" /> Alto</span><span><i className="legend-dot low" /> Menor</span><span><i className="legend-dot you" /> Tú</span></div>
            <div className="patrol-controls"><button className="button-secondary" disabled={patrolBusy || !reports.length || Boolean(mapRisk)} onClick={() => void patrolStep('previous')}>Anterior</button><span>{mapRisk ? 'Quita el filtro para recorrer todos' : 'Recorrido por prioridad'}</span><button className="button-secondary" disabled={patrolBusy || !reports.length || Boolean(mapRisk)} onClick={() => void patrolStep('next')}>Siguiente</button></div>
            {patrolBusy && <LoadingIndicator compact label="Buscando el siguiente reporte…" />}
            {patrol && !mapFocus && <ReportCard report={patrol} />}
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
            <div className="page-heading"><div><span className="eyebrow">REGISTRO CIUDADANO</span><h1>Cada reporte <em>cuenta.</em></h1></div><button className="icon-button" disabled={loadingReports} onClick={() => void refreshReports()} aria-label="Actualizar reportes"><RefreshCw size={19} /></button></div>
            <div className="summary-card"><div className="summary-art"><Activity size={40} /></div><div><small>REPORTES EN LA PLATAFORMA</small><strong>{totalReports}</strong><span>Visibles para la comunidad</span></div></div>
            <p className="section-description">Busca un lugar, filtra por tipo de daño o riesgo y abre sus detalles. «Ver ubicación en mapa» muestra dónde fue registrado. Puedes guardar favoritos o exportar los resultados cargados.</p>
            <ReportSummary reports={reports} total={totalReports} />
            <Suspense fallback={<LoadingIndicator label="Preparando árboles…" />}><TreeExplorer onMap={showOnMap} /></Suspense>
            <div className="report-filter"><button className={sort === 'recent' ? 'button-primary' : 'button-secondary'} onClick={() => { setSort('recent'); void refreshReports('recent'); }}>Recientes</button><button className={sort === 'priority' ? 'button-primary' : 'button-secondary'} onClick={() => { setSort('priority'); void refreshReports('priority'); }}>Mayor riesgo</button></div>
            <div className="section-row"><h2>Actividad registrada</h2><span>{loadingReports ? 'Actualizando…' : `${reports.length} cargados`}</span></div>
            {error && <div className="message error"><AlertTriangle size={17} />{error}</div>}
            {!loadingReports && reports.length === 0 && <div className="empty-state"><Route size={31} /><strong>No hay reportes todavía</strong><p>Tu primer hallazgo puede ayudar a identificar una vía que necesita atención.</p><button className="button-primary" onClick={() => navigate('scan')}>Empezar a escanear <ArrowRight size={17} /></button></div>}
            {loadingReports && reports.length === 0 && <div className="report-skeletons" role="status" aria-label="Cargando reportes"><span /><span /><span /></div>}
            <ReportExplorer reports={reports} total={totalReports} loading={loadingReports} onMap={showOnMap} />
            {hasMore && <button className="button-secondary" disabled={loadingReports} onClick={() => void refreshReports(sort, true)}>Cargar más reportes</button>}
          </div>
        )}
        {tab === 'structures' && <div className="page structures-page">
          <div className="page-heading"><div><span className="eyebrow">ESTRUCTURAS DE DATOS</span><h1>Así funciona <em>BacheScan.</em></h1></div></div>
          <Suspense fallback={<LoadingIndicator label="Preparando árboles…" />}><TreeExplorer onMap={showOnMap} defaultOpen /></Suspense>
          <p className="section-description">Los árboles ordenan el riesgo y agrupan los reportes por ubicación. Aquí puedes conocer cómo se organiza el trabajo de BacheScan. Las listas ordenan el historial, las colas procesan los análisis y la pila permite volver a una sección anterior.</p>
          {error && <div className="message error"><AlertTriangle size={17} />{error}</div>}
          {!structures && !error && <LoadingIndicator label="Cargando información…" />}
          {structures && Object.entries(structures).filter(([, value]) => typeof value !== 'string').map(([key, value]) => {
            const stat = value as { size?: number; use: string };
            return <article className="structure-card" key={key}><Code2 size={20} /><div><strong>{structureLabels[key] || key}</strong><p>{stat.use}</p></div><span>{key === 'stack' ? historySize : stat.size ?? '↔'}</span></article>;
          })}
        </div>}

        {tab === 'trips' && <div className="page trips-page"><div className="page-heading"><div><span className="eyebrow">TUS CAMINOS GUARDADOS</span><h1>Mis <em>recorridos.</em></h1></div></div><p className="section-description">Consulta tus recorridos de A a B. Cada uno conserva la trayectoria GPS y los baches que se registraron durante el escaneo. Solo tu cuenta puede consultar estos caminos.</p><Suspense fallback={<LoadingIndicator label="Cargando recorridos…" />}><TripHistory /></Suspense></div>}
        <nav className="bottom-nav" aria-label="Navegación principal">
          <button className={tab === 'home' ? 'selected' : ''} aria-current={tab === 'home' ? 'page' : undefined} onClick={() => navigate('home')}><Home size={22} /><span>Inicio</span></button>
          <button className={tab === 'scan' || tab === 'photo' ? 'selected' : ''} aria-current={tab === 'scan' || tab === 'photo' ? 'page' : undefined} onClick={() => navigate('scan')}><ScanLine size={22} /><span>Escanear</span></button>
          <button className={tab === 'map' ? 'selected' : ''} aria-current={tab === 'map' ? 'page' : undefined} onClick={() => navigate('map')}><MapPin size={22} /><span>Mapa</span></button>
          <button className={tab === 'reports' ? 'selected' : ''} aria-current={tab === 'reports' ? 'page' : undefined} onClick={() => navigate('reports')}><Route size={22} /><span>Reportes</span></button>
          <button className={tab === 'trips' ? 'selected' : ''} aria-current={tab === 'trips' ? 'page' : undefined} onClick={() => navigate('trips')}><Route size={22} /><span>Recorridos</span></button>
          <button className={tab === 'structures' ? 'selected' : ''} aria-current={tab === 'structures' ? 'page' : undefined} onClick={() => navigate('structures')}><Code2 size={22} /><span>Estructuras</span></button>
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
      <small>{timeText(report.timestamp)} · {report.source === 'COMMUNITY' ? 'Comunidad' : 'YOLO'} · Riesgo {riskText[report.hazardLevel]} · Sin verificar</small>
    </div>
  </article>;
}
