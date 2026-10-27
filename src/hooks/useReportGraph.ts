import { useEffect, useState } from 'react';
import type { GraphOrder, GraphSnapshot } from '../types/graphs';
import { loadReportGraph } from '../services/graphs';
export default function useReportGraph(radius: number, order: GraphOrder, start: string, end: string, revision: number) {
  const key = `${radius}|${order}|${start}|${end}|${revision}`;
  const [result, setResult] = useState<{ key: string; snapshot: GraphSnapshot | null; error: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const timeout = setTimeout(() => controller.abort(), 30000);
    void loadReportGraph(radius, order, start, end, controller.signal)
      .then(snapshot => { if (active) setResult({ key, snapshot, error: false }); })
      .catch(() => { if (active) setResult({ key, snapshot: null, error: true }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [radius, order, start, end, revision, key]);
  return { snapshot: result?.key === key ? result.snapshot : null, error: result?.key === key && result.error,
    loading: result?.key !== key };
}
