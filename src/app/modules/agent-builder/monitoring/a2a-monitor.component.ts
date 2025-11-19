/**
 * A2A Monitor Component
 *
 * Real-time monitoring dashboard for A2A protocol operations.
 * Shows metrics, call logs, events, and agent cards.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { A2AService } from '../shared/services/a2a.service';
import {
  A2AMetrics,
  A2ACallLog,
  A2AEvent,
  AgentCardRegistry,
  OrchestratorInfo
} from '../shared/models/a2a.types';

@Component({
  selector: 'app-a2a-monitor',
  templateUrl: './a2a-monitor.component.html',
  styleUrls: ['./a2a-monitor.component.scss']
})
export class A2aMonitorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  metrics: A2AMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    activeTasks: 0,
    a2aCalls: 0
  };

  callLogs: A2ACallLog[] = [];
  events: A2AEvent[] = [];
  orchestrators: OrchestratorInfo[] = [];
  agentCardRegistry: AgentCardRegistry | null = null;

  // UI State
  activeTab: 'metrics' | 'logs' | 'events' | 'cards' | 'orchestrators' = 'metrics';
  loading = false;
  error: string | null = null;

  // Filters
  logFilter: 'all' | 'success' | 'error' = 'all';
  eventFilter: 'all' | 'calls' | 'tools' = 'all';

  constructor(private a2aService: A2AService) {}

  ngOnInit(): void {
    console.log('[A2AMonitor] Initializing');
    this.subscribeToUpdates();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  private subscribeToUpdates(): void {
    // Subscribe to metrics
    this.a2aService.metrics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.metrics = metrics;
      });

    // Subscribe to call logs
    this.a2aService.callLogs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(logs => {
        this.callLogs = logs;
      });

    // Subscribe to events
    this.a2aService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(events => {
        this.events = events;
      });
  }

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  private loadInitialData(): void {
    this.loadOrchestrators();
    this.loadAgentCardRegistry();
  }

  loadOrchestrators(): void {
    this.loading = true;
    this.error = null;

    this.a2aService.listOrchestrators()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.orchestrators = result.orchestrators;
          this.loading = false;
          console.log('[A2AMonitor] Orchestrators loaded:', this.orchestrators);
        },
        error: (error) => {
          this.error = `Error loading orchestrators: ${error.message}`;
          this.loading = false;
          console.error('[A2AMonitor] Error loading orchestrators:', error);
        }
      });
  }

  loadAgentCardRegistry(): void {
    this.a2aService.getAgentCardRegistry()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (registry) => {
          this.agentCardRegistry = registry;
          console.log('[A2AMonitor] Agent Card Registry loaded:', registry);
        },
        error: (error) => {
          console.error('[A2AMonitor] Error loading Agent Card Registry:', error);
        }
      });
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  refresh(): void {
    console.log('[A2AMonitor] Refreshing data');
    this.loadInitialData();
  }

  clearMetrics(): void {
    if (confirm('Are you sure you want to reset all metrics?')) {
      this.a2aService.resetMetrics();
      console.log('[A2AMonitor] Metrics reset');
    }
  }

  clearLogs(): void {
    if (confirm('Are you sure you want to clear all call logs?')) {
      this.a2aService.clearCallLogs();
      console.log('[A2AMonitor] Call logs cleared');
    }
  }

  clearEvents(): void {
    if (confirm('Are you sure you want to clear all events?')) {
      this.a2aService.clearEvents();
      console.log('[A2AMonitor] Events cleared');
    }
  }

  testRpcCall(): void {
    console.log('[A2AMonitor] Testing RPC call: orchestrator.list');
    this.loadOrchestrators();
  }

  // ==========================================================================
  // Computed Properties
  // ==========================================================================

  get filteredLogs(): A2ACallLog[] {
    if (this.logFilter === 'all') {
      return this.callLogs;
    }
    return this.callLogs.filter(log => log.status === this.logFilter);
  }

  get filteredEvents(): A2AEvent[] {
    if (this.eventFilter === 'all') {
      return this.events;
    }

    if (this.eventFilter === 'calls') {
      return this.events.filter(e =>
        e.type.includes('call:') || e.type.includes('a2a:')
      );
    }

    if (this.eventFilter === 'tools') {
      return this.events.filter(e => e.type.includes('tool:'));
    }

    return this.events;
  }

  get successRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100);
  }

  get failureRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return Math.round((this.metrics.failedRequests / this.metrics.totalRequests) * 100);
  }

  // ==========================================================================
  // UI Helpers
  // ==========================================================================

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'success':
      case 'completed':
      case 'active':
        return 'badge-success';
      case 'pending':
      case 'running':
        return 'badge-warning';
      case 'error':
      case 'failed':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getEventTypeIcon(type: string): string {
    if (type.includes('call:')) return 'pi pi-phone';
    if (type.includes('tool:')) return 'pi pi-wrench';
    if (type.includes('agent:')) return 'pi pi-user';
    if (type.includes('task:')) return 'pi pi-list';
    if (type.includes('error')) return 'pi pi-exclamation-triangle';
    return 'pi pi-info-circle';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${milliseconds}`;
  }

  formatDuration(duration: number): string {
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  }

  formatJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  getDepartmentColor(department: string): string {
    switch (department) {
      case 'sales':
        return '#3b82f6'; // blue
      case 'inventory':
        return '#10b981'; // green
      case 'logistics':
        return '#f59e0b'; // amber
      case 'general':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  }

  getOrchestratorIcon(department: string): string {
    switch (department) {
      case 'sales':
        return 'pi pi-chart-line';
      case 'inventory':
        return 'pi pi-box';
      case 'logistics':
        return 'pi pi-truck';
      case 'general':
        return 'pi pi-briefcase';
      default:
        return 'pi pi-circle';
    }
  }
}
