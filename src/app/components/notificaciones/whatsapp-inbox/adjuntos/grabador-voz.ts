/**
 * Grabador de notas de voz del chat de WhatsApp (bandeja única). Sin Angular y sin librerías.
 *
 * Cadena (WhatsApp solo muestra como nota de voz un Ogg/Opus de UN canal):
 *   getUserMedia({audio:{channelCount:1, echoCancellation, noiseSuppression}})
 *   → AudioContext (se crea y se reanuda en el clic, por Safari)
 *   → GainNode (channelCount 1, explicit)
 *   → MediaStreamAudioDestinationNode con channelCount = 1 y channelCountMode = 'explicit' (viene en 2)
 *   → MediaRecorder con audioBitsPerSecond 24000.
 *
 * Formato, en este orden: Ogg/Opus (Firefox), WebM/Opus (Chrome, Edge y Safari 18.4 o posterior; el servidor
 * cambia el contenedor a Ogg sin recodificar) y MP4/AAC (Safari viejo: llega como audio común, no como nota).
 * No se reutiliza voice-interaction (fija webm).
 */
import { MAX_SEGUNDOS_VOZ } from "./adjuntos.util";

export interface FormatoVoz {
  mimeType: string;
  extension: string;
  /** false: el teléfono lo verá como archivo de audio y no como nota de voz. */
  comoNota: boolean;
}

const FORMATOS: FormatoVoz[] = [
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg", comoNota: true },
  { mimeType: "audio/webm;codecs=opus", extension: "webm", comoNota: true },
  { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a", comoNota: false },
];

export type FalloGrabacion = "permiso" | "sinMicrofono" | "noSoportado" | "error";

export interface NotaGrabada {
  blob: Blob;
  nombre: string;
  segundos: number;
  formato: FormatoVoz;
}

/** El navegador puede grabar (y con qué formato); null si no. */
export function formatoDeVoz(): FormatoVoz | null {
  const MR: any = (window as any).MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== "function") return null;
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") return null;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  return FORMATOS.find((f) => MR.isTypeSupported(f.mimeType)) || null;
}

export class GrabadorVoz {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private analizador: AnalyserNode | null = null;
  private trozos: Blob[] = [];
  private inicio = 0;
  private reloj: any = null;
  private cancelado = false;
  private muestras: Uint8Array | null = null;

  /** Segundos grabados (se actualiza mientras graba). */
  segundos = 0;
  /** Nivel del micrófono, de 0 a 1 (para la barra). */
  nivel = 0;
  /** Canales que reportó el micrófono (informativo: la cadena siempre entrega uno). */
  canalesMicrofono: number | null = null;

  /**
   * @param alTerminar nota lista (al detener o al llegar a 2:30), o null si se canceló.
   * @param alTick cada ~200 ms mientras graba (tiempo y nivel).
   */
  constructor(
    private readonly formato: FormatoVoz,
    private readonly alTerminar: (nota: NotaGrabada | null) => void,
    private readonly alTick: () => void,
  ) {}

  /**
   * Pide el micrófono y empieza. Se llama DENTRO del clic: el AudioContext se crea y se reanuda antes del
   * primer `await`, porque Safari solo deja sonar audio iniciado por la persona.
   */
  async empezar(): Promise<FalloGrabacion | null> {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    try {
      this.ctx = new Ctx();
      void this.ctx!.resume?.();
    } catch {
      return "noSoportado";
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints,
      });
    } catch (err: any) {
      this.liberar();
      const nombre = String(err?.name || "");
      if (nombre === "NotAllowedError" || nombre === "SecurityError") return "permiso";
      if (nombre === "NotFoundError" || nombre === "OverconstrainedError") return "sinMicrofono";
      return "error";
    }
    if (this.cancelado) {
      this.liberar();
      return null;
    }
    try {
      const pista = this.stream.getAudioTracks()[0];
      const ajustes: any = pista && typeof pista.getSettings === "function" ? pista.getSettings() : {};
      this.canalesMicrofono = typeof ajustes.channelCount === "number" ? ajustes.channelCount : null;

      const ctx = this.ctx!;
      const fuente = ctx.createMediaStreamSource(this.stream);
      const ganancia = ctx.createGain();
      ganancia.channelCount = 1;
      ganancia.channelCountMode = "explicit";
      const destino = ctx.createMediaStreamDestination();
      destino.channelCount = 1;
      destino.channelCountMode = "explicit";
      fuente.connect(ganancia);
      ganancia.connect(destino);
      this.analizador = ctx.createAnalyser();
      this.analizador.fftSize = 512;
      this.muestras = new Uint8Array(this.analizador.fftSize);
      ganancia.connect(this.analizador);

      this.recorder = new MediaRecorder(destino.stream, {
        mimeType: this.formato.mimeType,
        audioBitsPerSecond: 24000,
      });
      this.trozos = [];
      this.recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) this.trozos.push(ev.data);
      };
      this.recorder.onstop = () => this.alDetener();
      this.recorder.start(1000);
      this.inicio = Date.now();
      this.reloj = setInterval(() => this.tick(), 200);
      return null;
    } catch {
      this.liberar();
      return "noSoportado";
    }
  }

  get grabando(): boolean {
    return !!this.recorder && this.recorder.state === "recording";
  }

  /** Detiene y entrega la nota (por `alTerminar`). */
  detener(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    } else {
      this.liberar();
    }
  }

  /** Descarta la grabación y suelta el micrófono. */
  cancelar(): void {
    this.cancelado = true;
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    } else {
      this.liberar();
      this.alTerminar(null);
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
    if (this.segundos >= MAX_SEGUNDOS_VOZ) this.detener();
    this.alTick();
  }

  private alDetener(): void {
    const segundos = Math.min(MAX_SEGUNDOS_VOZ, (Date.now() - this.inicio) / 1000);
    const tipo = (this.recorder && this.recorder.mimeType) || this.formato.mimeType;
    const trozos = this.trozos;
    this.liberar();
    if (this.cancelado || !trozos.length) {
      this.alTerminar(null);
      return;
    }
    const blob = new Blob(trozos, { type: tipo.split(";")[0] });
    this.alTerminar({ blob, nombre: `nota-de-voz.${this.formato.extension}`, segundos, formato: this.formato });
  }

  /** Suelta el micrófono (track.stop) y cierra el contexto de audio. */
  private liberar(): void {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        /* ya cerrado */
      }
    }
    this.ctx = null;
    this.analizador = null;
    this.recorder = null;
    this.trozos = [];
    this.nivel = 0;
  }
}
