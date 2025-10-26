import {
  IAgentAdapter,
  AgentIndustry,
  AdapterResult,
  AgentAction,
  ResultType,
  ActionType
} from '../core/models/agent-adapter.interface';
import { ToolDeclaration } from '../core/models/agent-config.interface';

/**
 * Adapter para diagnóstico de electrodomésticos Haceb
 * Especializado en neveras, lavadoras, estufas, etc.
 */
export class HacebAdapter implements IAgentAdapter {
  readonly industry = AgentIndustry.APPLIANCE;
  readonly name = 'Haceb Diagnostics';
  readonly description = 'Asistente de diagnóstico para electrodomésticos Haceb';

  /**
   * System instruction personalizado para Haceb
   */
  getSystemInstruction(): string {
    return `Eres un técnico experto en electrodomésticos Haceb con 20 años de experiencia.

**Tu misión:**
- Diagnosticar problemas en electrodomésticos analizando video y audio en tiempo real
- Determinar si el usuario puede resolver el problema (DIY) o necesita técnico
- Dar instrucciones claras y seguras cuando sea DIY
- Identificar riesgos eléctricos y de seguridad

**Electrodomésticos Haceb:**
- Neveras (refrigeradores y congeladores)
- Lavadoras (carga superior y frontal)
- Secadoras
- Estufas y hornos
- Microondas
- Lavavajillas
- Aires acondicionados

**Protocolo de diagnóstico:**
1. Identifica el tipo de electrodoméstico
2. Pregunta por el problema específico (sonidos, fugas, no enciende, etc.)
3. Solicita mostrar el panel de control, modelo y etiquetas
4. Analiza el video para identificar signos visuales
5. Escucha sonidos anormales si aplica
6. Determina severidad: BAJA (DIY), MEDIA (DIY guiado), ALTA (técnico necesario)

**Criterios DIY vs TÉCNICO:**

✅ **DIY (usuario puede resolver):**
- Filtros sucios o obstruidos
- Puerta mal cerrada
- Configuración incorrecta
- Alimentos bloqueando ventilación
- Limpieza de condensador externo
- Reset de circuitos
- Ajuste de patas niveladoras

❌ **TÉCNICO NECESARIO:**
- Fugas de refrigerante
- Problemas eléctricos internos
- Motor o compresor dañado
- Válvulas o sensores internos
- Sistema de desagüe bloqueado internamente
- Tablero electrónico dañado
- Cualquier problema que requiera apertura del equipo

**Seguridad CRÍTICA:**
- SIEMPRE advertir sobre desconectar de la corriente antes de tocar
- NUNCA sugerir abrir paneles eléctricos o componentes internos
- Alertar sobre riesgos de choque eléctrico o gas
- Recomendar técnico ante cualquier duda de seguridad

**Tono de comunicación:**
- Amable y empático
- Claro y directo
- Seguro y profesional
- Tranquilizador pero honesto

**Usa las herramientas (tools) para:**
- \`analyze_appliance\`: Identificar tipo y modelo
- \`diagnose_issue\`: Diagnosticar problema específico
- \`provide_solution\`: Dar solución DIY o recomendar técnico`;
  }

  /**
   * Tool declarations para diagnóstico Haceb
   */
  getToolDeclarations(): ToolDeclaration[] {
    return [
      {
        name: 'analyze_appliance',
        description: 'Analiza el tipo de electrodoméstico y extrae información del modelo',
        parameters: {
          type: 'object',
          properties: {
            appliance_type: {
              type: 'string',
              enum: ['nevera', 'lavadora', 'secadora', 'estufa', 'horno', 'microondas', 'lavavajillas', 'aire_acondicionado', 'otro'],
              description: 'Tipo de electrodoméstico identificado'
            },
            brand: {
              type: 'string',
              description: 'Marca del electrodoméstico (debería ser Haceb)'
            },
            model: {
              type: 'string',
              description: 'Número de modelo si es visible'
            },
            age_estimate: {
              type: 'string',
              enum: ['nuevo', '1-3_años', '4-7_años', '8+_años', 'desconocido'],
              description: 'Edad estimada del electrodoméstico'
            },
            visual_condition: {
              type: 'string',
              enum: ['excelente', 'bueno', 'regular', 'malo', 'crítico'],
              description: 'Condición visual externa'
            }
          },
          required: ['appliance_type', 'brand']
        }
      },
      {
        name: 'diagnose_issue',
        description: 'Diagnostica el problema específico reportado por el usuario',
        parameters: {
          type: 'object',
          properties: {
            issue_category: {
              type: 'string',
              enum: [
                'no_enciende',
                'ruido_anormal',
                'fuga_agua',
                'temperatura_incorrecta',
                'vibracion_excesiva',
                'olor_extraño',
                'error_codigo',
                'puerta_no_cierra',
                'ciclo_incompleto',
                'otro'
              ],
              description: 'Categoría del problema'
            },
            severity: {
              type: 'string',
              enum: ['baja', 'media', 'alta', 'crítica'],
              description: 'Severidad del problema'
            },
            symptoms: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lista de síntomas observados'
            },
            error_code: {
              type: 'string',
              description: 'Código de error si se muestra en pantalla'
            },
            duration: {
              type: 'string',
              enum: ['reciente', 'días', 'semanas', 'meses'],
              description: 'Tiempo que lleva el problema'
            },
            safety_risk: {
              type: 'boolean',
              description: 'Si hay riesgo de seguridad (eléctrico, gas, fuego)'
            }
          },
          required: ['issue_category', 'severity', 'symptoms']
        }
      },
      {
        name: 'provide_solution',
        description: 'Proporciona la solución recomendada basada en el diagnóstico',
        parameters: {
          type: 'object',
          properties: {
            solution_type: {
              type: 'string',
              enum: ['DIY', 'SERVICE', 'INFO', 'ESCALATE'],
              description: 'Tipo de solución recomendada'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Nivel de confianza en el diagnóstico (0-100)'
            },
            diy_steps: {
              type: 'array',
              items: { type: 'string' },
              description: 'Pasos detallados para solución DIY (si aplica)'
            },
            estimated_time: {
              type: 'string',
              description: 'Tiempo estimado para resolver (ej: "5 minutos", "1 hora")'
            },
            tools_needed: {
              type: 'array',
              items: { type: 'string' },
              description: 'Herramientas necesarias para DIY'
            },
            service_reason: {
              type: 'string',
              description: 'Razón por la que se requiere técnico (si aplica)'
            },
            urgency: {
              type: 'string',
              enum: ['bajo', 'medio', 'alto', 'urgente'],
              description: 'Urgencia de la reparación'
            },
            estimated_cost: {
              type: 'string',
              description: 'Costo estimado del servicio (si aplica)'
            },
            preventive_tips: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tips preventivos para evitar el problema en el futuro'
            }
          },
          required: ['solution_type', 'confidence']
        }
      }
    ];
  }

  /**
   * Procesa el resultado crudo de Gemini
   */
  processResult(rawResult: any): AdapterResult {
    const functionCall = rawResult.args || rawResult;

    // Determinar tipo de resultado
    let resultType: ResultType = 'INFO';
    let confidence = 50;
    let summary = 'Diagnóstico en proceso...';
    let details = functionCall;

    // Si es provide_solution, extraer información
    if (rawResult.name === 'provide_solution' || functionCall.solution_type) {
      const solutionType = functionCall.solution_type;
      confidence = functionCall.confidence || 50;

      switch (solutionType) {
        case 'DIY':
          resultType = 'DIY';
          summary = 'Puedes resolver este problema tú mismo siguiendo las instrucciones';
          break;
        case 'SERVICE':
          resultType = 'SERVICE';
          summary = 'Se requiere servicio técnico profesional';
          break;
        case 'ESCALATE':
          resultType = 'ESCALATE';
          summary = 'Este caso requiere atención especializada';
          break;
        default:
          resultType = 'INFO';
          summary = 'Información de diagnóstico';
      }

      details = {
        ...functionCall,
        processed_at: new Date().toISOString()
      };
    }

    return {
      type: resultType,
      confidence,
      summary,
      details,
      metadata: {
        adapter: this.name,
        industry: this.industry,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Determina la siguiente acción según el resultado
   */
  getNextAction(result: AdapterResult): AgentAction {
    const details = result.details || {};

    switch (result.type) {
      case 'DIY':
        return {
          action: 'SHOW_INSTRUCTIONS',
          data: {
            steps: details.diy_steps || [],
            estimatedTime: details.estimated_time || 'Desconocido',
            toolsNeeded: details.tools_needed || [],
            preventiveTips: details.preventive_tips || []
          },
          priority: this.determinePriority(details.urgency)
        };

      case 'SERVICE':
        return {
          action: 'SCHEDULE_SERVICE',
          data: {
            reason: details.service_reason || 'Requiere técnico especializado',
            urgency: details.urgency || 'medio',
            estimatedCost: details.estimated_cost || 'A cotizar',
            serviceType: 'Reparación de electrodoméstico Haceb'
          },
          priority: this.determinePriority(details.urgency)
        };

      case 'ESCALATE':
        return {
          action: 'ESCALATE_TO_HUMAN',
          data: {
            reason: 'Caso complejo que requiere evaluación humana',
            details: details
          },
          priority: 'high'
        };

      default:
        return {
          action: 'SHOW_INFO',
          data: {
            message: result.summary,
            details: details
          },
          priority: 'low'
        };
    }
  }

  /**
   * Determina prioridad basada en urgencia
   */
  private determinePriority(urgency?: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (urgency?.toLowerCase()) {
      case 'urgente':
        return 'critical';
      case 'alto':
        return 'high';
      case 'medio':
        return 'medium';
      case 'bajo':
      default:
        return 'low';
    }
  }

  /**
   * Configuración adicional del adapter
   */
  getAdapterConfig(): Record<string, any> {
    return {
      supportedLanguages: ['es', 'en'],
      defaultLanguage: 'es',
      maxSessionDuration: 600000, // 10 minutos
      autoScheduleService: true,
      requiresUserConfirmation: true,
      brandWebsite: 'https://www.haceb.com',
      supportPhone: '01-8000-123-456' // Placeholder
    };
  }
}
