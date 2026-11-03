import {
  CarteraCliente,
  CarteraPedido,
} from '../../shared/services/cartera/cartera.models';
import {
  AGING_BUCKETS,
  COMPROMISO_OPTIONS,
  CompromisoFiltro,
  ESTADO_PAGO_OPTIONS,
  FACTURA_OPTIONS,
  FacturaFiltro,
  grupoEstadoPago,
  OrdenCartera,
  RANGO_ANTIGUEDAD_LABEL,
  RangoAntiguedad,
  rangoAntiguedad,
  esClienteCredito,
  RISK_OPTIONS,
  RiskFilter,
  TIPO_PERSONA_OPTIONS,
  TipoPersonaFiltro,
  VENCE_OPTIONS,
  VenceFiltro,
  ORDEN_OPTIONS,
} from './cartera.constants';

/**
 * Ticket 1467 — Filtros de Cartera. UN solo modelo de filtros y UNA sola función que los aplica, para
 * que «Cartera por cliente», «Aging (Antigüedad)», el Excel y el PDF vean exactamente lo mismo.
 * Todo es puro (sin Angular), así se puede probar y compartir por la URL.
 */

/** Valor de «Vendedor» para los clientes sin vendedor asignado. */
export const SIN_VENDEDOR = '__sin_vendedor__';

export interface CarteraFiltros {
  busqueda: string;
  riesgo: RiskFilter;
  tipoPersona: TipoPersonaFiltro;
  /** Selección múltiple; SIN_VENDEDOR = clientes sin vendedor. Vacío = todos. */
  vendedores: string[];
  /** Selección múltiple de rangos de antigüedad (por pedido). Vacío = todos. */
  antiguedad: RangoAntiguedad[];
  /** Estados de pago (por pedido): Pendiente, Pospendiente, PreAprobado, PagoParcial, Procesando, Credito. Vacío = todos. */
  estadosPago: string[];
  factura: FacturaFiltro;
  vence: VenceFiltro;
  /** Saldo mínimo y máximo del cliente (lo que se ve con los demás filtros); null = sin tope. */
  saldoMin: number | null;
  saldoMax: number | null;
  /** Fechas «AAAA-MM-DD» ('' = sin límite). */
  compraDesde: string;
  compraHasta: string;
  entregaDesde: string;
  entregaHasta: string;
  limiteDesde: string;
  limiteHasta: string;
  compromiso: CompromisoFiltro;
  /** Cartera interna (ticket 1461): pide al servidor incluir empleados, socios y empresa propia. */
  incluirInternos: boolean;
  orden: OrdenCartera;
}

export function filtrosVacios(orden: OrdenCartera = 'saldo'): CarteraFiltros {
  return {
    busqueda: '',
    riesgo: 'todos',
    tipoPersona: 'todos',
    vendedores: [],
    antiguedad: [],
    estadosPago: [],
    factura: 'todas',
    vence: 'todos',
    saldoMin: null,
    saldoMax: null,
    compraDesde: '',
    compraHasta: '',
    entregaDesde: '',
    entregaHasta: '',
    limiteDesde: '',
    limiteHasta: '',
    compromiso: 'todos',
    incluirInternos: false,
    orden,
  };
}

/** Filtros que viven en el panel «Más filtros» (para abrirlo solo y contar cuántos hay). */
export function cuantosFiltrosAvanzados(f: CarteraFiltros): number {
  let n = 0;
  if (f.tipoPersona !== 'todos') n++;
  if (f.estadosPago.length) n++;
  if (f.factura !== 'todas') n++;
  if (f.vence !== 'todos') n++;
  if (f.saldoMin != null || f.saldoMax != null) n++;
  if (f.compraDesde || f.compraHasta) n++;
  if (f.entregaDesde || f.entregaHasta) n++;
  if (f.limiteDesde || f.limiteHasta) n++;
  if (f.compromiso !== 'todos') n++;
  if (f.incluirInternos) n++;
  return n;
}

/** ¿Hay algún filtro activo? (el orden no es un filtro). */
export function hayFiltrosActivos(f: CarteraFiltros): boolean {
  return !!f.busqueda.trim() || f.riesgo !== 'todos' || f.vendedores.length > 0 || f.antiguedad.length > 0 ||
    cuantosFiltrosAvanzados(f) > 0;
}

/** Rangos con el primer valor mayor que el segundo (mínimo > máximo, desde > hasta): no dejan pasar nada. */
export type RangoInvertido = 'saldo' | 'compra' | 'entrega' | 'limite';
export function rangosInvertidos(f: CarteraFiltros): RangoInvertido[] {
  const lista: RangoInvertido[] = [];
  if (f.saldoMin != null && f.saldoMax != null && f.saldoMin > f.saldoMax) lista.push('saldo');
  if (f.compraDesde && f.compraHasta && f.compraDesde > f.compraHasta) lista.push('compra');
  if (f.entregaDesde && f.entregaHasta && f.entregaDesde > f.entregaHasta) lista.push('entrega');
  if (f.limiteDesde && f.limiteHasta && f.limiteDesde > f.limiteHasta) lista.push('limite');
  return lista;
}

/** ¿Algún filtro recorta los pedidos de cada cliente (y no solo la lista de clientes)? */
export function filtraPedidos(f: CarteraFiltros): boolean {
  return f.antiguedad.length > 0 || f.estadosPago.length > 0 || f.factura !== 'todas' || f.vence !== 'todos' ||
    !!(f.compraDesde || f.compraHasta || f.entregaDesde || f.entregaHasta || f.limiteDesde || f.limiteHasta) ||
    f.compromiso !== 'todos';
}

// ── Cómo se aplican ─────────────────────────────────────────────────────────

/** «AAAA-MM-DD» de una fecha ISO, en la hora local (la misma que muestra la pantalla). */
function diaLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function enRangoDeFechas(iso: string | null | undefined, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true;
  const dia = diaLocal(iso);
  if (!dia) return false; // sin fecha no se puede saber si cae en el rango
  if (desde && dia < desde) return false;
  if (hasta && dia > hasta) return false;
  return true;
}

/** ¿El pedido cumple los filtros que se miran pedido por pedido? */
export function pedidoCumple(p: CarteraPedido, f: CarteraFiltros, ahora: Date = new Date()): boolean {
  const dias = Number(p.diasVencido) || 0;
  if (f.antiguedad.length && !f.antiguedad.includes(rangoAntiguedad(dias))) return false;
  if (f.estadosPago.length && !f.estadosPago.includes(grupoEstadoPago(p.estadoPago))) return false;
  if (f.factura === 'con' && !p.factura) return false;
  if (f.factura === 'sin' && p.factura) return false;
  if (f.vence !== 'todos') {
    if (!p.payDueDate) return false; // sin fecha límite no se sabe cuándo vence
    if (f.vence === 'hoy') {
      // «Hoy» = el límite cae en el día de hoy (hora local), no «lleva menos de 24 h vencido».
      if (diaLocal(p.payDueDate) !== diaLocal(ahora.toISOString())) return false;
    } else {
      const ventana = f.vence === '7' ? 7 : 30;
      if (dias > 0 || dias < -ventana) return false;
    }
  }
  if (!enRangoDeFechas(p.fechaCompra, f.compraDesde, f.compraHasta)) return false;
  if (!enRangoDeFechas(p.fechaEntrega, f.entregaDesde, f.entregaHasta)) return false;
  if (!enRangoDeFechas(p.payDueDate, f.limiteDesde, f.limiteHasta)) return false;
  if (f.compromiso === 'con' && !p.compromiso) return false;
  if (f.compromiso === 'incumplido' && !(p.compromiso && p.compromiso.estado === 'incumplido')) return false;
  return true;
}

function claveCliente(c: CarteraCliente): string {
  return c.documento || c.nombre || '';
}

/** ¿El cliente cumple los filtros que se miran cliente por cliente? */
export function clienteCumple(c: CarteraCliente, f: CarteraFiltros): boolean {
  const term = f.busqueda.trim().toLowerCase();
  if (term) {
    const nombre = (c.nombre || '').toLowerCase();
    const doc = (c.documento || '').toLowerCase();
    if (!nombre.includes(term) && !doc.includes(term)) return false;
  }
  switch (f.riesgo) {
    case 'vencida':
      if (!(c.vencido > 0)) return false;
      break;
    case 'cupo80':
      if (c.cupoUsadoPct == null || c.cupoUsadoPct <= 80) return false;
      break;
    case 'excede':
      if (!c.excedeCupo) return false;
      break;
    case 'credito':
      // Ticket 1502: crédito = cliente con cupo mayor a 0.
      if (!esClienteCredito(c.creditLimit)) return false;
      break;
    case 'contado':
      if (esClienteCredito(c.creditLimit)) return false;
      break;
  }
  if (f.tipoPersona !== 'todos' && (c.tipoPersona || '') !== f.tipoPersona) return false;
  if (f.vendedores.length) {
    const vendedor = (c.vendedor || '').trim();
    const clave = vendedor || SIN_VENDEDOR;
    if (!f.vendedores.includes(clave)) return false;
  }
  return true;
}

/** Un cliente tal como se ve con los filtros: sus pedidos y su saldo visibles. */
export interface FilaVista {
  cliente: CarteraCliente;
  pedidos: CarteraPedido[];
  saldo: number;
}

export interface VistaCartera {
  /** En el orden elegido. */
  filas: FilaVista[];
  clientes: CarteraCliente[];
  /** Saldo de todo lo que se ve. */
  total: number;
  /** ¿Algún filtro recorta los pedidos? (entonces el saldo de cada cliente es el de sus pedidos visibles). */
  recortaPedidos: boolean;
  /** Pedidos y saldo visibles por cliente. */
  porCliente: Map<string, FilaVista>;
}

function sumaSaldo(pedidos: CarteraPedido[]): number {
  return pedidos.reduce((suma, p) => suma + (Number(p.saldo) || 0), 0);
}

/** Fecha límite más cercana (ms) entre los pedidos visibles; Infinity si ninguno tiene. */
function limiteMasProximo(pedidos: CarteraPedido[]): number {
  let min = Infinity;
  pedidos.forEach((p) => {
    if (!p.payDueDate) return;
    const t = new Date(p.payDueDate).getTime();
    if (!isNaN(t) && t < min) min = t;
  });
  return min;
}

function maxDias(pedidos: CarteraPedido[]): number {
  return pedidos.reduce((max, p) => Math.max(max, Number(p.diasVencido) || 0), Number.MIN_SAFE_INTEGER);
}

function ordenarFilas(filas: FilaVista[], orden: OrdenCartera): FilaVista[] {
  const copia = [...filas];
  const porSaldo = (a: FilaVista, b: FilaVista) => b.saldo - a.saldo;
  switch (orden) {
    case 'nombre':
      return copia.sort((a, b) =>
        (a.cliente.nombre || '').localeCompare(b.cliente.nombre || '', 'es', { sensitivity: 'base' }));
    case 'vencido':
      return copia.sort((a, b) => maxDias(b.pedidos) - maxDias(a.pedidos) || porSaldo(a, b));
    case 'saldoVencido': {
      const vencido = (x: FilaVista) =>
        sumaSaldo(x.pedidos.filter((p) => (Number(p.diasVencido) || 0) > 0));
      return copia.sort((a, b) => vencido(b) - vencido(a) || porSaldo(a, b));
    }
    case 'limite':
      // El límite más cercano primero (el más atrasado o el que vence antes); sin fecha límite al final.
      return copia.sort((a, b) => {
        const la = limiteMasProximo(a.pedidos);
        const lb = limiteMasProximo(b.pedidos);
        if (la === lb) return porSaldo(a, b);
        return la < lb ? -1 : 1;
      });
    case 'pedidos':
      return copia.sort((a, b) => b.pedidos.length - a.pedidos.length || porSaldo(a, b));
    default:
      return copia.sort(porSaldo);
  }
}

/**
 * Aplica TODOS los filtros y el orden. Primero los de cliente; luego los de pedido recortan los pedidos
 * de cada cliente (entra solo quien se queda con al menos un pedido); al final, el saldo mínimo y máximo
 * miran el saldo que queda visible.
 */
export function aplicarFiltros(clientes: CarteraCliente[] | null | undefined, f: CarteraFiltros, ahora: Date = new Date()): VistaCartera {
  const recorta = filtraPedidos(f);
  const filas: FilaVista[] = [];
  (clientes || []).forEach((c) => {
    if (!clienteCumple(c, f)) return;
    const todos = c.pedidos || [];
    const pedidos = recorta ? todos.filter((p) => pedidoCumple(p, f, ahora)) : todos;
    if (recorta && pedidos.length === 0) return;
    const saldo = recorta ? sumaSaldo(pedidos) : Number(c.saldoPendiente) || 0;
    if (f.saldoMin != null && saldo < f.saldoMin) return;
    if (f.saldoMax != null && saldo > f.saldoMax) return;
    filas.push({ cliente: c, pedidos, saldo });
  });
  const ordenadas = ordenarFilas(filas, f.orden);
  const porCliente = new Map<string, FilaVista>();
  ordenadas.forEach((fila) => porCliente.set(claveCliente(fila.cliente), fila));
  return {
    filas: ordenadas,
    clientes: ordenadas.map((x) => x.cliente),
    total: ordenadas.reduce((suma, x) => suma + x.saldo, 0),
    recortaPedidos: recorta,
    porCliente,
  };
}

/** Saldo por rango de antigüedad de lo que se ve (sale de los pedidos visibles, con la misma regla del servidor). */
export function agingDeFila(fila: FilaVista, recortaPedidos: boolean): { [rango in RangoAntiguedad]: number } {
  const base = { sin_vencer: 0, d1_15: 0, d16_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
  if (!recortaPedidos) {
    AGING_BUCKETS.forEach((b) => { base[b.key] = Number(fila.cliente.aging?.[b.key]) || 0; });
    return base;
  }
  fila.pedidos.forEach((p) => {
    base[rangoAntiguedad(p.diasVencido)] += Number(p.saldo) || 0;
  });
  return base;
}

// ── Chips: los filtros activos en palabras ──────────────────────────────────

/** Un filtro activo, listo para pintar como etiqueta con X (y para describir las descargas). */
export interface ChipFiltro {
  id: string;
  /** Clave i18n del nombre del filtro y su valor (en pantalla). */
  grupoKey: string;
  valorKey?: string;
  valorParams?: { [k: string]: string };
  /** Valor ya escrito (nombre de vendedor, búsqueda, fechas, montos). */
  valorTexto?: string;
  /** Lo mismo en español fijo, para el Excel, el PDF y el nombre del archivo (las descargas van en español). */
  grupoEs: string;
  valorEs: string;
  /** Filtros que quedan al quitar este. */
  quitar: (f: CarteraFiltros) => CarteraFiltros;
}

function dineroEs(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

/** «dd/mm/aaaa» de «AAAA-MM-DD». */
function fechaEs(dia: string): string {
  const [a, m, d] = dia.split('-');
  return a && m && d ? `${d}/${m}/${a}` : dia;
}

function rangoTexto(desde: string, hasta: string, formato: (v: string) => string): { es: string; key: string; params: { [k: string]: string } } {
  if (desde && hasta) return { es: `${formato(desde)} a ${formato(hasta)}`, key: 'cartera.filtros.rangoEntre', params: { desde: formato(desde), hasta: formato(hasta) } };
  if (desde) return { es: `desde ${formato(desde)}`, key: 'cartera.filtros.rangoDesde', params: { desde: formato(desde) } };
  return { es: `hasta ${formato(hasta)}`, key: 'cartera.filtros.rangoHasta', params: { hasta: formato(hasta) } };
}

const ES_RIESGO: { [k in RiskFilter]: string } = {
  todos: 'Todos', vencida: 'Con cartera vencida', cupo80: 'Cupo > 80 %', excede: 'Exceden cupo', contado: 'Contado', credito: 'Crédito',
};
const ES_TIPO: { [k in TipoPersonaFiltro]: string } = { todos: 'Todos', empresa: 'Empresa (NIT)', persona: 'Persona (CC)' };
const ES_PAGO: { [k: string]: string } = {
  Pendiente: 'Pendiente', Pospendiente: 'Pago en revisión', PreAprobado: 'Preaprobado', PagoParcial: 'Pago parcial',
  Procesando: 'Procesando', Credito: 'Crédito',
};
const ES_FACTURA: { [k in FacturaFiltro]: string } = { todas: 'Todas', con: 'Con factura', sin: 'Sin factura' };
const ES_VENCE: { [k in VenceFiltro]: string } = { todos: 'Todos', hoy: 'Hoy', '7': 'Próximos 7 días', '30': 'Próximos 30 días' };
const ES_COMPROMISO: { [k in CompromisoFiltro]: string } = { todos: 'Todos', con: 'Con compromiso de pago', incumplido: 'Compromiso incumplido' };
export const ES_ORDEN: { [k in OrdenCartera]: string } = {
  saldo: 'Mayor saldo primero', saldoVencido: 'Mayor saldo vencido primero', vencido: 'Más días vencido primero',
  limite: 'Límite de pago más próximo primero', pedidos: 'Más pedidos primero', nombre: 'Nombre (A-Z)',
};

function claveOpcion(lista: { labelKey: string; value: string }[], valor: string): string {
  const o = lista.find((x) => x.value === valor);
  return o ? o.labelKey : '';
}

/** Los filtros activos, uno por valor (en las selecciones múltiples) para quitarlos de a uno. */
export function describirFiltros(f: CarteraFiltros): ChipFiltro[] {
  const chips: ChipFiltro[] = [];
  const busqueda = f.busqueda.trim();
  if (busqueda) {
    chips.push({ id: 'busqueda', grupoKey: 'cartera.filtros.grupoBusqueda', valorTexto: `"${busqueda}"`, grupoEs: 'Búsqueda', valorEs: `"${busqueda}"`,
      quitar: (x) => ({ ...x, busqueda: '' }) });
  }
  if (f.riesgo !== 'todos') {
    chips.push({ id: 'riesgo', grupoKey: 'cartera.carteraClientes.riesgo', valorKey: claveOpcion(RISK_OPTIONS, f.riesgo), grupoEs: 'Riesgo', valorEs: ES_RIESGO[f.riesgo],
      quitar: (x) => ({ ...x, riesgo: 'todos' }) });
  }
  if (f.tipoPersona !== 'todos') {
    chips.push({ id: 'tipo', grupoKey: 'cartera.filtros.grupoTipo', valorKey: claveOpcion(TIPO_PERSONA_OPTIONS, f.tipoPersona), grupoEs: 'Tipo de cliente', valorEs: ES_TIPO[f.tipoPersona],
      quitar: (x) => ({ ...x, tipoPersona: 'todos' }) });
  }
  f.vendedores.forEach((v) => {
    const sin = v === SIN_VENDEDOR;
    chips.push({ id: 'vendedor:' + v, grupoKey: 'cartera.carteraClientes.vendedor',
      valorKey: sin ? 'cartera.filtros.sinVendedor' : undefined, valorTexto: sin ? undefined : v,
      grupoEs: 'Vendedor', valorEs: sin ? 'Sin vendedor' : v,
      quitar: (x) => ({ ...x, vendedores: x.vendedores.filter((y) => y !== v) }) });
  });
  f.antiguedad.forEach((r) => {
    const meta = ANTIGUEDAD_CLAVE[r];
    chips.push({ id: 'antiguedad:' + r, grupoKey: 'cartera.carteraClientes.antiguedad', valorKey: meta, grupoEs: 'Antigüedad', valorEs: RANGO_ANTIGUEDAD_LABEL[r],
      quitar: (x) => ({ ...x, antiguedad: x.antiguedad.filter((y) => y !== r) }) });
  });
  f.estadosPago.forEach((e) => {
    chips.push({ id: 'pago:' + e, grupoKey: 'cartera.filtros.grupoPago', valorKey: claveOpcion(ESTADO_PAGO_OPTIONS, e), valorTexto: claveOpcion(ESTADO_PAGO_OPTIONS, e) ? undefined : e,
      grupoEs: 'Estado de pago', valorEs: ES_PAGO[e] || e,
      quitar: (x) => ({ ...x, estadosPago: x.estadosPago.filter((y) => y !== e) }) });
  });
  if (f.vence !== 'todos') {
    chips.push({ id: 'vence', grupoKey: 'cartera.filtros.grupoVence', valorKey: claveOpcion(VENCE_OPTIONS, f.vence), grupoEs: 'Vence', valorEs: ES_VENCE[f.vence],
      quitar: (x) => ({ ...x, vence: 'todos' }) });
  }
  if (f.factura !== 'todas') {
    chips.push({ id: 'factura', grupoKey: 'cartera.filtros.grupoFactura', valorKey: claveOpcion(FACTURA_OPTIONS, f.factura), grupoEs: 'Factura', valorEs: ES_FACTURA[f.factura],
      quitar: (x) => ({ ...x, factura: 'todas' }) });
  }
  if (f.saldoMin != null || f.saldoMax != null) {
    const min = f.saldoMin, max = f.saldoMax;
    let es: string, key: string, params: { [k: string]: string };
    if (min != null && max != null) { es = `${dineroEs(min)} a ${dineroEs(max)}`; key = 'cartera.filtros.rangoEntre'; params = { desde: dineroEs(min), hasta: dineroEs(max) }; }
    else if (min != null) { es = `desde ${dineroEs(min)}`; key = 'cartera.filtros.rangoDesde'; params = { desde: dineroEs(min) }; }
    else { es = `hasta ${dineroEs(max as number)}`; key = 'cartera.filtros.rangoHasta'; params = { hasta: dineroEs(max as number) }; }
    chips.push({ id: 'saldo', grupoKey: 'cartera.filtros.grupoSaldo', valorKey: key, valorParams: params, grupoEs: 'Saldo', valorEs: es,
      quitar: (x) => ({ ...x, saldoMin: null, saldoMax: null }) });
  }
  const fechas: { id: string; grupoKey: string; grupoEs: string; desde: string; hasta: string; quitar: (x: CarteraFiltros) => CarteraFiltros }[] = [
    { id: 'compra', grupoKey: 'cartera.filtros.grupoCompra', grupoEs: 'Fecha de compra', desde: f.compraDesde, hasta: f.compraHasta,
      quitar: (x) => ({ ...x, compraDesde: '', compraHasta: '' }) },
    { id: 'entrega', grupoKey: 'cartera.filtros.grupoEntrega', grupoEs: 'Fecha de entrega', desde: f.entregaDesde, hasta: f.entregaHasta,
      quitar: (x) => ({ ...x, entregaDesde: '', entregaHasta: '' }) },
    { id: 'limite', grupoKey: 'cartera.filtros.grupoLimite', grupoEs: 'Límite de pago', desde: f.limiteDesde, hasta: f.limiteHasta,
      quitar: (x) => ({ ...x, limiteDesde: '', limiteHasta: '' }) },
  ];
  fechas.filter((x) => x.desde || x.hasta).forEach((x) => {
    const r = rangoTexto(x.desde, x.hasta, fechaEs);
    chips.push({ id: x.id, grupoKey: x.grupoKey, valorKey: r.key, valorParams: r.params, grupoEs: x.grupoEs, valorEs: r.es, quitar: x.quitar });
  });
  if (f.compromiso !== 'todos') {
    chips.push({ id: 'compromiso', grupoKey: 'cartera.filtros.grupoCompromiso', valorKey: claveOpcion(COMPROMISO_OPTIONS, f.compromiso), grupoEs: 'Compromiso de pago', valorEs: ES_COMPROMISO[f.compromiso],
      quitar: (x) => ({ ...x, compromiso: 'todos' }) });
  }
  if (f.incluirInternos) {
    chips.push({ id: 'internos', grupoKey: 'cartera.filtros.grupoInternos', valorKey: 'cartera.filtros.internosSi', grupoEs: 'Incluir internos', valorEs: 'Sí',
      quitar: (x) => ({ ...x, incluirInternos: false }) });
  }
  return chips;
}

const ANTIGUEDAD_CLAVE: { [r in RangoAntiguedad]: string } = {
  sin_vencer: 'cartera.rangos.sinVencerFiltro',
  d1_15: 'cartera.rangos.d1_15Filtro',
  d16_30: 'cartera.rangos.d16_30Filtro',
  d31_60: 'cartera.rangos.d31_60Filtro',
  d61_90: 'cartera.rangos.d61_90Filtro',
  d90: 'cartera.rangos.d90Filtro',
};

/** Los filtros en una línea de español: encabezado del PDF y hoja «Filtros» del Excel. */
export function descripcionFiltrosEs(f: CarteraFiltros): string {
  const chips = describirFiltros(f);
  return chips.length ? chips.map((c) => `${c.grupoEs}: ${c.valorEs}`).join(' · ') : 'Toda la cartera';
}

/** Parte del nombre del archivo con los filtros (sin tildes ni símbolos; corta a 70 caracteres). */
export function sufijoArchivo(f: CarteraFiltros): string {
  const chips = describirFiltros(f);
  if (!chips.length) return '';
  const limpiar = (t: string) => t
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const partes = chips.map((c) => `${limpiar(c.grupoEs)}-${limpiar(c.valorEs)}`).filter((t) => t.length > 1);
  let texto = '';
  for (let i = 0; i < partes.length; i++) {
    const siguiente = texto ? `${texto}_${partes[i]}` : partes[i];
    if (siguiente.length > 70) {
      const restantes = partes.length - i;
      texto = (texto ? texto + '_' : '') + `y-${restantes}-filtros-mas`;
      break;
    }
    texto = siguiente;
  }
  return texto;
}

// ── La URL ──────────────────────────────────────────────────────────────────

/** Nombres de los parámetros de la URL que son de los filtros (para no tocar otros). */
export const PARAMS_FILTROS = [
  'q', 'riesgo', 'tipo', 'vend', 'antig', 'pago', 'fact', 'vence', 'smin', 'smax',
  'cd', 'ch', 'ed', 'eh', 'ld', 'lh', 'comp', 'int', 'orden', 'vista',
] as const;

export type ParamsUrl = { [k: string]: string | string[] | null };

function numeroOpcional(v: string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function fechaOpcional(v: string | null | undefined): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

function unicoDe<T extends string>(v: string | null | undefined, validos: readonly string[], porDefecto: T): T {
  return v && validos.includes(v) ? (v as T) : porDefecto;
}

/** Lee los filtros de la URL; lo que no se reconoce se ignora (la URL se puede escribir a mano o venir vieja). */
export function filtrosDesdeUrl(leer: { get(k: string): string | null; getAll(k: string): string[] }): CarteraFiltros {
  const rangos = AGING_BUCKETS.map((b) => b.key as string);
  const antiguedad = unicoLista(leer.getAll('antig'), rangos) as RangoAntiguedad[];
  const pagos = unicoLista(leer.getAll('pago'), ESTADO_PAGO_OPTIONS.map((o) => o.value));
  const vendedores = Array.from(new Set(leer.getAll('vend').map((v) => v.trim()).filter(Boolean)));
  const vacios = filtrosVacios();
  return {
    busqueda: (leer.get('q') || '').slice(0, 120),
    riesgo: unicoDe(leer.get('riesgo'), RISK_OPTIONS.map((o) => o.value), vacios.riesgo),
    tipoPersona: unicoDe(leer.get('tipo'), TIPO_PERSONA_OPTIONS.map((o) => o.value), vacios.tipoPersona),
    vendedores,
    antiguedad,
    estadosPago: pagos,
    factura: unicoDe(leer.get('fact'), FACTURA_OPTIONS.map((o) => o.value), vacios.factura),
    vence: unicoDe(leer.get('vence'), VENCE_OPTIONS.map((o) => o.value), vacios.vence),
    saldoMin: numeroOpcional(leer.get('smin')),
    saldoMax: numeroOpcional(leer.get('smax')),
    compraDesde: fechaOpcional(leer.get('cd')),
    compraHasta: fechaOpcional(leer.get('ch')),
    entregaDesde: fechaOpcional(leer.get('ed')),
    entregaHasta: fechaOpcional(leer.get('eh')),
    limiteDesde: fechaOpcional(leer.get('ld')),
    limiteHasta: fechaOpcional(leer.get('lh')),
    compromiso: unicoDe(leer.get('comp'), COMPROMISO_OPTIONS.map((o) => o.value), vacios.compromiso),
    incluirInternos: leer.get('int') === '1',
    orden: unicoDe(leer.get('orden'), ORDEN_OPTIONS.map((o) => o.value), vacios.orden),
  };
}

function unicoLista(valores: string[], validos: string[]): string[] {
  const set = new Set<string>();
  valores.forEach((v) => { if (validos.includes(v)) set.add(v); });
  return validos.filter((v) => set.has(v)); // en el orden de las opciones, así la URL es estable
}

/**
 * Los parámetros de la URL para unos filtros: solo los que no están en su valor por defecto; los demás
 * van en null para que Angular los quite de la dirección.
 * Ojo: la búsqueda (nombre o documento del cliente) y los nombres de vendedor viajan en la dirección: quien
 * comparte el enlace los comparte, y quedan en el historial del navegador. Siguen necesitando sesión de la
 * empresa para ver los datos. Decisión pendiente: si se prefiere, excluir «q» de la dirección.
 */
export function filtrosAUrl(f: CarteraFiltros): ParamsUrl {
  const v = filtrosVacios();
  const num = (n: number | null) => (n == null ? null : String(n));
  return {
    q: f.busqueda.trim() || null,
    riesgo: f.riesgo !== v.riesgo ? f.riesgo : null,
    tipo: f.tipoPersona !== v.tipoPersona ? f.tipoPersona : null,
    vend: f.vendedores.length ? [...f.vendedores] : null,
    // En el orden de las opciones, así la misma selección da siempre la misma dirección.
    antig: f.antiguedad.length ? AGING_BUCKETS.map((b) => b.key as string).filter((k) => f.antiguedad.includes(k as RangoAntiguedad)) : null,
    pago: f.estadosPago.length ? ESTADO_PAGO_OPTIONS.map((o) => o.value as string).filter((k) => f.estadosPago.includes(k)) : null,
    fact: f.factura !== v.factura ? f.factura : null,
    vence: f.vence !== v.vence ? f.vence : null,
    smin: num(f.saldoMin),
    smax: num(f.saldoMax),
    cd: f.compraDesde || null,
    ch: f.compraHasta || null,
    ed: f.entregaDesde || null,
    eh: f.entregaHasta || null,
    ld: f.limiteDesde || null,
    lh: f.limiteHasta || null,
    comp: f.compromiso !== v.compromiso ? f.compromiso : null,
    int: f.incluirInternos ? '1' : null,
    orden: f.orden !== v.orden ? f.orden : null,
  };
}

/** Dos filtros son iguales si dan la misma URL (para no reaccionar a nuestra propia escritura). */
export function mismosFiltros(a: CarteraFiltros, b: CarteraFiltros): boolean {
  return JSON.stringify(filtrosAUrl(a)) === JSON.stringify(filtrosAUrl(b));
}

/** Pone en null los saldos que no son un número válido (campo vacío o letras). */
export function numeroDeCampo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
