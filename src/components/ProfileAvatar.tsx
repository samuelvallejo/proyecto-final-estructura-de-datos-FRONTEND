import { useEffect, useRef, useState } from 'react';
import { BarChart3, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import type { Me } from '../types';
import { avatarColor, initialsOf } from '../services/format';

export function Avatar({ name, initials, size = 36 }: { name: string; initials?: string; size?: number }) {
  return <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * .38), background: avatarColor(name) }}>
    {initials || initialsOf(name)}
  </span>;
}

interface Props { me: Me | null; onNavigate: (tab: 'profile' | 'dashboard' | 'admin') => void; onLogout: () => void; logoutBusy: boolean }

/** Icono de perfil automático: iniciales y color propios de cada cuenta, con menú rápido. */
export default function ProfileAvatar({ me, onNavigate, onLogout, logoutBusy }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const go = (tab: 'profile' | 'dashboard' | 'admin') => { setOpen(false); onNavigate(tab); };
  const name = me?.displayName || 'Mi cuenta';
  return <div className="profile-avatar" ref={root}>
    <button className="avatar-button" aria-haspopup="menu" aria-expanded={open} aria-label={`Abrir menú de ${name}`} onClick={() => setOpen(value => !value)}>
      <Avatar name={name} initials={me?.initials} size={34} />
      {me?.isAdmin && <span className="avatar-badge" title="Administrador"><ShieldCheck size={11} /></span>}
    </button>
    {open && <div className="avatar-menu" role="menu">
      <div className="avatar-menu-head"><Avatar name={name} initials={me?.initials} size={42} /><div><strong>{name}</strong><small>{me?.email}</small><span className={`role-chip role-${(me?.role || 'Conductor').toLowerCase()}`}>{me?.role || 'Conductor'}</span></div></div>
      <button role="menuitem" onClick={() => go('profile')}><UserRound size={17} /> Mi perfil e historial</button>
      <button role="menuitem" onClick={() => go('dashboard')}><BarChart3 size={17} /> Panel de datos</button>
      {me?.isAdmin && <button role="menuitem" onClick={() => go('admin')}><ShieldCheck size={17} /> Administración</button>}
      <button role="menuitem" className="danger" disabled={logoutBusy} onClick={() => { setOpen(false); onLogout(); }}><LogOut size={17} /> Cerrar sesión</button>
    </div>}
  </div>;
}
