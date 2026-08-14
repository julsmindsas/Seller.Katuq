import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { environment } from "../../../environments/environment";
import { IntegrationStateService } from "./integration-state.service";
import { IntegrationCacheService } from "./integration-cache.service";
import { tap, map, catchError, finalize } from "rxjs/operators";

// ===== INTERFACES V2 SEGÚN DOCUMENTACIÓN BACKEND =====

export interface IntegrationV2 {
  provider: string; // Nuevo: reemplaza 'type'
  config: any; // Nuevo: configuración validada por esquema
  enabled?: boolean; // Opcional: manejado por el backend
  metadata?: {
    // Nuevo: metadatos del backend
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
  // Indica si la integración requiere modal de cotización antes de despacho
  isModalRate?: boolean;
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
  type: "string" | "number" | "boolean" | "object" | "array";
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
  ECOMMERCE = "ecommerce",
  PAYMENT = "payment",
  LOGISTICS = "logistics",
  MARKETING = "marketing",
  CRM = "crm",
  ACCOUNTING = "accounting",
  OTHER = "other",
}

// Categorías para mostrar en la interfaz de usuario
export const CATEGORY_LABELS = {
  [IntegrationCategory.ECOMMERCE]: "Plataformas de E-commerce",
  [IntegrationCategory.PAYMENT]: "Pasarelas de Pago",
  [IntegrationCategory.LOGISTICS]: "Logística y Envíos",
  [IntegrationCategory.MARKETING]: "Marketing y Publicidad",
  [IntegrationCategory.CRM]: "CRM y Clientes",
  [IntegrationCategory.ACCOUNTING]: "Contabilidad y Facturación",
  [IntegrationCategory.OTHER]: "Otras Integraciones",
};

@Injectable({
  providedIn: "root",
})
export class IntegrationsService {
  // Nueva URL base según API V2
  private apiUrl = `${environment.urlApi}/v1/integration/config`;

  constructor(
    private http: HttpClient,
    private stateService: IntegrationStateService,
    private cacheService: IntegrationCacheService,
  ) {
    // Company ID now fetched dynamically on each request
  }

  /**
   * Obtiene el ID de la empresa actual del contexto o localStorage
   * Se llama dinámicamente en cada request para obtener el company ID actual
   */
  private getCurrentCompanyId(): string {
    // Primero verificar si existe currentCompanyId directamente
    const directCompanyId = localStorage.getItem("currentCompanyId");
    if (directCompanyId) {
      console.log('🆔 [getCurrentCompanyId] Using direct ID:', directCompanyId);
      return directCompanyId;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.company) return String(user.company);
      } catch (_) { /* se intenta con currentCompany */ }
    }

    // Si no existe, extraerlo del objeto currentCompany
    const currentCompany = localStorage.getItem("currentCompany");
    if (currentCompany) {
      try {
        const company = JSON.parse(currentCompany);
        // Intentar diferentes campos que pueden contener el ID de la empresa
        const id = company.cd ||
                   company.id ||
                   company.companyId ||
                   company.nomComercial ||
                   company.nombreComercio ||
                   company.razonSocial ||
                   company.nombre;
        if (!id) throw new Error('La empresa activa no tiene identificador.');
        console.log('🆔 [getCurrentCompanyId] Extracted from company object:', id);
        return id;
      } catch (error) {
        console.error("Error parsing currentCompany from localStorage:", error);
      }
    }

    throw new Error('No hay una empresa activa para configurar integraciones.');
  }

  /**
   * Genera headers requeridos por la API V2
   * Company ID se obtiene dinámicamente en cada llamada
   */
  private getApiHeaders(): { [key: string]: string } {
    return {
      "Content-Type": "application/json",
      company: this.getCurrentCompanyId(),  // ✅ Dynamic company ID
    };
  }

  getIntegrations(): Observable<Integration[]> {
    this.stateService.setLoading("list", true);
    const companyId = this.getCurrentCompanyId(); // Cache key por empresa (aislamiento multi-tenant)

    const fetchIntegrations$ = this.http
      .get<{
        success: boolean;
        data?: Integration[];
        configs?: any[];
        metadata?: any;
      }>(this.apiUrl, {
        headers: this.getApiHeaders(),
      })
      .pipe(
        map((response) => {
          // V2 FIRST: Priorizar el nuevo formato de respuesta si contiene datos.
          if (response.configs && response.configs.length > 0) {
            // Convertir cada registro V2 al formato legacy que usa la UI actual
            return (response.configs || []).map((cfg) =>
              this.convertFromV2(cfg),
            );
          }

          // V1 FALLBACK: Usar el formato antiguo solo si `configs` no está presente o está vacío.
          if (response.data) {
            // Asegurar que cada integración tenga categoría. Si el backend legacy no la envía, la inferimos.
            return (response.data || []).map((intg: any) => {
              if (intg && !intg.category) {
                const provider = intg.provider || intg.type;
                return {
                  ...intg,
                  category: this.getCategoryForProvider(provider),
                };
              }
              return intg;
            });
          }

          // Si la respuesta no tiene ni `configs` ni `data` válidos, devolver un array vacío.
          return [];
        }),
      );

    const integrationsFromCacheOrApi$ = this.cacheService.get(
      `integrations:all:${companyId}`,
      () => fetchIntegrations$,
      5 * 60 * 1000, // 5 minutos TTL
    );

    return integrationsFromCacheOrApi$.pipe(
      tap((integrations) => {
        this.stateService.setIntegrations(integrations);
        this.stateService.setError("list", null);
      }),
      catchError((error) => {
        console.error(
          "Error al cargar integraciones (desde getIntegrations):",
          error,
        );
        this.stateService.setError(
          "list",
          error.message || "Error al cargar integraciones",
        );
        this.stateService.setIntegrations([]);
        return of([]);
      }),
      finalize(() => {
        this.stateService.setLoading("list", false);
      }),
    );
  }

  getIntegration(provider: string): Observable<Integration> {
    const companyId = this.getCurrentCompanyId();
    console.log(`🔍 [IntegrationsService] Fetching ${provider} for company: ${companyId}`);

    return this.cacheService.get(
      `integration:${provider}:${companyId}`,  // ✅ Cache key includes company
      () =>
        this.http
          .get<{ success: boolean; config: any; metadata?: any }>(
            `${this.apiUrl}/${provider}`,
            {
              headers: this.getApiHeaders(),
            },
          )
          .pipe(
            map((response) => {
              // Mapear respuesta del backend a estructura frontend
              const backendConfig = response.config;
              return {
                id: backendConfig.id,
                provider: backendConfig.provider,
                type: backendConfig.provider,  // Legacy compatibility
                name: backendConfig.provider,
                enabled: backendConfig.status === 'active',  // ✅ Mapear status a enabled
                config: backendConfig.config,  // Contiene publicKey, etc.
                createdAt: backendConfig.createdAt,
                updatedAt: backendConfig.updatedAt,
                category: 'payment' as IntegrationCategory,  // Asumir payment por defecto
                credentials: backendConfig.config  // Legacy compatibility
              } as Integration;
            }),
            tap((integration) => {
              console.log(`✅ [IntegrationsService] ${provider} fetched successfully for ${companyId}`);
              console.log(`   - Enabled: ${integration.enabled}`);
              console.log(`   - Has config: ${!!integration.config}`);
              console.log(`   - Has publicKey: ${!!integration.config?.publicKey}`);
            })
          ),
      10 * 60 * 1000, // 10 minutos TTL para integraciones individuales
    );
  }

  createIntegration(
    provider: string,
    config: any,
  ): Observable<Integration | null> {
    this.stateService.setLoading("save", true);

    const requestBody = {
      provider: provider,
      config: config,
    };

    return this.http
      .post<{
        success: boolean;
        data?: Integration;
        configId?: string;
        message?: string;
        metadata?: any;
      }>(this.apiUrl, requestBody, {
        headers: this.getApiHeaders(),
      })
      .pipe(
        map((response) => response.data || null),
        tap((createdIntegration) => {
          // Si el backend no devuelve la integración completa (solo configId), forzar refetch
          if (createdIntegration) {
            this.stateService.addIntegration(createdIntegration);
            this.cacheService.cacheIntegration(createdIntegration);
          } else {
            // Refrescar lista completa
            this.invalidateAllCache();
            this.getIntegrations().subscribe();
          }
          this.stateService.setError("save", null);
        }),
        catchError((error) => {
          this.stateService.setError(
            "save",
            error.message || "Error al crear integración",
          );
          throw error;
        }),
        finalize(() => {
          this.stateService.setLoading("save", false);
        }),
      );
  }

  updateIntegration(
    provider: string,
    config: any,
  ): Observable<Integration | null> {
    this.stateService.setLoading("save", true);

    const requestBody = {
      provider: provider,
      config: config,
    };

    return this.http
      .put<{
        success: boolean;
        data?: Integration;
        configId?: string;
        message?: string;
        metadata?: any;
      }>(`${this.apiUrl}/${provider}`, requestBody, {
        headers: this.getApiHeaders(),
      })
      .pipe(
        map((response) => response.data || null),
        tap((updatedIntegration) => {
          if (updatedIntegration) {
            this.stateService.updateIntegration(updatedIntegration);
            this.cacheService.cacheIntegration(updatedIntegration);
          } else {
            // Sin datos: invalidar caches y refetch lista
            this.cacheService.invalidateIntegration(provider);
            this.invalidateAllCache();
            this.getIntegrations().subscribe();
          }
          this.stateService.setError("save", null);
        }),
        catchError((error) => {
          this.stateService.setError(
            "save",
            error.message || "Error al actualizar integración",
          );
          throw error;
        }),
        finalize(() => {
          this.stateService.setLoading("save", false);
        }),
      );
  }

  deleteIntegration(provider: string): Observable<any> {
    this.stateService.setLoading("delete", true);
    return this.http
      .delete<{ success: boolean; message?: string }>(
        `${this.apiUrl}/${provider}`,
        {
          headers: this.getApiHeaders(),
        },
      )
      .pipe(
        tap(() => {
          this.stateService.removeIntegration(provider);
          this.stateService.setError("delete", null);
          // Invalidar cache
          this.cacheService.invalidateIntegration(provider);
        }),
        catchError((error) => {
          this.stateService.setError(
            "delete",
            error.message || "Error al eliminar integración",
          );
          throw error;
        }),
        finalize(() => {
          this.stateService.setLoading("delete", false);
        }),
      );
  }

  testIntegration(
    provider: string,
    config: any,
  ): Observable<{ success: boolean; message: string }> {
    this.stateService.setLoading("test", true);

    const requestBody = {
      provider: provider,
      config: config,
    };

    return this.http
      .post<{ success: boolean; message: string }>(
        `${this.apiUrl}/test`,
        requestBody,
        {
          headers: this.getApiHeaders(),
        },
      )
      .pipe(
        tap((result) => {
          this.stateService.setError("test", null);
          // Cachear resultado de test por un tiempo corto
          this.cacheService.set(`test:${provider}`, result, 2 * 60 * 1000); // 2 minutos
        }),
        catchError((error) => {
          this.stateService.setError(
            "test",
            error.message || "Error al probar integración",
          );
          throw error;
        }),
        finalize(() => {
          this.stateService.setLoading("test", false);
        }),
      );
  }

  // Métodos adicionales para optimización de performance

  /**
   * Obtener integraciones por categoría con cache
   */
  /**
   * Proveedores de categoría LOGISTICS que AÚN no tienen estrategia de despacho
   * en el backend (logisticsManager): ofrecerlos como transportadora termina en
   * "proveedor no soportado". Fullpi entra aquí hasta que exista su proveedor
   * de despacho por-pedido (revisión D-156, hallazgo A / Fase 2 del roadmap WMS).
   * Las 4 pantallas de despachos consumen este método, así que este es el único
   * punto de filtro.
   */
  // Vacío desde 2026-08-11: la estrategia de despacho de Fullpi ya existe en
  // el backend (fullpiProvider → pushSingleOrder), así que la puerta dejó de
  // ser pintada. El filtro queda como mecanismo por si otra integración
  // logística futura llega sin estrategia.
  private static readonly LOGISTICS_SIN_DESPACHO: string[] = [];

  getIntegrationsByCategory(
    category: IntegrationCategory,
  ): Observable<Integration[]> {
    const companyId = this.getCurrentCompanyId();
    return this.cacheService.get(
      `integrations:category:${category}:${companyId}`,
      () =>
        this.getIntegrations().pipe(
          map((integrations) =>
            (integrations || []).filter(
              (i) =>
                i.category === category &&
                !(
                  category === IntegrationCategory.LOGISTICS &&
                  IntegrationsService.LOGISTICS_SIN_DESPACHO.includes(i.provider)
                ),
            ),
          ),
        ),
      3 * 60 * 1000, // 3 minutos TTL
    );
  }

  /**
   * Obtener solo integraciones activas
   */
  getActiveIntegrations(): Observable<Integration[]> {
    const companyId = this.getCurrentCompanyId();
    return this.cacheService.get(
      `integrations:active:${companyId}`,
      () =>
        this.getIntegrations().pipe(
          map((integrations) => (integrations || []).filter((i) => i.enabled)),
        ),
      2 * 60 * 1000, // 2 minutos TTL para datos más dinámicos
    );
  }

  /**
   * Buscar integraciones con cache
   */
  searchIntegrations(query: string): Observable<Integration[]> {
    const companyId = this.getCurrentCompanyId();
    const cacheKey = `integrations:search:${query.toLowerCase()}:${companyId}`;
    return this.cacheService.get(
      cacheKey,
      () =>
        this.getIntegrations().pipe(
          map((integrations) =>
            (integrations || []).filter(
              (i) =>
                i.name.toLowerCase().includes(query.toLowerCase()) ||
                i.type.toLowerCase().includes(query.toLowerCase()),
            ),
          ),
        ),
      1 * 60 * 1000, // 1 minuto TTL para búsquedas
    );
  }

  /**
   * Prefetch de datos comunes
   */
  prefetchCommonData(): void {
    // Prefetch integraciones activas
    this.getActiveIntegrations().subscribe();

    // Prefetch por categorías principales
    [IntegrationCategory.PAYMENT, IntegrationCategory.ECOMMERCE].forEach(
      (category) => {
        this.getIntegrationsByCategory(category).subscribe();
      },
    );
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
  validateConfig(
    provider: string,
    config: any,
  ): Observable<ValidationResponse> {
    const requestBody = {
      provider: provider,
      config: config,
    };

    return this.http.post<ValidationResponse>(
      `${this.apiUrl}/validate`,
      requestBody,
      { headers: this.getApiHeaders() },
    );
  }

  /**
   * Obtener esquema de configuración para un proveedor
   */
  getConfigSchema(provider: string): Observable<ConfigSchema> {
    return this.cacheService.get(
      `schema:${provider}`,
      () =>
        this.http
          .get<{ success: boolean; data: ConfigSchema }>(
            `${this.apiUrl}/schema/${provider}`,
            {
              headers: this.getApiHeaders(),
            },
          )
          .pipe(map((response) => response.data)),
      30 * 60 * 1000, // 30 minutos TTL para esquemas
    );
  }

  /**
   * Crear integración usando nueva API V2
   */
  createIntegrationV2(
    provider: string,
    config: any,
  ): Observable<IntegrationV2> {
    this.stateService.setLoading("save", true);

    const requestBody = {
      provider: provider,
      config: config,
    };

    return this.http
      .post<{ success: boolean; data: IntegrationV2; metadata?: any }>(
        this.apiUrl,
        requestBody,
        {
          headers: this.getApiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap((createdIntegration) => {
          this.stateService.setError("save", null);
          this.cacheService.invalidatePattern(/^integrations:/);
        }),
        catchError((error) => {
          this.stateService.setError(
            "save",
            error.message || "Error al crear integración",
          );
          throw error;
        }),
        finalize(() => {
          this.stateService.setLoading("save", false);
        }),
      );
  }

  /**
   * Actualizar una integración existente usando la API V2.
   */
  updateIntegrationV2(
    provider: string,
    config: any,
  ): Observable<IntegrationV2> {
    this.stateService.setLoading("save", true);

    const requestBody = {
      provider: provider,
      config: config,
    };

    return this.http
      .put<{ success: boolean; data: IntegrationV2; metadata?: any }>(
        `${this.apiUrl}/${provider}`,
        requestBody,
        {
          headers: this.getApiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap((updatedIntegration) => {
          this.stateService.setError("save", null);
          // Invalidar cache de esta integración y de las listas relacionadas
          this.cacheService.invalidateIntegration(provider);
        }),
        catchError((error) => {
          this.stateService.setError(
            "save",
            error.message || "Error al actualizar integración",
          );
          throw error;
        }),
        finalize(() => {
          this.stateService.setLoading("save", false);
        }),
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
      metadata: integration.metadata,
    };
  }

  /**
   * Convierte un registro de la API V2 (o el objeto raw devuelto por /configs) al modelo legacy
   * utilizado actualmente por el resto de la aplicación.
   */
  convertFromV2(
    integrationV2: any,
    category?: IntegrationCategory,
  ): Integration {
    const provider = integrationV2.provider || integrationV2.type;

    // Determinar categoría si no viene definida externamente
    const resolvedCategory = category || this.getCategoryForProvider(provider);

    // Derivar bandera enabled desde múltiples posibles campos
    const enabled =
      typeof integrationV2.enabled === "boolean"
        ? integrationV2.enabled
        : integrationV2.status
          ? integrationV2.status.toString().toLowerCase() === "active"
          : true;

    // Clonar el objeto para no modificar el original.
    const credentials = { ...integrationV2 };

    // Lista de claves estándar que no son parte de las credenciales.
    const standardKeys = [
      "id",
      "type",
      "provider",
      "name",
      "enabled",
      "status",
      "category",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "metadata",
      "config",
      "credentials",
      "companyId",
      "version",
      "company",
      "companyID",
    ];

    // Eliminar las claves estándar para dejar solo las credenciales.
    for (const key of standardKeys) {
      delete credentials[key];
    }

    // Fusionar campos anidados de config/credentials si existen
    if (
      integrationV2.credentials &&
      typeof integrationV2.credentials === "object"
    ) {
      Object.assign(credentials, integrationV2.credentials);
    }
    if (integrationV2.config && typeof integrationV2.config === "object") {
      Object.assign(credentials, integrationV2.config);
    }

    return {
      id: integrationV2.id || provider,
      type: provider,
      provider: provider,
      // Si el backend no manda name, fallback a un display name canónico antes
      // del provider raw. Asi en /despachos aparece "Guía Cereza" en vez de
      // "osmosis", "Siigo" en vez de "siigo", etc.
      name: integrationV2.name || this.getDisplayNameForProvider(provider) || provider,
      enabled: enabled,
      category: resolvedCategory,
      credentials: credentials,
      config: credentials,
      createdAt: integrationV2.createdAt,
      updatedAt: integrationV2.updatedAt,
      metadata: integrationV2.metadata,
    };
  }

  /**
   * Display name canónico de cada provider para mostrar al usuario cuando el
   * backend no manda `name` poblado. Mantiene consistencia con el catálogo
   * `availableIntegrations` y con los labels de proveedores logísticos.
   */
  private getDisplayNameForProvider(provider: string): string | null {
    const map: Record<string, string> = {
      osmosis:           'Guía Cereza',
      fullpi:            'Fullpi',
      prindel:           'Prindel',
      enviame:           'Envíame.io',
      partners_logistics:'Partners Logística',
      aliaddo_fulfillment:'Aliaddo Fulfillment',
      fedex:             'FedEx',
      dhl:               'DHL',
      servientrega:      'Servientrega',
      coordinadora:      'Coordinadora',
      shopify:           'Shopify',
      woocommerce:       'WooCommerce',
      magento:           'Magento',
      dian:              'DIAN directo',
      siigo:             'Siigo',
      world_office:      'World Office',
      quickbooks:        'QuickBooks',
      wompi:             'Wompi',
      epayco:            'ePayco',
      paypal:            'PayPal',
      stripe:            'Stripe',
      payu:              'PayU',
      mercadopago:       'Mercado Pago',
      multiop:           'MultiOP',
    };
    return map[provider] || null;
  }

  /**
   * Mapeo rápido de proveedor ➜ categoría para soportar la conversión V2.
   */
  private getCategoryForProvider(provider: string): IntegrationCategory {
    switch (provider) {
      case "shopify":
      case "woocommerce":
      case "magento":
      case "prestashop":
        return IntegrationCategory.ECOMMERCE;
      case "wompi":
      case "epayco":
      case "paypal":
      case "stripe":
      case "payu":
      case "mercadopago":
        return IntegrationCategory.PAYMENT;
      case "fedex":
      case "dhl":
      case "servientrega":
      case "coordinadora":
      case "enviame":
      case "partners_logistics":
      case "prindel":
      case "osmosis": // Cereza/Guía Cereza opera como proveedor logístico (despacha desde sus bodegas)
      case "fullpi": // WMS Fullpi (spec 017): despacha pedidos desde su bodega y reporta stock
        return IntegrationCategory.LOGISTICS;
      case "mailchimp":
      case "hubspot":
      case "google_analytics":
        return IntegrationCategory.MARKETING;
      case "salesforce":
      case "zoho_crm":
        return IntegrationCategory.CRM;
      case "quickbooks":
      case "dian":
      case "siigo":
      case "world_office":
        return IntegrationCategory.ACCOUNTING;
      case "multiop":
        return IntegrationCategory.OTHER;
      default:
        return IntegrationCategory.OTHER;
    }
  }

  /**
   * Health check del servicio de integraciones
   */
  getHealthCheck(): Observable<{
    status: string;
    services: any;
    timestamp: string;
  }> {
    return this.http.get<{ status: string; services: any; timestamp: string }>(
      `${this.apiUrl}/health`,
      { headers: this.getApiHeaders() },
    );
  }

  /**
   * Obtener estadísticas de seguridad de webhooks
   */
  getWebhookSecurityStats(): Observable<any> {
    return this.http
      .get<{
        success: boolean;
        data: any;
      }>(`${environment.urlApi}/v1/integration/webhook-security-stats`, {
        headers: this.getApiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  /**
   * Obtener métricas de salud del sistema
   */
  getMetricsHealth(): Observable<any> {
    return this.http.get<{ status: string; metrics: any }>(
      `${environment.urlApi}/v1/metrics/health`,
      { headers: this.getApiHeaders() },
    );
  }

  /**
   * Actualizar company ID (útil para cambio de contexto)
   * Company ID se lee dinámicamente de localStorage, no se cachea
   */
  setCompanyId(companyId: string): void {
    localStorage.setItem("currentCompanyId", companyId);
    // Invalidar cache al cambiar de empresa
    this.invalidateAllCache();
  }

  // ===== MÉTODOS ESPECÍFICOS PARA SIIGO =====

  /**
   * Probar conexión con Siigo sin guardar configuración
   */
  testSiigoConnection(config: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.urlApi}/v1/accounting/siigo/test`,
      config,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Cargar configuración de Siigo
   */
  loadSiigoConfig(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/integration/config/siigo`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Guardar configuración de Siigo
   */
  saveSiigoConfig(config: any): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/integration/config`,
      {
        provider: 'siigo',
        config: config,
        companyId: this.getCurrentCompanyId()
      },
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Sincronizar productos con Siigo
   */
  syncSiigoProducts(options: any): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/siigo/products/sync`,
      options,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener centros de costo de Siigo
   */
  getSiigoCostCenters(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/cost-centers`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener tipos de documento de Siigo
   */
  getSiigoDocumentTypes(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/document-types`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener tipos de pago de Siigo
   */
  getSiigoPaymentTypes(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/payment-types`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener impuestos de Siigo
   */
  getSiigoTaxes(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/taxes`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener listas de precios de Siigo
   */
  getSiigoPriceLists(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/price-lists`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener grupos de cuentas de Siigo
   */
  getSiigoAccountGroups(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/account-groups`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener bodegas de Siigo
   */
  getSiigoWarehouses(): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/warehouses`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Crear producto en Siigo
   */
  createSiigoProduct(productData: any): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/siigo/products`,
      productData,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Actualizar producto en Siigo
   */
  updateSiigoProduct(productId: string, productData: any): Observable<any> {
    return this.http.put<any>(
      `${environment.urlApi}/v1/accounting/siigo/products/${productId}`,
      productData,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Crear factura en Siigo (método legacy - requiere datos de factura completos)
   */
  createSiigoInvoice(invoiceData: any): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/siigo/invoices`,
      invoiceData,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Crear factura en Siigo desde un pedido de Katuq
   * Este método maneja el flujo completo:
   * 1. Obtiene el pedido completo de Firestore
   * 2. Verifica/crea el cliente en Siigo automáticamente
   * 3. Transforma el pedido al formato de factura de Siigo
   * 4. Crea la factura en Siigo
   * 5. Actualiza el pedido con la información de facturación
   *
   * @param orderId ID del pedido en Firestore
   * @param options Opciones adicionales (documentTypeId, paymentTypeId, etc.)
   */
  createSiigoInvoiceFromOrder(orderId: string, options?: {
    documentTypeId?: number;
    paymentTypeId?: number;
    costCenterId?: number;
    sellerId?: number;
  }): Observable<any> {
    const body: any = { orderId };

    if (options?.documentTypeId) body.documentTypeId = options.documentTypeId;
    if (options?.paymentTypeId) body.paymentTypeId = options.paymentTypeId;
    if (options?.costCenterId) body.costCenterId = options.costCenterId;
    if (options?.sellerId) body.sellerId = options.sellerId;

    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/siigo/invoices/from-order`,
      body,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Crear factura desde un pedido usando cualquier proveedor contable.
   * Endpoint genérico: POST /v1/accounting/:provider/invoices/from-order
   */
  createAccountingInvoiceFromOrder(provider: string, orderId: string, options?: any): Observable<any> {
    const body: any = { orderId };
    if (options?.documentTypeId) body.documentTypeId = options.documentTypeId;
    if (options?.paymentTypeId) body.paymentTypeId = options.paymentTypeId;
    if (options?.dueDate) body.dueDate = options.dueDate; // D-042: vencimiento de crédito (yyyy-MM-dd)

    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/${provider}/invoices/from-order`,
      body,
      { headers: this.getApiHeaders() }
    );
  }

  /** Ejecuta el set oficial DIAN (8 facturas, 1 NC y 1 ND). */
  submitDianHabilitationSet(orderIds: string[]): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/dian/habilitation/test-set`,
      { orderIds },
      { headers: this.getApiHeaders() }
    );
  }

  getDianHabilitationStatus(zipKey: string): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/dian/habilitation/status/${encodeURIComponent(zipKey)}`,
      { headers: this.getApiHeaders() }
    );
  }

  createDianNote(noteType: 'credit' | 'debit', payload: {
    orderId: string;
    reference: { number: string; cufe: string; issueDate: string };
    correction: { code: string; description: string };
    adjustment?: { description: string; baseAmount: number; taxRate: number };
  }): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/dian/notes/${noteType}`,
      payload,
      { headers: this.getApiHeaders() }
    );
  }

  getDianDocumentStatus(trackId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/dian/documents/${encodeURIComponent(trackId)}/status`,
      { headers: this.getApiHeaders() }
    );
  }

  downloadDianArtifact(documentNumber: string, kind: 'xml' | 'pdf' | 'applicationResponse' | 'attachedDocument'): Observable<Blob> {
    return this.http.get(
      `${environment.urlApi}/v1/accounting/dian/documents/${encodeURIComponent(documentNumber)}/artifacts/${kind}`,
      { headers: this.getApiHeaders(), responseType: 'blob' }
    );
  }

  listDianDocuments(status?: string, limit = 50): Observable<any> {
    let params = `limit=${limit}`;
    if (status) params += `&status=${encodeURIComponent(status)}`;
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/dian/invoices?${params}`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Crear factura async (fire-and-forget) para cualquier proveedor.
   * Retorna 202 inmediato con jobId. El backend procesa en background.
   */
  createAccountingInvoiceAsync(provider: string, orderId: string, options?: any): Observable<any> {
    const body: any = { orderId };
    if (options?.documentTypeId) body.documentTypeId = options.documentTypeId;
    if (options?.paymentTypeId) body.paymentTypeId = options.paymentTypeId;
    if (options?.prefijoId) body.prefijoId = options.prefijoId;
    if (options?.dueDate) body.dueDate = options.dueDate; // D-042: vencimiento de crédito (yyyy-MM-dd)

    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/${provider}/invoices/from-order-async`,
      body,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Resolver prefijos de facturación por texto.
   * Envía textos del rol (ej: ["FE", "POS"]) y retorna los prefijos del proveedor que matchean + default.
   */
  resolvePrefixes(provider: string, prefixFilters: string[]): Observable<any> {
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/${provider}/resolve-prefixes`,
      { prefixFilters },
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtiene formas de pago disponibles en el proveedor contable.
   * Para World Office: GET /v1/accounting/world_office/payment-types
   */
  getAccountingPaymentTypes(provider: string): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/${provider}/payment-types`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtiene tipos de documento disponibles en el proveedor contable.
   * Para World Office: GET /v1/accounting/world_office/document-types
   */
  getAccountingDocumentTypes(provider: string): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/${provider}/document-types`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Carga todos los datos maestros de World Office en una sola llamada.
   * Si se pasan credentials (nueva integración aún no guardada), las usa directamente.
   * Sin credentials, el backend usa la config guardada en Firestore (modo edición).
   */
  getWOMasterData(credentials?: { apiToken?: string; apiUrl?: string }): Observable<any> {
    const body = credentials?.apiToken ? { credentials } : {};
    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/world_office/master-data`,
      body,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Encolar facturación Siigo en background (async)
   * Este método NO bloquea - retorna inmediatamente con un jobId.
   * El usuario recibe una notificación cuando la facturación termine.
   *
   * Flujo async:
   * 1. Encola el proceso de facturación
   * 2. Retorna inmediatamente con jobId (HTTP 202 Accepted)
   * 3. Worker procesa: cliente, productos, factura
   * 4. Notifica al usuario cuando termina
   *
   * @param orderId ID del pedido en Firestore
   * @param options Opciones adicionales (documentTypeId, paymentTypeId, etc.)
   * @returns Observable con { success, jobId, message }
   */
  createSiigoInvoiceFromOrderAsync(orderId: string, options?: {
    documentTypeId?: number;
    paymentTypeId?: number;
    costCenterId?: number;
    sellerId?: number;
    userEmail?: string;
  }): Observable<{
    success: boolean;
    jobId: string;
    orderId: string;
    provider: string;
    message: string;
    alreadyQueued?: boolean;
    timestamp: string;
  }> {
    const body: any = { orderId };

    if (options?.documentTypeId) body.documentTypeId = options.documentTypeId;
    if (options?.paymentTypeId) body.paymentTypeId = options.paymentTypeId;
    if (options?.costCenterId) body.costCenterId = options.costCenterId;
    if (options?.sellerId) body.sellerId = options.sellerId;
    if (options?.userEmail) body.userEmail = options.userEmail;

    return this.http.post<any>(
      `${environment.urlApi}/v1/accounting/siigo/invoices/from-order-async`,
      body,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener estado de un job de facturación async
   * @param jobId ID del job de facturación
   * @returns Observable con estado del job
   */
  getSiigoInvoiceJobStatus(jobId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/invoices/job/${jobId}`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener factura de Siigo
   */
  getSiigoInvoice(invoiceId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.urlApi}/v1/accounting/siigo/invoices/${invoiceId}`,
      { headers: this.getApiHeaders() }
    );
  }

  // ===== SHOPIFY DASHBOARD METHODS =====

  /**
   * Obtener estado de sincronización del dashboard Shopify
   */
  getShopifySyncStatus(): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.get<any>(
      `${environment.urlApi}/v1/shopify/dashboard/${companyId}`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener logs de sincronización Shopify con filtros y paginación
   */
  getShopifySyncLogs(filters: {
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    let params: any = {};
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    return this.http.get<any>(
      `${environment.urlApi}/v1/shopify/sync-logs/${companyId}`,
      { headers: this.getApiHeaders(), params }
    );
  }

  /**
   * Disparar sincronización manual de Shopify
   */
  triggerShopifySync(resource: string): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.post<any>(
      `${environment.urlApi}/v1/shopify/sync/trigger`,
      { companyId, resource },
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener webhooks registrados en Shopify
   */
  getShopifyWebhooks(): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.get<any>(
      `${environment.urlApi}/v1/shopify/webhooks/${companyId}`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Registrar todos los webhooks de Shopify
   */
  registerShopifyWebhooks(): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.post<any>(
      `${environment.urlApi}/v1/shopify/webhooks/register`,
      { companyId },
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Desregistrar un webhook específico de Shopify
   */
  unregisterShopifyWebhook(webhookId: string): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.delete<any>(
      `${environment.urlApi}/v1/shopify/webhooks/${companyId}/${webhookId}`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener mapeos de ubicaciones Shopify
   */
  getShopifyLocationMappings(): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.get<any>(
      `${environment.urlApi}/v1/shopify/locations/${companyId}`,
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Guardar mapeos de ubicaciones Shopify
   */
  saveShopifyLocationMapping(mappings: any[]): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.post<any>(
      `${environment.urlApi}/v1/shopify/locations/map`,
      { companyId, mappings },
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Auto-mapear ubicaciones Shopify con bodegas Katuq
   */
  autoMapShopifyLocations(): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.post<any>(
      `${environment.urlApi}/v1/shopify/locations/auto-map`,
      { companyId },
      { headers: this.getApiHeaders() }
    );
  }

  /**
   * Obtener mapeos de campos Shopify (variantes, estados)
   */
  getShopifyFieldMapping(): Observable<any> {
    const companyId = this.getCurrentCompanyId();
    return this.http.get<any>(
      `${environment.urlApi}/v1/shopify/field-mapping/${companyId}`,
      { headers: this.getApiHeaders() }
    );
  }

  // Método para obtener las integraciones disponibles por categoría
  getAvailableIntegrations(): {
    [category: string]: Array<{
      id: string;
      name: string;
      description: string;
      logo: string;
      active: boolean;
    }>;
  } {
    return {
      [IntegrationCategory.ECOMMERCE]: [
        {
          id: "shopify",
          name: "Shopify",
          description:
            "Plataforma de comercio electrónico para tiendas online y sistemas de punto de venta",
          logo: "assets/images/logos/shopify.svg",
          active: true,
        },
        {
          id: "woocommerce",
          name: "WooCommerce",
          description: "Plataforma de eCommerce para WordPress",
          logo: "assets/images/logos/woocommerce.svg",
          active: true,
        },
        {
          id: "magento",
          name: "Magento",
          description: "Plataforma de comercio electrónico de Adobe",
          logo: "assets/images/logos/magento.svg",
          active: false,
        },
        {
          id: "prestashop",
          name: "PrestaShop",
          description:
            "Sistema de gestión de contenido de código abierto para eCommerce",
          logo: "assets/images/logos/prestashop.svg",
          active: false,
        },
      ],
      [IntegrationCategory.PAYMENT]: [
        {
          id: "wompi",
          name: "Wompi",
          description:
            "Pasarela de pagos digital para Colombia y Latinoamérica",
          logo: "assets/images/logos/wompi.svg",
          active: true,
        },
        {
          id: "epayco",
          name: "ePayco",
          description:
            "Pasarela de pagos colombiana con múltiples medios de pago",
          logo: "assets/images/logos/epayco.svg",
          active: false,
        },
        {
          id: "paypal",
          name: "PayPal",
          description: "Sistema global de pagos en línea",
          logo: "assets/images/logos/paypal.svg",
          active: false,
        },
        {
          id: "stripe",
          name: "Stripe",
          description:
            "Plataforma de procesamiento de pagos para negocios en Internet",
          logo: "assets/images/logos/stripe.svg",
          active: false,
        },
        {
          id: "payu",
          name: "PayU",
          description:
            "Proveedor global de servicios de pago para comercio electrónico",
          logo: "assets/images/logos/payu.svg",
          active: false,
        },
        {
          id: "mercadopago",
          name: "Mercado Pago",
          description:
            "Plataforma de pagos de Mercado Libre para Latinoamérica",
          logo: "assets/images/logos/mercadopago.svg",
          active: false,
        },
      ],
      [IntegrationCategory.LOGISTICS]: [
        {
          id: "fedex",
          name: "FedEx",
          description: "Servicios de envío y seguimiento internacional",
          logo: "assets/images/logos/fedex.svg",
          active: false,
        },
        {
          id: "dhl",
          name: "DHL",
          description: "Logística global y envíos internacionales",
          logo: "assets/images/logos/dhl.svg",
          active: false,
        },
        {
          id: "servientrega",
          name: "Servientrega",
          description: "Empresa de logística y entregas en Colombia",
          logo: "assets/images/logos/servientrega.svg",
          active: false,
        },
        {
          id: "coordinadora",
          name: "Coordinadora",
          description: "Servicio de entrega puerta a puerta de Colombia",
          logo: "assets/images/logos/coordinadora.svg",
          active: false,
        },
        {
          id: "enviame",
          name: "Enviame.io",
          description:
            "Plataforma de envíos y logística para e-commerce en Latinoamérica. Requiere API Key, ID Seller y configuración de bodegas.",
          logo: "assets/images/logos/logo-enviame-light-v3-mobile.svg",
          active: true,
        },
        {
          id: "partners_logistics",
          name: "Partners Logística",
          description:
            "Integración personalizada con partners de logística y envíos",
          logo: "assets/images/logos/partners-logistics.svg",
          active: true,
        },
        {
          id: "aliaddo_fulfillment",
          name: "Aliaddo Fulfillment",
          description:
            "Integración de fulfillment e inventario externo con Aliaddo. Sincroniza stock, productos y gestiona bodegas de forma automática.",
          logo: "assets/images/integrations/aliaddo-logo.png",
          active: true,
        },
        {
          id: "prindel",
          name: "Prindel",
          description:
            "Soluciones de logística de última milla para e-commerce en Colombia. Envíos rápidos con tracking en tiempo real.",
          logo: "assets/images/logos/prindel.png",
          active: true,
        },
        {
          // Osmosis (Cereza Media / Guía Cereza). Cereza opera como proveedor
          // logístico además de catálogo/ICG. El adapter osmosisProvider.js
          // expone los métodos createShipment/trackShipment/cancelShipment al
          // LogisticsManager igual que Prindel/Enviame, lo que permite
          // seleccionar Cereza desde el módulo de Despachos.
          id: "osmosis",
          name: "Cereza / Guía Cereza",
          description:
            "Proveedor logístico + catálogo Cereza Media (Osmosis ERP/ICG). Sincroniza productos y stock por bodega; recibe pedidos y los despacha desde sus bodegas.",
          logo: "assets/images/logos/guiacereza.svg",
          active: true,
        },
        {
          // Fullpi (WMS) — spec 017. Recibe pedidos pagados/contraentrega para
          // despacho, reporta estados (tracking) y stock por SKU. La sincronización
          // corre por los flows fullpi-* (activarlos en /flows es el toggle).
          id: "fullpi",
          name: "Fullpi",
          description:
            "WMS de fulfillment: recibe tus pedidos pagados para despacharlos desde su bodega, reporta el estado de cada envío y sincroniza el inventario disponible.",
          logo: "assets/images/logos/fullpi.svg",
          active: true,
        },
      ],
      [IntegrationCategory.MARKETING]: [
        {
          id: "whatsapp_kapso",
          name: "WhatsApp Business",
          description:
            "Notificaciones transaccionales por WhatsApp Business (Kapso). Avisos automáticos a tus clientes sobre pedidos, pagos y despachos.",
          logo: "assets/images/logos/whatsapp.svg",
          active: true,
        },
        {
          id: "mailchimp",
          name: "Mailchimp",
          description:
            "Plataforma de automatización de marketing y email marketing",
          logo: "assets/images/logos/mailchimp.svg",
          active: false,
        },
        {
          id: "hubspot",
          name: "HubSpot",
          description:
            "Plataforma de inbound marketing, ventas y servicio al cliente",
          logo: "assets/images/logos/hubspot.svg",
          active: false,
        },
        {
          id: "google_analytics",
          name: "Google Analytics",
          description:
            "Servicio de análisis web para el seguimiento del tráfico",
          logo: "assets/images/logos/google_analytics.svg",
          active: false,
        },
      ],
      [IntegrationCategory.CRM]: [
        {
          id: "salesforce",
          name: "Salesforce",
          description: "Plataforma CRM para gestión de clientes y ventas",
          logo: "assets/images/logos/salesforce.svg",
          active: false,
        },
        {
          id: "zoho_crm",
          name: "Zoho CRM",
          description: "Software de gestión de relación con el cliente",
          logo: "assets/images/logos/zoho_crm.svg",
          active: false,
        },
      ],
      [IntegrationCategory.ACCOUNTING]: [
        {
          id: "dian",
          name: "DIAN directo",
          description: "Facturación electrónica con software propio, sin intermediarios contables.",
          logo: "assets/images/logos/dian.svg",
          active: true,
        },
        {
          id: "quickbooks",
          name: "QuickBooks",
          description:
            "Software de contabilidad para pequeñas y medianas empresas",
          logo: "assets/images/logos/quickbooks.svg",
          active: false,
        },
        {
          id: "siigo",
          name: "Siigo",
          description: "Software contable y administrativo colombiano",
          logo: "assets/images/logos/siigo.svg",
          active: true,
        },
        {
          id: "world_office",
          name: "World Office",
          description: "Software contable y de facturación electrónica colombiano con soporte DIAN",
          logo: "assets/images/logos/world-office.svg",
          active: true,
        },
      ],
      [IntegrationCategory.OTHER]: [
        {
          id: "flows",
          name: "Flujos Automatizados",
          description:
            "Editor visual estilo n8n. Conectá Osmosis, Shopify, Katuq y otros con triggers, acciones y lógica condicional sin escribir código.",
          logo: "assets/images/integrations/flows-logo.svg",
          active: true,
        },
        {
          id: "multiop",
          name: "MultiOP",
          description:
            "Sistema de producción de lentes oftálmicos. Conecta pedidos de óptica con el laboratorio de producción MultiOP.",
          logo: "assets/images/integrations/multiop-logo.png",
          active: true,
        },
        {
          id: "slack",
          name: "Slack",
          description: "Plataforma de comunicación empresarial",
          logo: "assets/images/logos/slack.svg",
          active: false,
        },
        {
          id: "zapier",
          name: "Zapier",
          description:
            "Plataforma de automatización que conecta apps y servicios",
          logo: "assets/images/logos/zapier.svg",
          active: false,
        },
      ],
    };
  }

  // ===== MÉTODOS ESPECÍFICOS PARA OSMOSIS / GUÍA CEREZA =====

  /**
   * Reenvía manualmente un pedido Katuq a Cereza/Osmosis.
   * Útil cuando el push automático falló o el pedido no tiene osmosisOrderId.
   * Backend: POST /v1/osmosis/orders/:id/push
   *
   * @param katuqOrderId  cd Firestore del pedido (no nroPedido)
   */
  pushOrderToOsmosis(
    katuqOrderId: string,
  ): Observable<{ success: boolean; osmosisOrderId?: number; message?: string }> {
    return this.http.post<{
      success: boolean;
      osmosisOrderId?: number;
      message?: string;
    }>(
      `${environment.urlApi}/v1/osmosis/orders/${katuqOrderId}/push`,
      {},
      { headers: this.getApiHeaders() },
    );
  }

  /**
   * Transportadoras de Guía Cereza para elegir al despachar. Cereza exige el
   * `carrier_code` al crear la orden; la ciudad se resuelve sola desde el
   * pedido, así que esto es lo único que el operador escoge.
   *
   * `defaultCarrierCode` es la que la empresa tiene configurada — el modal la
   * preselecciona para que despachar siga siendo un clic.
   * Backend: GET /v1/osmosis/catalogs/carriers (cacheado 30 min)
   */
  getCerezaCarriers(): Observable<{
    success: boolean;
    carriers: { code: string; name: string }[];
    defaultCarrierCode?: string | null;
  }> {
    return this.http.get<{
      success: boolean;
      carriers: { code: string; name: string }[];
      defaultCarrierCode?: string | null;
    }>(
      `${environment.urlApi}/v1/osmosis/catalogs/carriers`,
      { headers: this.getApiHeaders() },
    );
  }

  /**
   * Cancela en Guía Cereza el envío de un pedido y lo deja listo para volver a
   * despacharse (queda en "En Despacho", conservando su orden de envío).
   * Se usa cuando salió con la transportadora o la bodega equivocada.
   * Backend: POST /v1/osmosis/orders/:id/cancel-shipment
   *
   * @param katuqOrderId  cd Firestore del pedido (no nroPedido)
   */
  cancelarEnvioCereza(
    katuqOrderId: string,
    motivo: string,
  ): Observable<{ success: boolean; osmosisOrderId?: number; estadoProceso?: string; message?: string }> {
    return this.http.post<{
      success: boolean;
      osmosisOrderId?: number;
      estadoProceso?: string;
      message?: string;
    }>(
      `${environment.urlApi}/v1/osmosis/orders/${katuqOrderId}/cancel-shipment`,
      { motivo },
      { headers: this.getApiHeaders() },
    );
  }
}
