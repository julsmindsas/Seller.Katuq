// D-500 (decisión 12, tarea 4.3): proveedor de facturación → dónde se configura.
// Los componentes de la facturación no comparan el proveedor con un texto fijo: preguntan aquí.
// Mientras no exista el asistente nuevo de DIAN (tarea 4.5, sensible), DIAN abre el de siempre.

import { ProveedorContableId } from '../../../shared/services/facturacion/facturacion-automatica.util';

export interface AsistenteFacturacion {
  /** Ruta con su query, para `router.navigateByUrl`. */
  ruta: string;
  /** Texto del botón. */
  etiqueta: string;
}

export const ASISTENTES_FACTURACION: Record<ProveedorContableId, AsistenteFacturacion> = {
  dian: { ruta: '/integrations/configure?provider=dian', etiqueta: 'Configurar DIAN' },
  siigo: { ruta: '/integrations/siigo', etiqueta: 'Configurar SIIGO' },
  // World Office se configura con el formulario del listado de siempre.
  world_office: { ruta: '/integrations?abrir=world_office', etiqueta: 'Configurar World Office' },
};

export function asistenteDe(provider: string | null | undefined): AsistenteFacturacion | null {
  return provider && provider in ASISTENTES_FACTURACION ? ASISTENTES_FACTURACION[provider as ProveedorContableId] : null;
}
