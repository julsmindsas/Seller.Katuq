import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CrmContact, CrmActivity, CrmTask, CrmStats,
  CrmPaginatedResponse, CrmSingleResponse, CrmContactFilters,
} from '../models/crm.models';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly baseUrl = `${environment.urlApi}/v1/crm`;

  // ─── Reactive State ──────────────────────────────────────
  private statsSubject = new BehaviorSubject<CrmStats | null>(null);
  public stats$ = this.statsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════
  //  CONTACTS
  // ═══════════════════════════════════════════════════════════

  getContacts(filters: CrmContactFilters = {}): Observable<CrmPaginatedResponse<CrmContact>> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.source) params = params.set('source', filters.source);
    if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);

    return this.http.get<CrmPaginatedResponse<CrmContact>>(`${this.baseUrl}/contacts`, { params })
      .pipe(catchError(this.handleError<CrmPaginatedResponse<CrmContact>>('getContacts', {
        success: false, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      })));
  }

  getContactById(id: string): Observable<CrmContact | null> {
    return this.http.get<CrmSingleResponse<CrmContact>>(`${this.baseUrl}/contacts/${id}`)
      .pipe(
        map(res => res.success ? res.data : null),
        catchError(this.handleError<CrmContact | null>('getContactById', null)),
      );
  }

  createContact(data: Partial<CrmContact>): Observable<CrmContact | null> {
    return this.http.post<CrmSingleResponse<CrmContact>>(`${this.baseUrl}/contacts`, data)
      .pipe(
        map(res => res.success ? res.data : null),
        catchError(this.handleError<CrmContact | null>('createContact', null)),
      );
  }

  updateContact(id: string, data: Partial<CrmContact>): Observable<CrmContact | null> {
    return this.http.put<CrmSingleResponse<CrmContact>>(`${this.baseUrl}/contacts/${id}`, data)
      .pipe(
        map(res => res.success ? res.data : null),
        catchError(this.handleError<CrmContact | null>('updateContact', null)),
      );
  }

  updateContactStatus(id: string, status: string): Observable<boolean> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/contacts/${id}/status`, { status })
      .pipe(
        map(res => res.success),
        catchError(this.handleError<boolean>('updateContactStatus', false)),
      );
  }

  deleteContact(id: string): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/contacts/${id}`)
      .pipe(
        map(res => res.success),
        catchError(this.handleError<boolean>('deleteContact', false)),
      );
  }

  // ═══════════════════════════════════════════════════════════
  //  ACTIVITIES
  // ═══════════════════════════════════════════════════════════

  getActivities(contactId: string, page = 1, limit = 50): Observable<CrmPaginatedResponse<CrmActivity>> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<CrmPaginatedResponse<CrmActivity>>(
      `${this.baseUrl}/contacts/${contactId}/activities`, { params },
    ).pipe(catchError(this.handleError<CrmPaginatedResponse<CrmActivity>>('getActivities', {
      success: false, data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    })));
  }

  addActivity(contactId: string, data: Partial<CrmActivity>): Observable<CrmActivity | null> {
    return this.http.post<CrmSingleResponse<CrmActivity>>(
      `${this.baseUrl}/contacts/${contactId}/activities`, data,
    ).pipe(
      map(res => res.success ? res.data : null),
      catchError(this.handleError<CrmActivity | null>('addActivity', null)),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  TASKS
  // ═══════════════════════════════════════════════════════════

  getTasks(filters: { assignedTo?: string; status?: string; contactId?: string; overdue?: boolean; page?: number; limit?: number } = {}): Observable<CrmPaginatedResponse<CrmTask>> {
    let params = new HttpParams();
    if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.contactId) params = params.set('contactId', filters.contactId);
    if (filters.overdue) params = params.set('overdue', 'true');
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<CrmPaginatedResponse<CrmTask>>(`${this.baseUrl}/tasks`, { params })
      .pipe(catchError(this.handleError<CrmPaginatedResponse<CrmTask>>('getTasks', {
        success: false, data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      })));
  }

  getContactTasks(contactId: string): Observable<CrmPaginatedResponse<CrmTask>> {
    return this.http.get<CrmPaginatedResponse<CrmTask>>(`${this.baseUrl}/contacts/${contactId}/tasks`)
      .pipe(catchError(this.handleError<CrmPaginatedResponse<CrmTask>>('getContactTasks', {
        success: false, data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      })));
  }

  createTask(contactId: string, data: Partial<CrmTask>): Observable<CrmTask | null> {
    return this.http.post<CrmSingleResponse<CrmTask>>(`${this.baseUrl}/contacts/${contactId}/tasks`, data)
      .pipe(
        map(res => res.success ? res.data : null),
        catchError(this.handleError<CrmTask | null>('createTask', null)),
      );
  }

  updateTask(taskId: string, data: Partial<CrmTask>): Observable<CrmTask | null> {
    return this.http.patch<CrmSingleResponse<CrmTask>>(`${this.baseUrl}/tasks/${taskId}`, data)
      .pipe(
        map(res => res.success ? res.data : null),
        catchError(this.handleError<CrmTask | null>('updateTask', null)),
      );
  }

  // ═══════════════════════════════════════════════════════════
  //  STATS
  // ═══════════════════════════════════════════════════════════

  getStats(): Observable<CrmStats | null> {
    return this.http.get<{ success: boolean; data: CrmStats }>(`${this.baseUrl}/stats`)
      .pipe(
        map(res => res.success ? res.data : null),
        tap(stats => this.statsSubject.next(stats)),
        catchError(this.handleError<CrmStats | null>('getStats', null)),
      );
  }

  // ═══════════════════════════════════════════════════════════
  //  BULK
  // ═══════════════════════════════════════════════════════════

  bulkUpdateStatus(contactIds: string[], status: string): Observable<{ updated: number }> {
    return this.http.post<{ success: boolean; updated: number }>(
      `${this.baseUrl}/contacts/bulk-status`, { contactIds, status },
    ).pipe(catchError(this.handleError('bulkUpdateStatus', { updated: 0 })));
  }

  bulkAssign(contactIds: string[], assignedTo: string): Observable<{ updated: number }> {
    return this.http.post<{ success: boolean; updated: number }>(
      `${this.baseUrl}/contacts/bulk-assign`, { contactIds, assignedTo },
    ).pipe(catchError(this.handleError('bulkAssign', { updated: 0 })));
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORT
  // ═══════════════════════════════════════════════════════════

  exportContacts(filters: CrmContactFilters = {}): Observable<CrmContact[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);

    return this.http.get<{ success: boolean; data: CrmContact[] }>(
      `${this.baseUrl}/contacts/export`, { params },
    ).pipe(
      map(res => res.success ? res.data : []),
      catchError(this.handleError<CrmContact[]>('exportContacts', [])),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  INTEGRATION
  // ═══════════════════════════════════════════════════════════

  linkToClient(contactId: string, clienteId: string): Observable<boolean> {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/contacts/${contactId}/link-client`, { clienteId },
    ).pipe(
      map(res => res.success),
      catchError(this.handleError<boolean>('linkToClient', false)),
    );
  }

  convertToClient(contactId: string): Observable<{ clienteId: string } | null> {
    return this.http.post<{ success: boolean; clienteId: string }>(
      `${this.baseUrl}/contacts/${contactId}/convert`, {},
    ).pipe(
      map(res => res.success ? { clienteId: res.clienteId } : null),
      catchError(this.handleError<{ clienteId: string } | null>('convertToClient', null)),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  MIGRATION
  // ═══════════════════════════════════════════════════════════

  migrate(): Observable<{ migratedClients: number; migratedProspects: number }> {
    return this.http.post<any>(`${this.baseUrl}/migrate`, {})
      .pipe(catchError(this.handleError('migrate', { migratedClients: 0, migratedProspects: 0 })));
  }

  // ─── Error handler ─────────────────────────────────────────

  private handleError<T>(operation: string, fallback: T) {
    return (error: any): Observable<T> => {
      console.error(`CRM ${operation} failed:`, error?.error?.error || error?.message || error);
      return of(fallback);
    };
  }
}
