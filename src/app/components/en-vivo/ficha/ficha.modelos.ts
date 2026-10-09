import { ClaveLista } from '../utilidades/tarjetas';

/**
 * Modelos de la ficha de "En vivo" (D-386, tarea 4.7, diseño 12).
 *
 * Dos familias:
 * - `VistaFicha`: QUÉ se está mirando (un pedido, una lista o un mensajero). Es lo que guarda
 *   `EnVivoFichaService` y lo que sigue la cámara 3D.
 * - `Contenido*`: lo que se PINTA, ya armado y con los textos listos (ver `utilidades/`). Los
 *   componentes de la ficha solo pintan; no calculan nada. Con "ocultar clientes y montos" estos
 *   modelos ya vienen sin nombres de cliente ni valores, así que el DOM nunca los lleva.
 *
 * Solo lectura: ninguna acción cambia estados, asigna ni despacha.
 */

// ── Qué se está mirando ─────────────────────────────────────────────────────

export type VistaFicha =
  /** Un pedido. `empresa` solo importa con una sesión de Katuq (el comercio dueño del pedido). */
  | { tipo: 'pedido'; id: string; empresa: string | null }
  /** Pedidos de una cifra, etapa, canal o ciudad. */
  | { tipo: 'lista'; clave: ClaveLista }
  /** Un mensajero propio o una transportadora (por su nombre). */
  | { tipo: 'mensajero'; nombre: string };

/** Identificador estable de una vista: dos vistas iguales dan la misma clave. */
export function claveDeVista(vista: VistaFicha): string {
  switch (vista.tipo) {
    case 'pedido':
      return `pedido:${vista.id}@${vista.empresa ?? ''}`;
    case 'lista':
      return `lista:${vista.clave}`;
    default:
      return `mensajero:${vista.nombre}`;
  }
}

export function mismaVista(a: VistaFicha | null, b: VistaFicha | null): boolean {
  if (a === null || b === null) return a === b;
  return claveDeVista(a) === claveDeVista(b);
}

// ── Qué se pinta ────────────────────────────────────────────────────────────

/** Un paso del recorrido de hoy: cumplido, actual (resaltado) o pendiente. */
export interface PasoRecorrido {
  /** Id de la etapa (`recibido`, `camino`...) o `rechazado` / `cancelado` / `pos`. */
  id: string;
  nombre: string;
  /** "3:40 p. m. · hace 20 min · con Carlos", "Sin hora registrada" o "Pendiente". */
  detalle: string;
  cumplido: boolean;
  /** Es la etapa en la que está el pedido ahora (resaltado). */
  actual: boolean;
  /** Cumplido, pero el servidor no vio la hora (el pedido cambió antes de que empezara a observarlo). */
  sinHora: boolean;
  /** Se cumplió mientras la ficha estaba abierta: entra animado un momento. */
  nuevo: boolean;
  /** Clase del tono (`t-ok`, `t-info`...). */
  clase: string;
}

/** Una celda del cuadro de datos ("Canal", "Pago", "Llegó"...). */
export interface CeldaFicha {
  etiqueta: string;
  valor: string;
  /** Clase de tono para el valor (`t-ok`, `t-warn`...) o vacío. */
  clase: string;
}

export interface LineaProducto {
  /** "2×". */
  cantidad: string;
  nombre: string;
  /** Vacío con "ocultar clientes y montos". */
  valor: string;
}

/** Lo que se puede hacer desde la ficha de un pedido. Ninguna acción escribe nada. */
export type AccionFicha =
  | { tipo: 'abrir-pedidos'; etiqueta: string; primaria: boolean; numero: string; creado: string | null }
  | { tipo: 'ver-tablero'; etiqueta: string; primaria: boolean; empresa: string; nombre: string; pedidoId: string }
  | { tipo: 'ver-mensajero'; etiqueta: string; primaria: boolean; nombre: string };

export interface ContenidoPedido {
  /** `cargando`: aún no hay nada que mostrar; `no-encontrado`: el servidor respondió 404 y no hay otra fuente. */
  fase: 'cargando' | 'listo' | 'no-encontrado';
  /** "Laura M." o "Cliente" con "ocultar". */
  cliente: string;
  /** "Medellín · Laureles". */
  ubicacion: string;
  etapaNombre: string;
  etapaClase: string;
  /** Monto grande, o "3 productos" con "ocultar". Vacío mientras no se sepa. */
  principal: string;
  /** "No suma en ventas" en un pedido cancelado o rechazado. */
  principalNota: string;
  celdas: CeldaFicha[];
  recorrido: PasoRecorrido[];
  productosFase: 'cargando' | 'listo' | 'error';
  productos: LineaProducto[];
  /** Domicilio cobrado ("$8.000"), vacío si no hay o con "ocultar". */
  envio: string;
  total: string;
  acciones: AccionFicha[];
  nota: string;
  /** Texto de `no-encontrado`. */
  mensaje: string;
}

/** Una fila tocable de una lista (un pedido), ya con sus textos. */
export interface FilaVista {
  id: string;
  /** Comercio dueño; solo importa en toda Katuq. */
  empresa: string | null;
  iniciales: string;
  claseAvatar: string;
  titulo: string;
  subtitulo: string;
  /** Vacío con "ocultar". */
  monto: string;
  /** Texto completo para lectores de pantalla. */
  etiquetaAria: string;
}

export interface ContenidoLista {
  /** "Suman" y "Ticket promedio" (o "Comercios" en toda Katuq). Vacío con "ocultar". */
  celdas: CeldaFicha[];
  filas: FilaVista[];
  /** Cuántas filas más hay que no se muestran ("y 12 más"). */
  restantes: number;
  vacio: string;
  nota: string;
}

export interface ContenidoMensajero {
  esTransportadora: boolean;
  /** "Moto · mensajero propio" / "Camión · envíos a otras ciudades". */
  descripcion: string;
  subtitulo: string;
  pastilla: string;
  clasePastilla: string;
  celdas: CeldaFicha[];
  tituloLleva: string;
  filas: FilaVista[];
  restantes: number;
  nota: string;
}

/** Todo lo que pinta la ficha para una vista. `firma` cambia solo si cambió el contenido. */
export interface ContenidoFicha {
  clave: string;
  eyebrow: string;
  titulo: string;
  pedido: ContenidoPedido | null;
  lista: ContenidoLista | null;
  mensajero: ContenidoMensajero | null;
  firma: string;
}

/** Lo que sale al tocar una fila de una lista: qué pedido abrir (con su comercio en toda Katuq). */
export interface PedidoAbierto {
  id: string;
  empresa: string | null;
}

/** Lo que la ficha avisa al pedir el tablero de un comercio (el integrador navega). */
export interface TableroSolicitado {
  empresa: string;
  nombre: string;
  /** El pedido que estaba abierto: la ficha lo vuelve a abrir en el tablero del comercio. */
  pedidoId?: string;
  /** Viene de la acción de Opttia "Ver atascados de <comercio>". */
  foco?: 'atascados';
}
