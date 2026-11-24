import { ApiClient } from './api.ts';
import { ReportTools } from './reportTools.ts';
import type { Report } from '../types';

export interface SearchIndexInfo { documents: number; terms: number; trieNodes: number; builtAt: number; buildMs: number; rebuilt: boolean }
export interface SearchResponse { reports: Report[]; total: number; hasMore: boolean; tokens: string[]; tookMs: number; index: SearchIndexInfo }
export interface PlaceSuggestion { label: string; kind: 'street' | 'neighborhood' | 'city'; count: number }

/** HTTP client of the server-side search (inverted index + trie in the backend). */
export class SearchApi {
  static searchReports(query: string, signal?: AbortSignal, limit = 200): Promise<SearchResponse> {
    return ApiClient.request<SearchResponse>(`/reports/search?q=${encodeURIComponent(query)}&limit=${limit}`, { signal });
  }

  static suggestPlaces(prefix: string, signal?: AbortSignal): Promise<{ suggestions: PlaceSuggestion[] }> {
    return ApiClient.request<{ suggestions: PlaceSuggestion[] }>(`/reports/suggest?prefix=${encodeURIComponent(prefix)}&limit=6`, { signal });
  }
}

/** Pure rules that decide when and with what the explorer searches on the server. */
export class SearchView {
  /** Minimum typed characters before asking the server; shorter text keeps local filtering. */
  static readonly SERVER_SEARCH_MIN_LENGTH = 2;
  static readonly SEARCH_DEBOUNCE_MS = 300;
  static readonly placeKindText: Record<PlaceSuggestion['kind'], string> = { street: 'Vía', neighborhood: 'Barrio', city: 'Ciudad' };

  /** Query sent to the server, or '' when the text is too short to search there. */
  static serverQuery(text: string): string {
    const value = ReportTools.normalize(text);
    return value.replace(/[^a-z0-9]/g, '').length >= SearchView.SERVER_SEARCH_MIN_LENGTH ? value : '';
  }

  /** Reports to show: server results when the server answered this query, otherwise the loaded ones. */
  static searchBase(loaded: Report[], query: string, server: { query: string; reports: Report[] } | null): { reports: Report[]; fromServer: boolean } {
    const active = SearchView.serverQuery(query);
    if (active && server && server.query === active) return { reports: server.reports, fromServer: true };
    return { reports: loaded, fromServer: false };
  }
}
