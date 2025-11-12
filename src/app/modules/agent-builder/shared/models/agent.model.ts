export type DepartmentType = 'sales' | 'logistics' | 'inventory';
export type AgentStatus = 'active' | 'inactive';
export type ModelType = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface Agent {
  id?: string;
  agentName: string;
  department: DepartmentType;
  systemPrompt: string;
  selectedTools: string[];
  description?: string;
  model?: ModelType;
  status?: AgentStatus;
  createdAt?: string;
  updatedAt?: string;
  metadata?: AgentMetadata;
}

export interface AgentMetadata {
  totalExecutions?: number;
  avgExecutionTime?: number;
  lastExecuted?: string;
  successRate?: number;
}

export interface AgentExecution {
  agentId: string;
  task: string;
  result?: string;
  executedAt?: string;
  executionTime?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface CreateAgentRequest {
  agentName: string;
  department: DepartmentType;
  systemPrompt: string;
  selectedTools: string[];
  description?: string;
  model?: ModelType;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  id: string;
  status?: AgentStatus;
}

export interface AgentExecutionRequest {
  agentId: string;
  task: string;
}

export interface AgentExecutionResponse {
  success: boolean;
  data: {
    result: string;
    conversation?: any[]; // A2A conversation array from backend
  };
  companyId?: string;
  agentId: string;
  executionId?: string;
  executedAt?: string;
  executionTime?: number;
  status?: 'completed' | 'failed';
  error?: string;
}
