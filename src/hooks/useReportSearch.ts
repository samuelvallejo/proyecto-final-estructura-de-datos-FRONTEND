import { useEffect, useState } from 'react';
import type { PlaceSuggestion, SearchResponse } from '../services/search';
import { SearchApi, SearchView } from '../services/search';
import { LruCache } from '../data-structures/LruCache';

interface Answer { query: string; response: SearchResponse | null; suggestions: PlaceSuggestion[]; error: string }
type CachedAnswer = Omit<Answer, 'query'>;

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
export default function useReportSearch(text: string) {
  const query = SearchView.serverQuery(text);
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (!query || searchCache.get(query)) return; // get() also marks the entry as recently used.
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const lastWord = query.split(' ').pop() || query;
      Promise.all([SearchApi.searchReports(query, controller.signal), SearchApi.suggestPlaces(lastWord, controller.signal).catch(() => ({ suggestions: [] }))])
        .then(([response, places]) => {
          const value = { response, suggestions: places.suggestions, error: '' };
          searchCache.set(query, value);
          setAnswer({ query, ...value });
        })
        .catch((cause: Error) => { if (cause.name !== 'AbortError') setAnswer({ query, response: null, suggestions: [], error: cause.message }); });
    }, SearchView.SEARCH_DEBOUNCE_MS);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query]);
  // A cached answer is shown in the same render; peek() has no side effects.
  const cached = query && answer?.query !== query ? searchCache.peek(query) : undefined;
  const current = answer?.query === query ? answer : cached ? { query, ...cached } : null;
  return {
    query,
    searching: Boolean(query) && !current,
    response: current?.response ?? null,
    suggestions: current?.suggestions ?? [],
    error: current?.error ?? '',
    fromCache: Boolean(cached),
  };
}
