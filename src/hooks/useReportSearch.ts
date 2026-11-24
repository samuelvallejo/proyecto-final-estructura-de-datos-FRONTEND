import { useEffect, useState } from 'react';
import type { PlaceSuggestion, SearchResponse } from '../services/search';
import { SearchView, SearchApi } from '../services/search';

interface Answer { query: string; response: SearchResponse | null; suggestions: PlaceSuggestion[]; error: string }

/**
 * Debounced server search. Each new text cancels the previous request, and the
 * answer is stored with its query so stale responses are never shown.
 */
export default function useReportSearch(text: string) {
  const query = SearchView.serverQuery(text);
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const lastWord = query.split(' ').pop() || query;
      Promise.all([SearchApi.searchReports(query, controller.signal), SearchApi.suggestPlaces(lastWord, controller.signal).catch(() => ({ suggestions: [] }))])
        .then(([response, places]) => setAnswer({ query, response, suggestions: places.suggestions, error: '' }))
        .catch((cause: Error) => { if (cause.name !== 'AbortError') setAnswer({ query, response: null, suggestions: [], error: cause.message }); });
    }, SearchView.SEARCH_DEBOUNCE_MS);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query]);
  const current = answer?.query === query ? answer : null;
  return {
    query,
    searching: Boolean(query) && !current,
    response: current?.response ?? null,
    suggestions: current?.suggestions ?? [],
    error: current?.error ?? '',
  };
}
