/**
 * Registro de conexiones por ventana emergente (D-437), al estilo de
 * `provider-dashboard/provider-registry.ts`.
 *
 * Cada proveedor que se conecta con un enlace externo vuelve a
 * `/integrations/:provider/retorno`. Esa página (IntegrationConnectReturnComponent)
 * le avisa a la ventana que la abrió con `postMessage` y se cierra; la tarjeta
 * que abrió la ventana es la que confirma con el servidor.
 *
 * Para sumar un proveedor basta con una entrada acá. Meta conserva su propia
 * ruta `meta/retorno` (está registrada en Meta) hasta que se toque.
 */

/** Tipo del mensaje que la página de regreso publica a la ventana de origen. */
export const MENSAJE_CONEXION = 'integration_connect';

export interface MensajeConexion {
  tipo: typeof MENSAJE_CONEXION;
  provider: string;
  params: Record<string, string>;
}

export interface ConnectorConfig {
  /** Nombre visible en la página de regreso. */
  nombre: string;
  mensajeRetorno: typeof MENSAJE_CONEXION;
  /**
   * Tipo de integración (catálogo de `/integrations`) cuya tarjeta confirma la
   * conexión. Se usa cuando el regreso llega sin ventana de origen.
   */
  tipoIntegracion: string;
  /** ¿El regreso dice que la conexión terminó? Igual la confirma el servidor. */
  esExitoso: (params: Record<string, string>) => boolean;
}

export const CONNECTOR_REGISTRY: Record<string, ConnectorConfig> = {
  kapso: {
    nombre: 'WhatsApp',
    mensajeRetorno: MENSAJE_CONEXION,
    tipoIntegracion: 'whatsapp_kapso',
    esExitoso: (p) => p['status'] === 'completed' && !p['error_code'] && !!p['phone_number_id'],
  },
};

/** Parámetro que marca, en `/integrations`, un regreso que llegó sin ventana de origen. */
export const PARAM_CONEXION_PENDIENTE = 'conectar';

export function getConnectorConfig(provider: string | null | undefined): ConnectorConfig | null {
  return (provider && CONNECTOR_REGISTRY[provider]) || null;
}
