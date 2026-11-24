import { useCallback, useEffect, useState } from 'react';
import App from '../App';
import { ApiClient, ApiError } from '../services/api';
import { ProfileApi } from '../services/profile';
import type { Me } from '../types';
import AuthScreen from './AuthScreen';
import LoadingIndicator from './LoadingIndicator';
export default function AuthGate() {
  const [state, setState] = useState<'checking' | 'signed-out' | 'signed-in' | 'unavailable'>('checking');
  const [notice, setNotice] = useState(''); const [loggingOut, setLoggingOut] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  // Profile, role and avatar initials; reloaded on sign-in and when returning to a profile screen.
  const refreshMe = useCallback(() => ProfileApi.loadMe().then(setMe).catch(() => setMe(null)), []);
  useEffect(() => { if (state === 'signed-in') void refreshMe(); }, [state, refreshMe]);
  async function check() { try { await ApiClient.authStatus(); setState('signed-in'); } catch (cause) { setState(cause instanceof ApiError && cause.status === 401 ? 'signed-out' : 'unavailable'); } }
  useEffect(() => {
    let alive = true;
    try { localStorage.removeItem('bachescan-session'); } catch { /* Storage may be disabled. */ }
    void ApiClient.authStatus().then(() => { if (alive) setState('signed-in'); })
      .catch(cause => { if (alive) setState(cause instanceof ApiError && cause.status === 401 ? 'signed-out' : 'unavailable'); });
    const expired = () => { setNotice('La sesión terminó. Inicia sesión para continuar.'); setState('signed-out'); };
    window.addEventListener('bachescan-session-expired', expired);
    return () => { alive = false; window.removeEventListener('bachescan-session-expired', expired); };
  }, []);
  async function logout() { setLoggingOut(true); try { await ApiClient.endSession(); try { localStorage.removeItem('bachescan-favorites-v1'); } catch { /* Storage may be disabled. */ } setNotice('Todo se ejecutó correctamente.'); setState('signed-out'); } catch { setNotice('No se pudo completar la operación. Inténtalo de nuevo.'); } finally { setLoggingOut(false); } }
  if (state === 'checking') return <main className="auth-check"><LoadingIndicator label="Comprobando acceso…" /></main>;
  if (state === 'unavailable') return <main className="auth-check"><img src="/favicon.svg" width={60} alt="BacheScan AI" /><p>No se pudo completar la operación. Comprueba tu conexión.</p><button className="button-primary" onClick={() => { setState('checking'); void check(); }}>Reintentar</button></main>;
  if (state === 'signed-out') return <AuthScreen initialNotice={notice} onAuthenticated={() => { setNotice('Todo se ejecutó correctamente.'); setState('signed-in'); }} />;
  return <><App me={state === 'signed-in' ? me : null} onRefreshMe={refreshMe} onLogout={() => void logout()} logoutBusy={loggingOut} />{loggingOut && <div className="processing-overlay"><LoadingIndicator label="Cerrando sesión…" /></div>}<span className="sr-only" role="status">{notice}</span></>;
}
