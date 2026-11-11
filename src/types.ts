export type HazardLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface BoundingBox { ymin: number; xmin: number; ymax: number; xmax: number }
export interface ScanResult {
  confidence?: number;
  isPothole: boolean;
  potholeType: 'BACHE' | 'HUNDIMIENTO' | 'GRIETA' | 'OTRO_DANO' | null;
  hazardScore: number;
  hazardLevel: HazardLevel;
  aiDescription: string;
  riskFactors: string[];
  boundingBox?: BoundingBox;
}
export interface Position { lat: number; lng: number; accuracy: number; capturedAt?: number }
export interface Report extends ScanResult {
  id: string;
  timestamp: number;
  location: Position;
  zone: { street: string | null; neighborhood: string | null; city: string | null; fullAddress: string | null };
  source?: 'COMMUNITY' | 'YOLO';
  status: ReportStatus;
  /** Bache físico al que pertenece el reporte. */
  potholeId?: string;
  /** Veces que alguien pasó por este hueco y personas distintas que lo hicieron. */
  passCount?: number;
  peopleCount?: number;
  lastPassAt?: number | null;
}
export type ReportStatus = 'UNVERIFIED' | 'CONFIRMED' | 'IN_PROGRESS' | 'REPAIRED' | 'REJECTED';
export interface ScanResponse {
  detections?: (ScanResult & { confidence?: number; report: Report | null; existing: boolean })[];
  reports?: Report[];
  result: ScanResult;
  provider: 'gemini' | 'local-yolo';
  fallback?: boolean;
  nextScanMs?: number;
  durationMs?: number;
  report: Report | null;
  existing: boolean;
  locationNote: string | null;
}
export interface ReportsPage { reports: Report[]; total: number; hasMore: boolean }
export interface Health { status: string; database?: 'up' | 'down'; model?: 'ready' | 'unavailable' }
export interface PhotoDetection { clase: 'pothole'; confianza: number; bbox: [number, number, number, number] }
export interface PhotoDetections { total_baches: number; ancho: number; alto: number; detecciones: PhotoDetection[] }
export type Vehicle = 'moto' | 'carro';
export interface Trip {
  id: string; name: string; pointA: string; pointB: string; start: Position; end: Position | null;
  startedAt: number; endedAt: number | null; reportCount: number; path?: Position[]; reports?: Report[];
  vehicle?: Vehicle | null; durationMs?: number; passCount?: number; potholeCount?: number; distanceMeters?: number;
}
export type Role = 'Administrador' | 'Operario' | 'Conductor';
export interface UserStats { sessions: number; scans: number; potholesDetected: number; potholesPassed: number; passes: number; trips: number; drivingMs: number }
export interface Me { id: string; displayName: string; email: string; initials: string; role: Role; isAdmin: boolean; createdAt: number; sessionId: string; stats: UserStats }
export interface AuditEvent { action: string; at: number; entityId?: string | null; details: Record<string, unknown>; userName?: string; userId?: string; id?: string; sessionId?: string }
export interface SessionSummary {
  id: string; startedAt: number; endedAt: number | null; lastSeenAt: number | null; active: boolean; current: boolean;
  durationMs: number; scans: number; potholesDetected: number; potholesPassed: number; trips: number; events: AuditEvent[];
  userId?: string; userName?: string;
}
export interface PotholeHistoryItem { kind: 'detected' | 'passed'; at: number; source: string; report: Report; tripId: string | null; distanceMeters: number | null }
export interface DemoAccount { role: Role; label: string; description: string; email: string; password: string }
export interface StructureStat { size?: number; use: string; runningAndQueued?: number }
export type StructureStats = Record<string, StructureStat | string>;
