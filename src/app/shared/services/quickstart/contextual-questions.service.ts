import { Injectable } from '@angular/core';

export interface ContextualQuestion {
  id: string;
  question: string;
  type: 'single_choice';
  options: string[];
  allowOther?: boolean;
  condition: (responses: { [key: string]: string }) => boolean;
  priority: number; // 1 = alta, 2 = media, 3 = baja
  category: 'payments' | 'logistics' | 'marketing' | 'production';
}

@Injectable({
  providedIn: 'root'
})
export class ContextualQuestionsService {

  private contextualQuestions: ContextualQuestion[] = [
    // PAGOS - Para e-commerce y ventas online
    {
      id: 'ctx_payments_online',
      question: '¿Cómo reciben pagos tus clientes online?',
      type: 'single_choice',
      options: [
        'Tarjeta de crédito/débito',
        'PSE',
        'Transferencias bancarias',
        'Nequi / Daviplata',
        'PayPal / Stripe',
        'Otro'
      ],
      allowOther: true,
      condition: (responses) => {
        return responses.q8?.includes('online') || 
               responses.q8?.includes('Marketplaces') ||
               responses.q8?.includes('Ecommerce');
      },
      priority: 1,
      category: 'payments'
    },

    // LOGÍSTICA - Para productos físicos con envíos
    {
      id: 'ctx_logistics_coverage',
      question: '¿Cuál es tu cobertura de envíos?',
      type: 'single_choice',
      options: [
        'Solo local (misma ciudad)',
        'Departamental',
        'Nacional',
        'Internacional'
      ],
      condition: (responses) => {
        return responses.q8 !== 'Punto de venta físico' && 
               responses.q12 !== 'Vendo sobre pedido (no mantengo stock)';
      },
      priority: 2,
      category: 'logistics'
    },

    {
      id: 'ctx_logistics_time',
      question: '¿Cuánto tardas en procesar y enviar un pedido?',
      type: 'single_choice',
      options: [
        'Mismo día',
        '24-48 horas', 
        'Más de 48 horas'
      ],
      condition: (responses) => {
        return responses.q8 !== 'Punto de venta físico';
      },
      priority: 2,
      category: 'logistics'
    },

    // MARKETING - Para catálogos grandes
    {
      id: 'ctx_marketing_customers',
      question: '¿Tienes una base de datos de clientes?',
      type: 'single_choice',
      options: [
        'Sí, en Excel',
        'Sí, uso un CRM',
        'No, pero quiero empezar'
      ],
      condition: (responses) => {
        return responses.q6 === 'Más de 500' || 
               responses.q7 === 'Ambos: clientes finales y empresas';
      },
      priority: 2,
      category: 'marketing'
    },

    {
      id: 'ctx_marketing_advertising',
      question: '¿Inviertes en publicidad digital?',
      type: 'single_choice',
      options: [
        'Sí, mensualmente',
        'Ocasionalmente', 
        'No, pero quiero empezar',
        'No lo considero necesario'
      ],
      condition: (responses) => {
        return responses.q8?.includes('online') ||
               responses.q26 === 'Expandirme a nuevos mercados';
      },
      priority: 3,
      category: 'marketing'
    },

    // PRODUCCIÓN - Para manufactura
    {
      id: 'ctx_production_type',
      question: '¿Tus productos requieren procesos de producción?',
      type: 'single_choice',
      options: [
        'Sí, los fabrico/ensamblo',
        'Sí, pero los maquilo con terceros',
        'No, solo comercializo'
      ],
      condition: (responses) => {
        return responses.q1 === 'Manufactura' ||
               responses.q12 === 'Vendo sobre pedido (no mantengo stock)';
      },
      priority: 1,
      category: 'production'
    }
  ];

  constructor() { }

  /**
   * Obtiene preguntas contextuales basadas en respuestas del diagnóstico principal
   */
  getContextualQuestions(responses: { [key: string]: string }, maxQuestions: number = 3): ContextualQuestion[] {
    const applicableQuestions = this.contextualQuestions
      .filter(q => q.condition(responses))
      .sort((a, b) => a.priority - b.priority); // Ordenar por prioridad

    return applicableQuestions.slice(0, maxQuestions);
  }

  /**
   * Determina si se necesitan preguntas contextuales
   */
  needsContextualQuestions(responses: { [key: string]: string }): boolean {
    return this.getContextualQuestions(responses, 1).length > 0;
  }

  /**
   * Obtiene recomendaciones de configuración basadas en respuestas contextuales
   */
  getConfigurationRecommendations(
    mainResponses: { [key: string]: string }, 
    contextualResponses: { [key: string]: string }
  ): any {
    const recommendations = {
      formasPago: ['Efectivo'],
      tiposEntrega: ['Recogida en tienda'],
      modulosAdicionales: [],
      configuracionesEspeciales: []
    };

    // Configuraciones de pagos
    if (contextualResponses.ctx_payments_online) {
      const paymentMethod = contextualResponses.ctx_payments_online;
      if (paymentMethod.includes('Tarjeta')) {
        recommendations.formasPago.push('Tarjeta');
      }
      if (paymentMethod.includes('PSE')) {
        recommendations.formasPago.push('PSE');
      }
      if (paymentMethod.includes('Nequi')) {
        recommendations.formasPago.push('Nequi', 'Daviplata');
      }
    }

    // Configuraciones de logística
    if (contextualResponses.ctx_logistics_coverage) {
      const coverage = contextualResponses.ctx_logistics_coverage;
      if (coverage === 'Nacional') {
        recommendations.tiposEntrega.push('Envío nacional');
        recommendations.modulosAdicionales.push('integracion_transportadoras');
      }
      if (coverage === 'Internacional') {
        recommendations.tiposEntrega.push('Envío internacional');
        recommendations.modulosAdicionales.push('integracion_courrier_internacional');
      }
    }

    // Configuraciones de marketing
    if (contextualResponses.ctx_marketing_customers === 'Sí, uso un CRM') {
      recommendations.modulosAdicionales.push('crm_avanzado');
    }

    // Configuraciones de producción
    if (contextualResponses.ctx_production_type?.includes('fabrico')) {
      recommendations.modulosAdicionales.push('modulo_produccion');
      recommendations.configuracionesEspeciales.push('centros_trabajo');
    }

    return recommendations;
  }
}