/**
 * A2A Protocol Service
 *
 * Service for interacting with the A2A (Agent-to-Agent) protocol implementation.
 * Provides JSON-RPC 2.0 communication with KAI backend through the main backend proxy.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  AgentCardRegistry,
  AgentCard,
  AgentExecuteParams,
  AgentExecuteResult,
  OrchestratorListResult,
  TaskStatusParams,
  TaskStatusResult,
  A2AEvent,
  A2AMetrics,
  A2ACallLog
} from '../models/a2a.types';

@Injectable({
  providedIn: 'root'
})
export class A2AService {
  private baseUrl = environment.agentBuilderApi; // http://localhost:3300
  private rpcEndpoint = `${this.baseUrl}/api/rpc`;
  private agentCardEndpoint = `${this.baseUrl}/.well-known/agent-card.json`;

  // State management
  private metricsSubject = new BehaviorSubject<A2AMetrics>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    activeTasks: 0,
    a2aCalls: 0
  });

  private callLogsSubject = new BehaviorSubject<A2ACallLog[]>([]);
  private eventsSubject = new BehaviorSubject<A2AEvent[]>([]);

  public metrics$ = this.metricsSubject.asObservable();
  public callLogs$ = this.callLogsSubject.asObservable();
  public events$ = this.eventsSubject.asObservable();

  private requestIdCounter = 1;

  constructor(private http: HttpClient) {
    console.log('[A2AService] Initialized with baseUrl:', this.baseUrl);
  }

  // ==========================================================================
  // JSON-RPC 2.0 Core Methods
  // ==========================================================================

  /**
   * Make a JSON-RPC 2.0 call
   */
  private call<T>(method: string, params?: any): Observable<T> {
    const requestId = this.requestIdCounter++;
    const startTime = Date.now();

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params: params || {},
      id: requestId
    };

    const headers = this.getHeaders();

    console.log(`[A2AService] JSON-RPC Call: ${method}`, params);

    // Add to call logs
    this.addCallLog({
      id: requestId.toString(),
      timestamp: new Date().toISOString(),
      method,
      params,
      duration: 0,
      status: 'pending'
    });

    return this.http.post<JsonRpcResponse<T>>(this.rpcEndpoint, request, { headers }).pipe(
      tap(response => {
        const duration = Date.now() - startTime;
        console.log(`[A2AService] JSON-RPC Response: ${method} (${duration}ms)`, response);

        // Update call log
        this.updateCallLog(requestId.toString(), {
          result: response.result,
          error: response.error,
          duration,
          status: response.error ? 'error' : 'success'
        });

        // Update metrics
        this.updateMetrics(duration, !response.error);
      }),
      map(response => {
        if (response.error) {
          throw new Error(`JSON-RPC Error [${response.error.code}]: ${response.error.message}`);
        }
        return response.result as T;
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        console.error(`[A2AService] JSON-RPC Error: ${method}`, error);

        // Update call log
        this.updateCallLog(requestId.toString(), {
          error: { code: -1, message: error.message },
          duration,
          status: 'error'
        });

        // Update metrics
        this.updateMetrics(duration, false);

        return throwError(() => error);
      })
    );
  }

  /**
   * Make a batch JSON-RPC 2.0 call
   */
  callBatch<T>(requests: Array<{ method: string; params?: any }>): Observable<T[]> {
    const batchRequest = requests.map((req, index) => ({
      jsonrpc: '2.0' as const,
      method: req.method,
      params: req.params || {},
      id: this.requestIdCounter++
    }));

    const headers = this.getHeaders();

    console.log('[A2AService] JSON-RPC Batch Call:', batchRequest);

    return this.http.post<JsonRpcResponse<T>[]>(this.rpcEndpoint, batchRequest, { headers }).pipe(
      map(responses => {
        return responses.map(response => {
          if (response.error) {
            throw new Error(`JSON-RPC Error [${response.error.code}]: ${response.error.message}`);
          }
          return response.result as T;
        });
      }),
      catchError(error => {
        console.error('[A2AService] JSON-RPC Batch Error:', error);
        return throwError(() => error);
      })
    );
  }

  // ==========================================================================
  // Agent Card Methods
  // ==========================================================================

  /**
   * Get complete Agent Card Registry
   */
  getAgentCardRegistry(): Observable<AgentCardRegistry> {
    console.log('[A2AService] Fetching Agent Card Registry');

    return this.http.get<AgentCardRegistry>(this.agentCardEndpoint, { headers: this.getHeaders() }).pipe(
      tap(registry => {
        console.log('[A2AService] Agent Card Registry loaded:', registry);
      }),
      catchError(error => {
        console.error('[A2AService] Error fetching Agent Card Registry:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get individual Agent Card for an orchestrator
   */
  getAgentCard(orchestrator: 'sales' | 'inventory' | 'logistics' | 'general-manager'): Observable<AgentCard> {
    const url = `${this.baseUrl}/.well-known/agent-cards/${orchestrator}`;
    console.log(`[A2AService] Fetching Agent Card: ${orchestrator}`);

    return this.http.get<AgentCard>(url, { headers: this.getHeaders() }).pipe(
      tap(card => {
        console.log(`[A2AService] Agent Card loaded: ${orchestrator}`, card);
      }),
      catchError(error => {
        console.error(`[A2AService] Error fetching Agent Card for ${orchestrator}:`, error);
        return throwError(() => error);
      })
    );
  }

  // ==========================================================================
  // Orchestrator Methods
  // ==========================================================================

  /**
   * List all orchestrators
   */
  listOrchestrators(): Observable<OrchestratorListResult> {
    return this.call<OrchestratorListResult>('orchestrator.list');
  }

  /**
   * Execute Sales Orchestrator
   */
  executeSalesOrchestrator(params: AgentExecuteParams): Observable<AgentExecuteResult> {
    return this.call<AgentExecuteResult>('salesOrchestrator.execute', params);
  }

  /**
   * Execute Inventory Orchestrator
   */
  executeInventoryOrchestrator(params: AgentExecuteParams): Observable<AgentExecuteResult> {
    return this.call<AgentExecuteResult>('inventoryOrchestrator.execute', params);
  }

  /**
   * Execute Logistics Orchestrator
   */
  executeLogisticsOrchestrator(params: AgentExecuteParams): Observable<AgentExecuteResult> {
    return this.call<AgentExecuteResult>('logisticsOrchestrator.execute', params);
  }

  /**
   * Execute General Manager (master orchestrator)
   */
  executeGeneralManager(params: AgentExecuteParams): Observable<AgentExecuteResult> {
    return this.call<AgentExecuteResult>('generalManager.execute', params);
  }

  // ==========================================================================
  // Sub-Agent Methods
  // ==========================================================================

  /**
   * Execute a sub-agent
   */
  executeAgent(agentName: string, task: string, context?: Record<string, any>): Observable<AgentExecuteResult> {
    return this.call<AgentExecuteResult>('agent.execute', {
      agentName,
      task,
      context
    });
  }

  /**
   * List agents
   */
  listAgents(department?: string): Observable<any> {
    return this.call<any>('agent.list', { department });
  }

  // ==========================================================================
  // Tool Methods
  // ==========================================================================

  /**
   * Call a tool directly
   */
  callTool(toolName: string, input: any): Observable<any> {
    return this.call<any>('tool.call', {
      toolName,
      input
    });
  }

  /**
   * List available tools
   */
  listTools(department?: string): Observable<any> {
    return this.call<any>('tool.list', { department });
  }

  // ==========================================================================
  // Task Tracking Methods
  // ==========================================================================

  /**
   * Get task status (for async tasks)
   */
  getTaskStatus(taskId: string): Observable<TaskStatusResult> {
    return this.call<TaskStatusResult>('task.status', { taskId });
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string, reason?: string): Observable<any> {
    return this.call<any>('task.cancel', { taskId, reason });
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: string): Observable<any> {
    return this.call<any>('task.result', { taskId });
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * Add an A2A event
   */
  addEvent(event: A2AEvent): void {
    const events = this.eventsSubject.value;
    events.push(event);

    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }

    this.eventsSubject.next(events);
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.eventsSubject.next([]);
  }

  // ==========================================================================
  // Metrics & Logging
  // ==========================================================================

  private addCallLog(log: A2ACallLog): void {
    const logs = this.callLogsSubject.value;
    logs.unshift(log); // Add to beginning

    // Keep only last 50 logs
    if (logs.length > 50) {
      logs.pop();
    }

    this.callLogsSubject.next(logs);
  }

  private updateCallLog(id: string, update: Partial<A2ACallLog>): void {
    const logs = this.callLogsSubject.value;
    const index = logs.findIndex(log => log.id === id);

    if (index !== -1) {
      logs[index] = { ...logs[index], ...update };
      this.callLogsSubject.next([...logs]);
    }
  }

  private updateMetrics(duration: number, success: boolean): void {
    const current = this.metricsSubject.value;
    const totalRequests = current.totalRequests + 1;
    const successfulRequests = success ? current.successfulRequests + 1 : current.successfulRequests;
    const failedRequests = success ? current.failedRequests : current.failedRequests + 1;

    // Calculate new average response time
    const totalTime = current.averageResponseTime * current.totalRequests + duration;
    const averageResponseTime = totalTime / totalRequests;

    this.metricsSubject.next({
      ...current,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime)
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): A2AMetrics {
    return this.metricsSubject.value;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metricsSubject.next({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeTasks: 0,
      a2aCalls: 0
    });
  }

  /**
   * Clear call logs
   */
  clearCallLogs(): void {
    this.callLogsSubject.next([]);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private getHeaders(): HttpHeaders {
    const company = localStorage.getItem('company') || '';
    const email = localStorage.getItem('email') || '';
    const token = localStorage.getItem('token') || '';

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'company': company,
      'email': email,
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}
