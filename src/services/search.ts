import { ApiClient } from './api.ts';
import { ReportTools } from './reportTools.ts';
import type { Report } from '../types';

export interface SearchIndexInfo { documents: number; terms: number; trieNodes: number; builtAt: number; buildMs: number; rebuilt: boolean }
export interface SearchFacets { risk: Record<string, number>; damage: Record<string, number> }
export interface SearchResponse { reports: Report[]; total: number; hasMore: boolean; tokens: string[]; tookMs: number; index: SearchIndexInfo; facets?: SearchFacets }
/** What the explorer asks for; dates are YYYY-MM-DD from date inputs ('' = no limit). */
export interface SearchFilters { text: string; risk: string; damage: string; from: string; to: string }
export interface PlaceSuggestion { label: string; kind: 'street' | 'neighborhood' | 'city'; count: number }

/** HTTP client of the server-side search (inverted index, trie, bitmap index and AVL tree in the backend). */
export class SearchApi {
  static searchReports(key: string, signal?: AbortSignal, limit = 200): Promise<SearchResponse> {
    return ApiClient.request<SearchResponse>(`/reports/search?${key}&limit=${limit}`, { signal });
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

  /** Local day bounds in milliseconds: from the first to the last millisecond of each chosen day. */
  static dayBounds(from: string, to: string): { since: number | null; until: number | null } {
    const since = from ? new Date(`${from}T00:00:00`).getTime() : NaN;
    const until = to ? new Date(`${to}T23:59:59.999`).getTime() : NaN;
    return { since: Number.isFinite(since) ? since : null, until: Number.isFinite(until) ? until : null };
  }

  /**
   * Canonical query string for the server ('' when there is nothing to ask). It is
   * also the cache key, so the same filters typed in another order hit the cache.
   */
  static searchKey(filters: SearchFilters): string {
    const params = new URLSearchParams();
    const text = SearchView.serverQuery(filters.text);
    if (text) params.set('q', text);
    if (filters.risk) params.set('risk', filters.risk);
    if (filters.damage) params.set('damage', filters.damage);
    const { since, until } = SearchView.dayBounds(filters.from, filters.to);
    if (since !== null) params.set('from', String(since));
    if (until !== null) params.set('to', String(until));
    return params.toString();
  }

  /** Date filter for the loaded reports when the server cannot answer. */
  static withinDays(report: Pick<Report, 'timestamp'>, from: string, to: string): boolean {
    const { since, until } = SearchView.dayBounds(from, to);
    return (since === null || report.timestamp >= since) && (until === null || report.timestamp <= until);
  }

  /** Reports to show: server results when the server answered these filters, otherwise the loaded ones. */
  static searchBase(loaded: Report[], key: string, server: { key: string; reports: Report[] } | null): { reports: Report[]; fromServer: boolean } {
    if (key && server && server.key === key) return { reports: server.reports, fromServer: true };
    return { reports: loaded, fromServer: false };
  }
}
