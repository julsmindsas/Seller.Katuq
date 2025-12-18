/**
 * Chat Pro V2 - Models
 *
 * Modelos para la experiencia de chat multi-agente donde los agentes
 * "hablan" visiblemente como en un grupo de WhatsApp/Slack.
 *
 * PRINCIPIO: Los agentes tienen personalidad humana, no técnica.
 * - Carlos (CEO) coordina todo
 * - María (Ventas) analiza métricas de ventas
 * - Pedro (Inventario) gestiona el stock
 * - Ana (Logística) optimiza entregas
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
export type SpeakerType = 'user' | 'ceo' | 'department' | 'sub_agent' | 'external' | 'system' | 'voter';

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
 * Metadata de herramienta para UI amigable
 */
export interface ToolMetadata {
    friendlyName: string;      // "Consultando ventas" en vez de "get_sales_metrics"
    description: string;       // "Obteniendo métricas de ventas del día..."
    icon: string;              // pi-chart-line
    category: 'query' | 'action' | 'analysis';
}

/**
 * Resumen de resultado de herramienta (para mostrar en UI)
 */
export interface ToolResultSummary {
    title: string;             // "Resumen del Día"
    type: 'metrics' | 'alert' | 'list' | 'status' | 'comparison';
    items: ToolResultItem[];
    footer?: string;           // "+12% vs ayer"
    status?: 'success' | 'warning' | 'error';
}

export interface ToolResultItem {
    icon: string;
    label: string;
    value: string | number;
    format?: 'currency' | 'number' | 'percent' | 'text';
    highlight?: boolean;
}

/**
 * Contexto de actividad del agente (para typing indicators)
 */
export interface AgentActivityContext {
    currentTask: string;       // "Analizando ventas"
    thinkingAbout?: string[];  // ["Métricas diarias", "Comparación con ayer"]
    progress?: number;         // 0-100
}

/**
 * Contexto de negociación
 */
export interface NegotiationContext {
    originalProposal: string;
    currentRound: number;
    maxRounds: number;
    currentVotes: Record<string, 'APPROVE' | 'REJECT' | 'PENDING'>;
    reasonForNewRound?: string;
}

/**
 * Resultado de consenso
 */
export interface ConsensusResult {
    decision: string;
    approvedBy: string[];
    rejectedBy: string[];
    nextSteps?: string[];
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
    toolMetadata?: ToolMetadata;           // UI amigable para tools
    toolResultSummary?: ToolResultSummary; // Resumen visual del resultado

    // Delegation info (si aplica)
    delegationTarget?: ChatProSpeaker;
    delegationPurpose?: string;            // "para revisar las ventas"

    // Activity context (para typing indicators enriquecidos)
    activityContext?: AgentActivityContext;

    // Vote info (si aplica)
    vote?: string;
    voteReason?: string;

    // Negotiation info (si aplica)
    negotiationRound?: number;
    newProposal?: string;
    consensusDecision?: string;
    votesSummary?: { approve?: number; reject?: number; pending?: number };
    negotiationContext?: NegotiationContext; // Contexto completo de negociación
    consensusResult?: ConsensusResult;       // Resultado con next steps

    // UI state
    isStreaming?: boolean;
    isExpanded?: boolean;

    // Metadata
    executionTimeMs?: number;
    isFinalResponse?: boolean;              // Para destacar respuesta final
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
 *
 * PERSONAS HUMANAS (para UX natural):
 * - Carlos (CEO) - Director General, coordina todo
 * - María (Ventas) - Gerente de Ventas, analiza métricas
 * - Pedro (Inventario) - Jefe de Bodega, gestiona stock
 * - Ana (Logística) - Coord. Logística, optimiza entregas
 */
export const AGENT_UI_CONFIG: Record<string, Partial<ChatProSpeaker> & { humanName: string; role: string; emoji: string }> = {
    general_manager: {
        humanName: 'Carlos',
        display_name: 'Carlos',
        role: 'Director General',
        emoji: '👔',
        type: 'ceo',
        department: null,
        color: '#6366f1',
        avatar: 'pi-briefcase'
    },
    sales_orchestrator: {
        humanName: 'María',
        display_name: 'María',
        role: 'Gerente de Ventas',
        emoji: '📈',
        type: 'department',
        department: 'sales',
        color: '#10b981',
        avatar: 'pi-chart-line'
    },
    sales_parallel: {
        humanName: 'María',
        display_name: 'María',
        role: 'Gerente de Ventas',
        emoji: '📈',
        type: 'department',
        department: 'sales',
        color: '#10b981',
        avatar: 'pi-chart-line'
    },
    inventory_orchestrator: {
        humanName: 'Pedro',
        display_name: 'Pedro',
        role: 'Jefe de Bodega',
        emoji: '📦',
        type: 'department',
        department: 'inventory',
        color: '#f59e0b',
        avatar: 'pi-box'
    },
    inventory_parallel: {
        humanName: 'Pedro',
        display_name: 'Pedro',
        role: 'Jefe de Bodega',
        emoji: '📦',
        type: 'department',
        department: 'inventory',
        color: '#f59e0b',
        avatar: 'pi-box'
    },
    logistics_orchestrator: {
        humanName: 'Ana',
        display_name: 'Ana',
        role: 'Coord. Logística',
        emoji: '🚚',
        type: 'department',
        department: 'logistics',
        color: '#3b82f6',
        avatar: 'pi-truck'
    },
    logistics_parallel: {
        humanName: 'Ana',
        display_name: 'Ana',
        role: 'Coord. Logística',
        emoji: '🚚',
        type: 'department',
        department: 'logistics',
        color: '#3b82f6',
        avatar: 'pi-truck'
    },
    synthesis_agent: {
        humanName: 'Carlos',
        display_name: 'Carlos',
        role: 'Director General',
        emoji: '👔',
        type: 'ceo',
        department: null,
        color: '#6366f1',
        avatar: 'pi-briefcase'
    },
    multi_department_pipeline: {
        humanName: 'Carlos',
        display_name: 'Carlos',
        role: 'Director General',
        emoji: '👔',
        type: 'ceo',
        department: null,
        color: '#6366f1',
        avatar: 'pi-briefcase'
    },
    parallel_departments: {
        humanName: 'Carlos',
        display_name: 'Carlos',
        role: 'Director General',
        emoji: '👔',
        type: 'ceo',
        department: null,
        color: '#6366f1',
        avatar: 'pi-briefcase'
    },
    user: {
        humanName: 'Tú',
        display_name: 'Tú',
        role: '',
        emoji: '👤',
        type: 'user',
        department: null,
        color: '#64748b',
        avatar: 'pi-user'
    },
    // Voter agents for NegotiationLoop
    sales_voter: {
        humanName: 'María',
        display_name: 'María',
        role: 'Gerente de Ventas',
        emoji: '📈',
        type: 'department',
        department: 'sales',
        color: '#10b981',
        avatar: 'pi-chart-line'
    },
    inventory_voter: {
        humanName: 'Pedro',
        display_name: 'Pedro',
        role: 'Jefe de Bodega',
        emoji: '📦',
        type: 'department',
        department: 'inventory',
        color: '#f59e0b',
        avatar: 'pi-box'
    },
    logistics_voter: {
        humanName: 'Ana',
        display_name: 'Ana',
        role: 'Coord. Logística',
        emoji: '🚚',
        type: 'department',
        department: 'logistics',
        color: '#3b82f6',
        avatar: 'pi-truck'
    },
    consensus_resolver: {
        humanName: 'Sistema',
        display_name: 'Consenso',
        role: 'Sistema de Decisiones',
        emoji: '🤝',
        type: 'system',
        department: null,
        color: '#8b5cf6',
        avatar: 'pi-check-square'
    },
    voting_round: {
        humanName: 'Votación',
        display_name: 'Votación',
        role: 'Ronda de Votos',
        emoji: '🗳️',
        type: 'system',
        department: null,
        color: '#ec4899',
        avatar: 'pi-thumbs-up'
    },
    negotiation_loop: {
        humanName: 'Negociación',
        display_name: 'Negociación',
        role: 'Proceso de Consenso',
        emoji: '🔄',
        type: 'system',
        department: null,
        color: '#14b8a6',
        avatar: 'pi-sync'
    }
};

/**
 * Helper para obtener config de speaker
 */
export function getSpeakerConfig(agentId: string): ChatProSpeaker {
    const config = AGENT_UI_CONFIG[agentId] || {
        humanName: agentId,
        display_name: agentId,
        type: 'sub_agent' as SpeakerType,
        department: null,
        color: '#6b7280',
        avatar: 'pi-user'
    };

    return {
        name: config.humanName || config.display_name || agentId,
        display_name: config.display_name,
        agent_id: agentId,
        type: config.type || 'sub_agent',
        department: config.department,
        avatar: config.avatar || 'pi-user',
        color: config.color || '#6b7280'
    };
}

/**
 * Mapa de herramientas técnicas a nombres amigables
 */
export const TOOL_FRIENDLY_NAMES: Record<string, ToolMetadata> = {
    get_sales_metrics: {
        friendlyName: 'Revisando ventas',
        description: 'Obteniendo métricas de ventas...',
        icon: 'pi-chart-line',
        category: 'query'
    },
    get_sales_by_date: {
        friendlyName: 'Consultando ventas',
        description: 'Buscando ventas por fecha...',
        icon: 'pi-calendar',
        category: 'query'
    },
    get_inventory_status: {
        friendlyName: 'Revisando inventario',
        description: 'Verificando estado del stock...',
        icon: 'pi-box',
        category: 'query'
    },
    get_low_stock_alerts: {
        friendlyName: 'Verificando alertas',
        description: 'Buscando productos con bajo stock...',
        icon: 'pi-exclamation-triangle',
        category: 'query'
    },
    get_logistics_status: {
        friendlyName: 'Revisando entregas',
        description: 'Verificando estado de logística...',
        icon: 'pi-truck',
        category: 'query'
    },
    optimize_route: {
        friendlyName: 'Optimizando rutas',
        description: 'Calculando mejor ruta de entrega...',
        icon: 'pi-map',
        category: 'analysis'
    },
    create_dispatch: {
        friendlyName: 'Creando despacho',
        description: 'Generando plan de despacho...',
        icon: 'pi-send',
        category: 'action'
    },
    search_products: {
        friendlyName: 'Buscando productos',
        description: 'Buscando en catálogo...',
        icon: 'pi-search',
        category: 'query'
    },
    get_order_details: {
        friendlyName: 'Consultando pedido',
        description: 'Obteniendo detalles del pedido...',
        icon: 'pi-file',
        category: 'query'
    },
    calculate_totals: {
        friendlyName: 'Calculando totales',
        description: 'Sumando valores...',
        icon: 'pi-calculator',
        category: 'analysis'
    }
};

/**
 * Obtiene metadata amigable para una herramienta
 */
export function getToolFriendlyName(toolName: string): ToolMetadata {
    return TOOL_FRIENDLY_NAMES[toolName] || {
        friendlyName: 'Procesando',
        description: 'Ejecutando consulta...',
        icon: 'pi-cog',
        category: 'query'
    };
}

/**
 * Genera mensaje de delegación natural
 * "Carlos le pide a María que revise las ventas"
 */
export function getDelegationMessage(from: ChatProSpeaker, to: ChatProSpeaker, purpose?: string): string {
    const fromName = from.name || 'El sistema';
    const toName = to.name || 'un especialista';

    if (purpose) {
        return `${fromName} le pide a ${toName} que ${purpose}`;
    }
    return `${fromName} invitó a ${toName} al chat`;
}

/**
 * Genera mensaje de actividad natural
 * "María está revisando las ventas..."
 */
export function getActivityMessage(speaker: ChatProSpeaker, context?: AgentActivityContext): string {
    const name = speaker.name || 'El equipo';

    if (context?.currentTask) {
        return `${name} está ${context.currentTask.toLowerCase()}...`;
    }

    // Mensaje por defecto según departamento
    switch (speaker.department) {
        case 'sales':
            return `${name} está revisando las ventas...`;
        case 'inventory':
            return `${name} está verificando el inventario...`;
        case 'logistics':
            return `${name} está coordinando la logística...`;
        default:
            return `${name} está analizando tu solicitud...`;
    }
}

/**
 * Formatea número como moneda
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

/**
 * Formatea número con separadores de miles
 */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value);
}

/**
 * Formatea porcentaje
 */
export function formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

// =============================================================================
// SESSION MANAGEMENT INTERFACES
// =============================================================================

/**
 * Sesion de chat persistida en Firestore
 */
export interface ChatSession {
    id: string;
    title: string;
    last_update: string | null;
    created_at?: string;
}

/**
 * Respuesta del historial de una sesion
 */
export interface SessionHistory {
    session_id: string;
    title: string;
    messages: HistoryMessage[];
    state?: Record<string, any>;
}

/**
 * Mensaje individual del historial
 */
export interface HistoryMessage {
    author: string;
    text: string;
    timestamp: number;
}
