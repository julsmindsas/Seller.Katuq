/**
 * Local copy of the FlowSpec / NodeSpec / RunContext contracts. Mirrors
 * `katuq_admin_back_firebase/functions/services/flows/contracts/*.ts`. We keep
 * a copy here because the Web Component must be buildable in isolation; the
 * source of truth lives in the backend repo.
 */

export type JSONSchemaLike = Record<string, any>;

export type NodeCategory =
    | 'trigger'
    | 'action'
    | 'transform'
    | 'flow-control'
    | 'ai';

export type NodeGroup =
    | 'osmosis'
    | 'shopify'
    | 'woocommerce'
    | 'katuq'
    | 'flow-control'
    | 'http'
    | 'kai';

export interface NodePort {
    name: string;
    label?: string;
    dataType?: 'item' | 'item[]' | 'binary' | 'event' | 'any';
    isError?: boolean;
}

export interface NodeSpec {
    type: string;
    category: NodeCategory;
    group: NodeGroup;
    displayName: string;
    description: string;
    icon: string;
    color: string;
    version: number;
    inputs: NodePort[];
    outputs: NodePort[];
    credentials?: string | string[];
    schema: JSONSchemaLike;
    defaults?: Record<string, any>;
    idempotent?: boolean;
    timeoutMs?: number;
    rateLimit?: { rps: number };
    tags?: string[];
}

export interface NodePosition { x: number; y: number; }

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

export type FlowTriggerType =
    | 'webhook'
    | 'cron'
    | 'event'
    | 'manual'
    | 'polling';

export interface FlowTriggerBinding {
    nodeId: string;
    type: FlowTriggerType;
    config: Record<string, any>;
    subscriptionId?: string;
    lastFiredAt?: string;
}

export type FlowStatus = 'draft' | 'active' | 'inactive' | 'error';

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
}

// ----- run state -----

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
