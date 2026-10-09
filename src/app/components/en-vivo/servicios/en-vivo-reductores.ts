import {
  CifrasEnVivo,
  CifrasGlobalEnVivo,
  ETAPAS_CON_HORA,
  EstadoEnVivo,
  EtapaId,
  EventoEnVivo,
  FotoEnVivo,
  FotoGlobalEnVivo,
  MensajeroEnVivo,
  PedidoEnVivo,
  ProductoEstrella,
  VistaEnVivo,
} from './en-vivo.modelos';
import { msDe, tipoDeTransportador } from './en-vivo-reglas';

/**
 * Reductores del estado de "En vivo": funciones PURAS que aplican lo que llega del
 * canal (foto, evento, cifras) a un `EstadoEnVivo` nuevo, sin tocar el anterior.
 * Sin Angular y sin reloj (la hora entra por parámetro), para probarlas con node suelto.
 *
 * El front NO suma ni calcula cifras: las de dinero y conteos salen del servidor.
 * Aquí solo se reubican pedidos y se deduplican eventos.
 */

/** Eventos que se conservan en el modelo (la lista muestra los más recientes). */
export const MAX_EVENTOS = 200;

/** Etapas en las que el pedido no vende: monto 0 y `cancelado: true`, igual que la proyección del servidor. */
const ETAPAS_QUE_NO_VENDEN: ReadonlyArray<EtapaId> = ['cancelado', 'rechazado'];

/** Atajos de hora que el servidor mantiene junto a `horas`. */
const ATAJO_DE_ETAPA: Readonly<Partial<Record<EtapaId, 'tL' | 'tS' | 'tE'>>> = {
  listo: 'tL',
  camino: 'tS',
  entregado: 'tE',
};

export function estadoInicial(vista: VistaEnVivo = 'comercio', empresa: string | null = null): EstadoEnVivo {
  return {
    conexion: 'detenido',
    motivoSinAcceso: null,
    disponible: null,
    cargado: false,
    vista,
    empresa,
    soloLectura: false,
    soloPropias: false,
    etapas: [],
    cifras: null,
    cifrasGlobal: null,
    pedidos: [],
    flota: [],
    eventos: [],
    radar: null,
    opttia: null,
    actualizadoEn: null,
  };
}

// ── Eventos ─────────────────────────────────────────────────────────────────

/**
 * Suma `entrantes` a `actuales` sin repetir ids y deja todo del más nuevo al más viejo.
 * Los que ya estaban conservan su lugar; los empates de hora los resuelve el orden de llegada.
 */
export function fusionarEventos(
  actuales: ReadonlyArray<EventoEnVivo>,
  entrantes: ReadonlyArray<EventoEnVivo>,
  maximo: number = MAX_EVENTOS
): EventoEnVivo[] {
  const conocidos = new Set<string>();
  for (const evento of actuales) conocidos.add(evento.id);

  const nuevos: EventoEnVivo[] = [];
  for (const evento of entrantes) {
    if (!evento || typeof evento.id !== 'string' || conocidos.has(evento.id)) continue;
    conocidos.add(evento.id);
    nuevos.push(evento);
  }
  if (nuevos.length === 0) return actuales.length > maximo ? actuales.slice(0, maximo) : actuales.slice();

  // Array.sort es estable: a igual hora, los nuevos quedan antes que los que ya estaban.
  return nuevos
    .concat(actuales)
    .sort((a, b) => (msDe(b.hora) ?? 0) - (msDe(a.hora) ?? 0))
    .slice(0, maximo);
}

function etapaDeEvento(evento: EventoEnVivo, actual: EtapaId): EtapaId {
  // El servidor siempre manda `etapa` (la del pedido ya actualizado); lo demás es respaldo.
  if (evento.tipo === 'cambio_estado' && evento.etapaNueva) return evento.etapaNueva;
  if (evento.etapa) return evento.etapa;
  switch (evento.tipo) {
    case 'entregado':
    case 'rechazado':
    case 'cancelado':
      return evento.tipo;
    case 'salida':
      return 'camino';
    default:
      return actual;
  }
}

/**
 * Pedido ya actualizado con lo que dice el evento (crea el pedido si no estaba). Cada evento
 * trae solo lo suyo: el estado en `cambio_estado` y `pedido_nuevo`, el pago en `pago_confirmado`
 * y el transportador en `salida` y `asignado`; de todos, `etapa` y los datos copiados del pedido.
 */
function pedidoDesdeEvento(previo: PedidoEnVivo | undefined, evento: EventoEnVivo): PedidoEnVivo {
  const ms = msDe(evento.hora);
  const base: PedidoEnVivo = previo ?? {
    id: evento.pedidoId,
    numero: evento.numero ?? null,
    estadoProceso: null,
    estadoPago: null,
    transportador: null,
    etapa: 'recibido',
    creado: evento.hora ?? null,
    tC: ms,
    tL: null,
    tS: null,
    tE: null,
    horas: { recibido: ms },
    monto: 0,
    canal: 'Web',
    cliente: null,
    ciudad: null,
    barrio: null,
    ia: false,
    cancelado: false,
  };

  const etapa = etapaDeEvento(evento, base.etapa);
  const horas = { ...base.horas };
  const atajos = { tL: base.tL ?? null, tS: base.tS ?? null, tE: base.tE ?? null };
  // Como el distribuidor: la hora se estampa solo cuando el pedido ENTRA a una etapa nueva, y la
  // primera hora vista manda. Un pago o una asignación no inventan la hora de una etapa cumplida antes.
  const cambioDeEtapa = !previo || etapa !== previo.etapa;
  if (cambioDeEtapa && ETAPAS_CON_HORA.indexOf(etapa) !== -1 && (horas[etapa] === undefined || horas[etapa] === null) && ms !== null) {
    horas[etapa] = ms;
    const atajo = ATAJO_DE_ETAPA[etapa];
    if (atajo && atajos[atajo] === null) atajos[atajo] = ms;
  }

  let estadoProceso = base.estadoProceso;
  let estadoPago = base.estadoPago;
  let transportador = base.transportador;
  let tipoTransportador = base.tipoTransportador;
  switch (evento.tipo) {
    case 'cambio_estado':
      estadoProceso = evento.estadoNuevo ?? estadoProceso;
      break;
    case 'pedido_nuevo':
      estadoProceso = evento.estado ?? estadoProceso;
      break;
    case 'pago_confirmado':
      estadoPago = evento.estadoPago ?? estadoPago;
      break;
    case 'salida':
    case 'asignado':
      transportador = evento.transportador ?? transportador;
      tipoTransportador = evento.tipoTransportador ?? tipoTransportador;
      break;
    default:
      break;
  }

  const noVende = ETAPAS_QUE_NO_VENDEN.indexOf(etapa) !== -1;
  return {
    ...base,
    numero: evento.numero ?? base.numero,
    estadoProceso,
    estadoPago,
    transportador,
    tipoTransportador,
    etapa,
    horas,
    ...atajos,
    monto: noVende ? 0 : evento.monto ?? base.monto,
    canal: evento.canal ?? base.canal,
    cliente: evento.cliente ?? base.cliente,
    ciudad: evento.ciudad ?? base.ciudad,
    barrio: evento.barrio ?? base.barrio,
    dane: evento.dane ?? base.dane,
    ia: evento.ia ?? base.ia,
    cancelado: noVende,
  };
}

export interface ResultadoEvento {
  estado: EstadoEnVivo;
  /** false si el id ya se conocía: no hay nada que animar ni contar. */
  nuevo: boolean;
}

/**
 * Aplica un evento en vivo: lo suma a la lista (deduplicado por id) y repinta el pedido.
 * En toda Katuq no hay lista de pedidos (solo eventos y cifras de plataforma).
 */
export function aplicarEvento(estado: EstadoEnVivo, evento: EventoEnVivo): ResultadoEvento {
  if (!evento || typeof evento.id !== 'string') return { estado, nuevo: false };
  if (estado.eventos.some((e) => e.id === evento.id)) return { estado, nuevo: false };

  const eventos = fusionarEventos(estado.eventos, [evento]);
  if (estado.vista === 'katuq') return { estado: { ...estado, eventos }, nuevo: true };

  const indice = estado.pedidos.findIndex((p) => p.id === evento.pedidoId);
  const pedido = pedidoDesdeEvento(indice === -1 ? undefined : estado.pedidos[indice], evento);
  const pedidos = estado.pedidos.slice();
  if (indice === -1) pedidos.push(pedido);
  else pedidos[indice] = pedido;
  return { estado: { ...estado, eventos, pedidos }, nuevo: true };
}

// ── Foto ────────────────────────────────────────────────────────────────────

function cambioDePedido(anterior: PedidoEnVivo | undefined, actual: PedidoEnVivo): boolean {
  return (
    !anterior ||
    anterior.estadoProceso !== actual.estadoProceso ||
    // `pedido_nuevo` no trae el estado de pago: un pedido que nació por evento lo tiene en null
    // (desconocido) hasta la próxima foto, y eso no es un cambio que contar.
    (anterior.estadoPago !== null && anterior.estadoPago !== actual.estadoPago) ||
    anterior.transportador !== actual.transportador ||
    anterior.etapa !== actual.etapa
  );
}

/**
 * Cuántos cambios hubo mientras no había conexión, para "Te pusimos al día: N cambios".
 * Es lo mayor entre los eventos de la foto que no se conocían y los pedidos que llegaron
 * o cambiaron de estado, pago, transportador o etapa: el servidor solo guarda los últimos
 * 60 eventos, y con una caída larga los pedidos son el conteo más fiel.
 */
export function contarCambios(previo: EstadoEnVivo, foto: FotoEnVivo | FotoGlobalEnVivo): number {
  const vistos = new Set<string>();
  for (const evento of previo.eventos) vistos.add(evento.id);
  const eventosNuevos = (foto.eventos || []).filter((e) => e && !vistos.has(e.id)).length;

  let pedidosCambiados = 0;
  const pedidosFoto = (foto as FotoEnVivo).pedidos;
  if (Array.isArray(pedidosFoto)) {
    const anteriores = new Map<string, PedidoEnVivo>();
    for (const pedido of previo.pedidos) anteriores.set(pedido.id, pedido);
    for (const pedido of pedidosFoto) {
      if (cambioDePedido(anteriores.get(pedido.id), pedido)) pedidosCambiados += 1;
    }
  }
  return Math.max(eventosNuevos, pedidosCambiados);
}

/**
 * La foto no marca si el transportador de un pedido es mensajero propio o transportadora
 * (solo los eventos `salida` y `asignado` lo traen): se completa con la regla del servidor,
 * comparando con los nombres de la `flota`. Sin transportador queda como llegó.
 */
function conTipoDeTransportador(pedido: PedidoEnVivo, flota: ReadonlyArray<MensajeroEnVivo>): PedidoEnVivo {
  if (pedido.tipoTransportador !== undefined || !pedido.transportador) return pedido;
  return { ...pedido, tipoTransportador: tipoDeTransportador(pedido.transportador, flota) };
}

export interface ResultadoFoto {
  estado: EstadoEnVivo;
  /** Cambios que se pusieron al día; 0 en la primera foto o si no fue tras una caída. */
  cambios: number;
}

/**
 * Aplica una foto completa: reemplaza pedidos, flota, cifras y etapas, y suma sus eventos
 * a la lista sin repetir. `trasCorte` = primera foto tras una caída o una pausa.
 */
export function aplicarFoto(
  estado: EstadoEnVivo,
  foto: FotoEnVivo | FotoGlobalEnVivo,
  opciones: { trasCorte: boolean; ahoraMs: number }
): ResultadoFoto {
  const cambios = estado.cargado && opciones.trasCorte ? contarCambios(estado, foto) : 0;
  // La foto trae los eventos del más viejo al más nuevo; al revés, los empates de hora quedan con el más nuevo primero.
  const eventos = fusionarEventos(estado.eventos, (foto.eventos || []).slice().reverse());
  const generado = msDe(foto.generadoEn) ?? opciones.ahoraMs;

  const comun = {
    ...estado,
    disponible: true,
    motivoSinAcceso: null,
    cargado: true,
    etapas: foto.etapas && foto.etapas.length > 0 ? foto.etapas : estado.etapas,
    eventos,
    radar: foto.radar ?? estado.radar,
    opttia: foto.opttia ?? estado.opttia,
    actualizadoEn: generado,
  };

  if (estado.vista === 'katuq') {
    const global = foto as FotoGlobalEnVivo;
    return { estado: { ...comun, cifrasGlobal: global.cifras ?? estado.cifrasGlobal }, cambios };
  }

  const comercio = foto as FotoEnVivo;
  const flota = comercio.flota ?? [];
  return {
    estado: {
      ...comun,
      empresa: comercio.empresa ?? estado.empresa,
      soloLectura: comercio.soloLectura === true,
      soloPropias: comercio.soloPropias === true,
      cifras: comercio.cifras ?? estado.cifras,
      pedidos: (comercio.pedidos ?? []).map((p) => conTipoDeTransportador(p, flota)),
      flota,
    },
    cambios,
  };
}

/**
 * Mensaje `cifras`: el servidor recalculó hoy y ayer. Se reemplaza completo (el front no suma).
 * Única excepción: `productosEstrella`, que el mensaje no trae (solo la foto y el radar), se conserva.
 */
export function aplicarCifras(estado: EstadoEnVivo, cifras: CifrasEnVivo | CifrasGlobalEnVivo): EstadoEnVivo {
  if (estado.vista === 'katuq') return { ...estado, cifrasGlobal: cifras as CifrasGlobalEnVivo };
  const nuevas = cifras as CifrasEnVivo;
  const productos = estado.cifras?.productosEstrella;
  const conservar = nuevas.productosEstrella === undefined && productos !== undefined;
  return { ...estado, cifras: conservar ? { ...nuevas, productosEstrella: productos } : nuevas };
}

/**
 * Los productos estrella de hoy del comercio: los del `radar` (se renuevan cada 30 s) y, si aún
 * no llegó, los de la foto. En toda Katuq no hay.
 */
export function productosEstrellaDe(estado: EstadoEnVivo): ReadonlyArray<ProductoEstrella> {
  return estado.radar?.productosEstrella ?? estado.cifras?.productosEstrella ?? [];
}
