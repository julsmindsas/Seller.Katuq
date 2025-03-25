import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, startWith, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Integration } from './integrations.service';

export interface IntegrationStatus {
  integrationId: string;
  status: 'online' | 'offline' | 'warning';
  lastChecked: Date;
  message?: string;
  metrics?: {
    successRate: number;
    responseTime: number;
    errorCount: number;
    transactionCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationMonitorService {
  private apiUrl = `${environment.urlApi}/integration-monitor`;
  private statusSubject = new BehaviorSubject<IntegrationStatus[]>([]);
  private pollingInterval = 60000; // 1 minute polling
  
  public status$ = this.statusSubject.asObservable();
  
  constructor(private http: HttpClient) {
    // Iniciar polling para monitoreo de estado
    this.startPolling();
  }
  
  private startPolling() {
    interval(this.pollingInterval).pipe(
      startWith(0),
      switchMap(() => this.fetchAllStatus())
    ).subscribe({
      next: (statuses) => this.statusSubject.next(statuses),
      error: (error) => console.error('Error polling integration status', error)
    });
  }
  
  fetchAllStatus(): Observable<IntegrationStatus[]> {
    return this.http.get<IntegrationStatus[]>(this.apiUrl);
  }
  
  getStatus(integrationId: string): Observable<IntegrationStatus | undefined> {
    return this.status$.pipe(
      map(statuses => statuses.find(status => status.integrationId === integrationId))
    );
  }
  
  checkStatus(integration: Integration): Observable<IntegrationStatus> {
    return this.http.post<IntegrationStatus>(`${this.apiUrl}/check`, integration);
  }
  
  resetErrorCount(integrationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${integrationId}/reset-errors`, {});
  }
  
  getStatusSummary(): Observable<{ 
    total: number, 
    online: number, 
    offline: number, 
    warning: number,
    recentTransactions: number
  }> {
    return this.status$.pipe(
      map(statuses => {
        const summary = {
          total: statuses.length,
          online: statuses.filter(s => s.status === 'online').length,
          offline: statuses.filter(s => s.status === 'offline').length,
          warning: statuses.filter(s => s.status === 'warning').length,
          recentTransactions: statuses.reduce((sum, s) => sum + (s.metrics?.transactionCount || 0), 0)
        };
        return summary;
      })
    );
  }
}
