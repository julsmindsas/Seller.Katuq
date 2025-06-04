import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, NEVER, timer } from 'rxjs';
import { switchMap, startWith, map, catchError, retry, takeUntil, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Integration } from './integrations.service';

export interface IntegrationStatus {
  integrationId: string;
  status: 'online' | 'offline' | 'warning' | 'checking';
  lastChecked: Date;
  message?: string;
  consecutiveErrors?: number;
  metrics?: {
    successRate: number;
    responseTime: number;
    errorCount: number;
    transactionCount: number;
    uptime: number;
  };
}

export interface MonitoringConfig {
  baseInterval: number;
  maxInterval: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationMonitorService {
  private apiUrl = `${environment.urlApi}/integration-monitor`;
  private statusSubject = new BehaviorSubject<IntegrationStatus[]>([]);
  private isPollingActiveSubject = new BehaviorSubject<boolean>(true);
  private errorCountSubject = new BehaviorSubject<number>(0);
  
  private config: MonitoringConfig = {
    baseInterval: 60000, // 1 minute
    maxInterval: 300000, // 5 minutes
    retryAttempts: 3,
    circuitBreakerThreshold: 5
  };
  
  private currentInterval = this.config.baseInterval;
  private consecutiveErrors = 0;
  private circuitBreakerOpen = false;
  
  public status$ = this.statusSubject.asObservable();
  public isPollingActive$ = this.isPollingActiveSubject.asObservable();
  public errorCount$ = this.errorCountSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.startIntelligentPolling();
  }
  
  private startIntelligentPolling() {
    this.createPollingStream().subscribe();
  }
  
  private createPollingStream(): Observable<void> {
    return interval(this.currentInterval).pipe(
      startWith(0),
      filter(() => this.isPollingActiveSubject.value && !this.circuitBreakerOpen),
      switchMap(() => this.fetchAllStatusWithRetry()),
      map((statuses) => {
        this.handleSuccessfulFetch(statuses);
        return void 0;
      }),
      catchError((error) => {
        this.handlePollingError(error);
        return NEVER;
      })
    );
  }
  
  private fetchAllStatusWithRetry(): Observable<IntegrationStatus[]> {
    return this.fetchAllStatus().pipe(
      retry({
        count: this.config.retryAttempts,
        delay: (error, retryCount) => timer(Math.min(1000 * retryCount, 5000))
      }),
      catchError((error) => {
        console.error('Failed to fetch integration status after retries:', error);
        throw error;
      })
    );
  }
  
  private handleSuccessfulFetch(statuses: IntegrationStatus[]): void {
    this.statusSubject.next(statuses);
    this.consecutiveErrors = 0;
    this.currentInterval = this.config.baseInterval;
    this.circuitBreakerOpen = false;
    this.errorCountSubject.next(0);
  }
  
  private handlePollingError(error: any): void {
    console.error('Error polling integration status:', error);
    this.consecutiveErrors++;
    this.errorCountSubject.next(this.consecutiveErrors);
    
    // Implement exponential backoff
    this.currentInterval = Math.min(
      this.currentInterval * 2,
      this.config.maxInterval
    );
    
    // Circuit breaker
    if (this.consecutiveErrors >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }
    
    // Restart polling with new interval
    setTimeout(() => {
      this.createPollingStream().subscribe();
    }, this.currentInterval);
  }
  
  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    console.warn('Circuit breaker opened due to consecutive errors');
    
    // Try to close circuit breaker after 5 minutes
    timer(300000).subscribe(() => {
      this.circuitBreakerOpen = false;
      this.consecutiveErrors = 0;
      this.currentInterval = this.config.baseInterval;
      console.info('Circuit breaker closed, resuming normal operation');
    });
  }
  
  fetchAllStatus(): Observable<IntegrationStatus[]> {
    return this.http.get<IntegrationStatus[]>(this.apiUrl).pipe(
      map(statuses => statuses.map(status => ({
        ...status,
        lastChecked: new Date(),
        consecutiveErrors: status.consecutiveErrors || 0
      }))),
      catchError(error => {
        console.error('Error fetching integration statuses:', error);
        // Return cached data with error status if available
        const cachedStatuses = this.statusSubject.value;
        const errorStatuses = cachedStatuses.map(status => ({
          ...status,
          status: 'offline' as const,
          message: 'Connection error',
          lastChecked: new Date()
        }));
        return [errorStatuses];
      })
    );
  }
  
  getStatus(integrationId: string): Observable<IntegrationStatus | undefined> {
    return this.status$.pipe(
      map(statuses => statuses.find(status => status.integrationId === integrationId)),
      filter(status => status !== undefined)
    );
  }
  
  // Método para pausar el polling
  pausePolling(): void {
    this.isPollingActiveSubject.next(false);
    console.info('Integration monitoring paused');
  }
  
  // Método para reanudar el polling
  resumePolling(): void {
    this.isPollingActiveSubject.next(true);
    this.consecutiveErrors = 0;
    this.currentInterval = this.config.baseInterval;
    this.circuitBreakerOpen = false;
    console.info('Integration monitoring resumed');
  }
  
  // Método para forzar una verificación inmediata
  forceCheck(): Observable<IntegrationStatus[]> {
    return this.fetchAllStatusWithRetry();
  }
  
  // Método para actualizar la configuración de monitoreo
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.info('Monitoring configuration updated:', this.config);
  }
  
  // Método para obtener métricas del servicio de monitoreo
  getMonitoringMetrics(): Observable<{
    isActive: boolean;
    currentInterval: number;
    consecutiveErrors: number;
    circuitBreakerOpen: boolean;
    lastUpdate: Date;
  }> {
    return this.isPollingActive$.pipe(
      map(isActive => ({
        isActive,
        currentInterval: this.currentInterval,
        consecutiveErrors: this.consecutiveErrors,
        circuitBreakerOpen: this.circuitBreakerOpen,
        lastUpdate: new Date()
      }))
    );
  }
  
  checkStatus(integration: Integration): Observable<IntegrationStatus> {
    // Update status to 'checking' immediately
    this.updateIntegrationStatus(integration.id!, 'checking', 'Verificando conexión...');
    
    return this.http.post<IntegrationStatus>(`${this.apiUrl}/check`, integration).pipe(
      map(status => ({
        ...status,
        lastChecked: new Date()
      })),
      catchError(error => {
        const errorStatus: IntegrationStatus = {
          integrationId: integration.id!,
          status: 'offline',
          lastChecked: new Date(),
          message: `Error: ${error.message || 'Connection failed'}`,
          consecutiveErrors: (this.getIntegrationStatus(integration.id!)?.consecutiveErrors || 0) + 1
        };
        this.updateIntegrationStatusInCache(errorStatus);
        throw error;
      })
    );
  }
  
  private updateIntegrationStatus(integrationId: string, status: IntegrationStatus['status'], message?: string): void {
    const currentStatuses = this.statusSubject.value;
    const updatedStatuses = currentStatuses.map(s => 
      s.integrationId === integrationId 
        ? { ...s, status, message, lastChecked: new Date() }
        : s
    );
    this.statusSubject.next(updatedStatuses);
  }
  
  private updateIntegrationStatusInCache(newStatus: IntegrationStatus): void {
    const currentStatuses = this.statusSubject.value;
    const index = currentStatuses.findIndex(s => s.integrationId === newStatus.integrationId);
    
    if (index >= 0) {
      currentStatuses[index] = newStatus;
    } else {
      currentStatuses.push(newStatus);
    }
    
    this.statusSubject.next([...currentStatuses]);
  }
  
  private getIntegrationStatus(integrationId: string): IntegrationStatus | undefined {
    return this.statusSubject.value.find(s => s.integrationId === integrationId);
  }
  
  resetErrorCount(integrationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${integrationId}/reset-errors`, {});
  }
  
  getStatusSummary(): Observable<{ 
    total: number, 
    online: number, 
    offline: number, 
    warning: number,
    checking: number,
    recentTransactions: number,
    averageUptime: number,
    healthScore: number
  }> {
    return this.status$.pipe(
      map(statuses => {
        const total = statuses.length;
        const online = statuses.filter(s => s.status === 'online').length;
        const offline = statuses.filter(s => s.status === 'offline').length;
        const warning = statuses.filter(s => s.status === 'warning').length;
        const checking = statuses.filter(s => s.status === 'checking').length;
        const recentTransactions = statuses.reduce((sum, s) => sum + (s.metrics?.transactionCount || 0), 0);
        const averageUptime = total > 0 
          ? statuses.reduce((sum, s) => sum + (s.metrics?.uptime || 0), 0) / total 
          : 0;
        const healthScore = total > 0 ? (online / total) * 100 : 0;
        
        return {
          total,
          online,
          offline,
          warning,
          checking,
          recentTransactions,
          averageUptime: Math.round(averageUptime * 100) / 100,
          healthScore: Math.round(healthScore * 100) / 100
        };
      })
    );
  }
  
  // Cleanup method
  destroy(): void {
    this.isPollingActiveSubject.next(false);
    this.statusSubject.complete();
    this.isPollingActiveSubject.complete();
    this.errorCountSubject.complete();
  }
}
