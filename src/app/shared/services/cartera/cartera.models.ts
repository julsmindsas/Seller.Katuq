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
  /** Ticket 1465: ciudad de entrega ('' si no tiene). */
  ciudad?: string;
  /** Ticket 1465: el pedido ya está en estado Entregado. */
  entregado?: boolean;
  /** Ticket 1465: fecha (ISO) del último abono aprobado, o null si no tiene. */
  ultimoAbono?: string | null;
  /** Fecha de entrega (ISO) o null si el pedido no la tiene. */
  fechaEntrega: string | null;
  /** Fecha límite de pago = fechaEntrega + payTermDays (ISO) o null. */
  payDueDate: string | null;
  total: number;
  pagado: number;
  saldo: number;
  /** Días transcurridos desde payDueDate (negativo/0 = aún no vence). */
  diasVencido: number;
  /** Ticket 1464: vence en los próximos 7 días (días vencido entre -7 y 0). */
  porVencer7?: boolean;
  /**
   * Ticket 1467 (preparado para el ticket 1463): compromiso de pago del pedido. Hasta que el servidor
   * lo mande, ningún pedido lo trae y el filtro «Compromiso de pago» no se muestra.
   */
  compromiso?: CompromisoPago | null;
}

/** Compromiso de pago (ticket 1463). `incumplido` es «Promesa vencida»; `vigente`, la fecha de hoy o futura. */
export interface CompromisoPago {
  estado: 'vigente' | 'incumplido' | 'cumplido';
  /** Fecha prometida («AAAA-MM-DD»). */
  fecha?: string | null;
  /** Valor prometido. */
  valor?: number;
  nota?: string;
  por?: string;
}

/** Ticket 1463: última gestión de cobro de un cliente. */
export interface UltimaGestion {
  fecha: string;
  canal: string;
  resultado: string;
  nota?: string;
  por?: string;
}

/** Ticket 1463: lo que dejan las acciones de cobro en la tarjeta (solo con la bandera `accionesCartera`). */
export interface CobroCliente {
  ultimaGestion?: UltimaGestion;
  compromiso?: CompromisoPago;
  /** Último estado de cuenta enviado, por canal. */
  ultimoEstadoCuenta?: { correo?: { fecha: string; por?: string }; whatsapp?: { fecha: string; por?: string } };
}

/** Ticket 1467: empresa (NIT) o persona (cédula y demás); '' si no se pudo saber. */
export type TipoPersona = 'empresa' | 'persona' | '';

/** Ticket 1461: relación del cliente con el comercio. Solo «employee», «partner» y «company» son internos. */
export type TipoRelacion = 'customer' | 'employee' | 'partner' | 'company';

/** Ticket 1461: por qué se sugiere que un cliente es interno (documento igual al de un usuario o al NIT de la empresa). */
export type SugerenciaInterno = 'usuario' | 'empresa';

/** Cartera agregada de un cliente. */
export interface CarteraCliente {
  documento: string;
  nombre: string;
  vendedor: string;
  /** Cupo de crédito configurado (0 = sin cupo). */
  creditLimit: number;
  /** Plazo de pago en días (0 = contado). */
  payTermDays: number;
  /** Ticket 1467: tipo de documento tal como está en la ficha del cliente (NIT, CC, CE…). */
  tipoDocumento?: string;
  /** Ticket 1467: «Empresa (NIT)» o «Persona (CC)», decidido por el servidor. */
  tipoPersona?: TipoPersona;
  /** Ticket 1465: teléfono y correo del cliente para gestionar el cobro ('' si no tiene). */
  telefono?: string;
  correo?: string;
  saldoPendiente: number;
  /** Saldo de los pedidos con 1 o más días vencido (ticket 1460). */
  vencido: number;
  /** De ese vencido, la parte con más de 15 días. */
  vencidoMas15?: number;
  /** Ticket 1464: saldo que vence en los próximos 7 días (cobro preventivo). */
  porVencer7?: number;
  porVencer7Pedidos?: number;
  pedidosActivos: number;
  /** Ticket 1461: tipo de relación (solo cuando la empresa tiene la cartera interna encendida). */
  relationType?: TipoRelacion;
  /** Ticket 1461: «posible interno», nunca se marca solo. */
  sugeridoInterno?: SugerenciaInterno;
  /** Ticket 1463: compromiso de pago y última gestión (solo con la bandera `accionesCartera`). */
  cobro?: CobroCliente;
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

/** Ticket 1464: cuánto se vence en los próximos 7 días (cobro preventivo). */
export interface CarteraPorVencerKpi {
  monto: number;
  clientes: number;
  pedidos: number;
  /** Ventana en días (7). */
  dias: number;
}

/** Ticket 1464: clientes con cupo de crédito configurado. */
export interface CarteraClientesConCupoKpi {
  /** Los que hoy tienen saldo en cartera. */
  enCartera: number;
  /** Todos los de la lista de clientes del comercio. */
  enEmpresa: number;
}

/** KPIs agregados server-side. */
export interface CarteraKpis {
  carteraTotal: CarteraTotalKpi;
  carteraVencida: CarteraVencidaKpi;
  /** DSO promedio ponderado (días). */
  dsoPromedio: number;
  excedenCupo: CarteraExcedenCupoKpi;
  clientesConCupo?: CarteraClientesConCupoKpi;
  porVencer7?: CarteraPorVencerKpi;
  /** Ticket 1463: clientes con una promesa de pago vencida (solo con la bandera `accionesCartera`). */
  promesasVencidas?: { clientes: number; monto: number };
  aging: AgingBuckets;
}

/** Respuesta de GET /v1/treasury/cartera. */
export interface CarteraResponse {
  kpis: CarteraKpis;
  clientes: CarteraCliente[];
  /**
   * Ticket 1461: resumen de la cartera interna (empleados, socios, empresa propia) que el servidor apartó.
   * Solo viene cuando la empresa tiene la bandera `carteraInterna` encendida; sin ella no aparece nada de esto.
   */
  internos?: CarteraInternos | null;
}

/** Ticket 1461: lo que se apartó (o se incluyó) de cartera interna. */
export interface CarteraInternos {
  monto: number;
  clientes: number;
  pedidos?: number;
  porTipo?: { [tipo: string]: { monto: number; clientes: number; pedidos: number } };
  /** Los internos ya están dentro de la lista y de las cifras («Incluir internos» o vista interna). */
  incluidos?: boolean;
}

/** Respuesta de POST /v1/treasury/cartera/relacion. */
export interface MarcarRelacionResponse {
  success: boolean;
  documento: string;
  relationType: TipoRelacion;
  fichas: number;
  actualizadas: number;
}

/** Un mes de la evolución: foto de la cartera total y vencida (ticket 1464). */
export interface CarteraEvolucionPunto {
  /** «AAAA-MM». */
  periodo: string;
  carteraTotal: number;
  carteraVencida: number;
  /** % vencido del total (0 a 100). */
  pctVencido: number;
  clientes: number;
  /** "foto" (tomada ese mes) o "reconstruida" (estimada hacia atrás). */
  origen: string;
  aproximada: boolean;
}

/** Respuesta de GET /v1/treasury/cartera/evolucion. */
export interface CarteraEvolucionResponse {
  meses: number;
  puntos: CarteraEvolucionPunto[];
  /** La bandera de la empresa está encendida (la tarea guarda la foto cada día). */
  habilitado: boolean;
}

/* ------------------------------------------------------------------ */
/* Ticket 1463: acciones de cobro de la tarjeta del cliente             */
/* ------------------------------------------------------------------ */

export type CanalGestion = 'llamada' | 'mensaje' | 'whatsapp' | 'correo' | 'visita' | 'otro';

/** Un pedido del estado de cuenta (los números los calcula el servidor). */
export interface EstadoCuentaPedido {
  orderId: string;
  nroPedido: string;
  factura: string;
  fecha: string | null;
  limitePago: string | null;
  diasVencido: number;
  total: number;
  abonos: number;
  saldo: number;
  /** Pago que Tesorería tiene por revisar: se muestra aparte, no se descuenta. */
  enRevision: number;
}

export interface EstadoCuentaDatos {
  corte: string;
  cliente: { nombre: string; documento: string; telefono: string; correo: string };
  pedidos: EstadoCuentaPedido[];
  totalAdeudado: number;
  totalVencido: number;
  proximoVencimiento: { fecha: string; saldo: number; nroPedido: string } | null;
  totalEnRevision: number;
  interno: boolean;
}

/** Respuesta de POST /cartera/estado-cuenta/vista-previa. */
export interface EstadoCuentaVistaPrevia {
  success: boolean;
  estado: EstadoCuentaDatos;
  /** El comercio todavía no configuró cuentas bancarias: el PDF saldría sin ellas. */
  sinCuentas: boolean;
  whatsapp: { disponible: boolean; enlace: string; mensaje: string; enviadoDentroDe24h: string | null };
  correo: { disponible: boolean; destino: string; asunto: string; enviadoDentroDe24h: string | null; servicioConfigurado: boolean };
  archivo: string;
}

export interface CuentaBancaria {
  banco: string;
  tipo?: string;
  numero: string;
  titular?: string;
  documentoTitular?: string;
}

export interface ConfigEstadoCuenta {
  cuentas: CuentaBancaria[];
  mensaje: string;
}

/** Respuesta de POST /cartera/credito (sin `confirmar` es la vista previa del efecto). */
export interface CreditoVistaPrevia {
  success: boolean;
  vistaPrevia?: boolean;
  guardado?: boolean;
  anterior: { creditLimit: number; payTermDays: number };
  nuevo: { creditLimit: number; payTermDays: number };
  pedidosAbiertos: number;
  pedidosCambianVencimiento: number;
  dejanDeVencer: number;
  empiezanAVencer: number;
  saldoQueCambiaDeRango: number;
  saldo: number;
  cupoUsadoPctAntes: number | null;
  cupoUsadoPctDespues: number | null;
  sinCambios: boolean;
  /** Las fichas del cliente tienen hoy cupo o plazo distintos: guardar las deja iguales. */
  fichasDistintas?: boolean;
}

export interface EventoCobro {
  tipo: string;
  fecha: string;
  por: string;
  motivo: string;
  detalle: any;
  orderIds: string[];
}

export interface CastigoPedido {
  orderId: string;
  nroPedido: string;
  saldo: number;
  motivo: string;
  fecha: string;
  por: string;
}

export interface CarteraCastigadaCliente {
  clave: string;
  documento: string;
  nombre: string;
  total: number;
  pedidos: CastigoPedido[];
}

/** Respuesta de GET /cartera/castigada. */
export interface CarteraCastigadaResponse {
  success: boolean;
  total: number;
  pedidos: number;
  clientes: CarteraCastigadaCliente[];
}
