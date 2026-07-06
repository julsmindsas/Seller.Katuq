/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Contratos de datos del módulo.
 * Identifiers en inglés (acuerdo del proyecto); textos de UI en español.
 * Alineado 1:1 con la respuesta de GET /v1/treasury/cartera.
 */

/** Montos por rango de antigüedad (aging). Todos en COP. */
export interface AgingBuckets {
  /** Corriente: no vencido o ≤ 15 días de vencido. */
  corriente: number;
  /** 16-30 días de vencido. */
  d16_30: number;
  /** 31-60 días de vencido. */
  d31_60: number;
  /** 60+ días de vencido. */
  d60: number;
}

/** Pedido activo con saldo de un cliente (detalle expandible). */
export interface CarteraPedido {
  orderId: string;
  nroPedido: string;
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
  /** Saldo con > 15 días de vencido (coherente con la barra de aging). */
  vencido: number;
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
  monto: number;
  pct: number;
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
