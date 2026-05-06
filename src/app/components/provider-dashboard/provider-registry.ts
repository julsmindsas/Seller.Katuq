/**
 * Registry de proveedores de integración soportados por el dashboard genérico.
 *
 * Cada entrada describe:
 *   - label: nombre visible al usuario
 *   - endpointBase: URL base del API REST (relativa a environment.urlApi)
 *   - features: qué tabs/secciones se renderizan en el dashboard
 *   - hasIssuesEndpoint: si el backend ya expone /dashboard/orders-with-issues
 *
 * Para agregar un nuevo provider, basta con añadir una entrada acá. Cero código
 * por archivo nuevo. El componente genérico lee este registry según el :provider
 * de la URL y renderiza lo que corresponda.
 */
export type ProviderFeature = 'issues' | 'kpis' | 'products';

export interface ProviderConfig {
  label: string;
  description: string;
  icon: string; // PrimeIcons (sin "pi pi-")
  endpointBase: string;
  features: ProviderFeature[];
  hasIssuesEndpoint: boolean;
  /** Endpoints específicos del provider (relativos a endpointBase). */
  endpoints: {
    issues?: string;
    pushOrder?: (orderId: string) => string;
  };
}

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  osmosis: {
    label: 'Cereza / Guía Cereza',
    description:
      'Integración con Osmosis (Cereza Media). Sincroniza productos, stock y estados de pedidos.',
    icon: 'box',
    endpointBase: '/v1/osmosis',
    features: ['issues'], // KPIs y products vendrán en iteraciones siguientes
    hasIssuesEndpoint: true,
    endpoints: {
      issues: '/dashboard/orders-with-issues',
      pushOrder: (orderId: string) => `/orders/${orderId}/push`,
    },
  },
  // shopify: { ... }   ← se agrega cuando se implemente
  // siigo:   { ... }   ← idem
};

/**
 * Devuelve la configuración del provider o null si no está registrado.
 */
export function getProviderConfig(provider: string): ProviderConfig | null {
  return PROVIDER_REGISTRY[provider] || null;
}

/**
 * Lista de slugs de providers soportados (para validación de ruta).
 */
export function listSupportedProviders(): string[] {
  return Object.keys(PROVIDER_REGISTRY);
}
