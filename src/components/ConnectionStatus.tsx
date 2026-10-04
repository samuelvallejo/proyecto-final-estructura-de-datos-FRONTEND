import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import type { Health } from '../types';
export default function ConnectionStatus({ health, busy, onRetry }: { health: Health | null; busy: boolean; onRetry: () => void }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <aside className={`connection-status ${online ? '' : 'is-offline'}`} aria-label="Estado de conexión">
    <div role="status">{!online ? <><WifiOff size={17} /><span>Sin conexión. Puedes consultar los reportes ya cargados; el escaneo y el mapa necesitan internet.</span></> : <><span className="connection-dot" /><span>{busy ? 'Actualizando datos…' : health ? 'Servicio disponible' : 'Servicio sin confirmar'} · {health ? `${health.reports} reportes en plataforma` : 'Reintenta para comprobar el servidor'}</span></>}</div>
    <button onClick={onRetry} disabled={!online || busy} aria-label="Comprobar conexión y actualizar reportes"><RefreshCw size={16} className={busy ? 'spin' : ''} /><span>Actualizar</span></button>
  </aside>;
}
