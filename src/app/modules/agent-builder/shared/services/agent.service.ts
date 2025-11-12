import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../shared/services/base.service';
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
export class AgentService extends BaseService {

  constructor(public http: HttpClient) {
    super(http);
  }

  /**
   * Creates a new agent with specified configuration
   * @param agent Agent configuration
   * @returns Observable with created agent data
   */
  createAgent(agent: CreateAgentRequest): Observable<{ success: boolean; agent: Agent; message: string }> {
    return this.post<{ success: boolean; agent: Agent; message: string }>('/v1/agent-builder/create', agent);
  }

  /**
   * Lists all agents, optionally filtered by department
   * @param department Optional department filter
   * @returns Observable with array of agents
   */
  listAgents(department?: DepartmentType): Observable<{ success: boolean; agents: Agent[] }> {
    const url = department
      ? `/v1/agent-builder/list?department=${department}`
      : '/v1/agent-builder/list';
    return this.get<{ success: boolean; agents: Agent[] }>(url);
  }

  /**
   * Gets a specific agent by ID
   * @param agentId Agent ID
   * @returns Observable with agent data
   */
  getAgent(agentId: string): Observable<{ success: boolean; agent: Agent }> {
    return this.get<{ success: boolean; agent: Agent }>(`/v1/agent-builder/agents/${agentId}`);
  }

  /**
   * Updates an existing agent
   * @param agentId Agent ID
   * @param updates Agent updates
   * @returns Observable with updated agent
   */
  updateAgent(agentId: string, updates: Partial<UpdateAgentRequest>): Observable<{ success: boolean; agent: Agent }> {
    return this.put<{ success: boolean; agent: Agent }>(`/v1/agent-builder/agents/${agentId}`, updates);
  }

  /**
   * Deletes an agent by ID
   * @param agentId Agent ID
   * @returns Observable with deletion result
   */
  deleteAgent(agentId: string): Observable<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/v1/agent-builder/agents/${agentId}`);
  }

  /**
   * Executes an agent with a specific task
   * @param execution Execution request with agent ID and task
   * @returns Observable with execution result
   */
  executeAgent(execution: AgentExecutionRequest): Observable<AgentExecutionResponse> {
    return this.post<AgentExecutionResponse>('/v1/agent-builder/execute', execution);
  }

  /**
   * Gets execution history for an agent
   * @param agentId Agent ID
   * @returns Observable with array of executions
   */
  getExecutionHistory(agentId: string): Observable<{ success: boolean; executions: AgentExecution[] }> {
    return this.get<{ success: boolean; executions: AgentExecution[] }>(`/v1/agent-builder/agents/${agentId}/history`);
  }

  /**
   * Toggles agent status (active/inactive)
   * @param agentId Agent ID
   * @returns Observable with updated agent
   */
  toggleAgentStatus(agentId: string): Observable<{ success: boolean; agent: Agent }> {
    return this.put<{ success: boolean; agent: Agent }>(`/v1/agent-builder/agents/${agentId}/toggle-status`, {});
  }
}
