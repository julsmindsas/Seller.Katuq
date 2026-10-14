import { Carrito, Cliente } from "../../ventas/modelo/pedido";

/**
 * Modelo de Cotización — spec 008 (T-13).
 * Reusa `Carrito` y `Cliente` del módulo de ventas para mantener fidelidad
 * de precios/IVA (los ítems llevan la misma forma que el carrito de venta asistida,
 * incluyendo _precioManualOverride / _ivaManualOverride y configuracion).
 */

// Estados canónicos (coinciden con el backend tras normalizarEstado).
export type EstadoCotizacion =
  | "borrador"
  | "enviada"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "convertida";

export const ESTADOS_COTIZACION: { value: EstadoCotizacion; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "vencida", label: "Vencida" },
  { value: "convertida", label: "Convertida" },
];

export interface VendedorCotizacion {
  email: string;
  nombre?: string;
}

export interface Cotizacion {
  id?: string;
  nroCotizacion?: string;
  company?: string;
  estadoCotizacion: EstadoCotizacion;
  cliente?: Cliente | null;
  vendedor?: VendedorCotizacion | null;
  // Ítems con la misma forma que el carrito de venta asistida.
  items: Carrito[];
  descGlobal?: number;
  // Totales calculados en el frontend (fuente de verdad — PaymentService).
  subtotal?: number;
  totalDescuento?: number;
  baseGravable?: number;
  totalImpuesto?: number;
  total?: number;
  // Términos y condiciones (precargados del default de empresa).
  terminos?: string;
  /** Ticket 1081: documento anexo de condiciones comerciales (PDF), copiado de la empresa al crearla. */
  anexoCondiciones?: AnexoCondiciones | null;
  fechaCreacion?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  validezDias?: number;
  // Banderas de conversión (fase 008.2).
  convertidaAPedido?: boolean;
  pedidoGenerado?: string | null;
  // Tracking de apertura del link público (spec 008.3 — seguimiento CRM).
  vistaCliente?: boolean;
  fechaPrimeraVista?: string | null;
  vistasCount?: number;
  /** Ticket 1202: margen (solo para roles autorizados; nunca va al cliente). */
  margen?: { base: number; costoTotal: number; valor: number | null; pct: number | null; lineas: number; lineasConCosto: number; completo: boolean } | null;
  /** Ticket 1202: última vez que el cliente abrió el enlace. */
  fechaUltimaVista?: string | null;
  /** Ticket 1207: motivo del rechazo (lo escribe el servidor al rechazar). */
  rechazo?: RechazoCotizacion | null;
  /** Ticket 1207: texto del motivo, también para rechazos viejos desde el enlace. */
  motivoRechazoTexto?: string;
  /** Ticket 1208: línea de tiempo de estados (solo lectura, la arma el servidor). */
  lineaDeTiempo?: EventoEstadoCotizacion[];
  // De dónde salió: vacío = venta asistida, "catalogo-digital" = carrito del
  // catálogo por link (D-141), "whatsapp-bot" = bot de pedidos por WhatsApp.
  origen?: string | null;
  date_edit?: string;
  user_edit?: string;
}

// KPIs del listado (GET /v1/cotizaciones/metrics).
export interface CotizacionMetrics {
  cotizadoMes: number;
  pipelineActivo: number;
  tasaConversion: number;
  borradores: number;
  /** Ticket 1211: enviadas vigentes (no incluye aceptadas ni enviadas vencidas). */
  pipelineAbierto?: number;
  pipelineAbiertoCount?: number;
  /** Ticket 1211: pipeline abierto × win rate por cantidad. */
  pipelinePonderado?: number;
  /** Ticket 1211: aceptadas que todavía no tienen pedido. */
  aceptadasSinConvertir?: { cantidad: number; valor: number };
  /** Ticket 1212: convertidas ÷ cerradas (convertidas + rechazadas + vencidas), en %. */
  winRate?: number;
  /** Ticket 1212: $ convertido ÷ $ cerrado, en %. */
  winRateValor?: number;
  convertidas?: number;
  cerradas?: number;
  /** Ticket 1200: true si las cifras vienen con búsqueda, pedido o comercial aplicados. */
  filtrado?: boolean;
  total?: number;
  porEstado?: { [estado: string]: number };
  /** Ticket 1104: comerciales con cotizaciones (para el filtro del listado). */
  vendedores?: { email: string; nombre: string; total: number }[];
  /** Ticket 1207: rechazadas por motivo. */
  motivosRechazo?: { [motivo: string]: number };
  /** Ticket 1205: indicadores del comercial o del equipo con los filtros. */
  indicadores?: IndicadoresComerciales;
  /** Ticket 1205: variación % de cada indicador frente al período anterior. */
  variacion?: { [campo: string]: number | null } | null;
  periodoAnterior?: { desde: string; hasta: string } | null;
  /** Ticket 1206: cuántas cotizaciones hay en cada alerta. */
  atencion?: { sinConvertir: number; porVencer: number; sinSeguimiento: number; borradoresViejos: number; noAbiertas?: number; bajoMargen?: number };
  /** Ticket 1202: el usuario puede ver márgenes y el mínimo de la empresa. */
  veMargen?: boolean;
  margenMinimo?: number;
  /** Ticket 1203: datos de las gráficas. */
  analisis?: {
    embudo: { etapa: string; cantidad: number; valor: number; paso: number }[];
    tendencia: { mes: string; cotizado: number; convertido: number }[];
    motivos: { motivo: string; cantidad: number; valor: number }[];
    productos: { cd: string; nombre: string; valor: number; cotizaciones: number; conversion: number }[];
    clientes: { grupo: string; cotizaciones: number; winRate: number }[];
  };
  /** Ticket 1204: una fila por asesor (cuando se pide la comparativa). */
  porVendedor?: (IndicadoresComerciales & { email: string; nombre: string; participacion: number })[];
}

/** Tickets 1204/1205: indicadores de un comercial o de un grupo. */
export interface IndicadoresComerciales {
  cotizaciones: number;
  cotizadoValor: number;
  ticketPromedio: number;
  winRate: number;
  winRateValor: number;
  convertidas: number;
  convertidoValor: number;
  convertidoMes: number;
  pipelineAbierto: number;
  cicloCierreDias: number | null;
  primeraRespuestaHoras: number | null;
  descuentoPromedio: number;
  /** Ticket 1202: margen promedio ponderado (solo roles autorizados). */
  margenPromedio?: number | null;
  meta: number;
  avanceMeta: number | null;
}

/** Ticket 1081: documento anexo (PDF) de las condiciones comerciales. */
export interface AnexoCondiciones {
  url: string;
  nombre: string;
}

// Config de términos base por empresa (GET/PUT /v1/cotizaciones/config).
export interface CotizacionConfig {
  terminosBase: string;
  /** true = la empresa ya guardó sus propios términos (no los de Katuq por defecto). */
  personalizados?: boolean;
  anexo?: AnexoCondiciones | null;
  /** Ticket 1102: la empresa ve los valores de sus cotizaciones en pesos enteros. */
  valoresSinDecimales?: boolean;
  /** Ticket 1207: motivos de rechazo de la empresa ("Otro" siempre al final). */
  motivosRechazo?: string[];
  /** Tickets 1204/1205: meta mensual de cada comercial { correo: pesos }. */
  metas?: { [email: string]: number };
  /** Ticket 1202: margen mínimo (%) para la alerta. */
  margenMinimo?: number;
}

/** Ticket 1207: por qué se perdió una cotización. */
export interface RechazoCotizacion {
  motivo: string;
  detalle?: string;
  competidor?: string;
  comentario?: string;
  fecha?: string;
  usuario?: string;
}

/** Ticket 1208: un cambio de estado de la línea de tiempo. */
export interface EventoEstadoCotizacion {
  de: string | null;
  a: string;
  fecha: string;
  usuario?: string;
  origen?: string;
  /** true = deducido de datos de antes del historial. */
  inferido?: boolean;
}

export interface CotizacionListFilter {
  estado?: EstadoCotizacion | "";
  q?: string;
  pedido?: string;
  /** Ticket 1104: correo del comercial (vendedor.email). */
  vendedor?: string;
  /** Ticket 1211: solo aceptadas sin pedido asociado. */
  sinConvertir?: boolean;
  /** Ticket 1207: rechazadas por este motivo. */
  motivo?: string;
  /** Ticket 1205: rango de fechas (emisión), "AAAA-MM-DD". */
  desde?: string;
  hasta?: string;
  /** Ticket 1206: alerta "Requieren atención". */
  atencion?: string;
  /** Ticket 1203: clic en las gráficas. */
  producto?: string;
  clienteTipo?: string;
  page?: number;
  limit?: number;
}

export interface CotizacionPaginatedResponse {
  success: boolean;
  data: Cotizacion[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CotizacionMetricsResponse {
  success: boolean;
  data: CotizacionMetrics;
}

export interface CotizacionConfigResponse {
  success: boolean;
  data: CotizacionConfig;
}

export interface CotizacionDetailResponse {
  success: boolean;
  data: Cotizacion;
}
