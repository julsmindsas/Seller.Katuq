import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CrmLead, CrmActivity, CrmTask, CrmStats, CrmPaginatedResponse, CrmStage } from '../models/crm.models';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly base = `${environment.urlApi}/v1/crm`;

  constructor(private http: HttpClient) {}

  /**
   * Fuerza el contexto CRM a 'corporate' (header x-crm-entity). Lo usa el
   * listado de Clientes Corporativos para crear/editar SIEMPRE sobre
   * corporate_clients + crm_pipeline, sin depender del flag por empresa.
   */
  private corporateOpts(force?: boolean): { headers?: HttpHeaders } {
    return force ? { headers: new HttpHeaders({ 'x-crm-entity': 'corporate' }) } : {};
  }

  // ─── Leads ──────────────────────────────────────────────────

  getLeads(filters: Record<string, any> = {}): Observable<CrmPaginatedResponse<CrmLead>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== '') params = params.set(k, v.toString());
    });
    return this.http.get<CrmPaginatedResponse<CrmLead>>(`${this.base}/leads`, { params })
      .pipe(catchError(() => of({ success: false, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } })));
  }

  getLead(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/leads/${id}`)
      .pipe(catchError(() => of({ success: false, data: null })));
  }

  updatePipeline(id: string, data: Record<string, any>): Observable<any> {
    return this.http.put<any>(`${this.base}/leads/${id}/pipeline`, data)
      .pipe(catchError(() => of({ success: false })));
  }

  updateLead(id: string, data: Record<string, any>, forceCorporate?: boolean): Observable<any> {
    return this.http.put<any>(`${this.base}/leads/${id}`, data, this.corporateOpts(forceCorporate))
      .pipe(catchError(() => of({ success: false })));
  }

  /** Bloquea/desbloquea el lead (soft-block). No borra el registro. */
  setLeadActive(id: string, active: boolean, forceCorporate?: boolean): Observable<any> {
    return this.http.put<any>(`${this.base}/leads/${id}/estado`, { active }, this.corporateOpts(forceCorporate))
      .pipe(catchError(() => of({ success: false })));
  }

  // ─── Activities ─────────────────────────────────────────────

  getActivities(entityId: string): Observable<CrmActivity[]> {
    return this.http.get<{ success: boolean; data: CrmActivity[] }>(`${this.base}/leads/${entityId}/activities`)
      .pipe(map(r => r.data || []), catchError(() => of([])));
  }

  addActivity(entityId: string, data: Partial<CrmActivity>): Observable<CrmActivity | null> {
    return this.http.post<{ success: boolean; data: CrmActivity }>(`${this.base}/leads/${entityId}/activities`, data)
      .pipe(map(r => r.data || null), catchError(() => of(null)));
  }

  // ─── Tasks ──────────────────────────────────────────────────

  getTasks(filters: Record<string, any> = {}): Observable<CrmTask[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null) params = params.set(k, v.toString());
    });
    return this.http.get<{ success: boolean; data: CrmTask[] }>(`${this.base}/tasks`, { params })
      .pipe(map(r => r.data || []), catchError(() => of([])));
  }

  createTask(entityId: string, data: Partial<CrmTask>): Observable<CrmTask | null> {
    return this.http.post<{ success: boolean; data: CrmTask }>(`${this.base}/leads/${entityId}/tasks`, data)
      .pipe(map(r => r.data || null), catchError(() => of(null)));
  }

  updateTask(taskId: string, data: Partial<CrmTask>): Observable<CrmTask | null> {
    return this.http.put<{ success: boolean; data: CrmTask }>(`${this.base}/tasks/${taskId}`, data)
      .pipe(map(r => r.data || null), catchError(() => of(null)));
  }

  reviewTask(taskId: string): Observable<CrmTask | null> {
    return this.http.patch<{ success: boolean; data: CrmTask }>(`${this.base}/tasks/${taskId}/review`, {})
      .pipe(map(r => r.data || null), catchError(() => of(null)));
  }

  // ─── Import ─────────────────────────────────────────────────

  importLead(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/leads/import`, data)
      .pipe(catchError(() => of({ success: false })));
  }

  createLead(data: Record<string, any>, forceCorporate?: boolean): Observable<any> {
    return this.http.post<any>(`${this.base}/leads`, data, this.corporateOpts(forceCorporate))
      .pipe(catchError(() => of({ success: false })));
  }

  // ─── Delete ─────────────────────────────────────────────────

  deleteLead(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/leads/${id}`)
      .pipe(catchError(() => of({ success: false })));
  }

  bulkDeleteLeads(ids: string[]): Observable<any> {
    return this.http.post<any>(`${this.base}/leads/bulk-delete`, { ids })
      .pipe(catchError(() => of({ success: false })));
  }

  findDuplicates(): Observable<any> {
    return this.http.get<any>(`${this.base}/leads/duplicates`)
      .pipe(catchError(() => of({ success: false, groups: [] })));
  }

  // ─── Stats & Stages ─────────────────────────────────────────

  getStats(): Observable<CrmStats | null> {
    return this.http.get<{ success: boolean; data: CrmStats }>(`${this.base}/stats`)
      .pipe(map(r => r.data || null), catchError(() => of(null)));
  }

  getStages(): Observable<{ stages: CrmStage[]; entityType: string }> {
    return this.http.get<{ success: boolean; data: CrmStage[]; entityType: string }>(`${this.base}/stages`)
      .pipe(map(r => ({ stages: r.data || [], entityType: r.entityType || 'client' })), catchError(() => of({ stages: [], entityType: 'client' })));
  }

  saveStages(stages: CrmStage[]): Observable<boolean> {
    return this.http.put<{ success: boolean }>(`${this.base}/stages`, { stages })
      .pipe(map(r => !!r.success), catchError(() => of(false)));
  }
}
