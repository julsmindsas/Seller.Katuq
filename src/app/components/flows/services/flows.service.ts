import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseService } from '../../../shared/services/base.service';
import { environment } from '../../../../environments/environment';
import {
  FlowSpec,
  FlowGraph,
  FlowTriggerBinding,
  RunContext,
  NodeSpec,
  FlowTemplate
} from '../interfaces/flow.interface';
import { FALLBACK_NODE_CATALOG } from './flows.fallback-catalog';

interface ApiResponse<T> {
  ok?: boolean;
  success?: boolean;
  data?: T;
  result?: T;
  flows?: T;
  flow?: T;
  runs?: T;
  run?: T;
  catalog?: T;
  templates?: T;
}

/**
 * HTTP gateway for the Flows backend (`/v1/flows/*`). Extends BaseService so
 * the global interceptor adds auth headers (`company`, `user`, ...).
 *
 * On the very first sprint the backend may not have all endpoints wired yet.
 * For the catalog we fall back to a hardcoded copy so the editor is usable
 * standalone while A2 finishes the route.
 */
@Injectable({
  providedIn: 'root'
})
export class FlowsService extends BaseService {
  private readonly baseUrl = `${environment.urlApi}/v1/flows`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Lista flows del tenant.
   * Por default `excludeEmpty=true` para no mostrar borradores con grafo vacío
   * (artefactos de pruebas o templates abandonados). Pasar `{includeEmpty: true}`
   * para verlos todos.
   */
  list(opts: { includeEmpty?: boolean; status?: string; limit?: number } = {}): Observable<FlowSpec[]> {
    const params: string[] = [];
    if (!opts.includeEmpty) params.push('excludeEmpty=true');
    if (opts.status) params.push(`status=${encodeURIComponent(opts.status)}`);
    if (opts.limit) params.push(`limit=${opts.limit}`);
    const url = params.length > 0 ? `${this.baseUrl}?${params.join('&')}` : this.baseUrl;
    return this.http
      .get<ApiResponse<FlowSpec[]> | FlowSpec[]>(url)
      .pipe(map((res) => unwrapList<FlowSpec>(res, 'flows')));
  }

  /**
   * Fetches one flow by id. Renamed from `get` because BaseService already
   * exposes a protected `get<T>` helper with a different signature.
   */
  getById(id: string): Observable<FlowSpec | null> {
    return this.http
      .get<ApiResponse<FlowSpec> | FlowSpec>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  create(payload: Partial<FlowSpec>): Observable<FlowSpec | null> {
    return this.http
      .post<ApiResponse<FlowSpec> | FlowSpec>(this.baseUrl, payload)
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  update(id: string, payload: Partial<FlowSpec>): Observable<FlowSpec | null> {
    return this.http
      .put<ApiResponse<FlowSpec> | FlowSpec>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  saveGraph(
    id: string,
    graph: FlowGraph,
    triggers?: FlowTriggerBinding[]
  ): Observable<FlowSpec | null> {
    return this.update(id, { graph, triggers });
  }

  activate(id: string): Observable<FlowSpec | null> {
    return this.http
      .post<ApiResponse<FlowSpec> | FlowSpec>(`${this.baseUrl}/${id}/activate`, {})
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  deactivate(id: string): Observable<FlowSpec | null> {
    return this.http
      .post<ApiResponse<FlowSpec> | FlowSpec>(`${this.baseUrl}/${id}/deactivate`, {})
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  duplicate(id: string): Observable<FlowSpec | null> {
    return this.http
      .post<ApiResponse<FlowSpec> | FlowSpec>(`${this.baseUrl}/${id}/duplicate`, {})
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  /**
   * Deletes a flow by id. Renamed from `delete` because BaseService already
   * exposes a protected `delete<T>` helper.
   */
  deleteFlow(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => true));
  }

  /**
   * Dispara un test-run del flow. Backend expone `/test-run` (no `/run`)
   * y devuelve `{ success, run: RunContext }`.
   */
  testRun(id: string, payload?: any): Observable<RunContext | null> {
    return this.http
      .post<ApiResponse<RunContext> | RunContext>(
        `${this.baseUrl}/${id}/test-run`,
        payload || {}
      )
      .pipe(map((res) => unwrapSingle<RunContext>(res, 'run')));
  }

  getRuns(flowId: string, limit = 25): Observable<RunContext[]> {
    return this.http
      .get<ApiResponse<RunContext[]> | RunContext[]>(
        `${this.baseUrl}/${flowId}/runs?limit=${limit}`
      )
      .pipe(map((res) => unwrapList<RunContext>(res, 'runs')));
  }

  /**
   * Backend devuelve `{ success, run: { runId, ... }, logs }`.
   * Preferimos `run` y caemos a `data` por compat.
   */
  getRun(runId: string): Observable<RunContext | null> {
    return this.http
      .get<ApiResponse<RunContext> | RunContext>(`${this.baseUrl}/runs/${runId}`)
      .pipe(map((res) => unwrapSingle<RunContext>(res, 'run')));
  }

  /**
   * Fetches the NodeSpec catalog from the backend. Falls back to the local
   * copy embedded in `flows.fallback-catalog.ts` so the editor renders even
   * if the endpoint is not yet implemented.
   */
  getNodeCatalog(): Observable<NodeSpec[]> {
    return this.http
      .get<ApiResponse<NodeSpec[]> | NodeSpec[]>(`${this.baseUrl}/nodes/catalog`)
      .pipe(
        map((res) => {
          const data = unwrapList<NodeSpec>(res, 'catalog');
          return data.length > 0 ? data : FALLBACK_NODE_CATALOG;
        }),
        catchError(() => of(FALLBACK_NODE_CATALOG))
      );
  }

  getTemplates(): Observable<FlowTemplate[]> {
    return this.http
      .get<ApiResponse<FlowTemplate[]> | FlowTemplate[]>(`${this.baseUrl}/templates`)
      .pipe(
        map((res) => unwrapList<FlowTemplate>(res, 'templates')),
        catchError(() => of([]))
      );
  }

  installTemplate(templateId: string): Observable<FlowSpec | null> {
    return this.http
      .post<ApiResponse<FlowSpec> | FlowSpec>(
        `${this.baseUrl}/templates/${templateId}/install`,
        {}
      )
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  // ---- Versions / diff / rollback ----

  listVersions(flowId: string): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.baseUrl}/${flowId}/versions`)
      .pipe(
        map((res) => unwrapList<any>(res, 'flows')),
        catchError(() => of([]))
      );
  }

  getVersion(flowId: string, version: number): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/${flowId}/versions/${version}`)
      .pipe(map((res: any) => res?.version || res));
  }

  diff(flowId: string, from: number, to: number): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.baseUrl}/${flowId}/diff?from=${from}&to=${to}`)
      .pipe(map((res: any) => res?.diff || res));
  }

  rollback(flowId: string, version: number): Observable<FlowSpec | null> {
    return this.http
      .post<ApiResponse<FlowSpec>>(`${this.baseUrl}/${flowId}/rollback/${version}`, {})
      .pipe(map((res) => unwrapSingle<FlowSpec>(res, 'flow')));
  }

  // ---- AI assist ----

  aiGenerate(prompt: string): Observable<{ flow: any; source: string; confidence: string; message?: string }> {
    return this.http
      .post<any>(`${this.baseUrl}/ai/generate`, { prompt })
      .pipe(
        map((res) => ({
          flow: res?.flow || null,
          source: res?.source || 'unknown',
          confidence: res?.confidence || 'low',
          message: res?.message,
        })),
        catchError(() => of({ flow: null, source: 'error', confidence: 'low', message: 'AI service unavailable' }))
      );
  }

  // ---- Run streaming (SSE) ----

  /**
   * Abre stream SSE para un run. El callback `onEvent` recibe cada evento.
   * Devuelve un EventSource que el caller debe cerrar al desmontar.
   */
  streamRun(runId: string, onEvent: (eventName: string, data: any) => void): EventSource {
    const url = `${this.baseUrl}/runs/${runId}/stream`;
    const source = new EventSource(url, { withCredentials: true });
    const handler = (eventName: string) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(eventName, data);
      } catch {
        onEvent(eventName, e.data);
      }
    };
    ['init', 'run_update', 'log', 'done', 'error'].forEach((name) => {
      source.addEventListener(name, handler(name) as EventListener);
    });
    return source;
  }

  // ---- Run actions ----

  retryRun(runId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/runs/${runId}/retry`, {});
  }

  cancelRun(runId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/runs/${runId}/cancel`, {});
  }
}

// ---- helpers ----

function unwrapList<T>(
  res: any,
  preferredKey: 'flows' | 'runs' | 'catalog' | 'templates'
): T[] {
  if (Array.isArray(res)) return res as T[];
  if (!res || typeof res !== 'object') return [];
  if (Array.isArray(res[preferredKey])) return res[preferredKey];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.result)) return res.result;
  return [];
}

function unwrapSingle<T>(
  res: any,
  preferredKey: 'flow' | 'run' | 'runs' | 'data'
): T | null {
  if (!res) return null;
  if (typeof res !== 'object') return null;
  if (preferredKey in res && res[preferredKey]) return res[preferredKey];
  // Algunos endpoints aún usan 'data' o 'result' como envelope.
  if ('run' in res && res.run) return res.run;
  if ('flow' in res && res.flow) return res.flow;
  if ('data' in res && res.data) return res.data;
  if ('result' in res && res.result) return res.result;
  // Plain shape
  if ('id' in res || 'runId' in res) return res as T;
  return null;
}
