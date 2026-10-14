import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './journeys.css'
import AuthGate from './components/AuthGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
