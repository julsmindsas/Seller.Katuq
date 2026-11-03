import { AgingBuckets } from '../../shared/services/cartera/cartera.models';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Constantes de UI del módulo.
 * El cálculo de cartera/aging vive en el SERVIDOR; aquí solo hay metadatos de
 * presentación (colores por rango, opciones de filtro, badges de estado de pago).
 */

/** Metadatos de un rango de antigüedad para renderizar segmentos y columnas. */
export interface AgingBucketMeta {
  /** Clave del rango dentro de AgingBuckets. */
  key: keyof AgingBuckets;
  /** Clave i18n de la etiqueta completa (KPIs, leyenda, columnas). */
  labelKey: string;
  /** Clave i18n de la etiqueta corta (leyenda del cliente). */
  shortKey: string;
  /** Texto numérico del rango, igual en todos los idiomas (ej. «1-15»); vacío en «sin vencer». */
  rango: string;
  /** Clase CSS de color del rango (semáforo verde→rojo). */
  cssClass: string;
}

/**
 * Los 6 rangos de antigüedad en orden de severidad creciente (ticket 1460).
 * Son los mismos del servidor: tarjetas, barra del cliente, pestaña Aging,
 * filtro, Excel y PDF usan esta única lista. Los textos viven en i18n
 * (cartera.rangos.*) y se traducen en la plantilla.
 */
export const AGING_BUCKETS: AgingBucketMeta[] = [
  { key: 'sin_vencer', labelKey: 'cartera.rangos.sinVencerEtiqueta', shortKey: 'cartera.rangos.sinVencerCorto', rango: '',      cssClass: 'cx-seg-sin' },
  { key: 'd1_15',      labelKey: 'cartera.rangos.d1_15Etiqueta',     shortKey: 'cartera.rangos.d1_15Corto',     rango: '1-15',  cssClass: 'cx-seg-d1' },
  { key: 'd16_30',     labelKey: 'cartera.rangos.d16_30Etiqueta',    shortKey: 'cartera.rangos.d16_30Corto',    rango: '16-30', cssClass: 'cx-seg-d16' },
  { key: 'd31_60',     labelKey: 'cartera.rangos.d31_60Etiqueta',    shortKey: 'cartera.rangos.d31_60Corto',    rango: '31-60', cssClass: 'cx-seg-d31' },
  { key: 'd61_90',     labelKey: 'cartera.rangos.d61_90Etiqueta',    shortKey: 'cartera.rangos.d61_90Corto',    rango: '61-90', cssClass: 'cx-seg-d61' },
  { key: 'd90',        labelKey: 'cartera.rangos.d90Etiqueta',       shortKey: 'cartera.rangos.d90Corto',       rango: '+90',   cssClass: 'cx-seg-d90' },
];

/**
 * Filtro de riesgo del tab "Cartera por Cliente". Ticket 1467: «Por vencer» dejó de ser un riesgo y pasó
 * a su propio filtro «Vence» (hoy, 7 o 30 días), que filtra por pedido.
 */
export type RiskFilter = 'todos' | 'vencida' | 'cupo80' | 'excede' | 'contado' | 'credito';

/** Ticket 1467: las opciones se traducen en la plantilla (antes estaban en español fijo). */
export const RISK_OPTIONS: { labelKey: string; value: RiskFilter }[] = [
  { labelKey: 'cartera.filtros.riesgoTodos',     value: 'todos' },
  { labelKey: 'cartera.filtros.riesgoVencida',   value: 'vencida' },
  { labelKey: 'cartera.filtros.riesgoCupo80',    value: 'cupo80' },
  { labelKey: 'cartera.filtros.riesgoExcede',    value: 'excede' },
  { labelKey: 'cartera.filtros.riesgoContado',   value: 'contado' },
  { labelKey: 'cartera.filtros.riesgoCredito',   value: 'credito' },
];

/** Ticket 1467: Empresa (NIT) o Persona (CC). El servidor decide el tipo de cada cliente. */
export type TipoPersonaFiltro = 'todos' | 'empresa' | 'persona';
export const TIPO_PERSONA_OPTIONS: { labelKey: string; value: TipoPersonaFiltro }[] = [
  { labelKey: 'cartera.filtros.tipoTodos',    value: 'todos' },
  { labelKey: 'cartera.filtros.tipoEmpresa',  value: 'empresa' },
  { labelKey: 'cartera.filtros.tipoPersona',  value: 'persona' },
];

/**
 * Ticket 1461: tipo de relación del cliente con el comercio. «Cliente» es lo normal; los otros tres son
 * cartera interna (se manejan por otra vía, por ejemplo descuento de nómina).
 */
export type RelacionFiltro = 'todos' | 'customer' | 'employee' | 'partner' | 'company';
export const RELACION_OPTIONS: { labelKey: string; value: RelacionFiltro }[] = [
  { labelKey: 'cartera.interna.todos',    value: 'todos' },
  { labelKey: 'cartera.interna.cliente',  value: 'customer' },
  { labelKey: 'cartera.interna.empleado', value: 'employee' },
  { labelKey: 'cartera.interna.socio',    value: 'partner' },
  { labelKey: 'cartera.interna.empresaPropia', value: 'company' },
];
/** Los tres tipos internos, en el orden en que se muestran. */
export const TIPOS_INTERNOS: ('employee' | 'partner' | 'company')[] = ['employee', 'partner', 'company'];
/** Textos en español para los archivos (Excel y PDF no se traducen). */
export const RELACION_ES: { [k: string]: string } = {
  customer: 'Cliente', employee: 'Empleado', partner: 'Socio', company: 'Empresa propia',
};
/** Clave i18n de cada tipo. */
export const RELACION_CLAVE: { [k: string]: string } = {
  customer: 'cartera.interna.cliente', employee: 'cartera.interna.empleado', partner: 'cartera.interna.socio', company: 'cartera.interna.empresaPropia',
};

/**
 * Ticket 1467: estados de pago del filtro. «Pospendiente» se llama «Pago en revisión» (ticket 1448) y
 * «Crédito», «Pago parcial» y «Procesando» solo aparecen cuando algún pedido ya está en ese estado.
 */
export type EstadoPagoGrupo = 'Pendiente' | 'Pospendiente' | 'PreAprobado' | 'PagoParcial' | 'Procesando' | 'Credito';
export const ESTADO_PAGO_OPTIONS: { labelKey: string; value: EstadoPagoGrupo }[] = [
  { labelKey: 'cartera.filtros.pagoPendiente',   value: 'Pendiente' },
  { labelKey: 'cartera.filtros.pagoRevision',    value: 'Pospendiente' },
  { labelKey: 'cartera.filtros.pagoPreaprobado', value: 'PreAprobado' },
  { labelKey: 'cartera.filtros.pagoParcial',      value: 'PagoParcial' },
  { labelKey: 'cartera.filtros.pagoProcesando',   value: 'Procesando' },
  { labelKey: 'cartera.filtros.pagoCredito',     value: 'Credito' },
];

/**
 * Estado de pago de un pedido llevado a su opción del filtro. «Pago parcial» y «Procesando» (estados que el
 * servidor sigue contando como cartera) tienen su propia opción, igual que en la tabla de detalle, para que
 * «Preaprobado» solo traiga los preaprobados.
 */
export function grupoEstadoPago(estado: string | null | undefined): string {
  const e = (estado || '').trim();
  if (e === 'Pago Parcial') return 'PagoParcial';
  return e;
}

export type FacturaFiltro = 'todas' | 'con' | 'sin';
export const FACTURA_OPTIONS: { labelKey: string; value: FacturaFiltro }[] = [
  { labelKey: 'cartera.filtros.facturaTodas', value: 'todas' },
  { labelKey: 'cartera.filtros.facturaCon',   value: 'con' },
  { labelKey: 'cartera.filtros.facturaSin',   value: 'sin' },
];

/** Cobro preventivo: pedidos que vencen hoy o dentro de 7 o 30 días. */
export type VenceFiltro = 'todos' | 'hoy' | '7' | '30';
export const VENCE_OPTIONS: { labelKey: string; value: VenceFiltro }[] = [
  { labelKey: 'cartera.filtros.venceTodos', value: 'todos' },
  { labelKey: 'cartera.filtros.venceHoy',   value: 'hoy' },
  { labelKey: 'cartera.filtros.vence7',     value: '7' },
  { labelKey: 'cartera.filtros.vence30',    value: '30' },
];

/** Ticket 1467 (preparado para el ticket 1463): se muestra solo cuando los pedidos traen compromiso de pago. */
export type CompromisoFiltro = 'todos' | 'con' | 'incumplido';
export const COMPROMISO_OPTIONS: { labelKey: string; value: CompromisoFiltro }[] = [
  { labelKey: 'cartera.filtros.compromisoTodos',      value: 'todos' },
  { labelKey: 'cartera.filtros.compromisoCon',        value: 'con' },
  { labelKey: 'cartera.filtros.compromisoIncumplido', value: 'incumplido' },
];

/**
 * Ticket 1502: el cliente es de crédito si tiene cupo asignado (mayor a 0);
 * con cupo en 0 o sin cupo configurado es de contado.
 */
export function esClienteCredito(creditLimit: number | null | undefined): boolean {
  return (Number(creditLimit) || 0) > 0;
}

/**
 * Filtro de antigüedad por PEDIDO (tickets 1130 y 1460). Usa las mismas claves
 * que los rangos del servidor (AgingBuckets).
 */
export type RangoAntiguedad = keyof AgingBuckets;
export type AntiguedadFiltro = 'todas' | RangoAntiguedad;

export const ANTIGUEDAD_OPTIONS: { labelKey: string; value: AntiguedadFiltro }[] = [
  { labelKey: 'cartera.carteraClientes.todas',   value: 'todas' },
  { labelKey: 'cartera.rangos.sinVencerFiltro',  value: 'sin_vencer' },
  { labelKey: 'cartera.rangos.d1_15Filtro',      value: 'd1_15' },
  { labelKey: 'cartera.rangos.d16_30Filtro',     value: 'd16_30' },
  { labelKey: 'cartera.rangos.d31_60Filtro',     value: 'd31_60' },
  { labelKey: 'cartera.rangos.d61_90Filtro',     value: 'd61_90' },
  { labelKey: 'cartera.rangos.d90Filtro',        value: 'd90' },
];

/** Nombre del rango para la descarga (Excel y PDF). Las descargas van en español, igual que el resto de sus columnas. */
export const RANGO_ANTIGUEDAD_LABEL: { [rango in RangoAntiguedad]: string } = {
  sin_vencer: 'Sin vencer',
  d1_15: '1 a 15 días vencido',
  d16_30: '16 a 30 días vencido',
  d31_60: '31 a 60 días vencido',
  d61_90: '61 a 90 días vencido',
  d90: 'Más de 90 días vencido',
};

/** Rango de un pedido según sus días vencidos (0 o negativo = aún no vence). Igual al del servidor. */
export function rangoAntiguedad(diasVencido: number): RangoAntiguedad {
  const dias = Number(diasVencido) || 0;
  if (dias <= 0) return 'sin_vencer';
  if (dias <= 15) return 'd1_15';
  if (dias <= 30) return 'd16_30';
  if (dias <= 60) return 'd31_60';
  if (dias <= 90) return 'd61_90';
  return 'd90';
}

/**
 * Orden de la lista de clientes (ticket 1130). Ticket 1467 suma «mayor saldo vencido», «límite de pago más
 * próximo» y «más pedidos». `vencido` es por días vencido; `saldoVencido`, por monto vencido.
 */
export type OrdenCartera = 'saldo' | 'vencido' | 'nombre' | 'saldoVencido' | 'limite' | 'pedidos';

export const ORDEN_OPTIONS: { labelKey: string; value: OrdenCartera }[] = [
  { labelKey: 'cartera.filtros.ordenSaldo',        value: 'saldo' },
  { labelKey: 'cartera.filtros.ordenSaldoVencido', value: 'saldoVencido' },
  { labelKey: 'cartera.filtros.ordenVencido',      value: 'vencido' },
  { labelKey: 'cartera.filtros.ordenLimite',       value: 'limite' },
  { labelKey: 'cartera.filtros.ordenPedidos',      value: 'pedidos' },
  { labelKey: 'cartera.filtros.ordenNombre',       value: 'nombre' },
];

/** Metadatos de un badge de estado de pago (para el detalle de pedidos). */
export interface PagoBadgeMeta {
  label: string;
  badgeClass: string;
}

/**
 * Estados de pago que pueden aparecer en cartera (Pendiente/Pospendiente/
 * PreAprobado + legacy). Colores alineados a los tokens $badge-pago-* usados
 * en tesorería para mantener paridad visual entre pantallas.
 */
export const PAGO_BADGE_META: { [estado: string]: PagoBadgeMeta } = {
  Pendiente:      { label: 'Pendiente',    badgeClass: 'cx-badge-pendiente' },
  Pospendiente:   { label: 'Por revisar',  badgeClass: 'cx-badge-pendiente' },
  PreAprobado:    { label: 'Pre-aprobado', badgeClass: 'cx-badge-preaprobado' },
  'Pago Parcial': { label: 'Pago parcial', badgeClass: 'cx-badge-preaprobado' },
  Procesando:     { label: 'Procesando',   badgeClass: 'cx-badge-preaprobado' },
};

/** Metadatos de un estado de pago, con fallback seguro. */
export function metaPago(estado: string): PagoBadgeMeta {
  return PAGO_BADGE_META[estado] || { label: estado || '—', badgeClass: 'cx-badge-neutral' };
}
