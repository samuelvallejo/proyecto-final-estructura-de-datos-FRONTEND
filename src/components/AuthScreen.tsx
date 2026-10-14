import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, MapPin, ShieldCheck, Route } from 'lucide-react';
import { authenticate, registerAccount } from '../services/api';
import LoadingIndicator from './LoadingIndicator';
import '../auth.css';

export default function AuthScreen({ onAuthenticated, initialNotice = '' }: { onAuthenticated: () => void; initialNotice?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false); const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(initialNotice); const [error, setError] = useState(false);
  const registering = mode === 'register';
  const rules = [
    ['Entre 12 y 128 caracteres', password.length >= 12 && password.length <= 128],
    ['Una letra mayúscula y una minúscula', /[A-Z]/.test(password) && /[a-z]/.test(password)],
    ['Un número y un símbolo (por ejemplo ! o #)', /[0-9]/.test(password) && /[^a-zA-Z0-9\s]/.test(password)],
    ['Las dos contraseñas deben coincidir', Boolean(password) && password === confirmation],
  ] as const;
  function switchMode(next: 'login' | 'register') { setMode(next); setPassword(''); setConfirmation(''); setVisible(false); setConfirmVisible(false); setNotice(''); setError(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    if (registering && (!rules.every(([, valid]) => valid) || name.trim().length < 2)) { setError(true); setNotice('No se pudo completar la operación. Revisa los requisitos del formulario.'); return; }
    setBusy(true); setNotice(''); setError(false);
    try {
      if (registering) { await registerAccount(name.trim(), email.trim(), password, confirmation); setName(''); setEmail(''); setPassword(''); setConfirmation(''); setMode('login'); }
      else { await authenticate(email.trim(), password); setEmail(''); setPassword(''); setConfirmation(''); }
      setNotice('Todo se ejecutó correctamente.'); if (!registering) onAuthenticated();
    } catch { setPassword(''); setConfirmation(''); setError(true); setNotice('No se pudo completar la operación. Revisa los requisitos e inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell">
    <header className="auth-brand"><img src="/favicon.svg" alt="Logo BacheScan" /><span>BacheScan <b>AI</b></span><span className="auth-brand-caption">Vías más seguras, juntos.</span></header>
    <div className="auth-layout"><section className="auth-story" aria-label="Bienvenida a BacheScan"><span className="auth-eyebrow">CUIDEMOS EL CAMINO</span><h1>Un mejor camino<br />empieza <em>contigo.</em></h1><p>Detecta posibles baches, conoce su ubicación y comparte información que ayuda a cuidar las vías de tu comunidad.</p>
      <div className="auth-road-art" aria-hidden="true"><div className="art-route" /><span className="art-pin first"><MapPin /></span><span className="art-pin last"><MapPin /></span><span className="art-scan"><img src="/favicon.svg" alt="" />BacheScan AI<small>Observa · Detecta · Ubica</small></span></div>
      <div className="auth-benefits"><span><MapPin size={19} /> Ubicación en el mapa</span><span><Route size={19} /> Recorridos de A a B</span><span><ShieldCheck size={19} /> Acceso con tu cuenta</span></div></section>
      <section className="auth-card" aria-labelledby="auth-title"><img className="auth-card-logo" src="/favicon.svg" alt="" /><h2 id="auth-title">{registering ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2><p>{registering ? 'Regístrate para empezar a cuidar las vías.' : 'Inicia sesión para acceder a BacheScan AI.'}</p>
        <div className="auth-tabs" aria-label="Tipo de acceso"><button type="button" aria-pressed={!registering} disabled={busy} onClick={() => switchMode('login')}>Iniciar sesión</button><button type="button" aria-pressed={registering} disabled={busy} onClick={() => switchMode('register')}>Registrarme</button></div>
        <form onSubmit={submit} aria-describedby="auth-help" aria-busy={busy}><fieldset disabled={busy}>
          {registering && <label htmlFor="display-name">Nombre<input id="display-name" name="displayName" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="Tu nombre" /></label>}
          <label htmlFor="email">Correo electrónico<input id="email" name="email" type="email" inputMode="email" autoComplete="email" required minLength={5} maxLength={180} value={email} onChange={e => setEmail(e.target.value.slice(0, 180))} placeholder="nombre@correo.com" /></label>
          <label htmlFor="password">Contraseña<span className="password-field"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value.slice(0, 128))} placeholder="Escribe tu contraseña" /><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></span></label>
          {registering && <label htmlFor="confirmation">Confirma tu contraseña<span className="password-field"><input id="confirmation" name="confirmPassword" type={confirmVisible ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value.slice(0, 128))} placeholder="Repite tu contraseña" /><button type="button" onClick={() => setConfirmVisible(v => !v)} aria-label={confirmVisible ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={confirmVisible}>{confirmVisible ? <EyeOff size={20} /> : <Eye size={20} />}</button></span></label>}
          <button className="auth-submit" type="submit">{busy ? <LoadingIndicator compact label={registering ? 'Creando cuenta…' : 'Iniciando sesión…'} /> : <>{registering ? 'Crear mi cuenta' : 'Iniciar sesión'}<ArrowRight size={19} /></>}</button>
        </fieldset></form>
        {notice && <p className={`auth-notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{notice}</p>}
        <aside className="form-guidance" id="auth-help"><strong>Antes de {registering ? 'registrarte' : 'iniciar sesión'}</strong>{registering ? <><p>Nombre: de 2 a 80 caracteres. Correo: una dirección válida, máximo 180 caracteres.</p><ul>{rules.map(([label, valid]) => <li key={label} className={valid ? 'complete' : ''}><Check size={14} aria-hidden="true" />{label}</li>)}</ul></> : <p>Escribe tu correo registrado y tu contraseña de 12 a 128 caracteres. Usa el ojo para revisar lo que escribes.</p>}<p>Los campos se detienen al alcanzar el máximo. No compartas tu contraseña. Cierra sesión al usar un dispositivo compartido.</p></aside>
      </section></div><footer className="auth-footer">BacheScan AI · Tecnología que acompaña a tu comunidad</footer>
  </main>;
}
