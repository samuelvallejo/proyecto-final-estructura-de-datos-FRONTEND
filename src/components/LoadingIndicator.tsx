export default function LoadingIndicator({ label = 'Procesando…', compact = false }: { label?: string; compact?: boolean }) {
  return <span className={`loading-indicator ${compact ? 'compact' : ''}`} role="status" aria-live="polite"><span className="logo-loader" aria-hidden="true"><img src="/favicon.svg" alt="" /></span><span>{label}</span></span>;
}
