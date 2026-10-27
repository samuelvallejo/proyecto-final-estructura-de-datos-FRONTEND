import { useEffect, useRef, useState } from 'react';
import type { Position, Report } from '../types';
import { loadNearby } from '../services/api';
import { usableGPS } from '../services/community';

export default function useCommunityFeed(location: Position | null, enabled: boolean, revision: number) {
  const latest = useRef(location);
  useEffect(() => { latest.current = location; }, [location]);
  const [reports, setReports] = useState<Report[]>([]);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [feedError, setFeedError] = useState(false);
  // Refresh immediately after moving ~100 m; also poll without overlapping requests.
  const cell = location ? `${location.lat.toFixed(3)},${location.lng.toFixed(3)}` : '';
  useEffect(() => {
    if (!enabled || !cell) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        if (!usableGPS(latest.current)) { setFeedError(true); return; }
        const page = await loadNearby(latest.current, controller.signal);
        if (!controller.signal.aborted) { setReports(page.reports); setUpdatedAt(Date.now()); setFeedError(false); }
      } catch { if (!controller.signal.aborted) setFeedError(true); }
      finally { if (!controller.signal.aborted) timer = setTimeout(refresh, 15000); }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [enabled, cell, revision]);
  return { reports, updatedAt, feedError };
}
