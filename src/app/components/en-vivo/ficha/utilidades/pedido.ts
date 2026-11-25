import {
  DetallePedidoEnVivo,
  ETAPAS_CON_HORA,
  EstadoEnVivo,
  EtapaInfo,
  EventoEnVivo,
  HorasPorEtapa,
  MensajeroEnVivo,
  PedidoEnVivo,
  TipoTransportador,
  VistaEnVivo,
} from '../../servicios/en-vivo.modelos';
import { claveDeTexto, primerNombre, tipoDeTransportador } from '../../servicios/en-vivo-reglas';
import { aplicarEvento, estadoInicial } from '../../servicios/en-vivo-reductores';
import { dinero, entero, estadoLegible } from '../../utilidades/formato';
import { claseTono, mapaDeEtapas } from '../../utilidades/tonos';
import { nombreDeEtapa, Traductor } from '../../utilidades/traductor';
import { AccionFicha, CeldaFicha, ContenidoPedido, LineaProducto } from '../ficha.modelos';
import { armarRecorrido, textoDeHora } from './recorrido';

/**
 * Ficha de UN pedido (diseño 12). Todo puro: recibe lo que la pantalla ya tiene (el pedido de la
 * foto, los eventos, el detalle que se pidió al abrir) y arma los textos.
 *
 * De dónde sale cada cosa:
 * - El pedido "vivo": el de la foto (se mantiene al día con los eventos) o, en toda Katuq (que no tiene
 *   lista de pedidos), el detalle más los eventos que llegaron después de pedirlo.
 * - Los productos: SOLO del detalle (`GET /pedido/:id`), que se pide una vez al abrir.
 *
 * Datos mínimos: NUNCA se lee `asesor` (el correo del asesor llega en el detalle solo para el alcance
 * D-349 del servidor) ni se pinta nada que no esté en `ContenidoPedido`.
 */

// ── Detalle pedido al servidor ──────────────────────────────────────────────

/** Estado de la petición del detalle del pedido abierto. */
export interface EstadoDetalle {
  /** Id del pedido al que pertenece (para no mezclar el de uno con otro al cambiar de ficha). */
  id: string | null;
  fase: 'ninguno' | 'cargando' | 'listo' | 'error';
  detalle: DetallePedidoEnVivo | null;
  /** Ids de eventos que ya existían al llegar el detalle: ya están reflejados en él. */
  reflejados: ReadonlyArray<string>;
}

export const SIN_DETALLE: EstadoDetalle = { id: null, fase: 'ninguno', detalle: null, reflejados: [] };

// ── El pedido para la ficha ─────────────────────────────────────────────────

function lleno<T>(a: T | null | undefined, b: T | null | undefined): T | null {
  if (a !== null && a !== undefined && (a as unknown) !== '') return a;
  return b ?? null;
}

function esHora(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/** Horas por etapa: las del pedido vivo mandan; las del detalle completan las que faltan. */
function mezclarHoras(base: HorasPorEtapa | undefined, vivas: HorasPorEtapa | undefined): HorasPorEtapa {
  const horas: HorasPorEtapa = {};
  for (const etapa of ETAPAS_CON_HORA) {
    const hora = esHora(vivas?.[etapa]) ? vivas?.[etapa] : base?.[etapa];
    if (esHora(hora)) horas[etapa] = hora;
  }
  return horas;
}

/**
 * Une el pedido vivo (de la foto, el más fresco) con el detalle (trae lo que la foto no tenía). El
 * vivo manda en todo lo que cambia (etapa, pago, transportador, monto); el detalle llena huecos.
 */
export function fusionarPedido(vivo: PedidoEnVivo, detalle: PedidoEnVivo): PedidoEnVivo {
  return {
    id: vivo.id,
    numero: lleno(vivo.numero, detalle.numero),
    empresa: lleno(vivo.empresa, detalle.empresa),
    estadoProceso: lleno(vivo.estadoProceso, detalle.estadoProceso),
    estadoPago: lleno(vivo.estadoPago, detalle.estadoPago),
    transportador: lleno(vivo.transportador, detalle.transportador),
    tipoTransportador: vivo.tipoTransportador ?? detalle.tipoTransportador,
    etapa: vivo.etapa,
    creado: lleno(vivo.creado, detalle.creado),
    tC: vivo.tC ?? detalle.tC ?? null,
    tL: vivo.tL ?? detalle.tL ?? null,
    tS: vivo.tS ?? detalle.tS ?? null,
    tE: vivo.tE ?? detalle.tE ?? null,
    horas: mezclarHoras(detalle.horas, vivo.horas),
    monto: vivo.cancelado ? 0 : vivo.monto > 0 ? vivo.monto : detalle.monto,
    canal: lleno(vivo.canal, detalle.canal) ?? 'Web',
    cliente: lleno(vivo.cliente, detalle.cliente),
    ciudad: lleno(vivo.ciudad, detalle.ciudad),
    barrio: lleno(vivo.barrio, detalle.barrio),
    dane: lleno(vivo.dane, detalle.dane),
    ia: vivo.ia,
    cancelado: vivo.cancelado,
  };
}

function instante(evento: EventoEnVivo): number {
  const ms = Date.parse(evento.hora);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Aplica eventos (del más viejo al más nuevo) sobre un pedido con las mismas reglas del reductor
 * del estado, para que la ficha de un pedido que no está en la foto también se actualice sola.
 */
export function aplicarEventosAlPedido(base: PedidoEnVivo | null, id: string, eventos: ReadonlyArray<EventoEnVivo>): PedidoEnVivo | null {
  let estado: EstadoEnVivo = { ...estadoInicial('comercio'), pedidos: base ? [base] : [] };
  const ordenados = eventos.filter((e) => e.pedidoId === id).sort((a, b) => instante(a) - instante(b));
  for (const evento of ordenados) estado = aplicarEvento(estado, evento).estado;
  return estado.pedidos.find((p) => p.id === id) ?? base;
}

/** El detalle que corresponde a este pedido y ya llegó; si es de otro pedido o no llegó, null. */
export function detalleDe(id: string, estado: EstadoDetalle): DetallePedidoEnVivo | null {
  return estado.id === id && estado.fase === 'listo' ? estado.detalle : null;
}

export interface EntradaPedido {
  id: string;
  /** Comercio dueño del pedido (solo cuenta con una sesión de Katuq). */
  empresa: string | null;
  /** El pedido en la foto, si está (solo en la vista de un comercio). */
  vivo: PedidoEnVivo | null;
  detalle: EstadoDetalle;
  /** Eventos de la pantalla (cualquier orden). */
  eventos: ReadonlyArray<EventoEnVivo>;
  flota: ReadonlyArray<MensajeroEnVivo>;
  etapas: ReadonlyArray<EtapaInfo>;
  vista: VistaEnVivo;
  /** Katuq mirando un comercio ajeno. */
  soloLectura: boolean;
  /** Nombre del comercio dueño del pedido ("" si no se sabe). */
  nombreComercio: string;
  ciudadComercio: string | null;
  /** "Ocultar clientes y montos" (en toda Katuq: comercios y montos). */
  ocultar: boolean;
  /** Ids de pasos que se acaban de cumplir. */
  nuevos: ReadonlySet<string>;
  ahoraMs: number;
  /** Traductor del componente. */
  t: Traductor;
}

/** El pedido tal como se ve AHORA: la foto (o el detalle) más lo que llegó por eventos. Null si no hay nada. */
export function pedidoParaFicha(entrada: Pick<EntradaPedido, 'id' | 'vivo' | 'detalle' | 'eventos'>): PedidoEnVivo | null {
  const { id, vivo, eventos } = entrada;
  const detalle = detalleDe(id, entrada.detalle);
  if (vivo) return detalle ? fusionarPedido(vivo, detalle) : vivo;

  // Sin pedido en la foto (toda Katuq, o un pedido fuera de la ventana): el detalle más los eventos
  // que llegaron DESPUÉS de pedirlo. Sin detalle todavía, lo que se sepa por los eventos.
  if (detalle) {
    const reflejados = new Set(entrada.detalle.reflejados);
    // `fusionarPedido(d, d)` deja solo los campos del pedido: el `asesor` y las líneas del detalle no pasan.
    return aplicarEventosAlPedido(fusionarPedido(detalle, detalle), id, eventos.filter((e) => !reflejados.has(e.id)));
  }
  return aplicarEventosAlPedido(null, id, eventos);
}

// ── Textos ──────────────────────────────────────────────────────────────────

/** Estado del pago con su tono. */
export function pagoDe(estadoPago: string | null | undefined, t: Traductor): { texto: string; clase: string } {
  const clave = claveDeTexto(estadoPago).replace(/[\s_-]+/g, '');
  switch (clave) {
    case '':
      return { texto: t('enVivo.ficha.pagoSinDato'), clase: 't-slate' };
    case 'aprobado':
    case 'pagado':
      return { texto: t('enVivo.ficha.pagoAprobado'), clase: 't-ok' };
    case 'pendiente':
      return { texto: t('enVivo.ficha.pagoPendiente'), clase: 't-warn' };
    case 'pospendiente':
      return { texto: t('enVivo.ficha.pagoEnRevision'), clase: 't-warn' };
    case 'credito':
      return { texto: t('enVivo.ficha.pagoCredito'), clase: 't-info' };
    case 'preaprobado':
      return { texto: t('enVivo.ficha.pagoPreaprobado'), clase: 't-info' };
    case 'rechazado':
      return { texto: t('enVivo.ficha.pagoRechazado'), clase: 't-bad' };
    case 'precancelado':
    case 'cancelado':
      return { texto: t('enVivo.ficha.pagoCancelado'), clase: 't-bad' };
    default: {
      const legible = estadoLegible(estadoPago);
      return { texto: legible.charAt(0).toUpperCase() + legible.slice(1), clase: 't-slate' };
    }
  }
}

const FORMATO_CANTIDAD = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Líneas del carrito para pintar ("2×", nombre, valor); sin valor con "ocultar". */
export function lineasDeProductos(
  productos: ReadonlyArray<{ nombre: string; cantidad: number; valor: number }>,
  ocultar: boolean
): LineaProducto[] {
  return productos.map((p) => ({
    cantidad: `${FORMATO_CANTIDAD.format(Number.isFinite(p.cantidad) ? p.cantidad : 0)}×`,
    nombre: p.nombre,
    valor: ocultar ? '' : dinero(p.valor),
  }));
}

/** Ruta y parámetros de "Todos los pedidos" para abrir un pedido (la pantalla de Pedidos lee `buscar` y `fecha`). */
export function destinoTodosLosPedidos(
  numero: string,
  creado: string | null
): { comandos: string[]; parametros: Record<string, string> } {
  const limpio = numero.replace(/^\s*#/, '').trim();
  const parametros: Record<string, string> = { buscar: limpio };
  if (creado && Number.isFinite(Date.parse(creado))) parametros['fecha'] = creado;
  return { comandos: ['/ventas/pedidos'], parametros };
}

function contenidoVacio(fase: 'cargando' | 'no-encontrado', t: Traductor): ContenidoPedido {
  return {
    fase,
    cliente: '',
    ubicacion: '',
    etapaNombre: '',
    etapaClase: 't-slate',
    principal: '',
    principalNota: '',
    celdas: [],
    recorrido: [],
    productosFase: 'cargando',
    productos: [],
    envio: '',
    total: '',
    acciones: [],
    nota: '',
    mensaje: t(fase === 'no-encontrado' ? 'enVivo.ficha.pedidoNoEncontrado' : 'enVivo.ficha.cargandoElPedido'),
  };
}

export interface ResultadoPedido {
  eyebrow: string;
  titulo: string;
  contenido: ContenidoPedido;
}

/** Arma la ficha de un pedido. Siempre devuelve algo que pintar (cargando, no encontrado o completo). */
export function armarPedido(entrada: EntradaPedido): ResultadoPedido {
  const { ocultar, ahoraMs, t } = entrada;
  const katuq = entrada.vista === 'katuq';
  const comercioOculto = t('enVivo.ficha.comercioEnCiudad', { ciudad: entrada.ciudadComercio || 'Colombia' });
  const nombreDelComercio = ocultar ? comercioOculto : entrada.nombreComercio;

  const pedido = pedidoParaFicha(entrada);
  if (!pedido) {
    const fallo = entrada.detalle.id === entrada.id && entrada.detalle.fase === 'error';
    return {
      eyebrow: katuq ? (nombreDelComercio || t('enVivo.ficha.todaKatuq')) : t('enVivo.ficha.pedido'),
      titulo: t('enVivo.ficha.pedido'),
      contenido: contenidoVacio(fallo ? 'no-encontrado' : 'cargando', t),
    };
  }

  const etapas = mapaDeEtapas(entrada.etapas);
  const info = etapas.get(pedido.etapa);
  const detalle = detalleDe(entrada.id, entrada.detalle);
  const numero = String(pedido.numero ?? '').replace(/^\s*#/, '');
  const empresa = entrada.empresa ?? pedido.empresa ?? null;
  const eventosDelPedido = entrada.eventos.filter((e) => e.pedidoId === entrada.id);

  // Quién lo lleva. En toda Katuq el nombre del mensajero no se muestra nunca.
  const tipo: TipoTransportador =
    pedido.tipoTransportador ?? (pedido.transportador && !katuq ? tipoDeTransportador(pedido.transportador, entrada.flota) : null);
  const transportador = pedido.transportador;
  const salida =
    !katuq && transportador
      ? tipo === 'transportadora'
        ? t('enVivo.ficha.salidaPor', { nombre: transportador })
        : t('enVivo.ficha.salidaCon', { nombre: primerNombre(transportador) })
      : '';

  const horaFinal = (() => {
    if (pedido.etapa !== 'rechazado' && pedido.etapa !== 'cancelado') return null;
    const evento = eventosDelPedido.find((e) => e.tipo === pedido.etapa);
    return evento ? instante(evento) || null : null;
  })();

  const recorrido = armarRecorrido(pedido, { etapas, ahoraMs, horaFinal, salida, nuevos: entrada.nuevos, t });

  // Celdas
  const pago = pagoDe(pedido.estadoPago, t);
  const esPos = pedido.canal === 'POS';
  const etiquetaEntrega = katuq
    ? t('enVivo.ficha.entrega')
    : tipo === 'transportadora'
    ? t('enVivo.ficha.transportadora')
    : t('enVivo.ficha.mensajero');
  const valorEntrega = esPos
    ? t('enVivo.ficha.mostrador')
    : !transportador
    ? t('enVivo.ficha.sinAsignar')
    : katuq
    ? tipo === 'transportadora'
      ? t('enVivo.ficha.transportadoraAsignada')
      : t('enVivo.ficha.mensajeroAsignado')
    : transportador;
  const celdas: CeldaFicha[] = [
    {
      etiqueta: t('enVivo.ficha.canal'),
      valor: pedido.ia ? t('enVivo.ficha.canalConOpttia', { canal: pedido.canal }) : pedido.canal,
      clase: '',
    },
    { etiqueta: t('enVivo.ficha.pago'), valor: pago.texto, clase: pago.clase },
    { etiqueta: t('enVivo.ficha.llego'), valor: textoDeHora(pedido.tC, ahoraMs, t) || t('enVivo.ficha.sinHoraRegistrada'), clase: '' },
    { etiqueta: etiquetaEntrega, valor: valorEntrega, clase: '' },
  ];

  // Productos y monto
  const productosFase: ContenidoPedido['productosFase'] = detalle
    ? 'listo'
    : entrada.detalle.id === entrada.id && entrada.detalle.fase === 'error'
    ? 'error'
    : 'cargando';
  const productos = detalle ? lineasDeProductos(detalle.productos, ocultar) : [];
  const sumaProductos = detalle ? detalle.productos.reduce((s, p) => s + (Number.isFinite(p.valor) ? p.valor : 0), 0) : 0;
  const envio = detalle && Number.isFinite(detalle.envio) ? detalle.envio : 0;
  const unidades = detalle ? detalle.productos.reduce((s, p) => s + (Number.isFinite(p.cantidad) ? p.cantidad : 0), 0) : 0;

  let principal = '';
  let principalNota = '';
  if (ocultar) {
    principal = detalle
      ? t(Math.round(unidades) === 1 ? 'enVivo.ficha.productoUno' : 'enVivo.ficha.productosVarios', { n: entero(unidades) })
      : '';
  } else if (pedido.cancelado) {
    // Un pedido cancelado muestra monto 0, pero sus líneas conservan su valor.
    principal = detalle ? dinero(sumaProductos + envio) : '';
  } else {
    principal = dinero(pedido.monto);
  }
  if (pedido.cancelado) principalNota = t('enVivo.ficha.noSumaEnVentas');

  const total = ocultar || !detalle ? '' : dinero(pedido.cancelado || pedido.monto <= 0 ? sumaProductos + envio : pedido.monto);

  // Acciones: ninguna escribe nada.
  const acciones: AccionFicha[] = [];
  if (katuq) {
    if (empresa) {
      const nombre = entrada.nombreComercio || empresa;
      acciones.push({
        tipo: 'ver-tablero',
        etiqueta: ocultar ? t('enVivo.ficha.verTableroComercio') : t('enVivo.ficha.verTablero', { nombre }),
        primaria: true,
        empresa,
        nombre,
        pedidoId: entrada.id,
      });
    }
  } else {
    if (!entrada.soloLectura && numero) {
      acciones.push({ tipo: 'abrir-pedidos', etiqueta: t('enVivo.ficha.abrirEnPedidos'), primaria: true, numero, creado: pedido.creado });
    }
    if (pedido.etapa === 'camino' && transportador && tipo === 'mensajero') {
      acciones.push({
        tipo: 'ver-mensajero',
        etiqueta: t('enVivo.ficha.verMensajero', { nombre: primerNombre(transportador) }),
        primaria: false,
        nombre: transportador,
      });
    }
  }

  const ubicacion = [pedido.ciudad, ocultar ? null : pedido.barrio].filter((x) => !!x).join(' · ');
  const eyebrow = katuq
    ? nombreDelComercio || t('enVivo.ficha.comercio')
    : entrada.soloLectura
    ? entrada.nombreComercio || t('enVivo.ficha.pedido')
    : t('enVivo.ficha.pedido');
  const nota = t(!katuq && entrada.soloLectura ? 'enVivo.ficha.notaDatosSoloLectura' : 'enVivo.ficha.notaDatos');

  return {
    eyebrow,
    titulo: numero ? t('enVivo.ficha.tituloPedido', { numero }) : t('enVivo.ficha.pedido'),
    contenido: {
      fase: 'listo',
      cliente: ocultar ? t('enVivo.ficha.cliente') : pedido.cliente || t('enVivo.ficha.cliente'),
      ubicacion,
      etapaNombre: nombreDeEtapa(pedido.etapa, info, t),
      etapaClase: claseTono(info?.tono ?? 'neutro'),
      principal,
      principalNota,
      celdas,
      recorrido,
      productosFase,
      productos,
      envio: ocultar || envio <= 0 ? '' : dinero(envio),
      total,
      acciones,
      nota,
      mensaje: '',
    },
  };
}
