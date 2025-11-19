/**
 * A2A Protocol Types for Frontend
 *
 * TypeScript types matching the official A2A protocol (a2a-protocol.org)
 * for use in Angular frontend application.
 */

// ============================================================================
// JSON-RPC 2.0 Core Types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any> | any[];
  id: string | number | null;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

// ============================================================================
// Agent Card Types
// ============================================================================

export interface AgentCard {
  name: string;
  version: string;
  description: string;
  capabilities: AgentCapabilities;
  endpoints: AgentEndpoints;
  authentication?: AuthenticationInfo;
  metadata?: Record<string, any>;
}

export interface AgentCapabilities {
  methods: MethodCapability[];
  tools?: ToolCapability[];
  supportedProtocols: string[];
  asyncSupport: boolean;
  batchSupport: boolean;
}

export interface MethodCapability {
  name: string;
  description: string;
  params: ParameterSchema[];
  returns: ReturnSchema;
  async?: boolean;
}

export interface ToolCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  department?: string;
}

export interface ParameterSchema {
  name: string;
  type: string;
  description: string;
  required: boolean;
  schema?: Record<string, any>;
}

export interface ReturnSchema {
  type: string;
  description: string;
  schema?: Record<string, any>;
}

export interface AgentEndpoints {
  execute: string;
  status?: string;
  cancel?: string;
  result?: string;
  agentCard: string;
}

export interface AuthenticationInfo {
  type: 'oauth2' | 'bearer' | 'apikey' | 'none';
  tokenEndpoint?: string;
  scopes?: string[];
  description?: string;
}

// ============================================================================
// Agent Card Registry
// ============================================================================

export interface AgentCardRegistry {
  version: string;
  protocol: string;
  baseUrl: string;
  orchestrators: {
    sales: AgentCard;
    inventory: AgentCard;
    logistics: AgentCard;
    generalManager: AgentCard;
  };
  capabilities: {
    a2aSupport: boolean;
    asyncExecution: boolean;
    batchRequests: boolean;
    webSocketStreaming: boolean;
    taskTracking: boolean;
    crossDepartmentCalls: boolean;
  };
  metadata: {
    generatedAt: string;
    katuqVersion: string;
    totalOrchestrators: number;
  };
}

// ============================================================================
// A2A Method Types
// ============================================================================

export interface AgentExecuteParams {
  agent?: string;
  task: string;
  context?: Record<string, any>;
  async?: boolean;
  callback?: string;
  timeout?: number;
}

export interface AgentExecuteResult {
  taskId?: string;
  result?: string;
  status: 'completed' | 'pending' | 'running' | 'failed';
  conversation?: ConversationMessage[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface TaskStatusParams {
  taskId: string;
}

export interface TaskStatusResult {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface OrchestratorInfo {
  department: string;
  name: string;
  status: 'active' | 'inactive' | 'busy';
  description?: string;
}

export interface OrchestratorListResult {
  orchestrators: OrchestratorInfo[];
  count: number;
}

// ============================================================================
// Conversation & Logging Types
// ============================================================================

export interface ConversationMessage {
  timestamp: string;
  speaker: string;
  department: string;
  message: string;
  type: ConversationMessageType;
  metadata?: Record<string, any>;
}

export type ConversationMessageType =
  | 'user_request'
  | 'orchestrator_thinking'
  | 'tool_call'
  | 'sub_agent_call'
  | 'a2a_request'
  | 'a2a_response'
  | 'final_result'
  | 'error'
  | 'a2a_error';

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface A2AEvent {
  type: A2AEventType;
  timestamp: string;
  sessionId?: string;
  taskId?: string;
  payload: any;
}

export type A2AEventType =
  | 'a2a:call:started'
  | 'a2a:call:completed'
  | 'a2a:call:failed'
  | 'a2a:tool:executing'
  | 'a2a:tool:completed'
  | 'a2a:agent:thinking'
  | 'a2a:task:progress'
  | 'a2a:error';

export interface A2ACallStartedEvent {
  from: string;
  to: string;
  method: string;
  params: any;
}

export interface A2ACallCompletedEvent {
  from: string;
  to: string;
  method: string;
  result: any;
  duration: number;
}

export interface A2AToolExecutingEvent {
  toolName: string;
  agent: string;
  input: any;
}

export interface A2AToolCompletedEvent {
  toolName: string;
  agent: string;
  output: any;
  duration: number;
}

// ============================================================================
// UI-Specific Types
// ============================================================================

export interface A2AMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeTasks: number;
  a2aCalls: number;
}

export interface A2ACallLog {
  id: string;
  timestamp: string;
  method: string;
  params: any;
  result?: any;
  error?: JsonRpcError;
  duration: number;
  status: 'pending' | 'success' | 'error';
}
