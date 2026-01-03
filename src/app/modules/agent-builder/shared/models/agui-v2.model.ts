/**
 * AG-UI v2 Protocol Models with A2UI Support
 *
 * Implements the official AG-UI protocol specification with:
 * - All standard AG-UI events (lifecycle, text, tools, state, activity)
 * - Official Interrupts for HITL
 * - Namespaced custom events (katuq:*)
 * - A2UI integration for generative UI
 *
 * Based on:
 * - AG-UI: https://docs.ag-ui.com/
 * - A2UI: https://a2ui.org/specification/v0.8-a2ui/
 */

// ========================
// AG-UI EVENT TYPES (Spec Official)
// ========================

export type AgUiEventType =
  // Lifecycle
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'RUN_ERROR'
  | 'STEP_STARTED'
  | 'STEP_FINISHED'
  // Text Messages
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  // Tool Calls
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_RESULT'
  | 'TOOL_CALL_END'
  // State Management
  | 'STATE_SNAPSHOT'
  | 'STATE_DELTA'
  | 'MESSAGES_SNAPSHOT'
  // Activity
  | 'ACTIVITY_SNAPSHOT'
  | 'ACTIVITY_DELTA'
  // Interrupts (HITL Official)
  | 'INTERRUPT'
  // Special
  | 'RAW'
  | 'CUSTOM';

// ========================
// KATUQ CUSTOM EVENT TYPES (Namespaced)
// ========================

export type KatuqCustomEventType =
  // Multi-agent
  | 'katuq:AGENT_JOINED'
  | 'katuq:AGENT_THINKING'
  | 'katuq:DELEGATION'
  // Voting/Negotiation
  | 'katuq:VOTE'
  | 'katuq:CONSENSUS_REACHED'
  | 'katuq:NEGOTIATION_ROUND'
  // A2UI
  | 'katuq:SURFACE_UPDATE'
  | 'katuq:DATA_MODEL_UPDATE'
  | 'katuq:BEGIN_RENDERING'
  // Compatibility
  | 'katuq:USER_MESSAGE'
  | 'katuq:FINAL_RESPONSE';

// ========================
// A2UI TYPES
// ========================

/**
 * A2UI Bound Value - can be literal or path-based
 */
export type BoundValue =
  | { literalString: string }
  | { literalNumber: number }
  | { literalBoolean: boolean }
  | { literalArray: any[] }
  | { path: string }
  | { path: string; literalString: string }; // path + default

/**
 * A2UI Component definition
 */
export interface A2UIComponent {
  id: string;
  component: Record<string, Record<string, BoundValue | any>>;
}

/**
 * A2UI Surface Update message
 */
export interface A2UISurfaceUpdate {
  surfaceId: string;
  components: A2UIComponent[];
}

/**
 * A2UI Data Model content item
 */
export interface A2UIDataModelContent {
  key: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueArray?: any[];
  valueMap?: A2UIDataModelContent[];
}

/**
 * A2UI Data Model Update message
 */
export interface A2UIDataModelUpdate {
  surfaceId: string;
  path: string;
  contents: A2UIDataModelContent[];
}

/**
 * A2UI Begin Rendering message
 */
export interface A2UIBeginRendering {
  surfaceId: string;
  rootComponentId: string;
  catalogId?: string;
}

/**
 * A2UI User Action (client -> server)
 */
export interface A2UIUserAction {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * Combined A2UI payload that can be included in events
 */
export interface A2UIPayload {
  surfaceUpdate?: A2UISurfaceUpdate;
  dataModelUpdate?: A2UIDataModelUpdate;
  beginRendering?: A2UIBeginRendering;
}

// ========================
// KATUQ WIDGET TYPES
// ========================

export type KatuqWidgetType =
  // Standard A2UI
  | 'Text'
  | 'Button'
  | 'Row'
  | 'Column'
  | 'Card'
  | 'Image'
  | 'List'
  | 'TextField'
  // Katuq Custom
  | 'KatuqMetric'
  | 'KatuqChart'
  | 'KatuqDispatchMap'
  | 'KatuqProductCard'
  | 'KatuqOrderCard'
  | 'KatuqStockAlert'
  | 'KatuqTable'
  | 'KatuqConfirmation'
  | 'KatuqVotingPanel';

// ========================
// KATUQ WIDGET COMPONENT INTERFACES
// ========================

export interface KatuqMetricProps {
  value: BoundValue;
  label: BoundValue;
  trend?: BoundValue;
  trendDirection?: BoundValue;
  icon?: BoundValue;
  color?: BoundValue;
}

export interface KatuqChartProps {
  chartType: BoundValue;
  data: BoundValue;
  title?: BoundValue;
  xAxisLabel?: BoundValue;
  yAxisLabel?: BoundValue;
  showLegend?: BoundValue;
}

export interface KatuqDispatchMapProps {
  center: { lat: BoundValue; lng: BoundValue };
  zoom: BoundValue;
  warehouse?: {
    lat: BoundValue;
    lng: BoundValue;
    address: BoundValue;
  };
  routes: BoundValue;
  markers: BoundValue;
  polylines: BoundValue;
  showSummary?: BoundValue;
  interactive?: BoundValue;
}

export interface KatuqStockAlertProps {
  products: BoundValue;
  severity: BoundValue;
  action?: {
    label: BoundValue;
    actionName: BoundValue;
  };
}

export interface KatuqTableProps {
  columns: BoundValue;
  data: BoundValue;
  pagination?: BoundValue;
  searchable?: BoundValue;
}

export interface KatuqConfirmationProps {
  title: BoundValue;
  message: BoundValue;
  details?: BoundValue;
  artifact?: BoundValue;
  actions: BoundValue;
  timeout?: BoundValue;
}

export interface KatuqVotingPanelProps {
  proposal: BoundValue;
  voters: BoundValue;
  round: BoundValue;
  status: BoundValue;
}

export interface KatuqProductCardProps {
  name: BoundValue;
  sku: BoundValue;
  price: BoundValue;
  stock: BoundValue;
  image?: BoundValue;
  stockStatus?: BoundValue;
}

export interface KatuqOrderCardProps {
  nroPedido: BoundValue;
  cliente: BoundValue;
  total: BoundValue;
  estado: BoundValue;
  fecha: BoundValue;
  items?: BoundValue;
}

// ========================
// SPEAKER/AGENT TYPES
// ========================

export interface AgUiSpeaker {
  id: string;
  name: string;
  displayName: string;
  department?: 'ceo' | 'sales' | 'inventory' | 'logistics';
  color: string;
  avatar: string;
  type: 'ceo' | 'department' | 'sub_agent' | 'user';
}

export const AGUI_V2_SPEAKERS: Record<string, AgUiSpeaker> = {
  general_manager: {
    id: 'general_manager',
    name: 'Carlos',
    displayName: 'Carlos (CEO)',
    department: 'ceo',
    color: '#6366f1',
    avatar: 'briefcase',
    type: 'ceo'
  },
  synthesis_agent: {
    id: 'synthesis_agent',
    name: 'Carlos',
    displayName: 'Carlos (CEO)',
    department: 'ceo',
    color: '#6366f1',
    avatar: 'briefcase',
    type: 'ceo'
  },
  sales_orchestrator: {
    id: 'sales_orchestrator',
    name: 'Maria',
    displayName: 'Maria (Ventas)',
    department: 'sales',
    color: '#10b981',
    avatar: 'chart-bar',
    type: 'department'
  },
  inventory_orchestrator: {
    id: 'inventory_orchestrator',
    name: 'Pedro',
    displayName: 'Pedro (Inventario)',
    department: 'inventory',
    color: '#f59e0b',
    avatar: 'cube',
    type: 'department'
  },
  logistics_orchestrator: {
    id: 'logistics_orchestrator',
    name: 'Ana',
    displayName: 'Ana (Logistica)',
    department: 'logistics',
    color: '#3b82f6',
    avatar: 'truck',
    type: 'department'
  }
};

// ========================
// AG-UI v2 EVENT PAYLOADS
// ========================

export interface AgUiRunStartedPayload {
  threadId: string;
  runId: string;
}

export interface AgUiRunFinishedPayload {
  threadId: string;
}

export interface AgUiRunErrorPayload {
  message: string;
  code: string;
}

export interface AgUiStepPayload {
  stepId: string;
  stepName?: string;
  agentId?: string;
}

export interface AgUiTextMessageStartPayload {
  messageId: string;
  role: 'user' | 'assistant';
  speaker?: AgUiSpeaker;
}

export interface AgUiTextMessageContentPayload {
  messageId: string;
  delta: string;
}

export interface AgUiTextMessageEndPayload {
  messageId: string;
}

export interface AgUiToolCallStartPayload {
  toolCallId: string;
  toolCallName: string;
  toolDisplayName?: string;
  message?: string;
}

export interface AgUiToolCallArgsPayload {
  toolCallId: string;
  delta: string;
  args?: Record<string, any>;
}

export interface AgUiToolCallResultPayload {
  toolCallId: string;
  result: string;
  a2ui?: A2UIPayload;
}

export interface AgUiToolCallEndPayload {
  toolCallId: string;
  result?: string;
  message?: string;
  requiresConfirmation?: boolean;
  confirmationId?: string;
  a2ui?: A2UIPayload;
}

export interface AgUiStateSnapshotPayload {
  snapshot: Record<string, any>;
}

export interface AgUiStateDeltaPayload {
  delta: Array<{ op: string; path: string; value?: any }>;
}

export interface AgUiMessagesSnapshotPayload {
  messages: Array<{ role: string; content: string; timestamp?: string }>;
}

export interface AgUiActivityPayload {
  activities?: Array<{
    id: string;
    type: string;
    status: 'running' | 'completed' | 'failed';
    message?: string;
  }>;
  delta?: Array<{ op: string; path: string; value?: any }>;
}

// ========================
// INTERRUPT (HITL) TYPES
// ========================

export type InterruptType = 'approval_required' | 'input_required' | 'choice_required';

export interface InterruptAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface AgUiInterruptPayload {
  interruptId: string;
  interruptType: InterruptType;
  title: string;
  message: string;
  resumeToken: string;
  actions: InterruptAction[];
  toolName?: string;
  toolArgs?: Record<string, any>;
  artifact?: A2UISurfaceUpdate;
  timeout?: number;
  expiresAt?: string;
}

export interface AgUiInterruptResponse {
  interruptId: string;
  resumeToken: string;
  action: string;
  modifiedArgs?: Record<string, any>;
  comment?: string;
  timestamp: string;
}

// ========================
// CUSTOM EVENT PAYLOADS
// ========================

export interface KatuqAgentJoinedPayload {
  agent: string;
  displayName: string;
  department?: string;
  color: string;
  avatar: string;
  type?: string;
  message: string;
}

export interface KatuqAgentThinkingPayload {
  agent: string;
  displayName: string;
  status: 'thinking' | 'done';
}

export interface KatuqDelegationPayload {
  messageId: string;
  from: string;
  to: string;
  toAgent: string;
  department?: string;
  message: string;
  mentions: string[];
}

export interface KatuqVotePayload {
  messageId: string;
  timestamp: string;
  speaker: AgUiSpeaker;
  vote: 'APPROVE' | 'REJECT' | 'PENDING';
  reason?: string;
  department?: string;
  agent: string;
  message: string;
}

export interface KatuqConsensusPayload {
  messageId: string;
  timestamp: string;
  decision: string;
  votesSummary: Record<string, number>;
  message: string;
}

export interface KatuqNegotiationRoundPayload {
  messageId: string;
  timestamp: string;
  round: number;
  newProposal?: string;
  message: string;
}

export interface KatuqUserMessagePayload {
  messageId: string;
  timestamp: string;
  speaker: AgUiSpeaker;
  message: string;
  company: string;
}

export interface KatuqFinalResponsePayload {
  messageId: string;
  timestamp: string;
  speaker?: AgUiSpeaker;
  message: string;
  company: string;
  sessionId: string;
}

// ========================
// A2UI CUSTOM EVENT PAYLOADS
// ========================

export interface KatuqSurfaceUpdatePayload {
  surfaceUpdate: A2UISurfaceUpdate;
}

export interface KatuqDataModelUpdatePayload {
  dataModelUpdate: A2UIDataModelUpdate;
}

export interface KatuqBeginRenderingPayload {
  beginRendering: A2UIBeginRendering;
}

// ========================
// UNIFIED EVENT TYPE
// ========================

export interface AgUiV2Event {
  type: AgUiEventType;
  customType?: KatuqCustomEventType;
  timestamp: string;

  // Payload fields (one will be present based on type)
  threadId?: string;
  runId?: string;
  messageId?: string;
  role?: string;
  delta?: string;
  speaker?: AgUiSpeaker;
  stepId?: string;
  stepName?: string;
  agentId?: string;
  toolCallId?: string;
  toolCallName?: string;
  toolDisplayName?: string;
  result?: string;
  message?: string;
  code?: string;
  snapshot?: Record<string, any>;
  messages?: any[];
  activities?: any[];
  requiresConfirmation?: boolean;
  confirmationId?: string;
  args?: Record<string, any>;

  // Interrupt fields
  interruptId?: string;
  interruptType?: InterruptType;
  title?: string;
  resumeToken?: string;
  actions?: InterruptAction[];
  toolName?: string;
  toolArgs?: Record<string, any>;
  timeout?: number;
  expiresAt?: string;

  // A2UI fields
  a2ui?: A2UIPayload;
  surfaceUpdate?: A2UISurfaceUpdate;
  dataModelUpdate?: A2UIDataModelUpdate;
  beginRendering?: A2UIBeginRendering;

  // Custom event fields
  agent?: string;
  displayName?: string;
  department?: string;
  color?: string;
  avatar?: string;
  from?: string;
  to?: string;
  toAgent?: string;
  mentions?: string[];
  vote?: string;
  reason?: string;
  decision?: string;
  votesSummary?: Record<string, number>;
  round?: number;
  newProposal?: string;
  company?: string;
  sessionId?: string;
}

// ========================
// MESSAGE TYPES
// ========================

export interface AgUiV2Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  speaker?: AgUiSpeaker;
  isStreaming?: boolean;
  toolCalls?: AgUiV2ToolCall[];
  artifacts?: A2UISurfaceUpdate[];
  interrupt?: AgUiInterruptPayload;
  vote?: KatuqVotePayload;
  delegation?: KatuqDelegationPayload;
}

export interface AgUiV2ToolCall {
  id: string;
  name: string;
  displayName: string;
  args?: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  message?: string;
  requiresConfirmation?: boolean;
  a2ui?: A2UIPayload;
}

// ========================
// SESSION TYPES
// ========================

export interface AgUiV2Session {
  id: string;
  company: string;
  title?: string;
  createdAt: string;
  lastUpdate: string;
  messageCount: number;
}

// ========================
// REQUEST/RESPONSE TYPES
// ========================

export interface AgUiV2Request {
  company: string;
  messages: Array<{ role: string; content: string }>;
  session_id?: string;
  capabilities?: {
    a2ui?: boolean;
    catalogs?: string[];
    interrupts?: boolean;
  };
}

export interface AgUiV2InterruptRequest {
  company: string;
  session_id: string;
  interrupt_id: string;
  resume_token: string;
  action: string;
  modified_args?: Record<string, any>;
  comment?: string;
}

// ========================
// STATE TYPES
// ========================

export interface AgUiV2State {
  isRunning: boolean;
  activeAgents: string[];
  currentSpeaker?: AgUiSpeaker;
  activities: Map<string, { type: string; status: string; message: string }>;
  surfaces: Map<string, A2UISurfaceUpdate>;
  dataModels: Map<string, Record<string, any>>;
  pendingInterrupt?: AgUiInterruptPayload;
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Resolve a BoundValue to its actual value
 */
export function resolveBoundValue(
  bound: BoundValue,
  dataModel: Record<string, any>
): any {
  if ('literalString' in bound) return bound.literalString;
  if ('literalNumber' in bound) return bound.literalNumber;
  if ('literalBoolean' in bound) return bound.literalBoolean;
  if ('literalArray' in bound) return bound.literalArray;

  if ('path' in bound) {
    const value = getValueAtPath(dataModel, bound.path);
    if (value !== undefined) return value;
    if ('literalString' in bound) return bound.literalString; // Default
  }

  return undefined;
}

/**
 * Get value at a JSON path
 */
export function getValueAtPath(obj: Record<string, any>, path: string): any {
  const parts = path.replace(/^\//, '').split('/');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Get speaker config by agent ID
 */
export function getSpeaker(agentId: string): AgUiSpeaker {
  return AGUI_V2_SPEAKERS[agentId] || {
    id: agentId,
    name: agentId,
    displayName: agentId,
    color: '#6b7280',
    avatar: 'user',
    type: 'sub_agent'
  };
}

/**
 * Check if an event is a custom Katuq event
 */
export function isCustomEvent(event: AgUiV2Event): boolean {
  return event.type === 'CUSTOM' && !!event.customType;
}

/**
 * Get widget type from A2UI component
 */
export function getWidgetType(component: A2UIComponent): KatuqWidgetType | null {
  const componentDef = component.component;
  const keys = Object.keys(componentDef);
  return keys.length > 0 ? (keys[0] as KatuqWidgetType) : null;
}

// ========================
// CATALOG DEFINITION
// ========================

export const KATUQ_WIDGET_CATALOG = {
  catalogId: 'katuq-standard-v1',
  version: '1.0.0',
  name: 'Katuq Business Widgets',
  widgets: [
    // Standard A2UI
    'Text',
    'Button',
    'Row',
    'Column',
    'Card',
    'Image',
    'List',
    'TextField',
    // Katuq Custom
    'KatuqMetric',
    'KatuqChart',
    'KatuqDispatchMap',
    'KatuqProductCard',
    'KatuqOrderCard',
    'KatuqStockAlert',
    'KatuqTable',
    'KatuqConfirmation',
    'KatuqVotingPanel'
  ]
};
