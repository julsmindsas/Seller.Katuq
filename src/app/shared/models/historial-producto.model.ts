/**
 * Historial del producto (D-548, F1). Forma de la respuesta de
 * `GET /v1/productos/historial/:productoId?vista=eventos` (backend:
 * `services/productos/historialProducto/lectura.js`).
 *
 * El servidor ya manda los textos de negocio (títulos, etiquetas, orígenes) y NUNCA el correo de una
 * persona que tiene nombre. El front solo los pinta.
 */

/** Filtro de la lista: solo cambios de precios, o solo de costo. Sin filtro, todo. */
export type FiltroHistorialProducto = 'precios' | 'costo';

export type OrdenHistorialProducto = 'asc' | 'desc';

/** De dónde sale el elemento: un evento nuevo o un registro de fotos de antes (D-501). */
export type FuenteHistorialProducto = 'evento' | 'fotos';

/** Tipo del evento tal como lo guarda el servidor (design D2); `photos_changed` es el de las fotos. */
export type TipoEventoProducto =
  | 'product_created'
  | 'product_deleted'
  | 'cost_changed'
  | 'price_changed'
  | 'product_deactivated'
  | 'product_activated'
  | 'product_sold_out'
  | 'product_available'
  | 'product_edited'
  | 'photos_changed';

export interface ActorHistorialProducto {
  /** Nombre de la persona, o el correo si no tiene nombre, o «Sistema». */
  nombre: string;
  rol: string | null;
}

/** Un dato que cambió: «Nombre: Camisa → Camisa azul». */
export interface DetalleHistorialProducto {
  etiqueta: string;
  antes: string | number | boolean | null;
  despues: string | number | boolean | null;
  /** `texto`, `booleano` o `porcentaje`. */
  clase: string;
}

/** Un precio o el costo que cambió. `antes`/`despues` van sin IVA; `…ConIva` con IVA (si aplica). */
export interface PrecioHistorialProducto {
  /** `base`, `customer_type`, `volume` o `cost`. */
  tipo: string;
  etiqueta: string;
  antes: number | null;
  despues: number | null;
  antesConIva: number | null;
  despuesConIva: number | null;
  diferencia: number | null;
  porcentaje: number | null;
}

/** Resumen del producto al crearlo o borrarlo (sin costo ni existencias). */
export interface FotoProductoHistorial {
  reference?: string | null;
  name?: string | null;
  category?: string | null;
  sellable?: boolean | null;
  available?: boolean | null;
  taxRate?: number | string | null;
  basePrice?: number | null;
  basePriceWithTax?: number | null;
  customerPrices?: Array<{ listId: string; listName: string | null; price: number | null; priceWithTax: number | null }>;
  volumePrices?: number;
}

export interface LoteHistorialProducto {
  nombre: string | null;
  total: number | null;
}

export interface EventoHistorialProducto {
  id: string;
  tipo: TipoEventoProducto | string;
  titulo: string;
  /** Instante en ISO (UTC). */
  fecha: string | null;
  actor: ActorHistorialProducto;
  origen: string | null;
  canal: string | null;
  detalles: DetalleHistorialProducto[];
  precios: PrecioHistorialProducto[];
  lote: LoteHistorialProducto | null;
  motivo: string | null;
  fuente: FuenteHistorialProducto;
  /** Hecho por el sistema o una integración, no por una persona. */
  sistema: boolean;
  foto?: FotoProductoHistorial;
}

export interface ResumenHistorialProducto {
  referencia: string | null;
  nombre: string | null;
  /** `null` si la persona no puede ver costos: no se revela cuántos hay. */
  totalCambios: number | null;
  ultimoCambio: { fecha: string | null; titulo: string } | null;
}

export interface PaginaHistorialProducto {
  success: boolean;
  /** `eventos`, o `legado` si el servidor respondió la vista de antes (bandera apagada o error). */
  vista?: 'eventos' | 'legado';
  productoId?: string;
  resumen?: ResumenHistorialProducto;
  eventos?: EventoHistorialProducto[];
  /** Cursor de la página siguiente, o `null` si no hay más. */
  siguiente?: string | null;
  orden?: OrdenHistorialProducto;
  /** Solo en la vista de antes. */
  historial?: any[];
}

export interface ConsultaHistorialProducto {
  cursor?: string | null;
  orden?: OrdenHistorialProducto;
  tipo?: FiltroHistorialProducto | null;
  limite?: number;
}
