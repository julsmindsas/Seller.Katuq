// Spec 009 — contrato de respuesta de GET /v1/orders/customer-summary
export interface CustomerSummaryPedido {
  nroPedido: string | null;
  fechaCreacion: string | null; // ISO
  estadoProceso: string | null;
  estadoPago: string | null;
  total: number;
}

export interface CustomerSummary {
  documento: string;
  metricas: {
    ticketPromedio: number;
    valorTotal: number;
    ultimaCompra: { valor: number; fecha: string | null; nroPedido: string | null } | null;
    totalPedidos: number;
    // métricas extendidas (Spec 009 v2)
    fechaPrimeraCompra: string | null;
    diasDesdeUltimaCompra: number | null;
    cadenciaPromedioDias: number | null;
    alertaCadencia: boolean;
    tasaDevoluciones: number;
    rfmSegmento: 'Campeón' | 'Fiel' | 'En riesgo' | 'Hibernando' | 'Perdido' | null;
    clv: number | null;
    canalPreferido: string | null;
    metodoPagoPreferido: string | null;
    categoriasMasCompradas: { nombre: string; cantidad: number }[];
    productosMasComprados: { nombre: string; cantidad: number }[];
  };
  pedidos: {
    page: number;
    pageSize: number;
    total: number;
    items: CustomerSummaryPedido[];
  };
  meta: {
    procesados: number;
    excluidos: number;
    totalesInvalidos: number;
  };
}
