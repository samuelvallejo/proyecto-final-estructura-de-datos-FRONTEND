import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { error: Error | null; }

/** Muestra una salida segura si un render de la aplicacion falla; mantiene el respaldo de la UI. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary:', error, info.componentStack); }

  render() {
    const { error } = this.state;
    const { children } = this.props;
    if (error) {
      return (
        <main className="error-boundary">
          <span className="eyebrow">ALERTA DE SISTEMA</span>
          <h1>No se pudo completar la operación.</h1>
          <p>Revisa la conexión y vuelve a intentarlo. El escaneo en curso no se perdió.</p>
          <button className="button-primary" onClick={() => this.setState({ error: null })}>Reintentar</button>
          <p className="error-boundary-hint">Si el problema se repite, cierra la sesión e inicia de nuevo.</p>
        </main>
      );
    }
    return children;
  }
}
