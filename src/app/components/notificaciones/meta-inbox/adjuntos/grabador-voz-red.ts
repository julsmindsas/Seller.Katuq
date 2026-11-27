/**
 * Grabador de notas de voz del chat de Instagram y Facebook (bandeja única). Sin Angular y sin librerías.
 *
 * Instagram y Facebook reciben audio AAC/M4A o WAV (no Ogg ni WebM), así que:
 *  - si el navegador graba `audio/mp4;codecs=mp4a.40.2` (Safari y los Chrome nuevos), se usa MediaRecorder;
 *  - si no, se arma un WAV PCM mono a 16 kHz. La frecuencia se baja a mano desde la del contexto (un
 *    AudioContext de 16 kHz falla en Firefox), con un AudioWorklet (o ScriptProcessor si no hay) y un
 *    encabezado RIFF de 44 bytes. 2:30 de voz son unos 4,8 MB.
 *
 * Cadena: getUserMedia({audio:{channelCount:1, echoCancellation, noiseSuppression}}) → AudioContext (se crea
 * y se reanuda en el clic, por Safari) → GainNode (channelCount 1, explicit) → MediaStreamAudioDestinationNode
 * con channelCount 1 explicit (para MediaRecorder) o el nodo que toma las muestras (para WAV).
 */
import { MAX_SEGUNDOS_VOZ_RED } from './adjuntos-red.util';

export type FormatoVozRed = 'mp4' | 'wav';

export type FalloGrabacionRed = 'permiso' | 'sinMicrofono' | 'noSoportado' | 'error';

export interface NotaGrabadaRed {
  blob: Blob;
  nombre: string;
  segundos: number;
}

const MIME_MP4 = 'audio/mp4;codecs=mp4a.40.2';
const FRECUENCIA_WAV = 16000;

/** Módulo del AudioWorklet: entrega al hilo principal cada bloque del primer canal. */
const CODIGO_WORKLET = `
class TomaMuestras extends AudioWorkletProcessor {
  process(entradas) {
    const canal = entradas[0] && entradas[0][0];
    if (canal && canal.length) this.port.postMessage(canal.slice(0));
    return true;
  }
}
registerProcessor('katuq-toma-muestras', TomaMuestras);
`;

/** Con qué formato puede grabar este navegador; null si no puede. */
export function formatoDeVozRed(): FormatoVozRed | null {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return null;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  const MR: any = (window as any).MediaRecorder;
  if (MR && typeof MR.isTypeSupported === 'function' && MR.isTypeSupported(MIME_MP4)) return 'mp4';
  return 'wav';
}

/** Encabezado RIFF/WAVE de 44 bytes + PCM de 16 bits mono. */
export function armarWav(muestras: Int16Array[], frecuencia: number): Blob {
  const total = muestras.reduce((n, m) => n + m.length, 0);
  const datos = total * 2;
  const cabeza = new DataView(new ArrayBuffer(44));
  const texto = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) cabeza.setUint8(pos + i, s.charCodeAt(i));
  };
  texto(0, 'RIFF');
  cabeza.setUint32(4, 36 + datos, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  cabeza.setUint32(16, 16, true); // tamaño del bloque fmt
  cabeza.setUint16(20, 1, true); // PCM
  cabeza.setUint16(22, 1, true); // mono
  cabeza.setUint32(24, frecuencia, true);
  cabeza.setUint32(28, frecuencia * 2, true); // bytes por segundo
  cabeza.setUint16(32, 2, true); // bytes por muestra
  cabeza.setUint16(34, 16, true); // bits
  texto(36, 'data');
  cabeza.setUint32(40, datos, true);
  return new Blob([cabeza.buffer, ...muestras.map((m) => m.buffer as ArrayBuffer)], { type: 'audio/wav' });
}

/**
 * Baja la frecuencia por bloques: promedia las muestras de entrada que caen en cada muestra de salida. Guarda
 * el estado entre bloques para no cortar la onda.
 */
export class Diezmador {
  private readonly paso: number;
  private siguienteCorte: number;
  private indice = 0;
  private suma = 0;
  private cuenta = 0;
  readonly salida: Int16Array[] = [];

  constructor(frecuenciaEntrada: number, frecuenciaSalida: number) {
    this.paso = Math.max(1, frecuenciaEntrada / frecuenciaSalida);
    this.siguienteCorte = this.paso;
  }

  agregar(bloque: Float32Array): void {
    const fuera: number[] = [];
    for (let i = 0; i < bloque.length; i++) {
      this.suma += bloque[i];
      this.cuenta += 1;
      this.indice += 1;
      if (this.indice >= this.siguienteCorte) {
        const v = Math.max(-1, Math.min(1, this.suma / this.cuenta));
        fuera.push(v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff));
        this.suma = 0;
        this.cuenta = 0;
        this.siguienteCorte += this.paso;
      }
    }
    if (fuera.length) this.salida.push(Int16Array.from(fuera));
  }
}

/** Lo único que el grabador necesita de NgZone (así sigue sin depender de Angular). */
export interface ZonaGrabadorRed {
  runOutsideAngular<T>(fn: () => T): T;
}

export class GrabadorVozRed {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private analizador: AnalyserNode | null = null;
  private toma: AudioNode | null = null;
  private diezmador: Diezmador | null = null;
  private trozos: Blob[] = [];
  private inicio = 0;
  private reloj: any = null;
  private cancelado = false;
  private terminado = false;
  private muestras: Uint8Array | null = null;
  private urlWorklet: string | null = null;

  /** Segundos grabados (se actualiza mientras graba). */
  segundos = 0;
  /** Nivel del micrófono, de 0 a 1 (para la barra). */
  nivel = 0;

  /**
   * @param alTerminar nota lista (al detener o al llegar a 2:30), o null si se canceló.
   * @param alTick cada ~200 ms mientras graba (tiempo y nivel). Con `zona`, corre FUERA de Angular: quien lo
   *   recibe repinta solo su parte (no toda la app cinco veces por segundo).
   * @param zona NgZone de quien graba; sin ella el reloj corre donde se llame.
   */
  constructor(
    private readonly formato: FormatoVozRed,
    private readonly alTerminar: (nota: NotaGrabadaRed | null) => void,
    private readonly alTick: () => void,
    private readonly zona: ZonaGrabadorRed | null = null,
  ) {}

  /**
   * Pide el micrófono y empieza. Se llama DENTRO del clic: el AudioContext se crea y se reanuda antes del
   * primer `await`, porque Safari solo deja sonar audio iniciado por la persona.
   */
  async empezar(): Promise<FalloGrabacionRed | null> {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    try {
      this.ctx = new Ctx();
      void this.ctx!.resume?.();
    } catch {
      return 'noSoportado';
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints,
      });
    } catch (err: any) {
      this.liberar();
      const nombre = String(err?.name || '');
      if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return 'permiso';
      if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'sinMicrofono';
      return 'error';
    }
    if (this.cancelado) {
      this.liberar();
      return null;
    }
    try {
      const ctx = this.ctx!;
      const fuente = ctx.createMediaStreamSource(this.stream);
      const ganancia = ctx.createGain();
      ganancia.channelCount = 1;
      ganancia.channelCountMode = 'explicit';
      fuente.connect(ganancia);
      this.analizador = ctx.createAnalyser();
      this.analizador.fftSize = 512;
      this.muestras = new Uint8Array(this.analizador.fftSize);
      ganancia.connect(this.analizador);

      if (this.formato === 'mp4') {
        const destino = ctx.createMediaStreamDestination();
        destino.channelCount = 1;
        destino.channelCountMode = 'explicit';
        ganancia.connect(destino);
        this.recorder = new MediaRecorder(destino.stream, { mimeType: MIME_MP4, audioBitsPerSecond: 48000 });
        this.trozos = [];
        this.recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) this.trozos.push(ev.data);
        };
        this.recorder.onstop = () => this.alDetener();
        this.recorder.start(1000);
      } else {
        this.diezmador = new Diezmador(ctx.sampleRate, FRECUENCIA_WAV);
        this.toma = await this.crearToma(ctx);
        if (this.cancelado) {
          this.liberar();
          return null;
        }
        // El nodo que toma muestras solo corre si llega al destino: se conecta en silencio.
        const silencio = ctx.createGain();
        silencio.gain.value = 0;
        ganancia.connect(this.toma);
        this.toma.connect(silencio);
        silencio.connect(ctx.destination);
      }
      this.inicio = Date.now();
      this.reloj = this.fuera(() => setInterval(() => this.tick(), 200));
      return null;
    } catch {
      this.liberar();
      return 'noSoportado';
    }
  }

  /** AudioWorklet (módulo propio, sin archivos externos) y, si el navegador no lo tiene, ScriptProcessor. */
  private async crearToma(ctx: AudioContext): Promise<AudioNode> {
    const alBloque = (bloque: Float32Array) => {
      if (!this.cancelado && !this.terminado) this.diezmador?.agregar(bloque);
    };
    const Worklet = (window as any).AudioWorkletNode;
    if (ctx.audioWorklet && Worklet) {
      try {
        this.urlWorklet = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: 'application/javascript' }));
        await ctx.audioWorklet.addModule(this.urlWorklet);
        const nodo: AudioWorkletNode = new Worklet(ctx, 'katuq-toma-muestras', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          channelCountMode: 'explicit',
        });
        // Llegan cientos de bloques por segundo: el manejador se pone fuera de Angular (no repinta la app).
        this.fuera(() => {
          nodo.port.onmessage = (ev: MessageEvent) => alBloque(ev.data as Float32Array);
        });
        return nodo;
      } catch {
        // sigue con ScriptProcessor
      }
    }
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    this.fuera(() => {
      proc.onaudioprocess = (ev: AudioProcessingEvent) => alBloque(ev.inputBuffer.getChannelData(0).slice(0));
    });
    return proc;
  }

  /** Corre `fn` fuera de Angular si hay zona (los manejadores que ponga quedan fuera). */
  private fuera<T>(fn: () => T): T {
    return this.zona ? this.zona.runOutsideAngular(fn) : fn();
  }

  get grabando(): boolean {
    return !!this.reloj;
  }

  /** Detiene y entrega la nota (por `alTerminar`). */
  detener(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
      return;
    }
    if (this.diezmador) {
      this.alDetener();
      return;
    }
    this.liberar();
  }

  /** Descarta la grabación y suelta el micrófono. */
  cancelar(): void {
    this.cancelado = true;
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    } else {
      this.liberar();
      if (!this.terminado) {
        this.terminado = true;
        this.alTerminar(null);
      }
    }
  }

  private tick(): void {
    this.segundos = (Date.now() - this.inicio) / 1000;
    if (this.analizador && this.muestras) {
      this.analizador.getByteTimeDomainData(this.muestras);
      let suma = 0;
      for (let i = 0; i < this.muestras.length; i++) {
        const v = (this.muestras[i] - 128) / 128;
        suma += v * v;
      }
      this.nivel = Math.min(1, Math.sqrt(suma / this.muestras.length) * 3);
    }
    if (this.segundos >= MAX_SEGUNDOS_VOZ_RED) this.detener();
    this.alTick();
  }

  private alDetener(): void {
    if (this.terminado) return;
    this.terminado = true;
    const segundos = Math.min(MAX_SEGUNDOS_VOZ_RED, (Date.now() - this.inicio) / 1000);
    const trozos = this.trozos;
    const pcm = this.diezmador ? this.diezmador.salida : null;
    this.liberar();
    if (this.cancelado) {
      this.alTerminar(null);
      return;
    }
    if (pcm) {
      if (!pcm.length) {
        this.alTerminar(null);
        return;
      }
      this.alTerminar({ blob: armarWav(pcm, FRECUENCIA_WAV), nombre: 'nota-de-voz.wav', segundos });
      return;
    }
    if (!trozos.length) {
      this.alTerminar(null);
      return;
    }
    this.alTerminar({ blob: new Blob(trozos, { type: 'audio/mp4' }), nombre: 'nota-de-voz.m4a', segundos });
  }

  /** Suelta el micrófono (track.stop) y cierra el contexto de audio. */
  private liberar(): void {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.toma) {
      try {
        this.toma.disconnect();
        const port = (this.toma as any).port;
        if (port) port.onmessage = null;
        if ((this.toma as any).onaudioprocess !== undefined) (this.toma as any).onaudioprocess = null;
      } catch {
        /* ya desconectado */
      }
    }
    this.toma = null;
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        /* ya cerrado */
      }
    }
    this.ctx = null;
    if (this.urlWorklet) URL.revokeObjectURL(this.urlWorklet);
    this.urlWorklet = null;
    this.analizador = null;
    this.recorder = null;
    this.diezmador = null;
    this.trozos = [];
    this.nivel = 0;
  }
}
