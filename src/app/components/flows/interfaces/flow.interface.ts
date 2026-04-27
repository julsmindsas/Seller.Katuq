/**
 * Frontend mirror of the FlowSpec / NodeSpec / RunContext contracts. Source
 * of truth lives in `katuq_admin_back_firebase/functions/services/flows/contracts/`.
 *
 * Keep these definitions structurally compatible. They are deliberately
 * looser (Record<string, any>) than the backend so the editor can degrade
 * gracefully when the API ships an extension.
 */

export type FlowStatus = 'draft' | 'active' | 'inactive' | 'error';

export type FlowTriggerType =
  | 'webhook'
  | 'cron'
  | 'event'
  | 'manual'
  | 'polling';

export type RunStatus =
  | 'running'
  | 'success'
  | 'failed'
  | 'partial'
  | 'cancelled';

export type NodeStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped';

export interface NodePosition {
  x: number;
  y: number;
}

export interface FlowNode {
  id: string;
  type: string;
  position: NodePosition;
  params: Record<string, any>;
  credentialRef?: string;
  disabled?: boolean;
  notes?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowTriggerBinding {
  nodeId: string;
  type: FlowTriggerType;
  config: Record<string, any>;
  subscriptionId?: string;
  lastFiredAt?: string;
}

export interface FlowSpec {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  status: FlowStatus;
  graph: FlowGraph;
  triggers: FlowTriggerBinding[];
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  errorWorkflowId?: string;
  vars?: Record<string, any>;
  verboseLogging?: boolean;
  // Run-list helpers (denormalized by the backend list endpoint).
  lastRunAt?: string;
  lastRunStatus?: RunStatus;
}

export interface NodePort {
  name: string;
  label?: string;
  dataType?: 'item' | 'item[]' | 'binary' | 'event' | 'any';
  isError?: boolean;
}

export interface NodeSpec {
  type: string;
  category: 'trigger' | 'action' | 'transform' | 'flow-control' | 'ai';
  group: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  version: number;
  inputs: NodePort[];
  outputs: NodePort[];
  credentials?: string | string[];
  schema: Record<string, any>;
  defaults?: Record<string, any>;
  idempotent?: boolean;
  timeoutMs?: number;
  rateLimit?: { rps: number };
  tags?: string[];
}

export interface NodeError {
  message: string;
  code?: string;
  stack?: string;
  nodeId: string;
  attempt: number;
  timestamp: string;
  retryable: boolean;
}

export interface NodeItem<T = Record<string, any>> {
  json: T;
  binary?: Record<string, any>;
  pairedItemIndex?: number;
  _meta?: Record<string, any>;
}

export interface NodeState {
  status: NodeStatus;
  attempt: number;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  output?: { main: NodeItem[][]; error?: NodeItem[] };
  error?: NodeError;
  subscriptionId?: string;
}

export interface RunContext {
  runId: string;
  flowId: string;
  flowVersion: number;
  companyId: string;
  triggerEventId?: string;
  startedAt: string;
  finishedAt?: string;
  status: RunStatus;
  triggerData: NodeItem[];
  nodeStates: Record<string, NodeState>;
  errors: NodeError[];
  totalDurationMs?: number;
  triggeredBy?: string;
  varsSnapshot?: Record<string, any>;
  parentRunId?: string;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  thumbnailUrl?: string;
  tags?: string[];
  graph: FlowGraph;
  triggers?: FlowTriggerBinding[];
}
