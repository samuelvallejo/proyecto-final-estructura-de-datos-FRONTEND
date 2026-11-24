/** Labels and formats shared by the screens; pure, tested functions. UI text stays in Spanish. */
export class Formatter {
  static readonly riskText: Record<string, string> = { LOW: 'Bajo', MEDIUM: 'Moderado', HIGH: 'Alto', CRITICAL: 'Crítico' };
  static readonly typeText: Record<string, string> = { BACHE: 'Bache', HUNDIMIENTO: 'Hundimiento', GRIETA: 'Grieta', OTRO_DANO: 'Daño vial' };
  static readonly statusText: Record<string, string> = {
    UNVERIFIED: 'Sin verificar', CONFIRMED: 'Confirmado', IN_PROGRESS: 'En reparación', REPAIRED: 'Reparado', REJECTED: 'Rechazado',
  };
  static readonly actionText: Record<string, string> = {
    'auth.login': 'Inició sesión', 'auth.logout': 'Cerró sesión', 'scan.detected': 'Detectó baches con la cámara',
    'report.created': 'Registró un bache nuevo', 'community.report.created': 'Publicó un aviso comunitario',
    'pothole.pass': 'Pasó por un bache conocido', 'trip.started': 'Inició un recorrido', 'trip.finished': 'Finalizó un recorrido',
    'photo.analyzed': 'Analizó una fotografía', 'admin.user.role': 'Cambió el rol de una cuenta',
    'admin.user.active': 'Cambió el acceso de una cuenta', 'admin.report.status': 'Cambió el estado de un bache',
    'operator.report.status': 'Actualizó el estado de un bache en mantenimiento',
  };
  private static readonly avatarPalette = ['#2f6b45', '#8a5a14', '#3d5f8f', '#7c3f62', '#4f6b1d', '#a04d2f', '#2d6a6a', '#5b4b8a'];

  static timeText(time: number): string {
    return new Date(time).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /** Readable duration: 45 s, 12 min 5 s, 2 h 03 min. */
  static durationText(ms: number | null | undefined): string {
    const total = Math.max(0, Math.round((ms || 0) / 1000));
    const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60), seconds = total % 60;
    if (hours) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
    if (minutes) return `${minutes} min ${seconds} s`;
    return `${seconds} s`;
  }

  static distanceText(meters: number | null | undefined): string {
    const value = Math.max(0, meters || 0);
    return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
  }

  /** Avatar initials: first letter of the first two words of the name, or BS. */
  static initialsOf(name: string | null | undefined): string {
    let letters = '';
    for (const part of (name || '').replace(/[.]/g, ' ').split(/\s+/)) {
      if (!part) continue;
      letters += part[0];
      if (letters.length === 2) break;
    }
    return letters.toUpperCase() || 'BS';
  }

  /** Stable color per person: the same name always produces the same color. */
  static avatarColor(seed: string | null | undefined): string {
    let hash = 0;
    for (const char of seed || '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return Formatter.avatarPalette[hash % Formatter.avatarPalette.length];
  }

  static peopleText(count: number | null | undefined): string {
    const value = count || 0;
    return value === 0 ? 'Nadie ha pasado todavía' : value === 1 ? '1 persona ha pasado por aquí' : `${value} personas han pasado por aquí`;
  }
}
