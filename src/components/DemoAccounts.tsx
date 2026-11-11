import { useEffect, useState } from 'react';
import { Check, Copy, LogIn, ShieldCheck, Truck, Wrench } from 'lucide-react';
import type { DemoAccount } from '../types';
import { loadDemoAccounts } from '../services/profile';

const icons = { Administrador: ShieldCheck, Operario: Wrench, Conductor: Truck };

/** Credenciales para copiar y pegar, o entrar directamente con uno de los tres botones. */
export default function DemoAccounts({ busy, onUse }: { busy: boolean; onUse: (account: DemoAccount) => void }) {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    let alive = true;
    void loadDemoAccounts().then(data => { if (alive && data.enabled) setAccounts(data.accounts); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  async function copy(key: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(key); setTimeout(() => setCopied(current => current === key ? '' : current), 1600); }
    catch { setCopied(''); }
  }
  if (!accounts.length) return null;
  return <section className="demo-accounts" aria-labelledby="demo-title">
    <strong id="demo-title">Cuentas de demostración</strong>
    <p>Entra con un botón o copia el correo y la contraseña.</p>
    <div className="demo-buttons">
      {accounts.map(account => {
        const Icon = icons[account.role];
        return <button key={account.role} type="button" className={`demo-button role-${account.role.toLowerCase()}`} disabled={busy} onClick={() => onUse(account)}>
          <Icon size={18} /><span><b>{account.label}</b><small>{account.description}</small></span><LogIn size={16} />
        </button>;
      })}
    </div>
    <details className="demo-credentials">
      <summary>Ver credenciales para copiar</summary>
      {accounts.map(account => <div key={account.role} className="demo-credential">
        <span className="demo-role">{account.label}</span>
        {(['email', 'password'] as const).map(field => {
          const key = account.role + field;
          return <button key={field} type="button" className="copy-field" onClick={() => void copy(key, account[field])} aria-label={`Copiar ${field === 'email' ? 'correo' : 'contraseña'} de ${account.label}`}>
            <code>{account[field]}</code>{copied === key ? <Check size={14} /> : <Copy size={14} />}
          </button>;
        })}
      </div>)}
    </details>
  </section>;
}
