/**
 * Chat Pro V2 - Models
 *
 * Modelos para la experiencia de chat multi-agente donde los agentes
 * "hablan" visiblemente como en un grupo de WhatsApp/Slack.
 */

/**
 * Tipos de eventos SSE del Chat Pro
 */
export type ChatProEventType =
  | 'user_message'
  | 'agent_joined'
  | 'agent_thinking'
  | 'tool_call'
  | 'tool_result'
  | 'agent_message'
  | 'delegation'
  | 'vote'
  | 'negotiation_round'
  | 'consensus_reached'
  | 'final_response'
  | 'error';

/**
 * Tipo de speaker en el chat
 */
export type SpeakerType = 'user' | 'ceo' | 'department' | 'sub_agent' | 'external' | 'system';

/**
 * Departamentos disponibles
 */
export type Department = 'sales' | 'inventory' | 'logistics' | null;

/**
 * Configuracion de un speaker (agente o usuario)
 */
export interface ChatProSpeaker {
  name: string;
  display_name?: string;
  agent_id?: string;
  type: SpeakerType;
  department?: Department;
  avatar: string;
  color: string;
}

/**
 * Evento base del Chat Pro
 */
export interface ChatProEvent {
  timestamp: string;
  speaker: ChatProSpeaker;
  message?: string;
  mentions?: string[];
  company?: string;
  session_id?: string;
}

/**
 * Evento de llamada a herramienta
 */
export interface ChatProToolCallEvent extends ChatProEvent {
  tool: string;
  params?: Record<string, any>;
}

/**
 * Evento de resultado de herramienta
 */
export interface ChatProToolResultEvent extends ChatProEvent {
  tool: string;
  result?: any;
  execution_time_ms?: number;
}

/**
 * Evento de delegacion
 */
export interface ChatProDelegationEvent extends ChatProEvent {
  target: ChatProSpeaker;
  reason?: string;
}

/**
 * Evento de voto (para negociacion)
 */
export interface ChatProVoteEvent extends ChatProEvent {
  vote: 'APPROVE' | 'REJECT' | 'PENDING';
  vote_reason?: string;
  round?: number;
}

/**
 * Mensaje de chat renderizado en la UI
 */
export interface ChatProMessage {
  id: string;
  timestamp: Date;
  eventType: ChatProEventType;

  // Speaker info
  speaker: ChatProSpeaker;

  // Content
  content: string;
  mentions: string[];

  // Tool info (si aplica)
  toolName?: string;
  toolParams?: Record<string, any>;
  toolResult?: any;

  // Delegation info (si aplica)
  delegationTarget?: ChatProSpeaker;

  // Vote info (si aplica)
  vote?: string;
  voteReason?: string;

  // UI state
  isStreaming?: boolean;
  isExpanded?: boolean;

  // Metadata
  executionTimeMs?: number;
}

/**
 * Estado del chat
 */
export interface ChatProState {
  messages: ChatProMessage[];
  isConnected: boolean;
  isExecuting: boolean;
  currentSessionId?: string;
  activeAgents: Set<string>;
  error?: string;
}

/**
 * Configuracion de colores/avatares por agente
 */
export const AGENT_UI_CONFIG: Record<string, Partial<ChatProSpeaker>> = {
  general_manager: {
    display_name: 'CEO',
    type: 'ceo',
    department: null,
    color: '#6366f1',
    avatar: 'pi-briefcase'
  },
  sales_orchestrator: {
    display_name: 'Ventas',
    type: 'department',
    department: 'sales',
    color: '#10b981',
    avatar: 'pi-chart-line'
  },
  sales_parallel: {
    display_name: 'Ventas',
    type: 'department',
    department: 'sales',
    color: '#10b981',
    avatar: 'pi-chart-line'
  },
  inventory_orchestrator: {
    display_name: 'Inventario',
    type: 'department',
    department: 'inventory',
    color: '#f59e0b',
    avatar: 'pi-box'
  },
  inventory_parallel: {
    display_name: 'Inventario',
    type: 'department',
    department: 'inventory',
    color: '#f59e0b',
    avatar: 'pi-box'
  },
  logistics_orchestrator: {
    display_name: 'Logistica',
    type: 'department',
    department: 'logistics',
    color: '#3b82f6',
    avatar: 'pi-truck'
  },
  logistics_parallel: {
    display_name: 'Logistica',
    type: 'department',
    department: 'logistics',
    color: '#3b82f6',
    avatar: 'pi-truck'
  },
  synthesis_agent: {
    display_name: 'Sintesis',
    type: 'sub_agent',
    department: null,
    color: '#8b5cf6',
    avatar: 'pi-sitemap'
  },
  multi_department_pipeline: {
    display_name: 'Pipeline',
    type: 'sub_agent',
    department: null,
    color: '#ec4899',
    avatar: 'pi-share-alt'
  },
  parallel_departments: {
    display_name: 'Paralelo',
    type: 'sub_agent',
    department: null,
    color: '#14b8a6',
    avatar: 'pi-bolt'
  },
  user: {
    display_name: 'Usuario',
    type: 'user',
    department: null,
    color: '#64748b',
    avatar: 'pi-user'
  }
};

/**
 * Helper para obtener config de speaker
 */
export function getSpeakerConfig(agentId: string): ChatProSpeaker {
  const config = AGENT_UI_CONFIG[agentId] || {
    display_name: agentId,
    type: 'sub_agent' as SpeakerType,
    department: null,
    color: '#6b7280',
    avatar: 'pi-user'
  };

  return {
    name: config.display_name || agentId,
    agent_id: agentId,
    type: config.type || 'sub_agent',
    department: config.department,
    avatar: config.avatar || 'pi-user',
    color: config.color || '#6b7280'
  };
}
