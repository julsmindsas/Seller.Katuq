import { ToolDeclaration } from './agent-config.interface';

/**
 * Interface para adapters plug & play
 * Permite agregar nuevas industrias sin modificar el core
 */
export interface IAgentAdapter {
  readonly industry: AgentIndustry;
  readonly name: string;
  readonly description: string;

  /**
   * System instruction personalizado para la industria
   */
  getSystemInstruction(): string;

  /**
   * Tool declarations específicas de la industria
   */
  getToolDeclarations(): ToolDeclaration[];

  /**
   * Procesa el resultado crudo de Gemini
   */
  processResult(rawResult: any): AdapterResult;

  /**
   * Determina la siguiente acción según el resultado
   */
  getNextAction(result: AdapterResult): AgentAction;

  /**
   * Configuración adicional opcional
   */
  getAdapterConfig?(): Record<string, any>;
}

/**
 * Industrias soportadas
 */
export enum AgentIndustry {
  APPLIANCE = 'appliance',      // Electrodomésticos (Haceb)
  AUTOMOTIVE = 'automotive',     // Automotriz
  HEALTHCARE = 'healthcare',     // Salud
  GENERAL = 'general'            // Genérico
}

/**
 * Resultado procesado por el adapter
 */
export interface AdapterResult {
  type: ResultType;
  confidence: number; // 0-100
  summary: string;
  details: any;
  metadata?: Record<string, any>;
}

export type ResultType =
  | 'DIY'           // Usuario puede resolver
  | 'SERVICE'       // Requiere servicio técnico
  | 'INFO'          // Solo información
  | 'ESCALATE';     // Escalar a humano

/**
 * Acción a ejecutar según el resultado
 */
export interface AgentAction {
  action: ActionType;
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export type ActionType =
  | 'SHOW_INSTRUCTIONS'     // Mostrar instrucciones DIY
  | 'SCHEDULE_SERVICE'      // Agendar servicio
  | 'SHOW_INFO'             // Mostrar información
  | 'REQUEST_MORE_INFO'     // Pedir más datos
  | 'ESCALATE_TO_HUMAN';    // Transferir a humano

/**
 * Configuración para registro de adapters
 */
export interface AdapterRegistration {
  adapter: IAgentAdapter;
  enabled: boolean;
  priority?: number; // Para ordenar en UI
}
