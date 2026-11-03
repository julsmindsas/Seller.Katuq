/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Contratos de datos del módulo.
 * Identifiers en inglés (acuerdo del proyecto); textos de UI en español.
 * Alineado 1:1 con la respuesta de GET /v1/treasury/cartera.
 */

/** Montos por rango de antigüedad (aging). Todos en COP. */
export interface AgingBuckets {
  /** Sin vencer: la fecha límite de pago aún no llega (0 o menos días vencido). */
  sin_vencer: number;
  /** 1 a 15 días vencido. */
  d1_15: number;
  /** 16 a 30 días vencido. */
  d16_30: number;
  /** 31 a 60 días vencido. */
  d31_60: number;
  /** 61 a 90 días vencido. */
  d61_90: number;
  /** Más de 90 días vencido. */
  d90: number;
}

/** Pedido activo con saldo de un cliente (detalle expandible). */
export interface CarteraPedido {
  orderId: string;
  nroPedido: string;
  /** Ticket 1384: número de la factura electrónica del pedido ('' si no tiene). */
  factura?: string;
  /** Ticket 1430: PDF de esa factura ('' si no tiene); el mismo que abre el detalle del pedido. */
  facturaUrl?: string;
  /** Ticket 1384: fecha de compra = creación del pedido (ISO) o null. */
  fechaCompra?: string | null;
  estadoPago: string;
  /** Fecha de entrega (ISO) o null si el pedido no la tiene. */
  fechaEntrega: string | null;
  /** Fecha límite de pago = fechaEntrega + payTermDays (ISO) o null. */
  payDueDate: string | null;
  total: number;
  pagado: number;
  saldo: number;
  /** Días transcurridos desde payDueDate (negativo/0 = aún no vence). */
  diasVencido: number;
}

/** Cartera agregada de un cliente. */
export interface CarteraCliente {
  documento: string;
  nombre: string;
  vendedor: string;
  /** Cupo de crédito configurado (0 = sin cupo). */
  creditLimit: number;
  /** Plazo de pago en días (0 = contado). */
  payTermDays: number;
  saldoPendiente: number;
  /** Saldo de los pedidos con 1 o más días vencido (ticket 1460). */
  vencido: number;
  /** De ese vencido, la parte con más de 15 días. */
  vencidoMas15?: number;
  pedidosActivos: number;
  aging: AgingBuckets;
  /** % de cupo usado; null si el cliente no tiene cupo configurado. */
  cupoUsadoPct: number | null;
  excedeCupo: boolean;
  /** Días de venta pendientes (edad promedio ponderada por saldo — MVP). */
  dso: number;
  pedidos: CarteraPedido[];
}

/** KPI cartera total: monto + número de clientes con saldo. */
export interface CarteraTotalKpi {
  monto: number;
  clientes: number;
}

/** KPI cartera vencida: monto + % del total. */
export interface CarteraVencidaKpi {
  /** Todo lo que tiene 1 o más días vencido. */
  monto: number;
  pct: number;
  /** Dato secundario: la parte con más de 15 días vencida. */
  mas15?: { monto: number; pct: number };
}

/** KPI clientes que exceden cupo. */
export interface CarteraExcedenCupoKpi {
  cantidad: number;
}

/** KPIs agregados server-side. */
export interface CarteraKpis {
  carteraTotal: CarteraTotalKpi;
  carteraVencida: CarteraVencidaKpi;
  /** DSO promedio ponderado (días). */
  dsoPromedio: number;
  excedenCupo: CarteraExcedenCupoKpi;
  aging: AgingBuckets;
}

/** Respuesta de GET /v1/treasury/cartera. */
export interface CarteraResponse {
  kpis: CarteraKpis;
  clientes: CarteraCliente[];
}
