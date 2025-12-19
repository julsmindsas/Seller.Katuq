/**
 * AG-UI Protocol Models
 *
 * Interfaces para el protocolo AG-UI (Agent-User Interface)
 * que estandariza la comunicación entre agentes y frontends.
 *
 * Basado en: https://docs.ag-ui.com/
 */

/**
 * Tipos de eventos AG-UI
 */
export type AgUiEventType =
    | 'RUN_STARTED'
    | 'RUN_FINISHED'
    | 'RUN_ERROR'
    | 'TEXT_MESSAGE_START'
    | 'TEXT_MESSAGE_CONTENT'
    | 'TEXT_MESSAGE_END'
    | 'TOOL_CALL_START'
    | 'TOOL_CALL_ARGS'
    | 'TOOL_CALL_END'
    | 'STATE_SNAPSHOT'
    | 'STATE_DELTA'
    // Human-in-the-Loop events
    | 'CONFIRMATION_REQUEST'
    | 'CONFIRMATION_RESPONSE'
    // Artifact events
    | 'ARTIFACT_START'
    | 'ARTIFACT_CONTENT'
    | 'ARTIFACT_END';

/**
 * Evento base AG-UI
 */
export interface AgUiEvent {
    type: AgUiEventType;
    // Run lifecycle
    threadId?: string;
    runId?: string;
    // Message streaming
    messageId?: string;
    role?: 'user' | 'assistant';
    delta?: string;
    // Tool calls
    toolCallId?: string;
    toolCallName?: string;
    result?: string;
    // State management
    state?: any;
    // JSON Patch for STATE_DELTA
    delta_ops?: AgUiStateDelta[];
    // Error
    message?: string;
    code?: string;
}

/**
 * JSON Patch operation for STATE_DELTA
 */
export interface AgUiStateDelta {
    op: 'add' | 'remove' | 'replace';
    path: string;
    value?: any;
}

// =============================================================================
// ARTIFACTS - Renderizado de contenido rico (imágenes, mapas, charts, etc.)
// =============================================================================

/**
 * Tipos de artifacts soportados
 */
export type AgUiArtifactType =
    | 'image'           // Imagen (URL o base64)
    | 'map'             // Mapa con markers/rutas (Google Maps)
    | 'chart'           // Gráfico (bar, line, pie, etc.)
    | 'table'           // Tabla de datos
    | 'card'            // Card con información estructurada
    | 'list'            // Lista de items
    | 'progress'        // Barra de progreso
    | 'metric'          // Métrica con valor y label
    | 'code'            // Bloque de código
    | 'html'            // HTML personalizado (sanitizado)
    | 'order_card'      // Card de pedido (específico de Katuq)
    | 'product_card'    // Card de producto
    | 'route_map'       // Mapa de ruta de entrega
    | 'sales_chart'     // Gráfico de ventas
    | 'stock_alert'     // Alerta de stock
    | 'dispatch_map';   // 🗺️ Mapa de despachos con rutas optimizadas

/**
 * Artifact base
 */
export interface AgUiArtifact {
    id: string;
    type: AgUiArtifactType;
    title?: string;
    data: any;
    metadata?: Record<string, any>;
}

/**
 * Artifact de imagen
 */
export interface AgUiImageArtifact extends AgUiArtifact {
    type: 'image';
    data: {
        url?: string;
        base64?: string;
        alt?: string;
        width?: number;
        height?: number;
    };
}

/**
 * Marker para mapas
 */
export interface AgUiMapMarker {
    lat: number;
    lng: number;
    label?: string;
    icon?: string;
    color?: string;
    info?: string;
}

/**
 * Ruta para mapas
 */
export interface AgUiMapRoute {
    points: Array<{ lat: number; lng: number }>;
    color?: string;
    label?: string;
}

/**
 * Artifact de mapa
 */
export interface AgUiMapArtifact extends AgUiArtifact {
    type: 'map' | 'route_map';
    data: {
        center?: { lat: number; lng: number };
        zoom?: number;
        markers?: AgUiMapMarker[];
        routes?: AgUiMapRoute[];
        style?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
    };
}

/**
 * Marker de despacho (con información completa del pedido)
 */
export interface AgUiDispatchMarker {
    sequence: number;           // Orden de entrega (1, 2, 3...)
    id: string;
    nroPedido: string;
    cliente: string;
    direccion: string;
    lat: number;
    lng: number;
    valorTotal: number;
    tipoPago: string;
    prioridad: 'high' | 'medium' | 'low';
    telefono?: string;
    zone?: string;
}

/**
 * Polyline de ruta
 */
export interface AgUiDispatchPolyline {
    zone: string;
    polyline: string;           // Encoded polyline de Google
    color: string;
}

/**
 * Ruta de despacho
 */
export interface AgUiDispatchRoute {
    zone: string;
    orders_count: number;
    orders: AgUiDispatchMarker[];
    metrics: {
        total_distance_km: number;
        estimated_duration_minutes: number;
        total_value: number;
    };
    polyline: string;
    suggested_transporter?: {
        id: string;
        nombre: string;
        vehiculo: string;
        telefono?: string;
    };
}

/**
 * 🗺️ Artifact de mapa de despachos con rutas optimizadas
 */
export interface AgUiDispatchMapArtifact extends AgUiArtifact {
    type: 'dispatch_map';
    data: {
        center: { lat: number; lng: number };
        zoom: number;
        warehouse: { lat: number; lng: number; address: string };
        markers: AgUiDispatchMarker[];
        polylines: AgUiDispatchPolyline[];
        routes: AgUiDispatchRoute[];
        summary: {
            total_orders: number;
            total_zones: number;
            total_distance_km: number;
            total_duration_minutes: number;
            total_value: number;
            available_transporters: number;
        };
    };
}

/**
 * Artifact de gráfico
 */
export interface AgUiChartArtifact extends AgUiArtifact {
    type: 'chart' | 'sales_chart';
    data: {
        chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
            backgroundColor?: string | string[];
            borderColor?: string;
        }>;
        options?: Record<string, any>;
    };
}

/**
 * Artifact de tabla
 */
export interface AgUiTableArtifact extends AgUiArtifact {
    type: 'table';
    data: {
        headers: string[];
        rows: Array<Array<string | number>>;
        footer?: string[];
    };
}

/**
 * Artifact de métrica
 */
export interface AgUiMetricArtifact extends AgUiArtifact {
    type: 'metric';
    data: {
        value: string | number;
        label: string;
        change?: number;      // Cambio porcentual
        changeType?: 'increase' | 'decrease' | 'neutral';
        icon?: string;
        color?: string;
    };
}

/**
 * Artifact de card de pedido
 */
export interface AgUiOrderCardArtifact extends AgUiArtifact {
    type: 'order_card';
    data: {
        orderId: string;
        nroPedido: string;
        customer: string;
        address: string;
        total: number;
        status: string;
        items?: Array<{ name: string; qty: number; price: number }>;
        deliveryDate?: string;
    };
}

/**
 * Artifact de card de producto
 */
export interface AgUiProductCardArtifact extends AgUiArtifact {
    type: 'product_card';
    data: {
        productId: string;
        name: string;
        sku?: string;
        price: number;
        stock: number;
        imageUrl?: string;
        category?: string;
        lowStock?: boolean;
    };
}

/**
 * Artifact de alerta de stock
 */
export interface AgUiStockAlertArtifact extends AgUiArtifact {
    type: 'stock_alert';
    data: {
        products: Array<{
            name: string;
            sku: string;
            currentStock: number;
            minStock: number;
            status: 'critical' | 'low' | 'ok';
        }>;
    };
}

// =============================================================================
// HUMAN-IN-THE-LOOP - Confirmaciones y aprobaciones
// =============================================================================

/**
 * Tipos de confirmación
 */
export type AgUiConfirmationType =
    | 'approve_reject'      // Simple aprobar/rechazar
    | 'approve_modify'      // Aprobar o modificar
    | 'multi_choice'        // Múltiples opciones
    | 'input_required';     // Requiere input del usuario

/**
 * Opción para confirmación multi-choice
 */
export interface AgUiConfirmationOption {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
    isDangerous?: boolean;
}

/**
 * Request de confirmación (Human-in-the-Loop)
 */
export interface AgUiConfirmationRequest {
    id: string;
    type: AgUiConfirmationType;
    title: string;
    message: string;
    details?: string;
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, any>;
    options?: AgUiConfirmationOption[];
    timeout?: number;           // Timeout en segundos (auto-reject si expira)
    expiresAt?: Date;           // Fecha de expiración
    artifact?: AgUiArtifact;    // Artifact para mostrar contexto
    metadata?: Record<string, any>;
}

/**
 * Response de confirmación del usuario
 */
export interface AgUiConfirmationResponse {
    requestId: string;
    decision: 'approve' | 'reject' | 'modify' | string;  // string para multi_choice
    modifiedArgs?: Record<string, any>;
    comment?: string;
    timestamp: Date;
}

/**
 * Estado de confirmación pendiente
 */
export interface AgUiPendingConfirmation {
    request: AgUiConfirmationRequest;
    createdAt: Date;
    expiresAt?: Date;
}

/**
 * Información del speaker/agente
 */
export interface AgUiSpeaker {
    id: string;
    name: string;
    displayName: string;
    department: 'ceo' | 'sales' | 'inventory' | 'logistics' | 'user' | null;
    color: string;
    icon: string;
    emoji: string;
}

/**
 * Tipo de evento del mensaje (para UI especial)
 */
export type AgUiMessageEventType =
    | 'user_message'
    | 'agent_message'
    | 'vote'
    | 'negotiation_round'
    | 'consensus_reached'
    | 'delegation'
    | 'final_response'
    | 'confirmation_request';

/**
 * Contexto de negociación
 */
export interface AgUiNegotiationContext {
    originalProposal?: string;
    currentRound: number;
    maxRounds: number;
    currentVotes?: Record<string, string>;
    reasonForNewRound?: string;
}

/**
 * Resultado de consenso
 */
export interface AgUiConsensusResult {
    decision: string;
    approvedBy: string[];
    rejectedBy: string[];
    nextSteps?: string[];
}

/**
 * Mensaje AG-UI renderizado en la UI
 */
export interface AgUiMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    speaker?: AgUiSpeaker;
    toolCalls?: AgUiToolCall[];
    timestamp: Date;
    isStreaming?: boolean;

    // Event type for special UI
    eventType?: AgUiMessageEventType;

    // Vote fields
    vote?: 'APPROVE' | 'REJECT' | 'PENDING';
    voteReason?: string;

    // Negotiation fields
    negotiationRound?: number;
    newProposal?: string;
    negotiationContext?: AgUiNegotiationContext;

    // Consensus fields
    consensusDecision?: string;
    votesSummary?: { approve?: number; reject?: number };
    consensusResult?: AgUiConsensusResult;

    // Delegation fields
    delegationTarget?: AgUiSpeaker;
    delegationPurpose?: string;

    // Final response flag
    isFinalResponse?: boolean;

    // Artifacts - Contenido rico (imágenes, mapas, charts, etc.)
    artifacts?: AgUiArtifact[];

    // Human-in-the-Loop - Confirmación pendiente
    confirmationRequest?: AgUiConfirmationRequest;
}

/**
 * Llamada a herramienta AG-UI
 */
export interface AgUiToolCall {
    id: string;
    name: string;
    args: string;
    result?: string;
    status: 'pending' | 'executing' | 'completed' | 'error';
}

/**
 * Estado del agente (sincronizado via STATE_DELTA)
 */
export interface AgUiAgentState {
    activeAgents: string[];
    currentSpeaker: string | null;
    [key: string]: any;
}

/**
 * Estado del chat AG-UI
 */
export interface AgUiChatState {
    messages: AgUiMessage[];
    toolCalls: Map<string, AgUiToolCall>;
    agentState: AgUiAgentState;
    isRunning: boolean;
    threadId: string | null;
    error: string | null;
}

/**
 * Request para el endpoint AG-UI
 */
export interface AgUiRequest {
    company: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    session_id?: string;
}

/**
 * Sesión de chat AG-UI
 */
export interface AgUiSession {
    id: string;
    title: string;
    created_at: string;
    last_update: string | null;
    message_count: number;
}

/**
 * Historial de sesión AG-UI
 */
export interface AgUiSessionHistory {
    session_id: string;
    title: string;
    messages: AgUiHistoryMessage[];
    state?: any;
}

/**
 * Mensaje del historial
 */
export interface AgUiHistoryMessage {
    author: string;
    text: string;
    timestamp?: number;
}

/**
 * Configuración visual para tool calls
 */
export const AGUI_TOOL_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
    // Sales tools
    get_sales_today: { icon: 'pi-chart-line', label: 'Ventas del día', color: '#10b981' },
    get_top_products: { icon: 'pi-star', label: 'Top productos', color: '#f59e0b' },
    get_sales_by_period: { icon: 'pi-calendar', label: 'Ventas por período', color: '#10b981' },
    get_recent_orders: { icon: 'pi-shopping-cart', label: 'Pedidos recientes', color: '#10b981' },

    // Inventory tools
    get_stock_levels: { icon: 'pi-box', label: 'Niveles de stock', color: '#f59e0b' },
    get_low_stock_alerts: { icon: 'pi-exclamation-triangle', label: 'Alertas stock bajo', color: '#ef4444' },
    get_product_info: { icon: 'pi-info-circle', label: 'Info producto', color: '#f59e0b' },

    // Logistics tools
    get_pending_dispatches: { icon: 'pi-truck', label: 'Despachos pendientes', color: '#3b82f6' },
    get_transporters_available: { icon: 'pi-users', label: 'Transportadores', color: '#3b82f6' },
    get_transporters: { icon: 'pi-users', label: 'Transportadores', color: '#3b82f6' },
    plan_routes: { icon: 'pi-map', label: 'Planificar rutas', color: '#3b82f6' },

    // Generic
    transfer_to_agent: { icon: 'pi-arrow-right', label: 'Transferir', color: '#6366f1' }
};

/**
 * Helper para obtener display de tool
 */
export function getToolDisplay(toolName: string): { icon: string; label: string; color: string } {
    return AGUI_TOOL_DISPLAY[toolName] || {
        icon: 'pi-cog',
        label: toolName.replace(/_/g, ' '),
        color: '#6b7280'
    };
}

/**
 * Helper para formatear argumentos de tool
 */
export function formatToolArgs(args: string): Record<string, any> {
    try {
        return JSON.parse(args);
    } catch {
        return {};
    }
}

/**
 * Helper para formatear resultado de tool
 */
export function formatToolResult(result: string): any {
    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}

/**
 * Configuración de speakers por agente (como en chat-pro)
 * Carlos (CEO), María (Ventas), Pedro (Inventario), Ana (Logística)
 */
export const AGUI_SPEAKER_CONFIG: Record<string, AgUiSpeaker> = {
    // CEO / General Manager
    general_manager: {
        id: 'general_manager',
        name: 'Carlos',
        displayName: 'Carlos',
        department: 'ceo',
        color: '#6366f1',
        icon: 'pi-briefcase',
        emoji: '👔'
    },
    synthesis_agent: {
        id: 'synthesis_agent',
        name: 'Carlos',
        displayName: 'Carlos',
        department: 'ceo',
        color: '#6366f1',
        icon: 'pi-briefcase',
        emoji: '👔'
    },
    multi_department_pipeline: {
        id: 'multi_department_pipeline',
        name: 'Carlos',
        displayName: 'Carlos',
        department: 'ceo',
        color: '#6366f1',
        icon: 'pi-briefcase',
        emoji: '👔'
    },

    // Ventas
    sales_orchestrator: {
        id: 'sales_orchestrator',
        name: 'María',
        displayName: 'María',
        department: 'sales',
        color: '#10b981',
        icon: 'pi-chart-line',
        emoji: '📈'
    },
    sales_parallel: {
        id: 'sales_parallel',
        name: 'María',
        displayName: 'María',
        department: 'sales',
        color: '#10b981',
        icon: 'pi-chart-line',
        emoji: '📈'
    },

    // Inventario
    inventory_orchestrator: {
        id: 'inventory_orchestrator',
        name: 'Pedro',
        displayName: 'Pedro',
        department: 'inventory',
        color: '#f59e0b',
        icon: 'pi-box',
        emoji: '📦'
    },
    inventory_parallel: {
        id: 'inventory_parallel',
        name: 'Pedro',
        displayName: 'Pedro',
        department: 'inventory',
        color: '#f59e0b',
        icon: 'pi-box',
        emoji: '📦'
    },

    // Logística
    logistics_orchestrator: {
        id: 'logistics_orchestrator',
        name: 'Ana',
        displayName: 'Ana',
        department: 'logistics',
        color: '#3b82f6',
        icon: 'pi-truck',
        emoji: '🚚'
    },
    logistics_parallel: {
        id: 'logistics_parallel',
        name: 'Ana',
        displayName: 'Ana',
        department: 'logistics',
        color: '#3b82f6',
        icon: 'pi-truck',
        emoji: '🚚'
    },

    // Usuario
    user: {
        id: 'user',
        name: 'Tú',
        displayName: 'Tú',
        department: 'user',
        color: '#64748b',
        icon: 'pi-user',
        emoji: '👤'
    }
};

/**
 * Helper para obtener configuración de speaker
 */
export function getSpeakerConfig(agentId: string): AgUiSpeaker {
    // Buscar configuración exacta o por prefijo
    if (AGUI_SPEAKER_CONFIG[agentId]) {
        return AGUI_SPEAKER_CONFIG[agentId];
    }

    // Detectar departamento por nombre
    if (agentId.includes('sales')) {
        return { ...AGUI_SPEAKER_CONFIG['sales_orchestrator'], id: agentId };
    }
    if (agentId.includes('inventory')) {
        return { ...AGUI_SPEAKER_CONFIG['inventory_orchestrator'], id: agentId };
    }
    if (agentId.includes('logistics')) {
        return { ...AGUI_SPEAKER_CONFIG['logistics_orchestrator'], id: agentId };
    }

    // Default: CEO
    return {
        id: agentId,
        name: agentId,
        displayName: agentId,
        department: 'ceo',
        color: '#6366f1',
        icon: 'pi-cpu',
        emoji: '🤖'
    };
}

/**
 * Helper para obtener etiqueta del departamento
 */
export function getDepartmentLabel(department: string | null): string {
    const labels: Record<string, string> = {
        'ceo': 'Director General',
        'sales': 'Ventas',
        'inventory': 'Inventario',
        'logistics': 'Logística',
        'user': ''
    };
    return labels[department || ''] || '';
}

// =============================================================================
// GENERATIVE UI - Mapeo de Tools a Artifacts
// =============================================================================

/**
 * Configuración de Generative UI
 * Define qué artifact renderizar basado en el resultado de un tool
 */
export interface AgUiToolArtifactConfig {
    toolName: string;
    artifactType: AgUiArtifactType;
    transform: (result: any) => AgUiArtifact | null;
    requiresConfirmation?: boolean;  // Si true, muestra Human-in-the-Loop
    confirmationMessage?: string;
}

/**
 * Mapeo de tools a artifacts
 * Cuando un tool retorna resultado, se transforma en un artifact visual
 */
export const AGUI_TOOL_ARTIFACT_MAP: AgUiToolArtifactConfig[] = [
    // Ventas - Métricas y Charts
    {
        toolName: 'get_sales_today',
        artifactType: 'metric',
        transform: (result) => {
            if (!result) return null;
            const total = result.total || result.totalSales || 0;
            const count = result.count || result.orderCount || 0;
            return {
                id: `metric_sales_${Date.now()}`,
                type: 'metric',
                title: 'Ventas de Hoy',
                data: {
                    value: `$${total.toLocaleString()}`,
                    label: `${count} pedidos`,
                    change: result.changePercent,
                    changeType: result.changePercent >= 0 ? 'increase' : 'decrease',
                    icon: 'pi-chart-line',
                    color: '#10b981'
                }
            } as AgUiMetricArtifact;
        }
    },
    {
        toolName: 'get_top_products',
        artifactType: 'chart',
        transform: (result) => {
            if (!result || !Array.isArray(result)) return null;
            const products = result.slice(0, 5);
            return {
                id: `chart_top_products_${Date.now()}`,
                type: 'chart',
                title: 'Top Productos',
                data: {
                    chartType: 'bar',
                    labels: products.map((p: any) => p.name || p.product || 'Producto'),
                    datasets: [{
                        label: 'Ventas',
                        data: products.map((p: any) => p.sales || p.quantity || p.total || 0),
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
                    }]
                }
            } as AgUiChartArtifact;
        }
    },
    {
        toolName: 'get_sales_by_period',
        artifactType: 'sales_chart',
        transform: (result) => {
            if (!result) return null;
            const data = Array.isArray(result) ? result : (result.data || []);
            return {
                id: `chart_sales_period_${Date.now()}`,
                type: 'sales_chart',
                title: 'Ventas por Período',
                data: {
                    chartType: 'line',
                    labels: data.map((d: any) => d.date || d.period || d.label),
                    datasets: [{
                        label: 'Ventas',
                        data: data.map((d: any) => d.total || d.amount || d.value || 0),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)'
                    }]
                }
            } as AgUiChartArtifact;
        }
    },
    {
        toolName: 'get_recent_orders',
        artifactType: 'table',
        transform: (result) => {
            if (!result || !Array.isArray(result)) return null;
            const orders = result.slice(0, 10);
            return {
                id: `table_orders_${Date.now()}`,
                type: 'table',
                title: 'Pedidos Recientes',
                data: {
                    headers: ['# Pedido', 'Cliente', 'Total', 'Estado'],
                    rows: orders.map((o: any) => [
                        o.nroPedido || o.id,
                        o.customer || o.cliente || 'N/A',
                        `$${(o.total || 0).toLocaleString()}`,
                        o.status || o.estado || 'Pendiente'
                    ])
                }
            } as AgUiTableArtifact;
        }
    },

    // Inventario - Alertas y Cards
    {
        toolName: 'get_low_stock_alerts',
        artifactType: 'stock_alert',
        transform: (result) => {
            if (!result || !Array.isArray(result)) return null;
            return {
                id: `alert_stock_${Date.now()}`,
                type: 'stock_alert',
                title: 'Alertas de Stock Bajo',
                data: {
                    products: result.map((p: any) => ({
                        name: p.name || p.producto || 'Producto',
                        sku: p.sku || p.codigo || '',
                        currentStock: p.stock || p.currentStock || 0,
                        minStock: p.minStock || p.stockMinimo || 10,
                        status: (p.stock || 0) === 0 ? 'critical' :
                                (p.stock || 0) < (p.minStock || 10) ? 'low' : 'ok'
                    }))
                }
            } as AgUiStockAlertArtifact;
        }
    },
    {
        toolName: 'get_stock_levels',
        artifactType: 'chart',
        transform: (result) => {
            if (!result) return null;
            const data = Array.isArray(result) ? result : (result.categories || result.products || []);
            if (!Array.isArray(data) || data.length === 0) return null;
            return {
                id: `chart_stock_${Date.now()}`,
                type: 'chart',
                title: 'Niveles de Stock',
                data: {
                    chartType: 'doughnut',
                    labels: data.slice(0, 6).map((d: any) => d.category || d.name || 'Categoría'),
                    datasets: [{
                        label: 'Stock',
                        data: data.slice(0, 6).map((d: any) => d.stock || d.quantity || d.total || 0),
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']
                    }]
                }
            } as AgUiChartArtifact;
        }
    },
    {
        toolName: 'get_product_info',
        artifactType: 'product_card',
        transform: (result) => {
            if (!result) return null;
            return {
                id: `product_${result.id || Date.now()}`,
                type: 'product_card',
                title: result.name || 'Producto',
                data: {
                    productId: result.id || '',
                    name: result.name || result.nombre || 'Producto',
                    sku: result.sku || result.codigo || '',
                    price: result.price || result.precio || 0,
                    stock: result.stock || 0,
                    imageUrl: result.imageUrl || result.imagen,
                    category: result.category || result.categoria,
                    lowStock: (result.stock || 0) < (result.minStock || 10)
                }
            } as AgUiProductCardArtifact;
        }
    },

    // Logística - Mapas y Rutas
    {
        toolName: 'get_pending_dispatches',
        artifactType: 'map',
        transform: (result) => {
            if (!result || !Array.isArray(result)) return null;
            const dispatches = result.filter((d: any) => d.lat && d.lng);
            if (dispatches.length === 0) return null;
            return {
                id: `map_dispatches_${Date.now()}`,
                type: 'map',
                title: 'Despachos Pendientes',
                data: {
                    center: dispatches[0] ? { lat: dispatches[0].lat, lng: dispatches[0].lng } : undefined,
                    zoom: 12,
                    markers: dispatches.map((d: any) => ({
                        lat: d.lat,
                        lng: d.lng,
                        label: d.nroPedido || d.id,
                        info: d.address || d.direccion,
                        color: '#3b82f6'
                    }))
                }
            } as AgUiMapArtifact;
        }
    },
    {
        toolName: 'plan_routes',
        artifactType: 'route_map',
        requiresConfirmation: true,
        confirmationMessage: '¿Aprobar esta planificación de rutas?',
        transform: (result) => {
            if (!result) return null;
            const routes = result.routes || result.optimizedRoutes || [];
            const markers = result.stops || result.deliveries || [];
            return {
                id: `route_map_${Date.now()}`,
                type: 'route_map',
                title: 'Rutas Planificadas',
                data: {
                    center: markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : undefined,
                    zoom: 11,
                    markers: markers.map((m: any, i: number) => ({
                        lat: m.lat,
                        lng: m.lng,
                        label: `${i + 1}`,
                        info: m.address || m.direccion,
                        color: '#3b82f6'
                    })),
                    routes: routes.map((r: any, i: number) => ({
                        points: r.points || r.path || [],
                        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 4],
                        label: r.name || `Ruta ${i + 1}`
                    }))
                }
            } as AgUiMapArtifact;
        }
    },
    {
        toolName: 'get_transporters_available',
        artifactType: 'table',
        transform: (result) => {
            if (!result || !Array.isArray(result)) return null;
            return {
                id: `table_transporters_${Date.now()}`,
                type: 'table',
                title: 'Transportadores Disponibles',
                data: {
                    headers: ['Nombre', 'Vehículo', 'Capacidad', 'Estado'],
                    rows: result.map((t: any) => [
                        t.name || t.nombre || 'N/A',
                        t.vehicle || t.vehiculo || 'N/A',
                        t.capacity || t.capacidad || 'N/A',
                        t.status || t.estado || 'Disponible'
                    ])
                }
            } as AgUiTableArtifact;
        }
    },
    // 🗺️ Mapa de Despachos con Rutas Optimizadas
    {
        toolName: 'plan_dispatch_routes',
        artifactType: 'dispatch_map',
        requiresConfirmation: true,
        confirmationMessage: '¿Aprobar estas rutas y crear los despachos?',
        transform: (result) => {
            console.log('[AGUI_MODEL] 🗺️ plan_dispatch_routes transform:', {
                hasResult: !!result,
                status: result?.status,
                hasMapData: !!result?.map_data,
                routesCount: result?.routes?.length
            });

            if (!result || result.status !== 'success') {
                console.log('[AGUI_MODEL] ❌ Invalid result status:', result?.status);
                return null;
            }

            const mapData = result.map_data;
            if (!mapData) {
                console.log('[AGUI_MODEL] ❌ No map_data in result');
                return null;
            }

            console.log('[AGUI_MODEL] ✅ Creating dispatch_map artifact with data:', {
                center: mapData.center,
                markersCount: mapData.markers?.length || 0,
                routesCount: result.routes?.length || 0,
                summaryTotal: mapData.summary?.total_orders || 0
            });

            const artifact = {
                id: `dispatch_map_${Date.now()}`,
                type: 'dispatch_map',
                title: '🗺️ Rutas de Despacho Optimizadas',
                data: {
                    center: mapData.center || { lat: 4.710989, lng: -74.072092 },
                    zoom: mapData.zoom || 12,
                    warehouse: mapData.warehouse || { lat: 4.710989, lng: -74.072092, address: 'Almacén' },
                    markers: mapData.markers || [],
                    polylines: mapData.polylines || [],
                    routes: result.routes || [],
                    summary: mapData.summary || {
                        total_orders: 0,
                        total_zones: 0,
                        total_distance_km: 0,
                        total_duration_minutes: 0,
                        total_value: 0,
                        available_transporters: 0
                    }
                },
                metadata: {
                    message: result.message,
                    artifact_type: result.artifact_type
                }
            } as AgUiDispatchMapArtifact;

            console.log('[AGUI_MODEL] 🎉 dispatch_map artifact created:', artifact.id);
            return artifact;
        }
    }
];

/**
 * Helper para obtener configuración de artifact por tool
 */
export function getToolArtifactConfig(toolName: string): AgUiToolArtifactConfig | undefined {
    return AGUI_TOOL_ARTIFACT_MAP.find(config => config.toolName === toolName);
}

/**
 * Helper para transformar resultado de tool a artifact
 */
export function transformToolResultToArtifact(toolName: string, result: any): AgUiArtifact | null {
    console.log('[AGUI_MODEL] 🔍 transformToolResultToArtifact:', {
        toolName,
        resultStatus: result?.status,
        resultHasMapData: !!result?.map_data
    });

    const config = getToolArtifactConfig(toolName);
    if (!config) {
        console.log('[AGUI_MODEL] ⚠️ No config found for tool:', toolName);
        return null;
    }

    console.log('[AGUI_MODEL] ✅ Config found:', {
        toolName: config.toolName,
        artifactType: config.artifactType,
        requiresConfirmation: config.requiresConfirmation
    });

    try {
        const artifact = config.transform(result);
        console.log('[AGUI_MODEL] 🎨 Transform result:', artifact ? 'SUCCESS' : 'NULL');
        return artifact;
    } catch (error) {
        console.error(`[AGUI_MODEL] ❌ Error transforming tool result to artifact: ${toolName}`, error);
        return null;
    }
}

/**
 * Helper para verificar si un tool requiere confirmación
 */
export function toolRequiresConfirmation(toolName: string): boolean {
    const config = getToolArtifactConfig(toolName);
    return config?.requiresConfirmation || false;
}

/**
 * Tools que requieren Human-in-the-Loop
 * Son acciones que modifican datos o tienen impacto significativo
 */
export const AGUI_HITL_TOOLS: string[] = [
    'plan_dispatch_routes',  // 🗺️ Planificación de rutas de despacho
    'create_dispatch',
    'assign_transporter',
    'update_order_status',
    'cancel_order',
    'adjust_stock',
    'create_purchase_order'
];
