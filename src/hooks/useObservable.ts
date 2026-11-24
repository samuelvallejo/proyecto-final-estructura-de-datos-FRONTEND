import { useCallback, useSyncExternalStore } from 'react';
import type { Observable } from '../patterns/Observable';

/** Re-renders the component whenever the observed subject notifies a change. */
export default function useObservable(subject: Observable | null): number {
  const subscribe = useCallback((listener: () => void) => subject ? subject.subscribe(listener) : () => {}, [subject]);
  return useSyncExternalStore(subscribe, () => subject?.version ?? 0);
}
