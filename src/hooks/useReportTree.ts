import { useEffect, useState } from 'react';
import type { Traversal } from '../data-structures/BinarySearchTree.ts';
import type { TreeSnapshot } from '../types/trees';
import { loadReportTree } from '../services/trees';
export default function useReportTree(minimum: number, maximum: number, order: Traversal, revision: number) {
  const key = `${minimum}|${maximum}|${order}|${revision}`;
  const [result, setResult] = useState<{ key: string; snapshot: TreeSnapshot | null; error: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const timeout = setTimeout(() => controller.abort(), 30000);
    void loadReportTree(minimum, maximum, order, controller.signal)
      .then(snapshot => { if (active) setResult({ key, snapshot, error: false }); })
      .catch(() => { if (active) setResult({ key, snapshot: null, error: true }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [minimum, maximum, order, revision, key]);
  return { snapshot: result?.key === key ? result.snapshot : null, error: result?.key === key && result.error,
    loading: result?.key !== key };
}
