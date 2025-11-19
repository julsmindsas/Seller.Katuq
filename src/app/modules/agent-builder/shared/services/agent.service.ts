import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  Agent,
  AgentExecution,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentExecutionRequest,
  AgentExecutionResponse,
  DepartmentType
} from '../models/agent.model';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly apiUrl = environment.agentBuilderApi;

  constructor(private http: HttpClient) {}

  /**
   * Creates a new agent with specified configuration
   * @param agent Agent configuration
   * @returns Observable with created agent data
   */
  createAgent(agent: CreateAgentRequest): Observable<{ success: boolean; agent: Agent; message: string }> {
    const payload = {
      ...agent,
      company: this.getCurrentCompany()
    };
    return this.http.post<{ success: boolean; agent: Agent; message: string }>(`${this.apiUrl}/v1/agent-builder/create`, payload);
  }

  /**
   * Lists all agents, optionally filtered by department
   * @param department Optional department filter
   * @returns Observable with array of agents
   */
  listAgents(department?: DepartmentType): Observable<{ success: boolean; agents: Agent[]; count: number }> {
    const company = this.getCurrentCompany();

    // When using proxy (port 3300), company goes in header
    const headers = { 'company': company };

    const params: any = {};
    if (department) {
      params.department = department;
    }

    return this.http.get<{ success: boolean; agents: Agent[]; count: number }>(
      `${this.apiUrl}/v1/agent-builder/list`,
      { headers, params }
    );
  }

  /**
   * Gets a specific agent by ID
   * @param agentId Agent ID
   * @returns Observable with agent data
   */
  getAgent(agentId: string): Observable<{ success: boolean; agent: Agent }> {
    return this.http.get<{ success: boolean; agent: Agent }>(`${this.apiUrl}/v1/agent-builder/agents/${agentId}`);
  }

  /**
   * Updates an existing agent
   * @param agentId Agent ID
   * @param updates Agent updates
   * @returns Observable with updated agent
   */
  updateAgent(agentId: string, updates: Partial<UpdateAgentRequest>): Observable<{ success: boolean; agent: Agent }> {
    return this.http.put<{ success: boolean; agent: Agent }>(`${this.apiUrl}/v1/agent-builder/agents/${agentId}`, updates);
  }

  /**
   * Deletes an agent by ID
   * @param agentId Agent ID
   * @returns Observable with deletion result
   */
  deleteAgent(agentId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/v1/agent-builder/agents/${agentId}`);
  }

  /**
   * Executes an agent with a specific task
   * @param execution Execution request with agent ID and task
   * @returns Observable with execution result
   */
  executeAgent(execution: AgentExecutionRequest): Observable<AgentExecutionResponse> {
    const payload = {
      ...execution,
      company: this.getCurrentCompany()
    };
    return this.http.post<AgentExecutionResponse>(`${this.apiUrl}/v1/agent-builder/execute`, payload);
  }

  /**
   * Gets execution history for an agent
   * @param agentId Agent ID
   * @returns Observable with array of executions
   */
  getExecutionHistory(agentId: string): Observable<{ success: boolean; executions: AgentExecution[] }> {
    const company = this.getCurrentCompany();
    return this.http.get<{ success: boolean; executions: AgentExecution[] }>(
      `${this.apiUrl}/v1/agent-builder/agents/${agentId}/history?company=${company}`
    );
  }

  /**
   * Toggles agent status (active/inactive)
   * @param agentId Agent ID
   * @returns Observable with updated agent
   */
  toggleAgentStatus(agentId: string): Observable<{ success: boolean; agent: Agent }> {
    return this.http.put<{ success: boolean; agent: Agent }>(`${this.apiUrl}/v1/agent-builder/agents/${agentId}/toggle-status`, {});
  }

  /**
   * Ejecuta el General Manager (Orquestador Maestro) con una consulta general
   * @param request Execution request with task and optional sessionId
   * @returns Observable with execution result including conversation log
   */
  executeGeneralManager(request: { task: string; sessionId?: string }): Observable<{
    success: boolean;
    data: {
      result: string;
      conversation?: any[];
      orchestratorsInvolved?: string[];
    };
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        result: string;
        conversation?: any[];
        orchestratorsInvolved?: string[];
      };
    }>(`${this.apiUrl}/v1/agent-builder/execute-general`, {
      company: this.getCurrentCompany(),
      task: request.task,
      sessionId: request.sessionId
    });
  }

  /**
   * Gets the current company ID from localStorage
   * @private
   * @returns Company ID
   */
  private getCurrentCompany(): string {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.company || 'unknown_company';
      }
    } catch (error) {
      console.error('[AgentService] Error getting current company:', error);
    }
    return 'unknown_company';
  }
}
