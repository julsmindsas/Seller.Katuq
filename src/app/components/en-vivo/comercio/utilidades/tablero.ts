import { claseTonoCss, EtapaId, EtapaInfo, PedidoEnVivo } from '../../servicios/en-vivo.modelos';
import { primerNombre } from '../../servicios/en-vivo-reglas';
import { diaDeColombia, dinero, duracion, horaRelativa } from '../../utilidades/formato';

/**
 * Tablero "Pedidos" del comercio (diseño 18): una columna por etapa con una tarjeta por pedido.
 * El front solo UBICA los pedidos de la foto por etapa y mide cuánto llevan en ella con las
 * `horas` del pedido; qué es "tarde" lo fija la tabla de abajo. Todo puro (la hora entra por
 * parámetro).
 */

export interface DefinicionColumna {
  id: EtapaId;
  nombre: string;
}

/** Las siete columnas, en orden (los estados de proceso de Katuq). Los rechazados y cancelados no tienen columna. */
export const COLUMNAS_TABLERO: ReadonlyArray<DefinicionColumna> = [
  { id: 'recibido', nombre: 'Sin producir' },
  { id: 'produccion', nombre: 'En producción' },
  { id: 'producido', nombre: 'Producido' },
  { id: 'empacado', nombre: 'Empacado' },
  { id: 'listo', nombre: 'Para despachar' },
  { id: 'camino', nombre: 'Despachado' },
  { id: 'entregado', nombre: 'Entregados hoy' },
];

/** Minutos en la etapa a partir de los cuales una tarjeta se marca "tarde". */
export const MINUTOS_TARDE: Readonly<Partial<Record<EtapaId, number>>> = {
  recibido: 30,
  produccion: 90,
  producido: 45,
  empacado: 45,
  listo: 45,
  camino: 80,
};

/** Tarjetas por columna; en "Entregados hoy" solo las últimas. */
export const MAX_TARJETAS_COLUMNA = 40;
export const MAX_TARJETAS_ENTREGADOS = 14;

/** Una tarjeta ya armada para pintar. `nuevo` y `movida` los fija el componente (dependen de lo que vio antes). */
export interface TarjetaTablero {
  id: string;
  /** "#1027". */
  numero: string;
  /** "Laura M." o "Cliente" con "ocultar clientes y montos". */
  cliente: string;
  /** "Bogotá · Tienda en línea". */
  lugar: string;
  /** "$128.900"; vacío con "ocultar clientes y montos". */
  monto: string;
  ia: boolean;
  /** Pasó el tiempo normal de su etapa. */
  tarde: boolean;
  /** Lo que lleva en la etapa ("45 min"); en entregados, hace cuánto se entregó ("hace 12 min"). */
  tiempo: string;
  /** Quién lo lleva (solo en "Despachado"): primer nombre del mensajero o nombre de la transportadora. */
  transporte: string;
  tipoTransporte: 'mensajero' | 'transportadora' | null;
  nuevo: boolean;
  movida: boolean;
  aria: string;
}

export interface ColumnaTablero {
  id: EtapaId;
  nombre: string;
  /** Clase del tema con el tono de la etapa (`t-info`, `t-ok`...). */
  clase: string;
  /** Cuántos pedidos hay en la columna (no solo los que se ven). */
  total: number;
  tarjetas: TarjetaTablero[];
  /** Cuántos quedan sin mostrar ("y 12 más"). */
  resto: number;
}

export interface OpcionesTablero {
  ahoraMs: number;
  /** Día de Colombia de hoy (AAAA-MM-DD): en "Entregados hoy" solo cuentan los de ese día. null = sin filtro. */
  dia: string | null;
  etapas: ReadonlyMap<EtapaId, EtapaInfo>;
  ocultar: boolean;
  maximo?: number;
  maximoEntregados?: number;
}

/**
 * Instante (ms) en que el pedido entró a su etapa actual: la hora que vio el distribuidor
 * (`horas`, o los atajos `tL`/`tS`/`tE`) y, si no la vio, la de creación. null si no hay ninguna.
 */
export function entradaEnEtapa(pedido: PedidoEnVivo): number | null {
  const propia = pedido.horas ? pedido.horas[pedido.etapa] : null;
  if (typeof propia === 'number') return propia;
  const atajo =
    pedido.etapa === 'listo' ? pedido.tL : pedido.etapa === 'camino' ? pedido.tS : pedido.etapa === 'entregado' ? pedido.tE : null;
  if (typeof atajo === 'number') return atajo;
  return typeof pedido.tC === 'number' ? pedido.tC : null;
}

/**
 * ¿La tarjeta va tarde? Pasados 30 / 90 / 45 / 45 / 45 / 80 minutos en sin producir / producción /
 * producido / empacado / para despachar / despachado. Los entregados no se marcan, y tampoco el envío
 * con transportadora en "Despachado" (tarda horas por naturaleza).
 */
export function esTarde(pedido: PedidoEnVivo, enEtapaMs: number | null): boolean {
  const limite = MINUTOS_TARDE[pedido.etapa];
  if (limite === undefined || enEtapaMs === null || !Number.isFinite(enEtapaMs)) return false;
  if (pedido.etapa === 'camino' && pedido.tipoTransportador === 'transportadora') return false;
  return enEtapaMs > limite * 60000;
}

/** Un entregado cuenta si se entregó hoy (por la hora vista; sin ella, por la de creación). */
export function entregadoHoy(pedido: PedidoEnVivo, dia: string | null): boolean {
  if (dia === null) return true;
  const ms = pedido.horas?.entregado ?? pedido.tE ?? pedido.tC;
  return typeof ms === 'number' && diaDeColombia(ms) === dia;
}

function numeroDe(pedido: PedidoEnVivo): string {
  return `#${pedido.numero ?? pedido.id.slice(-6)}`;
}

function tarjetaDe(pedido: PedidoEnVivo, nombreColumna: string, o: OpcionesTablero): TarjetaTablero {
  const entrada = entradaEnEtapa(pedido);
  const enEtapa = entrada !== null ? Math.max(0, o.ahoraMs - entrada) : null;
  const tarde = esTarde(pedido, enEtapa);
  const entregado = pedido.etapa === 'entregado';
  const tiempo = entrada === null ? '' : entregado ? horaRelativa(entrada, o.ahoraMs) : duracion(enEtapa ?? 0);
  const numero = numeroDe(pedido);
  const tipo = pedido.tipoTransportador ?? null;
  const transporte =
    pedido.etapa === 'camino' && pedido.transportador
      ? tipo === 'transportadora'
        ? pedido.transportador
        : primerNombre(pedido.transportador)
      : '';
  const cliente = o.ocultar ? 'Cliente' : pedido.cliente || 'Cliente';
  const monto = o.ocultar || pedido.monto <= 0 ? '' : dinero(pedido.monto);

  return {
    id: pedido.id,
    numero,
    cliente,
    lugar: [pedido.ciudad, pedido.canal].filter((x): x is string => !!x).join(' · '),
    monto,
    ia: pedido.ia === true,
    tarde,
    tiempo,
    transporte,
    tipoTransporte: transporte ? tipo : null,
    nuevo: false,
    movida: false,
    aria:
      `Pedido ${numero.slice(1)}, ${nombreColumna}` +
      `${pedido.ia ? ', armado con Opttia' : ''}${tarde ? ', va tarde' : ''}${tiempo ? `, ${tiempo}` : ''}. Ver el detalle`,
  };
}

/**
 * Arma las seis columnas con los pedidos de la foto. Orden: en cada etapa, el que lleva más tiempo
 * primero; en "Entregados hoy", el más reciente primero. Tope de 40 tarjetas por columna (14 en
 * entregados) y `resto` con las que quedan fuera; `total` cuenta todas.
 */
export function armarColumnas(pedidos: ReadonlyArray<PedidoEnVivo>, o: OpcionesTablero): ColumnaTablero[] {
  const maximo = Math.max(0, o.maximo ?? MAX_TARJETAS_COLUMNA);
  const maximoEntregados = Math.max(0, o.maximoEntregados ?? MAX_TARJETAS_ENTREGADOS);

  const porEtapa = new Map<EtapaId, PedidoEnVivo[]>();
  for (const columna of COLUMNAS_TABLERO) porEtapa.set(columna.id, []);
  for (const pedido of pedidos) {
    const lista = porEtapa.get(pedido.etapa);
    if (!lista) continue;
    if (pedido.etapa === 'entregado' && !entregadoHoy(pedido, o.dia)) continue;
    lista.push(pedido);
  }

  return COLUMNAS_TABLERO.map((definicion) => {
    const lista = porEtapa.get(definicion.id) ?? [];
    const entregados = definicion.id === 'entregado';
    const orden = new Map(lista.map((p, i) => [p.id, i] as const));
    const llave = (p: PedidoEnVivo): number | null => entradaEnEtapa(p);
    const ordenada = lista.slice().sort((a, b) => {
      const ta = llave(a);
      const tb = llave(b);
      // Sin hora, al final de la columna.
      if (ta === null || tb === null) {
        if (ta === tb) return (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0);
        return ta === null ? 1 : -1;
      }
      return (entregados ? tb - ta : ta - tb) || (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0);
    });
    const tope = entregados ? maximoEntregados : maximo;
    const visibles = ordenada.slice(0, tope);
    return {
      id: definicion.id,
      nombre: definicion.nombre,
      clase: claseTonoCss(o.etapas.get(definicion.id)?.tono),
      total: lista.length,
      tarjetas: visibles.map((p) => tarjetaDe(p, definicion.nombre, o)),
      resto: lista.length - visibles.length,
    };
  });
}

/** "Hay N pedidos en el tablero" (para vacío y lectores de pantalla). */
export function totalEnTablero(columnas: ReadonlyArray<ColumnaTablero>): number {
  return columnas.reduce((suma, c) => suma + c.total, 0);
}
