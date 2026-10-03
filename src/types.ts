export type HazardLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface BoundingBox { ymin: number; xmin: number; ymax: number; xmax: number }
export interface ScanResult {
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
  status: 'UNVERIFIED';
}
export interface ScanResponse {
  result: ScanResult;
  provider: 'gemini' | 'local-yolo';
  fallback?: boolean;
  nextScanMs?: number;
  report: Report | null;
  existing: boolean;
  locationNote: string | null;
}
export interface ReportsPage { reports: Report[]; total: number; hasMore: boolean }
export interface Health { status: string; storage: string; tables: number; reports: number; geminiConfigured: boolean; aiProvider: string; localModelReady: boolean }
export interface StructureStat { size?: number; use: string; runningAndQueued?: number }
export type StructureStats = Record<string, StructureStat | string>;
