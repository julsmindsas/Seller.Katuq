/**
 * Narrador de Opttia sobre la escena (D-386, tarea 4.10, diseño 16): arma las líneas con
 * PLANTILLAS a partir de lo que cambia en la pantalla, sin llamar al modelo. Puro: sin Angular y
 * sin reloj propio, para probarlo con node suelto. `EnVivoNarracionService` lo conecta al estado
 * y lo hace avanzar cada 9 segundos.
 *
 * Eventos que narra (spec `opttia-en-vivo`, "Narración en la escena"):
 *  - un pedido armado por Opttia (evento `pedido_nuevo` con `ia`);
 *  - un cambio en los primeros puestos de la carrera (toda Katuq);
 *  - una alerta nueva del radar;
 *  - un comercio que vuelve a vender (su alerta de silencio desaparece);
 *  - el camino al récord de pedidos (una vez por día y por vista).
 * Cuando no hay nada de eso, recorre el titular y los puntos del último resumen.
 *
 * Con "ocultar" no escribe montos ni nombres de comercios. Durante "Repetir el día" se calla.
 */
import {
  AlertaRadar,
  ComercioEnVivo,
  EstadoEnVivo,
  EventoEnVivo,
  RadarEnVivo,
  ResumenOpttia,
} from '../servicios/en-vivo.modelos';
import { dinero } from '../utilidades/formato';
import { enmascarar, lineasDelResumen, OpcionesMascara } from './opttia-reglas';

/** La línea cambia cada 9 segundos. */
export const PERIODO_NARRACION_MS = 9000;
/** La primera línea sale pronto, para que la escena no espere 9 s con la barra vacía. */
export const PRIMERA_LINEA_MS = 1500;
/** Líneas pendientes como máximo: las más viejas se descartan. */
export const MAX_COLA_NARRACION = 8;
/** Cuántos puestos del podio se narran. */
export const PUESTOS_NARRADOS = 3;

export type TipoLineaNarracion = 'pedido-opttia' | 'carrera' | 'alerta' | 'vuelve' | 'record' | 'resumen';

export interface LineaNarracion {
  /** Crece con cada línea: sirve para distinguir una línea igual a la anterior. */
  id: number;
  tipo: TipoLineaNarracion;
  texto: string;
  /** Pasa al frente de la cola. */
  urgente: boolean;
}

/** Un comercio del podio. */
export interface PuestoCarrera {
  empresa: string;
  nombre: string;
}

export interface CambioEnElPodio {
  /** Puesto al que subió (0 = primero). */
  puesto: number;
  sube: PuestoCarrera;
  /** El comercio que tenía adelante (el que ocupaba ese puesto antes). */
  pasoA: PuestoCarrera;
}

// ── Carrera ─────────────────────────────────────────────────────────────────

/**
 * Orden de la carrera: por ventas, o por pedidos con "ocultar" (así no se adivinan montos). Es
 * estable: a igualdad, queda el orden en que lo mandó el servidor.
 */
export function ordenDeCarrera(comercios: ReadonlyArray<ComercioEnVivo>, ocultar: boolean): PuestoCarrera[] {
  const clave: 'n' | 'ventas' = ocultar ? 'n' : 'ventas';
  return comercios
    .map((c, indice) => ({ c, indice }))
    .sort((a, b) => b.c[clave] - a.c[clave] || a.indice - b.indice)
    .map(({ c }) => ({ empresa: c.empresa, nombre: c.nombre }));
}

/**
 * Quién subió entre los primeros puestos. Solo cuentan los que ya estaban en la carrera (uno que
 * aparece no "pasa" a nadie) y los primeros `puestos`.
 */
export function cambiosEnElPodio(
  previo: ReadonlyArray<PuestoCarrera>,
  actual: ReadonlyArray<PuestoCarrera>,
  puestos: number = PUESTOS_NARRADOS
): CambioEnElPodio[] {
  const antes = new Map<string, number>();
  previo.forEach((p, i) => antes.set(p.empresa, i));
  const cambios: CambioEnElPodio[] = [];
  for (let i = 0; i < Math.min(puestos, actual.length); i++) {
    const posicionPrevia = antes.get(actual[i].empresa);
    if (posicionPrevia === undefined || posicionPrevia <= i) continue;
    const pasoA = previo[i];
    if (!pasoA || pasoA.empresa === actual[i].empresa) continue;
    cambios.push({ puesto: i, sube: actual[i], pasoA });
  }
  return cambios;
}

function ordinal(puesto: number): string {
  return `${puesto + 1}.º`;
}

/** "FLORECER pasó a ALMARA y ya va de 2.º en la carrera." (con "ocultar": sin nombres). */
export function textoDeCarrera(cambio: CambioEnElPodio, ocultar: boolean): string {
  if (ocultar) {
    return cambio.puesto === 0 ? 'Un comercio pasó al primer puesto de la carrera.' : `Un comercio subió al ${ordinal(cambio.puesto)} puesto de la carrera.`;
  }
  return cambio.puesto === 0
    ? `${cambio.sube.nombre} pasó a ${cambio.pasoA.nombre} y ya lidera la carrera.`
    : `${cambio.sube.nombre} pasó a ${cambio.pasoA.nombre} y ya va de ${ordinal(cambio.puesto)} en la carrera.`;
}

// ── Alertas ─────────────────────────────────────────────────────────────────

/** Identifica una alerta entre dos lecturas del radar: comercio + tipo + pedido o mensajero. */
export function claveDeAlerta(alerta: AlertaRadar): string {
  return [alerta.empresa ?? alerta.comercio ?? '', alerta.tipo, alerta.pedidoId ?? alerta.mensajero ?? alerta.numero ?? ''].join('|');
}

function empezarEnMinuscula(texto: string): string {
  return texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : texto;
}

function empezarEnMayuscula(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

function cerrarFrase(texto: string): string {
  const limpio = texto.trim();
  return /[.!?]$/.test(limpio) ? limpio : `${limpio}.`;
}

/** Nombre del comercio de una alerta o "un comercio" si no hay o se oculta. */
function comercioDeAlerta(alerta: AlertaRadar, ocultar: boolean): string {
  return !ocultar && alerta.comercio ? alerta.comercio : 'un comercio';
}

/**
 * "Atención: FLORECER, sin pedidos hace 1 h 5 min." · en racha: "FLORECER está en racha: vende
 * 2,4 veces su ritmo del día." · en un comercio: "Atención: #1023 lleva 2 h listo."
 */
export function textoDeAlerta(alerta: AlertaRadar, vista: EstadoEnVivo['vista'], ocultar: boolean): string {
  const titulo = String(alerta.titulo ?? '').trim();
  const global = vista === 'katuq';
  const comercio = comercioDeAlerta(alerta, ocultar);
  let texto: string;
  if (alerta.tipo === 'racha') {
    texto = global ? `${empezarEnMayuscula(comercio)} está en racha: ${empezarEnMinuscula(titulo)}` : titulo;
  } else {
    texto = global ? `Atención: ${comercio}, ${empezarEnMinuscula(titulo)}` : `Atención: ${empezarEnMinuscula(titulo)}`;
  }
  return enmascarar(cerrarFrase(texto), { montos: ocultar });
}

// ── Pedido de Opttia y récord ───────────────────────────────────────────────

/**
 * "Opttia te armó un pedido de $128.900 por WhatsApp." · en toda Katuq: "Opttia cerró un pedido
 * de $128.900 para FLORECER por WhatsApp." Con "ocultar": sin monto ni nombre de comercio.
 */
export function textoPedidoOpttia(evento: EventoEnVivo, vista: EstadoEnVivo['vista'], soloLectura: boolean, ocultar: boolean): string {
  const monto = !ocultar && typeof evento.monto === 'number' && evento.monto > 0 ? ` de ${dinero(evento.monto)}` : '';
  if (vista === 'katuq') {
    const comercio = ocultar ? null : evento.nombreComercio ?? evento.comercio?.nombre ?? null;
    return `Opttia cerró un pedido${monto}${comercio ? ` para ${comercio}` : ''} por WhatsApp.`;
  }
  return `Opttia ${soloLectura ? 'le armó' : 'te armó'} un pedido${monto} por WhatsApp.`;
}

/** "Si el ritmo sigue así, hoy Katuq rompe su récord de 123 pedidos." */
export function textoDeRecord(vista: EstadoEnVivo['vista'], soloLectura: boolean, recordPedidos: number): string {
  const quien = vista === 'katuq' ? 'Katuq rompe su' : soloLectura ? 'este comercio rompe su' : 'rompes tu';
  return `Si el ritmo sigue así, hoy ${quien} récord de ${Math.round(recordPedidos)} pedidos.`;
}

/** ¿Va camino al récord? Solo si hay récord y la proyección al cierre lo supera. */
export function vaCaminoAlRecord(radar: RadarEnVivo | null | undefined): number | null {
  const proyeccion = radar?.proyeccion;
  const record = radar?.record;
  if (!proyeccion || !record || !(record.n > 0)) return null;
  return proyeccion.pedidos > record.n ? record.n : null;
}

// ── El narrador ─────────────────────────────────────────────────────────────

interface BaseDeLaVista {
  llave: string;
  ocultar: boolean;
  orden: PuestoCarrera[];
  refComercios: ReadonlyArray<ComercioEnVivo> | null;
  alertas: Map<string, AlertaRadar> | null;
  refRadar: RadarEnVivo | null;
}

function llaveDe(estado: EstadoEnVivo): string {
  return `${estado.vista}|${estado.empresa ?? ''}`;
}

function diaDe(estado: EstadoEnVivo): string {
  return (estado.vista === 'katuq' ? estado.cifrasGlobal?.dia : estado.cifras?.dia) ?? '';
}

export class NarradorOpttia {
  private cola: LineaNarracion[] = [];
  private base: BaseDeLaVista | null = null;
  private readonly hitos = new Set<string>();
  private cursor = 0;
  private secuencia = 0;

  constructor(private readonly maxCola: number = MAX_COLA_NARRACION) {}

  /** Líneas esperando turno. */
  get pendientes(): number {
    return this.cola.length;
  }

  /** Las líneas que esperan, en el orden en que saldrán (copia). */
  get enCola(): ReadonlyArray<LineaNarracion> {
    return this.cola.slice();
  }

  /** Descarta lo que esperaba turno (al activar "ocultar" o al empezar "Repetir el día"). */
  vaciarCola(): void {
    this.cola = [];
  }

  /** Olvida la base: la siguiente lectura vuelve a ser "lo que ya estaba" (cambió la vista o el comercio). */
  reiniciar(): void {
    this.cola = [];
    this.base = null;
    this.cursor = 0;
  }

  /**
   * Compara lo que hay con lo que había y encola lo notable. La primera lectura de una vista solo
   * toma la base: lo que ya estaba al abrir no se narra. Con `callar` (repetición del día) la base
   * se actualiza pero no se encola nada.
   */
  observar(estado: EstadoEnVivo, ocultar: boolean, callar = false): void {
    if (!estado.cargado || estado.disponible === false) return;

    const llave = llaveDe(estado);
    const primera = !this.base || this.base.llave !== llave;
    if (primera) {
      this.base = { llave, ocultar, orden: [], refComercios: null, alertas: null, refRadar: null };
    }
    const base = this.base as BaseDeLaVista;
    const silencioso = primera || callar;

    this.observarCarrera(estado, ocultar, base, silencioso);
    this.observarAlertas(estado, ocultar, base, silencioso);
    base.ocultar = ocultar;
    // El récord no es un cambio sino un estado: si ya se va a romper, se cuenta una vez (también al abrir).
    if (!callar) this.observarRecord(estado, llave);
  }

  /** Un evento que llegó en vivo (no los de la foto). Solo narra los pedidos que armó Opttia. */
  alEvento(evento: EventoEnVivo, estado: Pick<EstadoEnVivo, 'vista' | 'soloLectura'>, ocultar: boolean, callar = false): void {
    if (callar || evento.tipo !== 'pedido_nuevo' || evento.ia !== true) return;
    this.encolar('pedido-opttia', textoPedidoOpttia(evento, estado.vista, estado.soloLectura, ocultar), false);
  }

  /**
   * La línea que sigue: la primera de la cola (las urgentes van al frente) o, si no hay nada
   * notable, el titular y los puntos del último resumen, uno por turno y dando la vuelta.
   */
  siguiente(resumen: ResumenOpttia | null | undefined, mascara: OpcionesMascara): LineaNarracion | null {
    const primera = this.cola.shift();
    if (primera) return primera;
    const lineas = lineasDelResumen(resumen, mascara);
    if (lineas.length === 0) return null;
    const texto = lineas[this.cursor % lineas.length];
    this.cursor++;
    return { id: ++this.secuencia, tipo: 'resumen', texto, urgente: false };
  }

  // ── Detección ─────────────────────────────────────────────────────────────

  private observarCarrera(estado: EstadoEnVivo, ocultar: boolean, base: BaseDeLaVista, silencioso: boolean): void {
    const comercios = estado.vista === 'katuq' ? estado.cifrasGlobal?.comercios : undefined;
    if (!comercios) return;
    if (comercios === base.refComercios && ocultar === base.ocultar) return;

    const orden = ordenDeCarrera(comercios, ocultar);
    // Si cambió "ocultar" cambia la regla del orden: no es que alguien pasara a alguien.
    const mismaRegla = base.refComercios !== null && ocultar === base.ocultar;
    if (mismaRegla && !silencioso) {
      for (const cambio of cambiosEnElPodio(base.orden, orden)) {
        this.encolar('carrera', textoDeCarrera(cambio, ocultar), false);
      }
    }
    base.orden = orden;
    base.refComercios = comercios;
  }

  private observarAlertas(estado: EstadoEnVivo, ocultar: boolean, base: BaseDeLaVista, silencioso: boolean): void {
    const radar = estado.radar;
    if (!radar || radar === base.refRadar) return;
    const lista = estado.vista === 'katuq' ? radar.alertas : radar.atencion;
    if (!Array.isArray(lista)) return;

    const actuales = new Map<string, AlertaRadar>();
    for (const alerta of lista) actuales.set(claveDeAlerta(alerta), alerta);

    if (base.alertas && !silencioso) {
      actuales.forEach((alerta, clave) => {
        if (!(base.alertas as Map<string, AlertaRadar>).has(clave)) {
          this.encolar('alerta', textoDeAlerta(alerta, estado.vista, ocultar), alerta.sev >= 2);
        }
      });
      // Un comercio al que se le había dado por callado y volvió a recibir pedidos.
      base.alertas.forEach((alerta, clave) => {
        if (alerta.tipo === 'silencio' && !actuales.has(clave)) {
          const quien = empezarEnMayuscula(comercioDeAlerta(alerta, ocultar));
          this.encolar('vuelve', `${quien} volvió a recibir pedidos.`, true);
        }
      });
    }
    base.alertas = actuales;
    base.refRadar = radar;
  }

  private observarRecord(estado: EstadoEnVivo, llave: string): void {
    const record = vaCaminoAlRecord(estado.radar);
    if (record === null) return;
    const hito = `record|${diaDe(estado)}|${llave}`;
    if (this.hitos.has(hito)) return;
    this.hitos.add(hito);
    this.encolar('record', textoDeRecord(estado.vista, estado.soloLectura, record), true);
  }

  private encolar(tipo: TipoLineaNarracion, texto: string, urgente: boolean): void {
    if (!texto || this.cola.some((l) => l.texto === texto)) return;
    const linea: LineaNarracion = { id: ++this.secuencia, tipo, texto, urgente };
    if (urgente) {
      // Las urgentes van delante, pero en el orden en que llegaron entre ellas.
      let posicion = 0;
      while (posicion < this.cola.length && this.cola[posicion].urgente) posicion++;
      this.cola.splice(posicion, 0, linea);
    } else {
      this.cola.push(linea);
    }
    if (this.cola.length > this.maxCola) this.cola.length = this.maxCola;
  }
}
