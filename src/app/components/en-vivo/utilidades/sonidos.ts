/**
 * Sonidos de "En vivo", sintetizados con WebAudio (sin archivos). Nacen APAGADOS: el
 * `AudioContext` solo se crea cuando la persona lo enciende (un gesto: el navegador no deja
 * sonar antes). Una sola voz por tipo cada cierto tiempo, para que un despacho masivo de 50
 * pedidos no sea una ráfaga de 50 tonos.
 */

export type TipoSonido = 'nuevo' | 'estado' | 'salida' | 'entregado' | 'hito';

interface Nota {
  /** Frecuencia en Hz. */
  f: number;
  /** Desfase respecto al inicio, en segundos. */
  inicio: number;
  /** Duración, en segundos. */
  duracion: number;
  onda: OscillatorType;
  volumen: number;
}

/** La "partitura" de cada sonido. Datos puros. */
export const NOTAS: Readonly<Record<TipoSonido, ReadonlyArray<Nota>>> = {
  nuevo: [
    { f: 987.8, inicio: 0, duracion: 0.18, onda: 'triangle', volumen: 0.12 },
    { f: 1318.5, inicio: 0.08, duracion: 0.42, onda: 'triangle', volumen: 0.12 },
  ],
  estado: [{ f: 660, inicio: 0, duracion: 0.12, onda: 'sine', volumen: 0.05 }],
  salida: [
    { f: 392, inicio: 0, duracion: 0.16, onda: 'sawtooth', volumen: 0.03 },
    { f: 523.3, inicio: 0.1, duracion: 0.22, onda: 'triangle', volumen: 0.07 },
  ],
  entregado: [523.3, 659.3, 784, 1046.5].map((f, i) => ({
    f,
    inicio: i * 0.075,
    duracion: 0.4,
    onda: 'sine' as OscillatorType,
    volumen: 0.08,
  })),
  hito: [523.3, 659.3, 784, 1046.5, 1318.5].map((f, i) => ({
    f,
    inicio: i * 0.09,
    duracion: 0.55,
    onda: 'triangle' as OscillatorType,
    volumen: 0.08,
  })),
};

/** Tiempo mínimo entre dos sonidos del mismo tipo, en ms. */
const SEPARACION_MS = 250;

type ConstructorAudio = new () => AudioContext;

export class Sonidos {
  private contexto: AudioContext | null = null;
  private readonly ultimo = new Map<TipoSonido, number>();

  /** true si ya hay un contexto de audio creado con un gesto (puede sonar). */
  get listo(): boolean {
    return this.contexto !== null && this.contexto.state !== 'closed';
  }

  /**
   * Crea (o reanuda) el audio. DEBE llamarse dentro de un gesto de la persona (un clic o una
   * tecla). Devuelve false si el navegador no tiene WebAudio.
   */
  activar(): boolean {
    try {
      const ventana = window as unknown as { AudioContext?: ConstructorAudio; webkitAudioContext?: ConstructorAudio };
      const Contexto = ventana.AudioContext ?? ventana.webkitAudioContext;
      if (!Contexto) return false;
      if (!this.contexto || this.contexto.state === 'closed') this.contexto = new Contexto();
      if (this.contexto.state === 'suspended') void this.contexto.resume().catch(() => undefined);
      return true;
    } catch {
      this.contexto = null;
      return false;
    }
  }

  /** Suena el tipo pedido. No hace nada si el audio no se activó con un gesto. */
  sonar(tipo: TipoSonido, ahoraMs: number = Date.now()): void {
    const contexto = this.contexto;
    if (!contexto || contexto.state === 'closed') return;
    const previo = this.ultimo.get(tipo);
    if (previo !== undefined && ahoraMs - previo < SEPARACION_MS) return;
    this.ultimo.set(tipo, ahoraMs);
    try {
      if (contexto.state === 'suspended') void contexto.resume().catch(() => undefined);
      const t0 = contexto.currentTime + 0.01;
      for (const nota of NOTAS[tipo]) this.tocar(contexto, nota, t0);
    } catch {
      // El audio falló: la pantalla sigue en silencio.
    }
  }

  /** Cierra el audio (al salir de la pantalla). */
  cerrar(): void {
    try {
      void this.contexto?.close();
    } catch {
      // Ya estaba cerrado.
    }
    this.contexto = null;
  }

  private tocar(contexto: AudioContext, nota: Nota, t0: number): void {
    const inicio = t0 + nota.inicio;
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.type = nota.onda;
    oscilador.frequency.value = nota.f;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(nota.volumen, inicio + 0.012);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + nota.duracion);
    oscilador.connect(ganancia);
    ganancia.connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + nota.duracion + 0.05);
  }
}
