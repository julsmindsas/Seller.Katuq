import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import { MediaInfo } from "../../models/whatsapp-thread.model";
import { CacheAdjuntos, EstadoAdjunto } from "../cache-adjuntos";
import { tamanoLegible } from "../adjuntos.util";

const LOCALE_POR_IDIOMA: Record<string, string> = { es: "es-CO", en: "en-US", pt: "pt-BR", de: "de-DE" };

/**
 * Archivo de un mensaje del chat de WhatsApp (solo presentación, bandeja única):
 *  - foto y sticker: se bajan al quedar a la vista y se amplían dentro de la página (Esc cierra);
 *  - audio y nota de voz: «Reproducir» baja el archivo al tocarlo; si el navegador no lo reproduce
 *    (Safari con Ogg), se ofrece descargarlo;
 *  - video: tarjeta con «Reproducir» y luego el reproductor;
 *  - documento: ícono, nombre, tamaño y «Descargar»;
 *  - no disponible: el motivo en palabras.
 * Los archivos se piden por el servicio con la sesión (blob) a través de la caché del chat, que los suelta al
 * cambiar de chat. Nunca se abre un blob en otra pestaña.
 */
@Component({
  selector: "app-wa-adjunto-vista",
  templateUrl: "./wa-adjunto-vista.component.html",
  styleUrls: ["./wa-adjunto-vista.component.scss"],
})
export class WaAdjuntoVistaComponent implements OnChanges, AfterViewInit, DoCheck, OnDestroy {
  @Input() adjunto: MediaInfo | null = null;
  @Input() cache: CacheAdjuntos | null = null;
  /** Lo envió el comercio (cambia el color de la tarjeta). */
  @Input() saliente = false;

  @ViewChild("caja") caja?: ElementRef<HTMLElement>;
  @ViewChild("cerrarAmpliada") cerrarAmpliada?: ElementRef<HTMLButtonElement>;

  /** El reproductor de audio o video se pidió (se monta al tener el archivo). */
  reproducir = false;
  /** El navegador no pudo mostrar o reproducir el archivo: se ofrece descargarlo. */
  noSeReproduce = false;
  ampliada = false;

  private observador: IntersectionObserver | null = null;
  private focoPrevio: HTMLElement | null = null;

  constructor(private readonly translate: TranslateService, private readonly zona: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    const cambio = changes["adjunto"];
    if (cambio && !cambio.firstChange) {
      // Cada refresco del chat trae objetos nuevos para el mismo archivo: si es el mismo, no se corta
      // el audio o el video que suena ni se cierra la foto ampliada.
      const previo = cambio.previousValue as MediaInfo | null;
      const actual = this.adjunto;
      if (
        previo &&
        actual &&
        previo.id === actual.id &&
        previo.url === actual.url &&
        previo.disponible === actual.disponible
      ) {
        return;
      }
      this.reproducir = false;
      this.noSeReproduce = false;
      this.ampliada = false;
      this.observar();
    }
  }

  ngAfterViewInit(): void {
    this.observar();
  }

  ngOnDestroy(): void {
    this.dejarDeObservar();
  }

  get a(): MediaInfo | null {
    return this.adjunto;
  }

  get estado(): EstadoAdjunto | null {
    return this.cache ? this.cache.estado(this.adjunto) : null;
  }

  get esImagen(): boolean {
    return this.adjunto?.kind === "image" || this.adjunto?.kind === "sticker";
  }

  /** El archivo llegó con un formato que el navegador no muestra: se trata como documento. */
  get soloDescarga(): boolean {
    const e = this.estado;
    return !!e && e.estado === "listo" && e.mime === "application/octet-stream" && this.adjunto?.kind !== "document";
  }

  get tamano(): string {
    const idioma = (this.translate.currentLang || "es").slice(0, 2);
    return tamanoLegible(this.adjunto?.bytes, LOCALE_POR_IDIOMA[idioma] || idioma);
  }

  get nombreArchivo(): string {
    const a = this.adjunto;
    if (!a) return "";
    if (a.filename) return a.filename;
    switch (a.kind) {
      case "image":
      case "sticker":
        return this.translate.instant("notificaciones.wa2.adjuntos.nombreFoto");
      case "audio":
        return this.translate.instant(a.voice ? "notificaciones.wa2.adjuntos.nombreVoz" : "notificaciones.wa2.adjuntos.nombreAudio");
      case "video":
        return this.translate.instant("notificaciones.wa2.adjuntos.nombreVideo");
      default:
        return this.translate.instant("notificaciones.wa2.adjuntos.nombreDocumento");
    }
  }

  /** Nombre con que se guarda en el equipo (con extensión si el servidor no trajo nombre). */
  private get nombreDescarga(): string {
    const a = this.adjunto;
    if (!a) return "archivo";
    if (a.filename) return a.filename;
    const ext: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/aac": "aac",
      "audio/amr": "amr",
      "video/mp4": "mp4",
      "video/3gpp": "3gp",
      "application/pdf": "pdf",
    };
    const e = ext[String(a.mime || "").toLowerCase()];
    return e ? `${this.nombreArchivo}.${e}` : this.nombreArchivo;
  }

  get iconoDocumento(): string {
    const m = String(this.adjunto?.mime || "").toLowerCase();
    const n = String(this.adjunto?.filename || "").toLowerCase();
    if (m.includes("pdf") || n.endsWith(".pdf")) return "fa-file-pdf-o";
    if (/sheet|excel/.test(m) || /\.xlsx?$/.test(n)) return "fa-file-excel-o";
    if (/word/.test(m) || /\.docx?$/.test(n)) return "fa-file-word-o";
    if (/presentation|powerpoint/.test(m) || /\.pptx?$/.test(n)) return "fa-file-powerpoint-o";
    if (this.adjunto?.kind === "audio") return "fa-file-audio-o";
    if (this.adjunto?.kind === "video") return "fa-file-video-o";
    if (m.startsWith("image/")) return "fa-file-image-o";
    return "fa-file-o";
  }

  get claveMotivo(): string {
    switch (this.adjunto?.motivo) {
      case "vencido":
        return "notificaciones.wa2.adjuntos.vencido";
      case "compartido":
        return "notificaciones.wa2.adjuntos.compartido";
      default:
        return "notificaciones.wa2.adjuntos.sinArchivo";
    }
  }

  get claveFallo(): string {
    const e = this.estado;
    if (!e || e.estado !== "error") return "";
    if (e.motivo === "vencido") return "notificaciones.wa2.adjuntos.vencido";
    if (e.motivo === "noDisponible") return "notificaciones.wa2.adjuntos.noDisponible";
    return "notificaciones.wa2.adjuntos.errorBajar";
  }

  get puedeReintentarBajar(): boolean {
    const e = this.estado;
    return !!e && e.estado === "error" && e.motivo === "reintentar";
  }

  reintentarBajar(): void {
    if (this.adjunto && this.cache) this.cache.pedir(this.adjunto, true);
  }

  /** «Reproducir» de audio y video: baja el archivo y monta el reproductor. */
  alReproducir(): void {
    if (!this.adjunto || !this.cache) return;
    this.reproducir = true;
    this.noSeReproduce = false;
    this.cache.pedir(this.adjunto);
  }

  /** «Descargar»: baja el archivo si hace falta y lo guarda con su nombre. */
  descargar(): void {
    const a = this.adjunto;
    if (!a || !this.cache) return;
    if (this.cache.guardarComo(a, this.nombreDescarga)) return;
    this.pendienteGuardar = true;
    this.cache.pedir(a, true);
  }
  /** Se pidió «Descargar» antes de tener el archivo: se guarda en cuanto llega. */
  private pendienteGuardar = false;

  /** Se revisa en cada vuelta: si la descarga pedida ya llegó, se guarda. */
  ngDoCheck(): void {
    if (!this.pendienteGuardar || !this.adjunto || !this.cache) return;
    const e = this.estado;
    if (!e || e.estado === "cargando") return;
    this.pendienteGuardar = false;
    if (e.estado === "listo") this.cache.guardarComo(this.adjunto, this.nombreDescarga);
  }

  alFallarReproduccion(): void {
    this.noSeReproduce = true;
  }

  ampliar(): void {
    if (!this.esImagen || this.estado?.estado !== "listo" || this.soloDescarga) return;
    this.focoPrevio = document.activeElement as HTMLElement | null;
    this.ampliada = true;
    setTimeout(() => this.cerrarAmpliada?.nativeElement.focus());
  }

  cerrar(): void {
    if (!this.ampliada) return;
    this.ampliada = false;
    const previo = this.focoPrevio;
    this.focoPrevio = null;
    if (previo && typeof previo.focus === "function") setTimeout(() => previo.focus());
  }

  /** La foto ampliada es una ventana modal: Tab y Mayús+Tab se quedan en su único botón. */
  retenerFoco(evento: Event): void {
    evento.preventDefault();
    this.cerrarAmpliada?.nativeElement.focus();
  }

  @HostListener("document:keydown.escape")
  alEscape(): void {
    this.cerrar();
  }

  /** Fotos y stickers se bajan al quedar a la vista (no todas al abrir el chat). */
  private observar(): void {
    this.dejarDeObservar();
    const a = this.adjunto;
    if (!a || !a.disponible || !this.cache || !(a.kind === "image" || a.kind === "sticker")) return;
    const el = this.caja?.nativeElement;
    if (!el || typeof IntersectionObserver === "undefined") {
      this.cache.pedir(a);
      return;
    }
    this.observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        // Dentro de Angular: así la respuesta de la descarga repinta la burbuja.
        this.zona.run(() => {
          this.dejarDeObservar();
          if (this.adjunto && this.cache) this.cache.pedir(this.adjunto);
        });
      },
      { rootMargin: "200px" },
    );
    this.observador.observe(el);
  }

  private dejarDeObservar(): void {
    if (this.observador) this.observador.disconnect();
    this.observador = null;
  }
}
