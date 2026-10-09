/**
 * Reglas puras del canal y del estado de "En vivo": espera de reconexión, descarte de
 * ids repetidos, día de Colombia y textos fijos. Sin Angular ni reloj propio, para
 * probarlas con node suelto.
 */

// ── Tiempos del canal (diseño 5) ────────────────────────────────────────────

/** Espera creciente entre reconexiones, en segundos (se queda en el último). */
export const ESPERAS_RECONEXION_S: ReadonlyArray<number> = [1, 2, 5, 10, 20, 30];

/** Ids de evento recordados para descartar repetidos. */
export const MAX_IDS_VISTOS = 300;

/** El servidor manda un latido cada 20 s; con 3 seguidos sin ningún byte la conexión se da por muerta. */
export const GUARDIA_SIN_DATOS_MS = 60000;

/** El servidor corta a los 30 min con `reconectar`; con 1 min de margen el cliente corta solo (red de seguridad). */
export const VIDA_MAXIMA_MS = 31 * 60000;

/** Una conexión que duró al menos esto cuenta como estable: la siguiente falla vuelve a empezar la escalera. */
export const CONEXION_ESTABLE_MS = 10000;

/** Intervalo de la foto en modo de respaldo ("Actualiza cada 30 s"). */
export const SONDEO_MS = 30000;

/** Fallas seguidas del stream (con red) antes de caer al sondeo mientras se sigue intentando. */
export const FALLAS_PARA_SONDEO = 3;

/** Con la pestaña oculta más de esto, el canal se pausa. */
export const PAUSA_OCULTA_MS = 5 * 60000;

/** En modo sondeo por orden del servidor, cada cuánto se vuelve a probar el stream. */
export const REINTENTO_VIVO_MS = 5 * 60000;

/**
 * Espera antes del intento número `intento` (0 = primero tras una falla): 1, 2, 5, 10,
 * 20 y 30 s, con azar de -20 % a +20 % para que las pantallas no reconecten todas juntas.
 */
export function esperaReconexionMs(intento: number, azar: () => number = Math.random): number {
  const indice = Math.min(Math.max(Math.floor(intento), 0), ESPERAS_RECONEXION_S.length - 1);
  const base = ESPERAS_RECONEXION_S[indice] * 1000;
  return Math.round(base * (0.8 + azar() * 0.4));
}

/** Espera corta y con azar tras un `reconectar` planeado del servidor (vida máxima o apagado): 0,3 a 1,5 s. */
export function esperaPlaneadaMs(azar: () => number = Math.random): number {
  return Math.round(300 + azar() * 1200);
}

// ── Ids repetidos ───────────────────────────────────────────────────────────

/** Memoria de los últimos N ids. Al pasarse, olvida el más viejo. */
export class IdsVistos {
  private readonly ids = new Set<string>();

  constructor(private readonly capacidad: number = MAX_IDS_VISTOS) {}

  /** true si el id es nuevo (y queda registrado); false si ya se había visto. */
  registrarSiNuevo(id: string): boolean {
    if (this.ids.has(id)) return false;
    this.ids.add(id);
    if (this.ids.size > this.capacidad) {
      const masViejo = this.ids.values().next().value as string;
      this.ids.delete(masViejo);
    }
    return true;
  }

  tiene(id: string): boolean {
    return this.ids.has(id);
  }

  get tamano(): number {
    return this.ids.size;
  }
}

// ── Tiempo ──────────────────────────────────────────────────────────────────

const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

/** Día de Colombia (UTC-5, sin horario de verano) como AAAA-MM-DD. */
export function diaDeColombia(ms: number): string {
  return new Date(ms - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}

/** Milisegundos de una hora que puede venir como ISO, número o vacía; null si no se entiende. */
export function msDe(hora: string | number | null | undefined): number | null {
  if (typeof hora === 'number') return Number.isFinite(hora) ? hora : null;
  if (typeof hora === 'string' && hora !== '') {
    const ms = Date.parse(hora);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

// ── Nombres ─────────────────────────────────────────────────────────────────

/** Texto comparable: sin tildes, en minúsculas, con espacios únicos y sin los de las puntas. */
export function claveDeTexto(texto: string | null | undefined): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Primera palabra del nombre ("Yulie Gómez" → "Yulie"). */
export function primerNombre(nombre: string | null | undefined): string {
  return String(nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

/**
 * Tipo de transportador de un nombre, con la misma regla del backend (`detector.tipoDeTransportador`):
 * mensajero propio si está entre los de la flota; si no, transportadora externa. Sin nombre, null.
 * La foto no trae `tipoTransportador` en sus pedidos; solo los eventos `salida` y `asignado`.
 */
export function tipoDeTransportador(
  transportador: string | null | undefined,
  flota: ReadonlyArray<{ nombre: string }>
): 'mensajero' | 'transportadora' | null {
  const clave = claveDeTexto(transportador);
  if (!clave) return null;
  return flota.some((m) => claveDeTexto(m.nombre) === clave) ? 'mensajero' : 'transportadora';
}

// ── Textos fijos ────────────────────────────────────────────────────────────

/** "Te pusimos al día: 3 cambios" (singular con 1). */
export function textoAlDia(cambios: number): string {
  return `Te pusimos al día: ${cambios} ${cambios === 1 ? 'cambio' : 'cambios'}`;
}

/** Motivos de `reconectar` tras los que el servidor perdió eventos y la foto nueva hay que contarla como corte. */
export const MOTIVOS_RECONECTAR_CON_CORTE: ReadonlyArray<string> = ['error', 'apagado'];
