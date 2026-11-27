import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import { MediaKind } from "../../models/whatsapp-thread.model";
import {
  ACCEPT_WHATSAPP,
  MAX_CAPTION,
  TOPE_SUBIDA,
  duracionLegible,
  kindDeArchivo,
  nuevoClientMessageId,
  tamanoLegible,
} from "../adjuntos.util";
import { EnvioAdjunto, EnvioAdjuntoService } from "../envio-adjunto.service";
import { FalloGrabacion, FormatoVoz, GrabadorVoz, formatoDeVoz } from "../grabador-voz";

/** Por qué no se pudo grabar → texto para el comercio. */
const CLAVE_FALLO_VOZ: Record<FalloGrabacion, string> = {
  permiso: "notificaciones.wa2.adjuntos.voz.permiso",
  sinMicrofono: "notificaciones.wa2.adjuntos.voz.sinMicrofono",
  noSoportado: "notificaciones.wa2.adjuntos.voz.noSoportado",
  error: "notificaciones.wa2.adjuntos.voz.error",
};

const LOCALE_POR_IDIOMA: Record<string, string> = { es: "es-CO", en: "en-US", pt: "pt-BR", de: "de-DE" };

/** Archivo elegido (o nota grabada) antes de enviar. */
interface Elegido {
  archivo: Blob;
  nombre: string;
  kind: MediaKind;
  voz: boolean;
  segundos: number | null;
  /** Dirección local de la vista previa (foto, audio o nota); se revoca al quitar o enviar. */
  cruda: string | null;
  vista: SafeUrl | null;
  /** La nota se grabó en un formato que el teléfono verá como archivo de audio. */
  comoArchivo: boolean;
}

export interface EstadoAdjuntar {
  /** Hay un archivo o una nota listos para enviar con el botón Enviar. */
  conArchivo: boolean;
  /** Es una nota de voz (el cuadro de texto se deshabilita). */
  voz: boolean;
  /** Se está grabando (el botón Enviar espera). */
  grabando: boolean;
}

type EstadoGrabacion = "inactivo" | "pidiendo" | "grabando";

/**
 * Adjuntar en el chat de WhatsApp (bandeja única): clip, micrófono, vista previa y avance del envío.
 *
 *  - Clip con los tipos que WhatsApp acepta; pegar (Ctrl+V) y arrastrar llegan por `tomarArchivo` con la misma
 *    revisión. La revisión de tamaño solo avisa: manda el servidor.
 *  - Vista previa: miniatura de la foto, ícono del video, reproductor del audio o la nota, ícono y nombre del
 *    documento, y «Quitar».
 *  - Envío en dos etapas («Subiendo X %», que se cancela; «Enviando a WhatsApp…», que no) y reintento con el
 *    mismo id. El envío vive en `EnvioAdjuntoService`: cambiar de chat no lo corta.
 *  - Nota de voz: pidiendo permiso, grabando (tiempo y nivel) y lista para escuchar, descartar o enviar. Corta
 *    sola a las 2:30.
 *  - Con el chat en solo lectura o la ventana de 24 h cerrada no hace nada y lo dice.
 */
@Component({
  selector: "app-wa-adjuntar",
  templateUrl: "./wa-adjuntar.component.html",
  styleUrls: ["./wa-adjuntar.component.scss"],
})
export class WaAdjuntarComponent implements OnChanges, OnDestroy {
  /** Clave del chat (`claveChat`): un envío por chat. */
  @Input() clave = "";
  @Input() phoneHash: string | null = null;
  @Input() lineId: string | null = null;
  /** Chat de otra persona o enviando un texto: no se adjunta. */
  @Input() bloqueado = false;
  /** El servidor dice que pasaron las 24 h: sin plantilla no se puede enviar nada. */
  @Input() ventanaCerrada = false;

  @Output() estadoCambio = new EventEmitter<EstadoAdjuntar>();

  @ViewChild("selector") selector?: ElementRef<HTMLInputElement>;
  @ViewChild("botonClip") botonClip?: ElementRef<HTMLButtonElement>;

  readonly accept = ACCEPT_WHATSAPP;
  readonly formatoVoz: FormatoVoz | null = formatoDeVoz();

  elegido: Elegido | null = null;
  /** Aviso local (tamaño, tipo, micrófono…): clave de traducción. */
  aviso: { clave: string; params?: Record<string, unknown> } | null = null;

  estadoGrabacion: EstadoGrabacion = "inactivo";
  private grabador: GrabadorVoz | null = null;

  constructor(
    readonly envios: EnvioAdjuntoService,
    private readonly sanitizer: DomSanitizer,
    private readonly translate: TranslateService,
    private readonly zona: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Otro chat: lo elegido o grabado era para el anterior y se descarta (un envío en camino sigue en el servicio).
    if (changes["clave"] && !changes["clave"].firstChange) {
      this.cancelarGrabacion();
      this.quitar();
      this.aviso = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelarGrabacion();
    this.soltarVista();
  }

  /** Envío en curso o fallido de este chat. */
  get envio(): EnvioAdjunto | null {
    return this.envios.de(this.clave);
  }

  get grabando(): boolean {
    return this.estadoGrabacion === "grabando";
  }

  /** Clip y micrófono: no con el chat bloqueado, la ventana cerrada, un envío en curso o una grabación. */
  get puedeAdjuntar(): boolean {
    return !!this.phoneHash && !this.bloqueado && !this.ventanaCerrada && !this.envio && this.estadoGrabacion === "inactivo";
  }

  get segundosGrabados(): string {
    return duracionLegible(this.grabador?.segundos || 0);
  }

  get nivelGrabacion(): number {
    return Math.round((this.grabador?.nivel || 0) * 100);
  }

  get tamanoElegido(): string {
    return this.elegido ? tamanoLegible(this.elegido.archivo.size, this.locale) : "";
  }

  get duracionElegida(): string {
    return this.elegido?.segundos ? duracionLegible(this.elegido.segundos) : "";
  }

  private get locale(): string {
    const idioma = (this.translate.currentLang || "es").slice(0, 2);
    return LOCALE_POR_IDIOMA[idioma] || idioma;
  }

  // ─── Elegir archivo ──────────────────────────────────────────────────

  abrirSelector(): void {
    if (!this.puedeAdjuntar) {
      this.avisarBloqueo();
      return;
    }
    this.selector?.nativeElement.click();
  }

  alElegir(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    input.value = "";
    if (archivo) this.tomarArchivo(archivo);
  }

  /** Archivo del clip, pegado o arrastrado: misma revisión para las tres vías. true si quedó listo. */
  tomarArchivo(archivo: File | null | undefined): boolean {
    if (!archivo) return false;
    if (!this.puedeAdjuntar) {
      this.avisarBloqueo();
      return false;
    }
    if (!archivo.size) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.errores.vacio" };
      return false;
    }
    const kind = kindDeArchivo(archivo);
    const tope = TOPE_SUBIDA[kind];
    if (archivo.size > tope) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoPesado", params: { mb: Math.round(tope / (1024 * 1024)) } };
      return false;
    }
    if (/^image\/(heic|heif)$/i.test(archivo.type) || /\.(heic|heif)$/i.test(archivo.name)) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoHeic" };
      return false;
    }
    if (kind === "video" && (/quicktime/i.test(archivo.type) || /\.mov$/i.test(archivo.name))) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.errores.videoComoDocumento" };
      return false;
    }
    this.quitar();
    this.aviso = null;
    const conVista = kind === "image" || kind === "audio";
    const cruda = conVista ? URL.createObjectURL(archivo) : null;
    this.elegido = {
      archivo,
      nombre: archivo.name || this.translate.instant("notificaciones.wa2.adjuntos.nombreDocumento"),
      kind,
      voz: false,
      segundos: null,
      cruda,
      vista: cruda ? this.sanitizer.bypassSecurityTrustUrl(cruda) : null,
      comoArchivo: false,
    };
    this.emitir();
    return true;
  }

  /** Quita lo elegido (y suelta su vista previa). */
  quitar(): void {
    if (!this.elegido) return;
    this.soltarVista();
    this.elegido = null;
    this.emitir();
  }

  /**
   * Envía lo elegido con `texto` como pie de foto (WhatsApp no deja texto en audios ni notas). Lo llama el
   * cuadro de escribir al pulsar Enviar o Enter. 'enviado': el cuadro puede limpiarse; 'nada': no había archivo;
   * 'aviso': no se envió y aquí se dice por qué.
   */
  enviarElegido(texto: string): "enviado" | "nada" | "aviso" {
    const e = this.elegido;
    if (!e) return "nada";
    if (!this.phoneHash || this.bloqueado || this.ventanaCerrada) {
      this.avisarBloqueo();
      return "aviso";
    }
    if (this.envio) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoUnoALaVez" };
      return "aviso";
    }
    const pie = (texto || "").trim();
    if (pie && e.kind === "audio") {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.errores.audioConTexto" };
      return "aviso";
    }
    if (pie.length > MAX_CAPTION) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.errores.textoLargo" };
      return "aviso";
    }
    const ok = this.envios.enviar({
      clave: this.clave,
      phoneHash: this.phoneHash,
      lineId: this.lineId,
      clientMessageId: nuevoClientMessageId(),
      archivo: e.archivo,
      nombre: e.nombre,
      kind: e.kind,
      voz: e.voz,
      texto: pie,
      durationSec: e.segundos,
    });
    if (!ok) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoUnoALaVez" };
      return "aviso";
    }
    this.soltarVista();
    this.elegido = null;
    this.aviso = null;
    this.emitir();
    return "enviado";
  }

  // ─── Envío en curso ──────────────────────────────────────────────────

  cancelarEnvio(): void {
    if (this.envios.cancelar(this.clave)) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.cancelado" };
    }
  }

  reintentarEnvio(): void {
    if (this.bloqueado || this.ventanaCerrada) {
      this.avisarBloqueo();
      return;
    }
    this.envios.reintentar(this.clave);
  }

  quitarEnvio(): void {
    this.envios.quitar(this.clave);
  }

  // ─── Nota de voz ─────────────────────────────────────────────────────

  /** Clic en el micrófono: pide permiso y graba. */
  async grabar(): Promise<void> {
    if (!this.formatoVoz) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.voz.noSoportado" };
      return;
    }
    if (!this.puedeAdjuntar) {
      this.avisarBloqueo();
      return;
    }
    this.quitar();
    this.aviso = null;
    this.estadoGrabacion = "pidiendo";
    this.emitir();
    const grabador = new GrabadorVoz(
      this.formatoVoz,
      (nota) => this.zona.run(() => this.alTerminarGrabacion(grabador, nota)),
      () => this.cdr.markForCheck(),
    );
    this.grabador = grabador;
    const fallo: FalloGrabacion | null = await grabador.empezar();
    if (this.grabador !== grabador) return; // se canceló mientras se pedía el permiso
    if (fallo) {
      this.grabador = null;
      this.estadoGrabacion = "inactivo";
      this.aviso = { clave: CLAVE_FALLO_VOZ[fallo] };
      this.emitir();
      return;
    }
    this.estadoGrabacion = "grabando";
    this.emitir();
  }

  detenerGrabacion(): void {
    this.grabador?.detener();
  }

  /** Descarta la grabación en curso y suelta el micrófono. */
  cancelarGrabacion(): void {
    const g = this.grabador;
    if (!g) return;
    this.grabador = null;
    g.cancelar();
    this.estadoGrabacion = "inactivo";
    this.emitir();
  }

  private alTerminarGrabacion(grabador: GrabadorVoz, nota: { blob: Blob; nombre: string; segundos: number; formato: FormatoVoz } | null): void {
    if (this.grabador !== grabador) return;
    this.grabador = null;
    this.estadoGrabacion = "inactivo";
    if (nota && nota.segundos >= 1) {
      const cruda = URL.createObjectURL(nota.blob);
      this.elegido = {
        archivo: nota.blob,
        nombre: nota.nombre,
        kind: "audio",
        voz: true,
        segundos: nota.segundos,
        cruda,
        vista: this.sanitizer.bypassSecurityTrustUrl(cruda),
        comoArchivo: !nota.formato.comoNota,
      };
    } else if (nota) {
      this.aviso = { clave: "notificaciones.wa2.adjuntos.voz.muyCorta" };
    }
    this.emitir();
  }

  // ─────────────────────────────────────────────────────────────────────

  private avisarBloqueo(): void {
    if (this.ventanaCerrada) this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoVentana" };
    else if (this.bloqueado) this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoBloqueado" };
    else if (this.envio) this.aviso = { clave: "notificaciones.wa2.adjuntos.avisoUnoALaVez" };
  }

  private soltarVista(): void {
    if (this.elegido?.cruda) URL.revokeObjectURL(this.elegido.cruda);
    if (this.elegido) {
      this.elegido.cruda = null;
      this.elegido.vista = null;
    }
  }

  private emitir(): void {
    this.estadoCambio.emit({
      conArchivo: !!this.elegido,
      voz: !!this.elegido?.voz,
      grabando: this.estadoGrabacion !== "inactivo",
    });
  }
}
