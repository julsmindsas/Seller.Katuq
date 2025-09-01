import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IntegrationStateService } from './integration-state.service';
import { IntegrationCacheService } from './integration-cache.service';
import { tap, map, catchError, finalize } from 'rxjs/operators';

// ===== INTERFACES V2 SEGÚN DOCUMENTACIÓN BACKEND =====

export interface IntegrationV2 {
  provider: string;        // Nuevo: reemplaza 'type'
  config: any;            // Nuevo: configuración validada por esquema
  enabled?: boolean;      // Opcional: manejado por el backend
  metadata?: {            // Nuevo: metadatos del backend
    version: string;
    lastModified: string;
    modifiedBy: string;
    encrypted?: string[]; // Campos que están encriptados
  };
}

// Mantener interface legacy para compatibilidad
export interface Integration {
  id?: string;
  type: string;
  name: string;
  enabled: boolean;
  category: IntegrationCategory;
  credentials: any;
  createdAt?: string;
  updatedAt?: string;
  // Nuevos campos V2
  provider?: string;
  config?: any;
  metadata?: {
    version: string;
    lastModified: string;
    modifiedBy: string;
    encrypted?: string[];
  };
}

// Nuevas interfaces para validación
export interface ValidationResponse {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface ConfigSchema {
  provider: string;
  fields: SchemaField[];
  required: string[];
  encrypted: string[];
  environments?: string[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  encrypted?: boolean;
  description?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
  };
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
  // Nueva URL base según API V2
  private apiUrl = `${environment.urlApi}/v1/integration/config`;
  
  // Company ID requerido para multi-tenancy
  private currentCompanyId: string = '';

  constructor(
    private http: HttpClient,
    private stateService: IntegrationStateService,
    private cacheService: IntegrationCacheService
  ) { 
    // TODO: Obtener company ID del usuario actual o contexto
    this.currentCompanyId = this.getCurrentCompanyId();
  }

  /**
   * Obtiene el ID de la empresa actual del contexto o localStorage
   */
  private getCurrentCompanyId(): string {
    // TODO: Implementar lógica para obtener company ID del contexto de usuario
    // Por ahora retorna un valor por defecto
    return localStorage.getItem('currentCompanyId') || 'default_company';
  }

  /**
   * Genera headers requeridos por la API V2
   */
  private getApiHeaders(): { [key: string]: string } {
    return {
      'Content-Type': 'application/json',
      'company': this.currentCompanyId
    };
  }

  getIntegrations(): Observable<Integration[]> {
    this.stateService.setLoading('list', true);

    const fetchIntegrations$ = this.http.get<{ success: boolean; data?: Integration[]; configs?: any[]; metadata?: any }>(this.apiUrl, {
      headers: this.getApiHeaders()
    }).pipe(
      map(response => {
        // V2 FIRST: Priorizar el nuevo formato de respuesta si contiene datos.
        if (response.configs && response.configs.length > 0) {
          // Convertir cada registro V2 al formato legacy que usa la UI actual
          return (response.configs || []).map(cfg => this.convertFromV2(cfg));
        }

        // V1 FALLBACK: Usar el formato antiguo solo si `configs` no está presente o está vacío.
        if (response.data) {
          // Asegurar que cada integración tenga categoría. Si el backend legacy no la envía, la inferimos.
          return (response.data || []).map((intg: any) => {
            if (intg && !intg.category) {
              const provider = intg.provider || intg.type;
              return {
                ...intg,
                category: this.getCategoryForProvider(provider)
              };
            }
            return intg;
          });
        }

        // Si la respuesta no tiene ni `configs` ni `data` válidos, devolver un array vacío.
        return [];
      })
    );

    const integrationsFromCacheOrApi$ = this.cacheService.get(
      'integrations:all',
      () => fetchIntegrations$,
      5 * 60 * 1000 // 5 minutos TTL
    );

    return integrationsFromCacheOrApi$.pipe(
      tap(integrations => {
        this.stateService.setIntegrations(integrations);
        this.stateService.setError('list', null);
      }),
      catchError(error => {
        console.error('Error al cargar integraciones (desde getIntegrations):', error);
        this.stateService.setError('list', error.message || 'Error al cargar integraciones');
        this.stateService.setIntegrations([]);
        return of([]);
      }),
      finalize(() => {
        this.stateService.setLoading('list', false);
      })
    );
  }

  getIntegration(provider: string): Observable<Integration> {
    return this.cacheService.get(
      `integration:${provider}`,
      () => this.http.get<{ success: boolean; data: Integration; metadata?: any }>(`${this.apiUrl}/${provider}`, {
        headers: this.getApiHeaders()
      }).pipe(
        map(response => response.data)
      ),
      10 * 60 * 1000 // 10 minutos TTL para integraciones individuales
    );
  }

  createIntegration(provider: string, config: any): Observable<Integration | null> {
    this.stateService.setLoading('save', true);
    
    const requestBody = {
      provider: provider,
      config: config
    };
    
    return this.http.post<{ success: boolean; data?: Integration; configId?: string; message?: string; metadata?: any }>(this.apiUrl, requestBody, {
      headers: this.getApiHeaders()
    }).pipe(
      map(response => response.data || null),
      tap(createdIntegration => {
        // Si el backend no devuelve la integración completa (solo configId), forzar refetch
        if (createdIntegration) {
          this.stateService.addIntegration(createdIntegration);
          this.cacheService.cacheIntegration(createdIntegration);
        } else {
          // Refrescar lista completa
          this.invalidateAllCache();
          this.getIntegrations().subscribe();
        }
        this.stateService.setError('save', null);
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

  updateIntegration(provider: string, config: any): Observable<Integration | null> {
    this.stateService.setLoading('save', true);
    
    const requestBody = {
      provider: provider,
      config: config
    };
    
    return this.http.put<{ success: boolean; data?: Integration; configId?: string; message?: string; metadata?: any }>(`${this.apiUrl}/${provider}`, requestBody, {
      headers: this.getApiHeaders()
    }).pipe(
      map(response => response.data || null),
      tap(updatedIntegration => {
        if (updatedIntegration) {
          this.stateService.updateIntegration(updatedIntegration);
          this.cacheService.cacheIntegration(updatedIntegration);
        } else {
          // Sin datos: invalidar caches y refetch lista
          this.cacheService.invalidateIntegration(provider);
          this.invalidateAllCache();
          this.getIntegrations().subscribe();
        }
        this.stateService.setError('save', null);
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

  deleteIntegration(provider: string): Observable<any> {
    this.stateService.setLoading('delete', true);
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${provider}`, {
      headers: this.getApiHeaders()
    }).pipe(
      tap(() => {
        this.stateService.removeIntegration(provider);
        this.stateService.setError('delete', null);
        // Invalidar cache
        this.cacheService.invalidateIntegration(provider);
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

  testIntegration(provider: string, config: any): Observable<{success: boolean, message: string}> {
    this.stateService.setLoading('test', true);
    
    const requestBody = {
      provider: provider,
      config: config
    };
    
    return this.http.post<{success: boolean, message: string}>(`${this.apiUrl}/test`, requestBody, {
      headers: this.getApiHeaders()
    }).pipe(
      tap(result => {
        this.stateService.setError('test', null);
        // Cachear resultado de test por un tiempo corto
        this.cacheService.set(`test:${provider}`, result, 2 * 60 * 1000); // 2 minutos
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
    this.cacheService.invalidatePattern(/^integrations:/);
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  // ===== NUEVOS MÉTODOS API V2 =====

  /**
   * Validar configuración sin guardar
   */
  validateConfig(provider: string, config: any): Observable<ValidationResponse> {
    const requestBody = {
      provider: provider,
      config: config
    };
    
    return this.http.post<ValidationResponse>(
      `${this.apiUrl}/validate`, 
      requestBody,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener esquema de configuración para un proveedor
   */
  getConfigSchema(provider: string): Observable<ConfigSchema> {
    return this.cacheService.get(
      `schema:${provider}`,
      () => this.http.get<{ success: boolean; data: ConfigSchema }>(`${this.apiUrl}/schema/${provider}`, {
        headers: this.getApiHeaders()
      }).pipe(
        map(response => response.data)
      ),
      30 * 60 * 1000 // 30 minutos TTL para esquemas
    );
  }

  /**
   * Crear integración usando nueva API V2
   */
  createIntegrationV2(provider: string, config: any): Observable<IntegrationV2> {
    this.stateService.setLoading('save', true);
    
    const requestBody = {
      provider: provider,
      config: config
    };
    
    return this.http.post<{ success: boolean; data: IntegrationV2; metadata?: any }>(this.apiUrl, requestBody, {
      headers: this.getApiHeaders()
    }).pipe(
      map(response => response.data),
      tap(createdIntegration => {
        this.stateService.setError('save', null);
        this.cacheService.invalidatePattern(/^integrations:/);
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

  /**
   * Actualizar una integración existente usando la API V2.
   */
  updateIntegrationV2(provider: string, config: any): Observable<IntegrationV2> {
    this.stateService.setLoading('save', true);

    const requestBody = {
      provider: provider,
      config: config
    };

    return this.http.put<{ success: boolean; data: IntegrationV2; metadata?: any }>(`${this.apiUrl}/${provider}`, requestBody, {
      headers: this.getApiHeaders()
    }).pipe(
      map(response => response.data),
      tap(updatedIntegration => {
        this.stateService.setError('save', null);
        // Invalidar cache de esta integración y de las listas relacionadas
        this.cacheService.invalidateIntegration(provider);
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

  /**
   * Convertir del modelo legacy al esquema V2 utilizado por la nueva API.
   */
  convertToV2(integration: Integration): IntegrationV2 {
    return {
      provider: integration.provider || integration.type,
      config: integration.config || integration.credentials,
      enabled: integration.enabled,
      metadata: integration.metadata
    };
  }

  /**
   * Convierte un registro de la API V2 (o el objeto raw devuelto por /configs) al modelo legacy
   * utilizado actualmente por el resto de la aplicación.
   */
  convertFromV2(integrationV2: any, category?: IntegrationCategory): Integration {
    const provider = integrationV2.provider || integrationV2.type;

    // Determinar categoría si no viene definida externamente
    const resolvedCategory = category || this.getCategoryForProvider(provider);

    // Derivar bandera enabled desde múltiples posibles campos
    const enabled = typeof integrationV2.enabled === 'boolean'
      ? integrationV2.enabled
      : (integrationV2.status ? integrationV2.status.toString().toLowerCase() === 'active' : true);

    // Clonar el objeto para no modificar el original.
    const credentials = { ...integrationV2 };

    // Lista de claves estándar que no son parte de las credenciales.
    const standardKeys = [
      'id', 'type', 'provider', 'name', 'enabled', 'status', 'category', 
      'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'metadata', 
      'config', 'credentials', 'companyId', 'version', 'company', 'companyID'
    ];
    
    // Eliminar las claves estándar para dejar solo las credenciales.
    for (const key of standardKeys) {
        delete credentials[key];
    }

    // Fusionar campos anidados de config/credentials si existen
    if (integrationV2.credentials && typeof integrationV2.credentials === 'object') {
        Object.assign(credentials, integrationV2.credentials);
    }
    if (integrationV2.config && typeof integrationV2.config === 'object') {
        Object.assign(credentials, integrationV2.config);
    }

    return {
      id: integrationV2.id || provider, 
      type: provider,
      provider: provider,
      name: integrationV2.name || provider,
      enabled: enabled,
      category: resolvedCategory,
      credentials: credentials,
      config: credentials,
      createdAt: integrationV2.createdAt,
      updatedAt: integrationV2.updatedAt,
      metadata: integrationV2.metadata
    };
  }

  /**
   * Mapeo rápido de proveedor ➜ categoría para soportar la conversión V2.
   */
  private getCategoryForProvider(provider: string): IntegrationCategory {
    switch (provider) {
      case 'shopify':
      case 'woocommerce':
      case 'magento':
      case 'prestashop':
        return IntegrationCategory.ECOMMERCE;
      case 'wompi':
      case 'epayco':
      case 'paypal':
      case 'stripe':
      case 'payu':
      case 'mercadopago':
        return IntegrationCategory.PAYMENT;
      case 'fedex':
      case 'dhl':
      case 'servientrega':
      case 'coordinadora':
      case 'enviame':
      case 'partners_logistics':
        return IntegrationCategory.LOGISTICS;
      case 'mailchimp':
      case 'hubspot':
      case 'google_analytics':
        return IntegrationCategory.MARKETING;
      case 'salesforce':
      case 'zoho_crm':
        return IntegrationCategory.CRM;
      case 'quickbooks':
      case 'siigo':
        return IntegrationCategory.ACCOUNTING;
      default:
        return IntegrationCategory.OTHER;
    }
  }

  /**
   * Health check del servicio de integraciones
   */
  getHealthCheck(): Observable<{ status: string; services: any; timestamp: string }> {
    return this.http.get<{ status: string; services: any; timestamp: string }>(
      `${this.apiUrl}/health`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener estadísticas de seguridad de webhooks
   */
  getWebhookSecurityStats(): Observable<any> {
    return this.http.get<{ success: boolean; data: any }>(
      `${environment.urlApi}/v1/integration/webhook-security-stats`,
      { headers: this.getApiHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtener métricas de salud del sistema
   */
  getMetricsHealth(): Observable<any> {
    return this.http.get<{ status: string; metrics: any }>(
      `${environment.urlApi}/v1/metrics/health`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Actualizar company ID (útil para cambio de contexto)
   */
  setCompanyId(companyId: string): void {
    this.currentCompanyId = companyId;
    localStorage.setItem('currentCompanyId', companyId);
    // Invalidar cache al cambiar de empresa
    this.invalidateAllCache();
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
        },
        { 
          id: 'enviame', 
          name: 'Enviame.io',
          description: 'Plataforma de envíos y logística para e-commerce en Latinoamérica. Requiere API Key, ID Seller y configuración de bodegas.',
          logo: 'assets/images/logos/enviame.svg' 
        },
        { 
          id: 'partners_logistics', 
          name: 'Partners Logística',
          description: 'Integración personalizada con partners de logística y envíos',
          logo: 'assets/images/logos/partners-logistics.svg' 
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
