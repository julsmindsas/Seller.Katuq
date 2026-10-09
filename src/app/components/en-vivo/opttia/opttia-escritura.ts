/**
 * Escritura animada ("máquina de escribir") de la tarjeta de Opttia y de la narración sobre la
 * escena (D-386, tarea 4.10). Puro: sin Angular y sin reloj propio (el temporizador entra por
 * parámetro), para probarlo con node suelto.
 *
 * Igual que el prototipo: cada paso muestra 2 letras más. Con "reducir movimiento" el texto sale
 * completo y de una vez. Se cuentan LETRAS (no unidades UTF-16) para no partir un emoji ni una
 * letra con tilde escrita en dos piezas.
 */

/** Letras que se agregan en cada paso. */
export const LETRAS_POR_PASO = 2;

/** Milisegundos entre pasos del resumen y de las respuestas (prototipo: 16 y 14). */
export const MS_POR_PASO_RESUMEN = 16;
export const MS_POR_PASO_RESPUESTA = 14;
/** Milisegundos entre pasos de la narración sobre la escena (prototipo: 22). */
export const MS_POR_PASO_NARRACION = 22;

/** Lo que va saliendo de un texto. Sin temporizador: quien lo maneja llama `avanzar()`. */
export class MaquinaDeEscribir {
  private readonly letras: string[];
  private cuenta: number;

  /**
   * @param texto El texto completo.
   * @param instantanea true: sale completo desde el principio (menos movimiento).
   * @param porPaso Letras por paso (mínimo 1).
   */
  constructor(texto: string, instantanea = false, private readonly porPaso: number = LETRAS_POR_PASO) {
    this.letras = Array.from(String(texto ?? ''));
    this.cuenta = instantanea ? this.letras.length : 0;
  }

  /** Lo que se ve ahora. */
  get visible(): string {
    return this.letras.slice(0, this.cuenta).join('');
  }

  get completo(): string {
    return this.letras.join('');
  }

  get terminada(): boolean {
    return this.cuenta >= this.letras.length;
  }

  /** Cuántos pasos hacen falta desde el principio hasta terminar. */
  get pasosTotales(): number {
    return Math.ceil(this.letras.length / Math.max(1, this.porPaso));
  }

  /** Da un paso y devuelve lo que se ve. Después de terminar no cambia nada. */
  avanzar(): string {
    if (!this.terminada) this.cuenta = Math.min(this.letras.length, this.cuenta + Math.max(1, this.porPaso));
    return this.visible;
  }

  /** Muestra todo de golpe (por ejemplo, si cambió "ocultar" a la mitad). */
  completar(): string {
    this.cuenta = this.letras.length;
    return this.visible;
  }
}

/** Quien agenda: se cambia en las pruebas por un reloj virtual. */
export interface Planificador {
  /** Repite `tarea` cada `ms`. Devuelve la función que lo detiene. */
  cada(tarea: () => void, ms: number): () => void;
}

export const PLANIFICADOR_REAL: Planificador = {
  cada(tarea: () => void, ms: number): () => void {
    const id = setInterval(tarea, ms);
    return () => clearInterval(id);
  },
};

export interface OpcionesEscritura {
  /** Milisegundos entre pasos. */
  ms: number;
  /** true si la persona pidió menos movimiento: sale completo de una vez. */
  reducir: boolean;
  porPaso?: number;
  planificador?: Planificador;
}

/**
 * Escribe `texto` poco a poco: llama `alTexto(visible)` en cada paso y `alTerminar()` al final.
 * Con `reducir` (o con un texto vacío) lo hace todo de inmediato, sin temporizador. Devuelve la
 * función para cancelar (no llama `alTerminar`). Antes del primer paso NO llama `alTexto`: quien
 * escribe parte de un texto vacío.
 */
export function escribirAnimado(
  texto: string,
  opciones: OpcionesEscritura,
  alTexto: (visible: string) => void,
  alTerminar?: () => void
): () => void {
  const maquina = new MaquinaDeEscribir(texto, opciones.reducir, opciones.porPaso);
  if (opciones.reducir || maquina.terminada) {
    alTexto(maquina.completo);
    if (alTerminar) alTerminar();
    return () => undefined;
  }

  // No llama `alTexto('')` al empezar: quien escribe ya parte de un texto vacío, y así no se repinta de más.
  const planificador = opciones.planificador ?? PLANIFICADOR_REAL;
  let parar: () => void = () => undefined;
  let vivo = true;
  parar = planificador.cada(() => {
    if (!vivo) return;
    alTexto(maquina.avanzar());
    if (maquina.terminada) {
      vivo = false;
      parar();
      if (alTerminar) alTerminar();
    }
  }, Math.max(1, opciones.ms));

  return () => {
    vivo = false;
    parar();
  };
}
