export interface ConversationMessage {
  id: string;
  timestamp: Date;
  speaker: string;           // 'user', 'salesOrchestrator', 'inventoryOrchestrator', etc.
  department?: string;       // 'sales', 'logistics', 'inventory', 'user'
  message: string;
  type: 'user' | 'agent' | 'orchestrator' | 'orchestrator_thinking' | 'tool_call' |
        'sub_agent_call' | 'a2a_request' | 'a2a_response' | 'result' | 'final_result' |
        'error' | 'a2a_error';
  targetDepartment?: string; // Para type='a2a_request'
  metadata?: {
    // Tool execution metadata
    toolName?: string;        // Nombre de la herramienta llamada
    toolParams?: any;         // Parámetros de la herramienta
    toolResult?: any;         // Resultado de la herramienta
    status?: 'pending' | 'running' | 'complete' | 'error'; // Estado de ejecución

    // Orchestrator metadata
    subAgentName?: string;    // Nombre del sub-agente
    thinking?: string;        // Texto de pensamiento del orchestrator
    error?: string;           // Mensaje de error si hay fallo

    // Streaming metadata (WebSocket + Genkit)
    executionTime?: number;   // Tiempo de ejecución en ms
    totalTokens?: number;     // Tokens totales usados
    inputTokens?: number;     // Tokens de entrada
    outputTokens?: number;    // Tokens de salida
    toolsExecuted?: string[]; // Array de herramientas ejecutadas
  };
  isStreaming?: boolean;      // Si el mensaje está siendo transmitido en tiempo real
  streamingComplete?: boolean; // Si el streaming se completó
}
