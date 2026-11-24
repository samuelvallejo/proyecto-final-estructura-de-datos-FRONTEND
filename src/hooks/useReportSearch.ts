import { useEffect, useState } from 'react';
import type { PlaceSuggestion, SearchFilters, SearchResponse } from '../services/search';
import { SearchView, SearchApi } from '../services/search';
import { LruCache } from '../data-structures/LruCache';

interface Answer { key: string; response: SearchResponse | null; suggestions: PlaceSuggestion[]; error: string }
type CachedAnswer = Omit<Answer, 'key'>;

/**
 * Recent server answers. Typing and deleting letters repeats queries
 * ("pan" -> "pana" -> "pan"), so the last 30 answers are reused for one minute
 * without a new request. Errors are never cached.
 */
export const searchCache = new LruCache<string, CachedAnswer>(30, 60_000);

/**
 * Debounced server search. Each new text cancels the previous request, and the
 * answer is stored with its query so stale responses are never shown.
 */
export default function useReportSearch(filters: SearchFilters) {
  const key = SearchView.searchKey(filters);
  const text = SearchView.serverQuery(filters.text);
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (!key || searchCache.get(key)) return; // get() also marks the entry as recently used.
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const lastWord = text.split(' ').pop() || text;
      const places = lastWord ? SearchApi.suggestPlaces(lastWord, controller.signal).catch(() => ({ suggestions: [] })) : Promise.resolve({ suggestions: [] });
      Promise.all([SearchApi.searchReports(key, controller.signal), places])
        .then(([response, places]) => {
          const value = { response, suggestions: places.suggestions, error: '' };
          searchCache.set(key, value);
          setAnswer({ key, ...value });
        })
        .catch((cause: Error) => { if (cause.name !== 'AbortError') setAnswer({ key, response: null, suggestions: [], error: cause.message }); });
    }, SearchView.SEARCH_DEBOUNCE_MS);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [key, text]);
  // A cached answer is shown in the same render; peek() has no side effects.
  const cached = key && answer?.key !== key ? searchCache.peek(key) : undefined;
  const current = answer?.key === key ? answer : cached ? { key, ...cached } : null;
  return {
    key,
    searching: Boolean(key) && !current,
    response: current?.response ?? null,
    suggestions: current?.suggestions ?? [],
    error: current?.error ?? '',
    facets: current?.response?.facets ?? null,
    fromCache: Boolean(cached),
  };
}
