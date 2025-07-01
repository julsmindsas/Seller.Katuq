import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IntegrationStateService } from './integration-state.service';
import { IntegrationCacheService } from './integration-cache.service';
import { tap, map, catchError, finalize } from 'rxjs/operators';

export interface Integration {
  id?: string;
  type: string;
  name: string;
  enabled: boolean;
  category: IntegrationCategory; // Añadido campo de categoría
  credentials: any;
  createdAt?: string;
  updatedAt?: string;
}

export enum IntegrationCategory {
  ECOMMERCE = 'ecommerce',
  PAYMENT = 'payment',
  LOGISTICS = 'logistics',
  MARKETING = 'marketing',
  CRM = 'crm',
  ACCOUNTING = 'accounting',
  OTHER = 'other'
}

// Categorías para mostrar en la interfaz de usuario
export const CATEGORY_LABELS = {
  [IntegrationCategory.ECOMMERCE]: 'Plataformas de E-commerce',
  [IntegrationCategory.PAYMENT]: 'Pasarelas de Pago',
  [IntegrationCategory.LOGISTICS]: 'Logística y Envíos',
  [IntegrationCategory.MARKETING]: 'Marketing y Publicidad',
  [IntegrationCategory.CRM]: 'CRM y Clientes',
  [IntegrationCategory.ACCOUNTING]: 'Contabilidad y Facturación',
  [IntegrationCategory.OTHER]: 'Otras Integraciones'
};

@Injectable({
  providedIn: 'root'
})
export class IntegrationsService {
  // Actualizar la URL base para coincidir con las rutas de la API
  private apiUrl = `${environment.urlApi}/v1/integration/configurations`;

  constructor(
    private http: HttpClient,
    private stateService: IntegrationStateService,
    private cacheService: IntegrationCacheService
  ) { }

  getIntegrations(): Observable<Integration[]> {
    return this.cacheService.get(
      'integrations:all',
      () => {
        this.stateService.setLoading('list', true);
        return this.http.get<Integration[]>(this.apiUrl).pipe(
          map(integrations => integrations || []),
          tap(integrations => {
            this.stateService.setIntegrations(integrations);
            this.stateService.setError('list', null);
          }),
          catchError(error => {
            console.error('Error al cargar integraciones desde API:', error);
            this.stateService.setError('list', error.message || 'Error al cargar integraciones');
            this.stateService.setIntegrations([]);
            // Retornar array vacío en lugar de propagar el error
            return of([]);
          }),
          finalize(() => {
            this.stateService.setLoading('list', false);
          })
        );
      },
      5 * 60 * 1000 // 5 minutos TTL
    );
  }

  getIntegration(id: string): Observable<Integration> {
    return this.cacheService.get(
      `integration:${id}`,
      () => this.http.get<Integration>(`${this.apiUrl}/${id}`),
      10 * 60 * 1000 // 10 minutos TTL para integraciones individuales
    );
  }

  createIntegration(integration: Integration): Observable<Integration> {
    this.stateService.setLoading('save', true);
    return this.http.post<Integration>(this.apiUrl, integration).pipe(
      tap(createdIntegration => {
        this.stateService.addIntegration(createdIntegration);
        this.stateService.setError('save', null);
        // Invalidar cache de listas
        this.cacheService.invalidatePattern(/^integrations:/);
        // Cachear la nueva integración
        this.cacheService.cacheIntegration(createdIntegration);
      }),
      catchError(error => {
        this.stateService.setError('save', error.message || 'Error al crear integración');
        throw error;
      }),
      finalize(() => {
        this.stateService.setLoading('save', false);
      })
    );
  }

  updateIntegration(id: string, integration: Integration): Observable<Integration> {
    this.stateService.setLoading('save', true);
    return this.http.put<Integration>(`${this.apiUrl}/${id}`, integration).pipe(
      tap(updatedIntegration => {
        this.stateService.updateIntegration(updatedIntegration);
        this.stateService.setError('save', null);
        // Invalidar cache específico y listas
        this.cacheService.invalidateIntegration(id);
        // Cachear la integración actualizada
        this.cacheService.cacheIntegration(updatedIntegration);
      }),
      catchError(error => {
        this.stateService.setError('save', error.message || 'Error al actualizar integración');
        throw error;
      }),
      finalize(() => {
        this.stateService.setLoading('save', false);
      })
    );
  }

  deleteIntegration(id: string): Observable<any> {
    this.stateService.setLoading('delete', true);
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.stateService.removeIntegration(id);
        this.stateService.setError('delete', null);
        // Invalidar cache
        this.cacheService.invalidateIntegration(id);
      }),
      catchError(error => {
        this.stateService.setError('delete', error.message || 'Error al eliminar integración');
        throw error;
      }),
      finalize(() => {
        this.stateService.setLoading('delete', false);
      })
    );
  }

  testIntegration(integration: Integration): Observable<{success: boolean, message: string}> {
    this.stateService.setLoading('test', true);
    return this.http.post<{success: boolean, message: string}>(`${this.apiUrl}/test`, integration).pipe(
      tap(result => {
        this.stateService.setError('test', null);
        // Opcional: cachear resultado de test por un tiempo corto
        if (integration.id) {
          this.cacheService.set(`test:${integration.id}`, result, 2 * 60 * 1000); // 2 minutos
        }
      }),
      catchError(error => {
        this.stateService.setError('test', error.message || 'Error al probar integración');
        throw error;
      }),
      finalize(() => {
        this.stateService.setLoading('test', false);
      })
    );
  }

  // Métodos adicionales para optimización de performance
  
  /**
   * Obtener integraciones por categoría con cache
   */
  getIntegrationsByCategory(category: IntegrationCategory): Observable<Integration[]> {
    return this.cacheService.get(
      `integrations:category:${category}`,
      () => this.getIntegrations().pipe(
        map(integrations => (integrations || []).filter(i => i.category === category))
      ),
      3 * 60 * 1000 // 3 minutos TTL
    );
  }

  /**
   * Obtener solo integraciones activas
   */
  getActiveIntegrations(): Observable<Integration[]> {
    return this.cacheService.get(
      'integrations:active',
      () => this.getIntegrations().pipe(
        map(integrations => (integrations || []).filter(i => i.enabled))
      ),
      2 * 60 * 1000 // 2 minutos TTL para datos más dinámicos
    );
  }

  /**
   * Buscar integraciones con cache
   */
  searchIntegrations(query: string): Observable<Integration[]> {
    const cacheKey = `integrations:search:${query.toLowerCase()}`;
    return this.cacheService.get(
      cacheKey,
      () => this.getIntegrations().pipe(
        map(integrations => (integrations || []).filter(i => 
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.type.toLowerCase().includes(query.toLowerCase())
        ))
      ),
      1 * 60 * 1000 // 1 minuto TTL para búsquedas
    );
  }

  /**
   * Prefetch de datos comunes
   */
  prefetchCommonData(): void {
    // Prefetch integraciones activas
    this.getActiveIntegrations().subscribe();
    
    // Prefetch por categorías principales
    [IntegrationCategory.PAYMENT, IntegrationCategory.ECOMMERCE].forEach(category => {
      this.getIntegrationsByCategory(category).subscribe();
    });
  }

  /**
   * Invalidar todo el cache relacionado con integraciones
   */
  invalidateAllCache(): void {
    this.cacheService.invalidatePattern(/^integrations?:/);
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  // Método para obtener las integraciones disponibles por categoría
  getAvailableIntegrations(): { [category: string]: Array<{id: string, name: string, description: string, logo: string}> } {
    return {
      [IntegrationCategory.ECOMMERCE]: [
        { 
          id: 'shopify', 
          name: 'Shopify',
          description: 'Plataforma de comercio electrónico para tiendas online y sistemas de punto de venta',
          logo: 'assets/images/logos/shopify.svg' 
        },
        { 
          id: 'woocommerce', 
          name: 'WooCommerce',
          description: 'Plataforma de eCommerce para WordPress',
          logo: 'assets/images/logos/woocommerce.svg' 
        },
        { 
          id: 'magento', 
          name: 'Magento',
          description: 'Plataforma de comercio electrónico de Adobe',
          logo: 'assets/images/logos/magento.svg' 
        },
        { 
          id: 'prestashop', 
          name: 'PrestaShop',
          description: 'Sistema de gestión de contenido de código abierto para eCommerce',
          logo: 'assets/images/logos/prestashop.svg' 
        }
      ],
      [IntegrationCategory.PAYMENT]: [
        { 
          id: 'wompi', 
          name: 'Wompi',
          description: 'Pasarela de pagos digital para Colombia y Latinoamérica',
          logo: 'assets/images/logos/wompi.svg' 
        },
        { 
          id: 'epayco', 
          name: 'ePayco',
          description: 'Pasarela de pagos colombiana con múltiples medios de pago',
          logo: 'assets/images/logos/epayco.svg' 
        },
        { 
          id: 'paypal', 
          name: 'PayPal',
          description: 'Sistema global de pagos en línea',
          logo: 'assets/images/logos/paypal.svg' 
        },
        { 
          id: 'stripe', 
          name: 'Stripe',
          description: 'Plataforma de procesamiento de pagos para negocios en Internet',
          logo: 'assets/images/logos/stripe.svg' 
        },
        { 
          id: 'payu', 
          name: 'PayU',
          description: 'Proveedor global de servicios de pago para comercio electrónico',
          logo: 'assets/images/logos/payu.svg' 
        },
        { 
          id: 'mercadopago', 
          name: 'Mercado Pago',
          description: 'Plataforma de pagos de Mercado Libre para Latinoamérica',
          logo: 'assets/images/logos/mercadopago.svg' 
        }
      ],
      [IntegrationCategory.LOGISTICS]: [
        { 
          id: 'fedex', 
          name: 'FedEx',
          description: 'Servicios de envío y seguimiento internacional',
          logo: 'assets/images/logos/fedex.svg' 
        },
        { 
          id: 'dhl', 
          name: 'DHL',
          description: 'Logística global y envíos internacionales',
          logo: 'assets/images/logos/dhl.svg' 
        },
        { 
          id: 'servientrega', 
          name: 'Servientrega',
          description: 'Empresa de logística y entregas en Colombia',
          logo: 'assets/images/logos/servientrega.svg' 
        },
        { 
          id: 'coordinadora', 
          name: 'Coordinadora',
          description: 'Servicio de entrega puerta a puerta de Colombia',
          logo: 'assets/images/logos/coordinadora.svg' 
        }
      ],
      [IntegrationCategory.MARKETING]: [
        { 
          id: 'mailchimp', 
          name: 'Mailchimp',
          description: 'Plataforma de automatización de marketing y email marketing',
          logo: 'assets/images/logos/mailchimp.svg' 
        },
        { 
          id: 'hubspot', 
          name: 'HubSpot',
          description: 'Plataforma de inbound marketing, ventas y servicio al cliente',
          logo: 'assets/images/logos/hubspot.svg' 
        },
        { 
          id: 'google_analytics', 
          name: 'Google Analytics',
          description: 'Servicio de análisis web para el seguimiento del tráfico',
          logo: 'assets/images/logos/google_analytics.svg' 
        }
      ],
      [IntegrationCategory.CRM]: [
        { 
          id: 'salesforce', 
          name: 'Salesforce',
          description: 'Plataforma CRM para gestión de clientes y ventas',
          logo: 'assets/images/logos/salesforce.svg' 
        },
        { 
          id: 'zoho_crm', 
          name: 'Zoho CRM',
          description: 'Software de gestión de relación con el cliente',
          logo: 'assets/images/logos/zoho_crm.svg' 
        }
      ],
      [IntegrationCategory.ACCOUNTING]: [
        { 
          id: 'quickbooks', 
          name: 'QuickBooks',
          description: 'Software de contabilidad para pequeñas y medianas empresas',
          logo: 'assets/images/logos/quickbooks.svg' 
        },
        { 
          id: 'siigo', 
          name: 'Siigo',
          description: 'Software contable y administrativo colombiano',
          logo: 'assets/images/logos/siigo.svg' 
        }
      ],
      [IntegrationCategory.OTHER]: [
        { 
          id: 'slack', 
          name: 'Slack',
          description: 'Plataforma de comunicación empresarial',
          logo: 'assets/images/logos/slack.svg' 
        },
        { 
          id: 'zapier', 
          name: 'Zapier',
          description: 'Plataforma de automatización que conecta apps y servicios',
          logo: 'assets/images/logos/zapier.svg' 
        }
      ]
    };
  }
}
