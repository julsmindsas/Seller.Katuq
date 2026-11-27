import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { MetaAdjunto, MetaAdjuntoKind } from '../../models/meta-thread.model';
import { CacheAdjuntosRed, EstadoAdjuntoRed } from '../cache-adjuntos-red';
import { LOCALE_POR_IDIOMA, claveEtiquetaAdjunto, kindDeAdjunto, tamanoLegibleRed } from '../adjuntos-red.util';

/** ¿Es el mismo archivo? (Un refresco trae otro objeto con los mismos datos.) */
function mismoArchivo(previo: MetaAdjunto | null | undefined, actual: MetaAdjunto | null | undefined): boolean {
  if (!previo || !actual) return previo === actual;
  return previo.id === actual.id && previo.url === actual.url && previo.disponible === actual.disponible;
}

/**
 * Archivo de un mensaje de Instagram o Facebook (solo presentación, bandeja única):
 *  - foto y sticker: se bajan al quedar a la vista y se amplían dentro de la página (Esc cierra);
 *  - audio: «Reproducir» baja el archivo al tocarlo; si el navegador no lo reproduce, se ofrece descargarlo;
 *  - video: tarjeta con «Reproducir» y luego el reproductor;
 *  - documento: ícono, nombre, tamaño y «Descargar»;
 *  - publicación, historia, reel o enlace compartido: una etiqueta, sin archivo;
 *  - lo que envió el comercio: Meta no deja volver a bajarlo, así que se ve la copia local mientras dure la
 *    sesión y, si no, la tarjeta con nombre y tamaño.
 * Los archivos se piden por el servicio con la sesión (blob) a través de la caché del chat, que los suelta al
 * cambiar de chat. Nunca se abre un blob en otra pestaña.
 */
@Component({
  selector: 'app-meta-adjunto-vista',
  templateUrl: './meta-adjunto-vista.component.html',
  styleUrls: ['./meta-adjunto-vista.component.scss'],
})
export class MetaAdjuntoVistaComponent implements OnChanges, AfterViewInit, DoCheck, OnDestroy {
  @Input() adjunto: MetaAdjunto | null = null;
  @Input() cache: CacheAdjuntosRed | null = null;
  /** Lo envió el comercio (cambia el color de la tarjeta). */
  @Input() saliente = false;
  /** La foto terminó de cargar (para que el chat siga abajo si el asesor estaba abajo). */
  @Output() cargada = new EventEmitter<void>();

  @ViewChild('caja') caja?: ElementRef<HTMLElement>;
  @ViewChild('cerrarAmpliada') cerrarAmpliada?: ElementRef<HTMLButtonElement>;

  /** El reproductor de audio o video se pidió (se monta al tener el archivo). */
  reproducir = false;
  /** El navegador no pudo mostrar o reproducir el archivo: se ofrece descargarlo. */
  noSeReproduce = false;
  ampliada = false;

  private observador: IntersectionObserver | null = null;
  private focoPrevio: HTMLElement | null = null;
  /** Se pidió «Descargar» antes de tener el archivo: se guarda en cuanto llega. */
  private pendienteGuardar = false;

  constructor(private readonly translate: TranslateService, private readonly zona: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    const cambioAdjunto = changes['adjunto'];
    const cambioCache = changes['cache'];
    if (!cambioAdjunto && !cambioCache) return;
    if ((cambioAdjunto || cambioCache)!.firstChange) return;
    // Cada refresco del chat (sondeo, respaldo o canal en vivo) trae objetos nuevos para el mismo archivo: si es
    // el mismo (id, ruta y disponibilidad) y la caché no cambió, no se corta el audio o el video que suena ni se
    // cierra la foto ampliada.
    if (!cambioCache && cambioAdjunto && mismoArchivo(cambioAdjunto.previousValue, cambioAdjunto.currentValue)) return;
    this.reproducir = false;
    this.noSeReproduce = false;
    this.ampliada = false;
    this.observar();
  }

  ngAfterViewInit(): void {
    this.observar();
  }

  ngOnDestroy(): void {
    this.dejarDeObservar();
  }

  get a(): MetaAdjunto | null {
    return this.adjunto;
  }

  get kind(): MetaAdjuntoKind | null {
    return kindDeAdjunto(this.adjunto);
  }

  /** Publicación, historia, reel o enlace compartido: no es un archivo. */
  get esEtiqueta(): boolean {
    return !this.kind;
  }

  get claveEtiqueta(): string {
    return claveEtiquetaAdjunto(this.adjunto?.tipo || this.adjunto?.kind);
  }

  /** Se puede ver o bajar (con la ruta del servidor o con la copia local de lo enviado en esta sesión). */
  get disponible(): boolean {
    return !!this.cache && this.cache.sePuedePedir(this.adjunto, this.saliente);
  }

  /**
   * Lo enviado por el comercio sin copia local: solo la tarjeta con nombre, tamaño y «Enviado». El servidor manda
   * la ruta también en lo saliente, pero con `disponible:false` y `motivo:'sin_archivo'` (Meta no deja volver a
   * bajarlo); por eso no depende de que falte la ruta. Lo vencido sí dice que venció.
   */
  get enviadoSinCopia(): boolean {
    return !this.disponible && this.saliente && this.adjunto?.motivo !== 'vencido';
  }

  get estado(): EstadoAdjuntoRed | null {
    return this.cache ? this.cache.estado(this.adjunto, this.saliente) : null;
  }

  get esImagen(): boolean {
    return this.kind === 'image' || this.kind === 'sticker';
  }

  /** El archivo llegó con un formato que el navegador no muestra: se trata como documento. */
  get soloDescarga(): boolean {
    const e = this.estado;
    return !!e && e.estado === 'listo' && e.mime === 'application/octet-stream' && this.kind !== 'document';
  }

  get tamano(): string {
    const idioma = (this.translate.currentLang || 'es').slice(0, 2);
    return tamanoLegibleRed(this.adjunto?.bytes, LOCALE_POR_IDIOMA[idioma] || idioma);
  }

  get nombreArchivo(): string {
    const a = this.adjunto;
    if (!a) return '';
    if (a.filename) return a.filename;
    switch (this.kind) {
      case 'image':
        return this.translate.instant('notificaciones.redes3.adjuntos.nombreFoto');
      case 'sticker':
        return this.translate.instant('notificaciones.redes3.adjuntos.nombreSticker');
      case 'audio':
        return this.translate.instant(a.voice ? 'notificaciones.redes3.adjuntos.nombreVoz' : 'notificaciones.redes3.adjuntos.nombreAudio');
      case 'video':
        return this.translate.instant('notificaciones.redes3.adjuntos.nombreVideo');
      default:
        return this.translate.instant('notificaciones.redes3.adjuntos.nombreDocumento');
    }
  }

  /** Nombre con que se guarda en el equipo (con extensión si el servidor no trajo nombre). */
  private get nombreDescarga(): string {
    const a = this.adjunto;
    if (!a) return 'archivo';
    if (a.filename) return a.filename;
    const ext: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'application/pdf': 'pdf',
    };
    const e = ext[String(a.mime || '').toLowerCase()];
    return e ? `${this.nombreArchivo}.${e}` : this.nombreArchivo;
  }

  get iconoDocumento(): string {
    const m = String(this.adjunto?.mime || '').toLowerCase();
    const n = String(this.adjunto?.filename || '').toLowerCase();
    if (m.includes('pdf') || n.endsWith('.pdf')) return 'fa-file-pdf-o';
    if (this.kind === 'audio') return 'fa-file-audio-o';
    if (this.kind === 'video') return 'fa-file-video-o';
    if (this.esImagen) return 'fa-file-image-o';
    return 'fa-file-o';
  }

  get claveMotivo(): string {
    if (this.adjunto?.motivo === 'vencido') return 'notificaciones.redes3.adjuntos.vencido';
    return 'notificaciones.redes3.adjuntos.sinArchivo';
  }

  get claveFallo(): string {
    const e = this.estado;
    if (!e || e.estado !== 'error') return '';
    if (e.motivo === 'vencido') return 'notificaciones.redes3.adjuntos.vencido';
    if (e.motivo === 'pesado') return 'notificaciones.cierre2.adjuntos.muyPesadoVer';
    if (e.motivo === 'noDisponible') return 'notificaciones.redes3.adjuntos.noDisponible';
    return 'notificaciones.redes3.adjuntos.errorBajar';
  }

  get puedeReintentarBajar(): boolean {
    const e = this.estado;
    return !!e && e.estado === 'error' && e.motivo === 'reintentar';
  }

  reintentarBajar(): void {
    if (this.adjunto && this.cache) this.cache.pedir(this.adjunto, true, this.saliente);
  }

  /** «Reproducir» de audio y video: baja el archivo y monta el reproductor. */
  alReproducir(): void {
    if (!this.adjunto || !this.cache) return;
    this.reproducir = true;
    this.noSeReproduce = false;
    this.cache.pedir(this.adjunto, false, this.saliente);
  }

  /** «Descargar»: baja el archivo si hace falta y lo guarda con su nombre. */
  descargar(): void {
    const a = this.adjunto;
    if (!a || !this.cache) return;
    if (this.cache.guardarComo(a, this.nombreDescarga, this.saliente)) return;
    this.pendienteGuardar = true;
    this.cache.pedir(a, true, this.saliente);
  }

  /** Se revisa en cada vuelta: si la descarga pedida ya llegó, se guarda. */
  ngDoCheck(): void {
    if (!this.pendienteGuardar || !this.adjunto || !this.cache) return;
    const e = this.estado;
    if (!e || e.estado === 'cargando') return;
    this.pendienteGuardar = false;
    if (e.estado === 'listo') this.cache.guardarComo(this.adjunto, this.nombreDescarga, this.saliente);
  }

  alFallarReproduccion(): void {
    this.noSeReproduce = true;
  }

  alCargarFoto(): void {
    this.cargada.emit();
  }

  ampliar(): void {
    if (!this.esImagen || this.estado?.estado !== 'listo' || this.soloDescarga) return;
    this.focoPrevio = document.activeElement as HTMLElement | null;
    this.ampliada = true;
    setTimeout(() => this.cerrarAmpliada?.nativeElement.focus());
  }

  cerrar(): void {
    if (!this.ampliada) return;
    this.ampliada = false;
    const previo = this.focoPrevio;
    this.focoPrevio = null;
    if (previo && typeof previo.focus === 'function') setTimeout(() => previo.focus());
  }

  /** La foto ampliada es una ventana modal: Tab y Mayús+Tab se quedan en su único botón (la X). */
  retenerFoco(evento: Event): void {
    evento.preventDefault();
    this.cerrarAmpliada?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.cerrar();
  }

  /** Fotos y stickers se bajan al quedar a la vista (no todas al abrir el chat). */
  private observar(): void {
    this.dejarDeObservar();
    const a = this.adjunto;
    if (!a || !this.cache || !this.esImagen || !this.cache.sePuedePedir(a, this.saliente)) return;
    const el = this.caja?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') {
      this.cache.pedir(a, false, this.saliente);
      return;
    }
    this.observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        // Dentro de Angular: así la respuesta de la descarga repinta la burbuja.
        this.zona.run(() => {
          this.dejarDeObservar();
          if (this.adjunto && this.cache) this.cache.pedir(this.adjunto, false, this.saliente);
        });
      },
      { rootMargin: '200px' },
    );
    this.observador.observe(el);
  }

  private dejarDeObservar(): void {
    if (this.observador) this.observador.disconnect();
    this.observador = null;
  }
}
