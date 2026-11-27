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
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

import { META_CANAL_LABEL } from '../../models/meta-thread.model';
import {
  CanalConArchivos,
  LOCALE_POR_IDIOMA,
  MAX_TEXTO_RED,
  TOPE_SUBIDA_RED,
  acceptDe,
  duracionLegibleRed,
  kindDeArchivoRed,
  nuevoIdEnvioRed,
  permitidoEnRed,
  tamanoLegibleRed,
} from '../adjuntos-red.util';
import { EnvioAdjuntoRed, EnvioAdjuntoRedService, KindEnvioRed } from '../envio-adjunto-red.service';
import { FalloGrabacionRed, FormatoVozRed, GrabadorVozRed, NotaGrabadaRed, formatoDeVozRed } from '../grabador-voz-red';

/** Por qué no se pudo grabar → texto para el comercio. */
const CLAVE_FALLO_VOZ: Record<FalloGrabacionRed, string> = {
  permiso: 'notificaciones.redes3.adjuntos.voz.permiso',
  sinMicrofono: 'notificaciones.redes3.adjuntos.voz.sinMicrofono',
  noSoportado: 'notificaciones.redes3.adjuntos.voz.noSoportado',
  error: 'notificaciones.redes3.adjuntos.voz.error',
};

/** Archivo elegido (o nota grabada) antes de enviar. */
interface Elegido {
  archivo: Blob;
  nombre: string;
  kind: KindEnvioRed;
  voz: boolean;
  segundos: number | null;
  /** Dirección local de la vista previa (foto, audio o nota); se revoca al quitar o enviar. */
  cruda: string | null;
  vista: SafeUrl | null;
}

export interface EstadoAdjuntarRed {
  /** Hay un archivo o una nota listos para enviar con el botón Enviar. */
  conArchivo: boolean;
  /** Se está grabando (el botón Enviar espera). */
  grabando: boolean;
}

type EstadoGrabacion = 'inactivo' | 'pidiendo' | 'grabando';

/**
 * Adjuntar en el chat de Instagram y Facebook (bandeja única): clip, micrófono, vista previa y avance del envío.
 *
 *  - Clip con los tipos que acepta cada red; pegar (Ctrl+V) y arrastrar llegan por `tomarArchivo` con la misma
 *    revisión. La revisión de tipo y tamaño solo avisa: manda el servidor.
 *  - Vista previa: miniatura de la foto, ícono del video, reproductor del audio o la nota, ícono y nombre del
 *    PDF, y «Quitar».
 *  - Envío en dos etapas («Subiendo X %», que se cancela; «Enviando a Instagram…», que no) y reintento con el
 *    mismo id. El envío vive en `EnvioAdjuntoRedService`: cambiar de chat no lo corta.
 *  - Nota de voz: M4A si el navegador la graba así; si no, WAV mono. Corta sola a las 2:30.
 *  - Con el chat en solo lectura o la ventana de 24 h cerrada no hace nada y lo dice.
 */
@Component({
  selector: 'app-meta-adjuntar',
  templateUrl: './meta-adjuntar.component.html',
  styleUrls: ['./meta-adjuntar.component.scss'],
})
export class MetaAdjuntarComponent implements OnChanges, OnDestroy {
  @Input() canal: CanalConArchivos = 'instagram';
  @Input() hash: string | null = null;
  /** Chat de otra persona, sin acceso o enviando un texto: no se adjunta. */
  @Input() bloqueado = false;
  /** El servidor dice que pasaron las 24 h: no se puede enviar nada hasta que el cliente escriba. */
  @Input() ventanaCerrada = false;

  @Output() estadoCambio = new EventEmitter<EstadoAdjuntarRed>();

  @ViewChild('selector') selector?: ElementRef<HTMLInputElement>;

  readonly formatoVoz: FormatoVozRed | null = formatoDeVozRed();

  elegido: Elegido | null = null;
  /** Aviso local (tamaño, tipo, micrófono…): clave de traducción. */
  aviso: { clave: string; params?: Record<string, unknown> } | null = null;

  estadoGrabacion: EstadoGrabacion = 'inactivo';
  private grabador: GrabadorVozRed | null = null;

  constructor(
    readonly envios: EnvioAdjuntoRedService,
    private readonly sanitizer: DomSanitizer,
    private readonly translate: TranslateService,
    private readonly zona: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Otro chat: lo elegido o grabado era para el anterior y se descarta (un envío en camino sigue en el servicio).
    const cambio = changes['hash'] || changes['canal'];
    if (cambio && !cambio.firstChange) {
      this.cancelarGrabacion();
      this.quitar();
      this.aviso = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelarGrabacion();
    this.soltarVista();
  }

  /** Clave del chat (`canal|hash`): un envío por chat. */
  get clave(): string {
    return `${this.canal}|${this.hash || ''}`;
  }

  get accept(): string {
    return acceptDe(this.canal);
  }

  get nombreCanal(): string {
    return META_CANAL_LABEL[this.canal];
  }

  get paramsCanal(): Record<string, unknown> {
    return { canal: this.nombreCanal };
  }

  /** Envío en curso o fallido de este chat. */
  get envio(): EnvioAdjuntoRed | null {
    return this.hash ? this.envios.de(this.clave) : null;
  }

  get grabando(): boolean {
    return this.estadoGrabacion === 'grabando';
  }

  /** Clip y micrófono: no con el chat bloqueado, la ventana cerrada, un envío en curso o una grabación. */
  get puedeAdjuntar(): boolean {
    return !!this.hash && !this.bloqueado && !this.ventanaCerrada && !this.envio && this.estadoGrabacion === 'inactivo';
  }

  get claveBoton(): string {
    if (this.ventanaCerrada) return 'notificaciones.redes3.adjuntos.avisoVentana';
    return 'notificaciones.redes3.adjuntos.adjuntar';
  }

  get segundosGrabados(): string {
    return duracionLegibleRed(this.grabador?.segundos || 0);
  }

  get nivelGrabacion(): number {
    return Math.round((this.grabador?.nivel || 0) * 100);
  }

  get tamanoElegido(): string {
    return this.elegido ? tamanoLegibleRed(this.elegido.archivo.size, this.locale) : '';
  }

  get duracionElegida(): string {
    return this.elegido?.segundos ? duracionLegibleRed(this.elegido.segundos) : '';
  }

  private get locale(): string {
    const idioma = (this.translate.currentLang || 'es').slice(0, 2);
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
    input.value = '';
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
      this.aviso = { clave: 'notificaciones.redes3.errores.vacio', params: this.paramsCanal };
      return false;
    }
    if (/^image\/(heic|heif)$/i.test(archivo.type) || /\.(heic|heif)$/i.test(archivo.name)) {
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoHeic', params: this.paramsCanal };
      return false;
    }
    if (!permitidoEnRed(this.canal, archivo)) {
      this.aviso = {
        clave: this.canal === 'instagram' ? 'notificaciones.redes3.adjuntos.tiposInstagram' : 'notificaciones.redes3.adjuntos.tiposFacebook',
      };
      return false;
    }
    const kind = kindDeArchivoRed(archivo);
    const tope = TOPE_SUBIDA_RED[kind];
    if (archivo.size > tope) {
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoPesado', params: { mb: Math.round(tope / (1024 * 1024)) } };
      return false;
    }
    this.quitar();
    this.aviso = null;
    const conVista = kind === 'image' || kind === 'audio';
    const cruda = conVista ? URL.createObjectURL(archivo) : null;
    this.elegido = {
      archivo,
      nombre: archivo.name || this.translate.instant('notificaciones.redes3.adjuntos.nombreDocumento'),
      kind,
      voz: false,
      segundos: null,
      cruda,
      vista: cruda ? this.sanitizer.bypassSecurityTrustUrl(cruda) : null,
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
   * Envía lo elegido. `texto` sale como un segundo mensaje, después del archivo. Lo llama el cuadro de escribir
   * al pulsar Enviar o Enter. 'enviado': el cuadro puede limpiarse; 'nada': no había archivo; 'aviso': no se
   * envió y aquí se dice por qué.
   */
  enviarElegido(texto: string): 'enviado' | 'nada' | 'aviso' {
    const e = this.elegido;
    if (!e) return 'nada';
    if (!this.hash || this.bloqueado || this.ventanaCerrada) {
      this.avisarBloqueo();
      return 'aviso';
    }
    if (this.envio) {
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoUnoALaVez' };
      return 'aviso';
    }
    const extra = (texto || '').trim();
    if (extra.length > MAX_TEXTO_RED) {
      this.aviso = { clave: 'notificaciones.redes3.errores.textoLargo', params: this.paramsCanal };
      return 'aviso';
    }
    const ok = this.envios.enviar({
      clave: this.clave,
      canal: this.canal,
      hash: this.hash,
      clientMessageId: nuevoIdEnvioRed(),
      archivo: e.archivo,
      nombre: e.nombre,
      kind: e.kind,
      voz: e.voz,
      texto: extra,
    });
    if (!ok) {
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoUnoALaVez' };
      return 'aviso';
    }
    this.soltarVista();
    this.elegido = null;
    this.aviso = null;
    this.emitir();
    return 'enviado';
  }

  // ─── Envío en curso ──────────────────────────────────────────────────

  cancelarEnvio(): void {
    if (this.envios.cancelar(this.clave)) {
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.cancelado' };
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
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.voz.noSoportado' };
      return;
    }
    if (!this.puedeAdjuntar) {
      this.avisarBloqueo();
      return;
    }
    this.quitar();
    this.aviso = null;
    this.estadoGrabacion = 'pidiendo';
    this.emitir();
    const grabador = new GrabadorVozRed(
      this.formatoVoz,
      (nota) => this.zona.run(() => this.alTerminarGrabacion(grabador, nota)),
      () => this.cdr.markForCheck(),
    );
    this.grabador = grabador;
    const fallo = await grabador.empezar();
    if (this.grabador !== grabador) return; // se canceló mientras se pedía el permiso
    if (fallo) {
      this.grabador = null;
      this.estadoGrabacion = 'inactivo';
      this.aviso = { clave: CLAVE_FALLO_VOZ[fallo] };
      this.emitir();
      return;
    }
    this.estadoGrabacion = 'grabando';
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
    this.estadoGrabacion = 'inactivo';
    this.emitir();
  }

  private alTerminarGrabacion(grabador: GrabadorVozRed, nota: NotaGrabadaRed | null): void {
    if (this.grabador !== grabador) return;
    this.grabador = null;
    this.estadoGrabacion = 'inactivo';
    if (nota && nota.segundos >= 1) {
      const cruda = URL.createObjectURL(nota.blob);
      this.elegido = {
        archivo: nota.blob,
        nombre: nota.nombre,
        kind: 'audio',
        voz: true,
        segundos: nota.segundos,
        cruda,
        vista: this.sanitizer.bypassSecurityTrustUrl(cruda),
      };
    } else if (nota) {
      this.aviso = { clave: 'notificaciones.redes3.adjuntos.voz.muyCorta' };
    }
    this.emitir();
  }

  // ─────────────────────────────────────────────────────────────────────

  private avisarBloqueo(): void {
    if (this.ventanaCerrada) this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoVentana' };
    else if (this.bloqueado) this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoBloqueado' };
    else if (this.envio) this.aviso = { clave: 'notificaciones.redes3.adjuntos.avisoUnoALaVez' };
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
      grabando: this.estadoGrabacion !== 'inactivo',
    });
  }
}
