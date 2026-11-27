import {
  AfterViewChecked,
  AfterViewInit,
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
import { Subject, Subscription, interval } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { AtencionService } from '../../../../../shared/services/messaging/atencion.service';
import {
  ColaBasica,
  RespuestaRapida,
  ResultadoUsoSugerencia,
  TextoSugerido,
  DuenoChat,
  MiembroEquipo,
  Transferencia,
  esErrorChatConDueno,
} from '../../../../../shared/services/messaging/messaging.models';

import { ChatRapidosComponent } from '../../../inbox-core/chat-rapidos/chat-rapidos.component';
import { mapaDeEquipo, nombreConMapa } from '../../../inbox-core/chat-dueno/nombre-asesor';
import {
  ItemFeed,
  MensajeEnFeed,
  SeparadorDia,
  agruparPorDia,
  cercaDelFinal,
  esMensajeEnFeed,
  esSeparadorDia,
  formatoHora,
} from '../../../inbox-core/feed-mensajes.util';
import { SONDEO_RESPALDO_MS } from '../../../../../shared/services/messaging/bandeja-en-vivo.service';
import { MetaInboxService } from '../../meta-inbox.service';
import {
  META_CANAL_LABEL,
  MetaAdjunto,
  MetaCanal,
  MetaErrorCarga,
  MetaHilo,
  MetaImagenAdjunta,
  MetaMensaje,
  MetaVentana,
} from '../../models/meta-thread.model';
import { CanalConArchivos, canalConArchivos } from '../../adjuntos/adjuntos-red.util';
import { CacheAdjuntosRed } from '../../adjuntos/cache-adjuntos-red';
import { EnvioAdjuntoRedService, EventoEnvioRed } from '../../adjuntos/envio-adjunto-red.service';
import { EstadoAdjuntarRed, MetaAdjuntarComponent } from '../../adjuntos/meta-adjuntar/meta-adjuntar.component';

/** Imágenes que se pueden adjuntar a una respuesta de TikTok (D-709). */
const TIPOS_IMAGEN = ['image/jpeg', 'image/png'];
const MAX_IMAGEN_MB = 3;

/**
 * Conversación abierta de un buzón de Meta (Instagram, Messenger y TikTok): encabezado, mensajes,
 * ventana, compositor, imagen adjunta y envío. Se extrajo de `meta-inbox-shell` sin cambiar lo que hace,
 * para poder alojarla también en la bandeja única.
 *
 * Quien la use le pasa el canal, el hilo y si el canal está conectado. Al cambiar de hilo recarga sola
 * los mensajes y los refresca cada 4 segundos (con los mismos frenos de siempre).
 */
@Component({
  selector: 'app-meta-hilo-detalle',
  templateUrl: './meta-hilo-detalle.component.html',
  styleUrls: ['./meta-hilo-detalle.component.scss'],
})
export class MetaHiloDetalleComponent implements OnChanges, OnDestroy, AfterViewInit, AfterViewChecked {
  @Input() canal: MetaCanal = 'instagram';
  @Input() hilo: MetaHilo | null = null;
  /** El canal tiene la cuenta conectada (TikTok no deja enviar sin ella). */
  @Input() conectado = false;

  // ─── Atención multiagente (D-725): todo opcional; sin `atencion` la pantalla es la de siempre ───
  /** Bandeja única con la bandera `bandejaUnica`: muestra el dueño del chat y quién envió. */
  @Input() atencion = false;
  /** Quién atiende el chat (lo trae la lista); `null` = sin asignar. */
  @Input() dueno: DuenoChat | null = null;
  @Input() miEmail = '';
  /** Quien coordina (administrador o supervisor). */
  @Input() coordina = false;
  @Input() equipo: MiembroEquipo[] = [];
  /** Cambió el dueño del chat abierto. */
  @Output() duenoCambiado = new EventEmitter<DuenoChat | null>();
  /** [D-727] Colas activas a las que se puede pasar el chat (campo estable de quien aloja). */
  @Input() colas: ColaBasica[] = [];
  /** [D-727] El chat pasó a una cola (id) tras pasarlo con éxito. */
  @Output() colaCambiada = new EventEmitter<string>();

  /** [D-728] Respuestas rápidas con comando (campo estable de quien aloja); sin ellas el cuadro es el de siempre. */
  @Input() rapidos: RespuestaRapida[] = [];
  /** [D-728] Nombre de quien escribe, para la variable {asesor}. */
  @Input() miNombre = '';
  /** [D-730] Texto que la ayuda de Opttia quiere en el cuadro de escribir; `n` cambia en cada uso. */
  @Input() textoSugerido: TextoSugerido | null = null;
  /** [D-730] Qué pasó con la sugerencia: usada, cuadro bloqueado o el asesor no quiso reemplazar. */
  @Output() sugeridoResultado = new EventEmitter<ResultadoUsoSugerencia>();

  /** Canal en vivo conectado (lo dice quien aloja): el sondeo baja a uno lento de respaldo. */
  @Input() enVivo = false;
  /** Cada cambio pide refrescar ya los mensajes en silencio (llegó un evento de este chat). */
  @Input() senalRefresco = 0;
  /** Cuándo se pidieron los mensajes por última vez (para el sondeo lento con el canal en vivo). */
  private ultimoRefresco = 0;
  /** Sube con cada apertura de conversación: un refresco que iba en camino antes de ella se descarta. */
  private refrescoSeq = 0;
  /** Un refresco a la vez; si se pide otro mientras tanto (o durante la apertura), se hace uno más al terminar. */
  private refrescoEnCurso = false;
  private refrescoPendiente = false;
  @ViewChild(ChatRapidosComponent) rapidosLista?: ChatRapidosComponent;
  /** Caja con scroll de los mensajes: se baja al final al abrir, al enviar y con lo nuevo si el asesor ya estaba abajo. */
  @ViewChild('caja') private caja?: ElementRef<HTMLElement>;
  private bajarAlFinal = false;
  /**
   * Región que el lector de pantalla anuncia (solo los mensajes). Abre en `aria-live="off"` y pasa a `polite`
   * cuando ya se pintó la primera carga del chat: así anuncia lo que llega después y no lee todo el historial.
   */
  @ViewChild('registro') private registro?: ElementRef<HTMLElement>;
  private encenderAnuncios = false;
  /**
   * El asesor estaba abajo la última vez que se pudo medir. Sirve cuando la caja estuvo escondida (la ficha
   * del contacto en la bandeja la tapa con `display:none`): al volver a verse, se baja al final si estaba abajo.
   */
  private ultimoAbajo = true;
  private altoCaja = 0;
  private observadorCaja?: ResizeObserver;
  /** Imágenes de TikTok que llegaron con el asesor abajo: al terminar de cargar (y tomar alto) se vuelve a bajar. */
  private imagenesParaBajar = new Set<string>();
  /**
   * Chat que el servidor rechazó para esta persona (`canal|hash`): no se sigue preguntando por él hasta que se
   * vuelva a abrir o se toque Reintentar.
   */
  private hiloCerrado: string | null = null;

  /** Dueño vigente del chat abierto (la lista lo entrega y las acciones lo actualizan). */
  duenoActual: DuenoChat | null = null;
  duenoOcupado = false;

  mensajes: MetaMensaje[] = [];
  /** Los mensajes con un separador por día, listos para pintar. */
  feed: ItemFeed<MetaMensaje>[] = [];
  /** Hora de cada mensaje (id → «3:45 p. m.»), ya en el idioma de la pantalla. */
  private horas = new Map<string, string>();
  ventana: MetaVentana | null = null;
  cargandoMensajes = false;
  /**
   * La conversación no se puede mostrar: `red` si falló la primera carga (se ofrece Reintentar); `acceso` o
   * `no_existe` si el servidor la rechazó, también en mitad de un refresco. En todos los casos no se deja escribir.
   */
  errorCarga: MetaErrorCarga | null = null;

  borrador = '';
  enviando = false;
  avisoEnvio: string | null = null;

  /** TikTok: imagen elegida para la próxima respuesta y su error de validación. */
  imagen: MetaImagenAdjunta | null = null;
  errorImagen: string | null = null;
  /** TikTok: el servidor dice si el país del cliente deja mandar imágenes en esta conversación. */
  permiteImagen = false;

  /**
   * TikTok: imágenes que escribió el cliente, ya descargadas (id del mensaje → dirección `blob:`). El
   * servidor las entrega por una ruta que pide la sesión, así que no se pueden mostrar con un `<img src>`
   * directo. De cada una se guarda la dirección cruda (para revocarla) y la marcada como segura (para el
   * `<img>`): Angular 14 no deja pasar `blob:` en `[src]` y lo dejaría como `unsafe:blob:…`.
   * `generacionImagenes` descarta respuestas que llegan después de cambiar de conversación.
   */
  private imagenesEntrantes = new Map<string, { crudo: string; seguro: SafeUrl }>();
  private imagenesEnCurso = new Set<string>();
  private imagenesFallidas = new Set<string>();
  private generacionImagenes = 0;

  private destroy$ = new Subject<void>();

  // ─── Archivos de Instagram y Facebook (solo con `atencion`, bandeja única) ───
  /** Clip, micrófono y envío de archivos del cuadro de escribir. */
  @ViewChild(MetaAdjuntarComponent) adjuntar?: MetaAdjuntarComponent;
  /** Archivos ya bajados de este chat (blob local); se sueltan al cambiar de chat y al salir. */
  readonly cache: CacheAdjuntosRed;
  /** Lo que tiene el adjuntar: un archivo o una nota listos, o grabando. */
  adjEstado: EstadoAdjuntarRed = { conArchivo: false, grabando: false };
  /** Se arrastra un archivo sobre el chat («Suelta para adjuntar»). */
  arrastrando = false;
  private readonly envioSub: Subscription;

  constructor(
    private servicio: MetaInboxService,
    private translate: TranslateService,
    private sanitizer: DomSanitizer,
    private atencionSrv: AtencionService,
    private toastr: ToastrService,
    private zona: NgZone,
    private envios: EnvioAdjuntoRedService,
  ) {
    this.arrancarRefrescoAutomatico();
    this.cache = new CacheAdjuntosRed(
      (ruta) => this.servicio.descargarAdjunto(ruta),
      sanitizer,
      (a) => (this.hilo ? this.envios.recienteDe(this.claveChat(this.hilo), a) : null),
    );
    this.envioSub = this.envios.eventos$.subscribe((ev) => this.alTerminarEnvioArchivo(ev));
  }

  get canalLabel(): string {
    return META_CANAL_LABEL[this.canal];
  }

  /**
   * Hay un envío en curso o texto/imagen a medias: quien refresca la lista por su cuenta no debe pisar
   * la pantalla en ese momento.
   */
  get ocupado(): boolean {
    return this.enviando || (this.borrador || '').trim().length > 0 || !!this.imagen;
  }

  /** Último `sentAt` entrante ya enviado al servidor como «visto», por chat (canal|hash). */
  private readonly ultimoMarcado = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['textoSugerido'] && !changes['textoSugerido'].firstChange && this.textoSugerido) {
      void this.aplicarSugerido(this.textoSugerido.texto);
    }
    if (this.atencion && (changes['dueno'] || changes['hilo'])) {
      this.duenoActual = this.dueno || this.hilo?.owner || null;
    }
    // Evento en vivo de este chat: se releen los mensajes ya. Solo se frena en mitad de un envío (el
    // refresco no toca lo que el asesor está escribiendo ni la imagen elegida).
    if (changes['senalRefresco'] && !changes['senalRefresco'].firstChange && !changes['hilo'] && this.hilo && !this.enviando) {
      // Con la apertura en camino se relee al terminar: esa respuesta pudo salir antes del evento.
      if (this.cargandoMensajes) this.refrescoPendiente = true;
      else this.refrescarMensajesEnSilencio();
    }
    if (!changes['hilo'] || !this.hilo) return;
    // Otra conversación: lo que se descargó de la anterior ya no sirve.
    const anterior = changes['hilo'].previousValue as MetaHilo | null;
    if (anterior?.identidadHash !== this.hilo.identidadHash || changes['canal']) {
      this.soltarImagenesEntrantes();
      // Archivos: lo bajado del chat anterior se suelta (revoke) y una descarga tardía se descarta. Un envío en
      // camino sigue en el servicio; si termina mientras se mira este otro chat, sale un aviso.
      this.cache.soltar();
      this.adjEstado = { conArchivo: false, grabando: false };
      this.arrastrando = false;
      this.envios.chatVisible = this.claveChat(this.hilo);
      // Mientras llegan los de la nueva conversación no se ven ni se usan los mensajes ni la ventana de la anterior
      // (el campo de respuesta queda cerrado hasta que llegue la ventana real). Solo al cambiar de conversación:
      // al enviar o reintentar se recarga la misma y vaciar haría parpadear el chat.
      // El lector de pantalla calla mientras se vacía y se pinta el historial del chat nuevo.
      this.fijarAnuncios(false);
      this.ponerMensajes([], 'abrir');
      this.ventana = null;
      this.errorCarga = null;
    }
    this.abrirHilo(this.hilo);
  }

  ngAfterViewInit(): void {
    const el = this.caja?.nativeElement;
    if (!el) return;
    // El scroll del asesor se escucha fuera de Angular: no hace falta repintar la pantalla en cada movimiento.
    this.zona.runOutsideAngular(() => el.addEventListener('scroll', this.alMoverCaja, { passive: true }));
    if (typeof ResizeObserver === 'undefined') return;
    this.altoCaja = el.clientHeight;
    // La caja escondida mide 0: al volver a verse (por ejemplo al cerrar la ficha en la bandeja) el navegador la
    // deja arriba, en lo más viejo. Si el asesor estaba abajo, se vuelve a bajar.
    this.observadorCaja = new ResizeObserver(() => {
      const alto = el.clientHeight;
      const volvioAVerse = this.altoCaja === 0 && alto > 0;
      this.altoCaja = alto;
      if (volvioAVerse && this.ultimoAbajo) el.scrollTop = el.scrollHeight;
    });
    this.observadorCaja.observe(el);
  }

  ngAfterViewChecked(): void {
    if (this.bajarAlFinal && this.caja) {
      this.irAlFinal();
      this.bajarAlFinal = false;
    }
    if (this.encenderAnuncios) {
      // Después de pintar: lo que ya se ve no se anuncia, lo que llegue desde ahora sí.
      this.encenderAnuncios = false;
      this.fijarAnuncios(true);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.observadorCaja?.disconnect();
    this.caja?.nativeElement.removeEventListener('scroll', this.alMoverCaja);
    this.soltarImagenAdjunta();
    this.soltarImagenesEntrantes();
    this.cache.soltar();
    this.envioSub.unsubscribe();
    if (this.hilo && this.envios.chatVisible === this.claveChat(this.hilo)) this.envios.chatVisible = null;
  }

  /**
   * Baja la caja de mensajes al final. Público para que quien aloja el chat lo pida si lo tuvo escondido (la
   * caja también lo hace sola al volver a verse si el asesor estaba abajo).
   */
  irAlFinal(): void {
    const el = this.caja?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    this.ultimoAbajo = true;
  }

  /**
   * Scroll del asesor: se recuerda si quedó abajo. Solo mientras la caja se ve: escondida mide 0, y al volver a
   * verse (antes de que la observe `ResizeObserver`, que la baja) el navegador la pone arriba sin que el asesor
   * se haya movido.
   */
  private readonly alMoverCaja = (): void => {
    const el = this.caja?.nativeElement;
    if (!el || el.clientHeight === 0) return;
    if (this.observadorCaja && this.altoCaja === 0) return;
    this.ultimoAbajo = cercaDelFinal(el);
  };

  /** La imagen del cliente terminó de cargar y tomó su alto: si el asesor estaba abajo cuando llegó, sigue abajo. */
  alCargarImagen(m: MetaMensaje): void {
    // Si mientras tanto subió a leer algo más viejo (lo dice su último scroll), no se le mueve.
    if (!this.imagenesParaBajar.delete(m.id) || !this.ultimoAbajo) return;
    this.irAlFinal();
  }

  /** Enciende o apaga los anuncios del lector de pantalla en la región de mensajes (directo en el DOM, sin ciclo extra). */
  private fijarAnuncios(encendido: boolean): void {
    this.registro?.nativeElement.setAttribute('aria-live', encendido ? 'polite' : 'off');
  }

  /** ¿El asesor está abajo? Con la caja escondida no se puede medir y vale lo último que se supo. */
  private estaAbajo(): boolean {
    const el = this.caja?.nativeElement;
    if (el && el.clientHeight === 0) return this.ultimoAbajo;
    return cercaDelFinal(el);
  }

  /**
   * Refresco automático de los mensajes del hilo abierto (cada 8 segundos, el mismo patrón del buzón de
   * WhatsApp). Con la pestaña oculta no relee la conversación. Frenos: no se pisa la pantalla en mitad
   * de un envío ni si el operador tiene texto a medias.
   */
  private arrancarRefrescoAutomatico(): void {
    interval(4000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.ocupado) return;
        if (document.hidden) return;
        // Con el canal en vivo conectado este sondeo queda de respaldo: como mucho cada 30 s.
        if (this.enVivo && Date.now() - this.ultimoRefresco < SONDEO_RESPALDO_MS) return;
        if (this.hilo) this.refrescarMensajesEnSilencio();
      });
  }

  private refrescarMensajesEnSilencio(): void {
    const hilo = this.hilo;
    if (!hilo) return;
    // El servidor ya dijo que este chat no es para esta persona: no se le sigue preguntando cada 4 s.
    if (this.hiloCerrado === this.claveChat(hilo)) return;
    this.ultimoRefresco = Date.now();
    // Uno a la vez: con uno en camino se pide otro al terminar, así una ráfaga de eventos más rápida que la
    // respuesta no descarta todas las lecturas.
    if (this.refrescoEnCurso) {
      this.refrescoPendiente = true;
      return;
    }
    const seq = this.refrescoSeq;
    this.refrescoEnCurso = true;

    this.servicio
      .mensajesDeHilo(this.canal, hilo.identidadHash)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.refrescoEnCurso = false;
          if (!this.refrescoPendiente || this.cargandoMensajes) return;
          this.refrescoPendiente = false;
          if (this.hilo && !this.enviando) this.refrescarMensajesEnSilencio();
        }),
      )
      .subscribe((r) => {
        // El operador pudo cambiar de conversación mientras la respuesta venía
        // en camino: si ya no es la misma, se descarta en vez de pintar los
        // mensajes de un hilo sobre otro.
        if (this.hilo?.identidadHash !== hilo.identidadHash) return;
        if (seq !== this.refrescoSeq) return;
        // Un corte breve no borra el chat ni cierra la ventana: se deja todo como estaba y el próximo
        // refresco lo intenta de nuevo. Un rechazo del servidor sí: el chat ya no es para esta persona.
        if (r.error === 'acceso' || r.error === 'no_existe') {
          this.perderChat(hilo, r.error);
          return;
        }
        if (r.error) return;
        this.errorCarga = null;
        this.ponerMensajes(r.items, 'refresco');
        this.ventana = r.ventana;
        this.fijarPermiteImagen(hilo, r.permiteImagen);
        this.cargarImagenesEntrantes(r.items);
        this.marcarLeidoSiHaceFalta(hilo, r.items);
      });
  }

  private abrirHilo(hilo: MetaHilo): void {
    this.avisoEnvio = null;
    this.borrador = '';
    this.soltarImagenAdjunta();
    this.errorImagen = null;
    this.fijarPermiteImagen(hilo, undefined);
    this.cargandoMensajes = true;
    this.errorCarga = null;
    // Abrir (o Reintentar) vuelve a preguntar aunque el servidor lo hubiera rechazado antes.
    this.hiloCerrado = null;
    this.cargarDueno(hilo);
    // Los refrescos en silencio que ya iban en camino quedan viejos.
    this.refrescoSeq++;
    this.refrescoPendiente = false;
    this.ultimoRefresco = Date.now();

    const canal = this.canal;
    this.servicio
      .mensajesDeHilo(canal, hilo.identidadHash)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        // En la bandeja se cambia de conversación a cada rato: una respuesta tardía de la anterior no pisa la nueva.
        if (this.hilo?.identidadHash !== hilo.identidadHash || this.canal !== canal) return;
        this.cargandoMensajes = false;
        if (r.error === 'acceso' || r.error === 'no_existe') {
          // El servidor rechazó el chat: se dice por qué (no «revisa tu conexión») y no se deja escribir.
          this.perderChat(hilo, r.error);
          return;
        }
        if (r.error) {
          // Primera carga (nada en pantalla): se dice que no cargó, sin franja de 24 h ni cuadro de escribir.
          // Si ya había mensajes (se recargó tras enviar), se conservan como en un refresco.
          if (!this.mensajes.length && !this.ventana) this.errorCarga = 'red';
        } else {
          this.ponerMensajes(r.items, 'abrir');
          this.ventana = r.ventana;
          this.fijarPermiteImagen(hilo, r.permiteImagen);
          this.cargarImagenesEntrantes(r.items);
          this.marcarLeidoSiHaceFalta(hilo, r.items);
          // Ya pintada la primera carga, el lector de pantalla anuncia solo lo que llegue después.
          this.encenderAnuncios = true;
        }
        // Un evento en vivo llegó mientras se abría: se relee una vez más.
        if (this.refrescoPendiente && !this.refrescoEnCurso && !this.enviando) {
          this.refrescoPendiente = false;
          this.refrescarMensajesEnSilencio();
        }
      });
  }

  /** «Reintentar» del aviso de carga fallida. */
  reintentarCarga(): void {
    if (this.hilo && !this.cargandoMensajes) this.abrirHilo(this.hilo);
  }

  private claveChat(hilo: MetaHilo): string {
    return `${this.canal}|${hilo.identidadHash}`;
  }

  /**
   * El servidor dijo que este chat ya no es para esta persona (403: lo pasaron a una cola que no ve) o que no
   * existe (404). Se vacía la pantalla, se cierra el cuadro de escribir (lo escrito ya no se podría enviar) y
   * se deja de preguntar por él; el aviso propio explica qué pasó.
   */
  private perderChat(hilo: MetaHilo, tipo: 'acceso' | 'no_existe'): void {
    this.hiloCerrado = this.claveChat(hilo);
    this.refrescoPendiente = false;
    this.fijarAnuncios(false);
    this.ponerMensajes([], 'abrir');
    this.ventana = null;
    this.borrador = '';
    this.soltarImagenAdjunta();
    this.errorImagen = null;
    this.avisoEnvio = null;
    this.errorCarga = tipo;
    this.cache.soltar();
  }

  /** Título del aviso cuando el chat no se puede mostrar. */
  get claveErrorTitulo(): string {
    if (this.errorCarga === 'acceso') return 'notificaciones.redes2.sinAccesoTitulo';
    if (this.errorCarga === 'no_existe') return 'notificaciones.redes2.noExisteTitulo';
    return 'notificaciones.redes2.errorCargaTitulo';
  }

  get claveErrorTexto(): string {
    if (this.errorCarga === 'acceso') return 'notificaciones.redes2.sinAccesoTexto';
    if (this.errorCarga === 'no_existe') return 'notificaciones.redes2.noExisteTexto';
    return 'notificaciones.redes2.errorCargaTexto';
  }

  /**
   * Pinta los mensajes con su separador de día y su hora. Al abrir (o tras enviar) baja al final; en un
   * refresco solo baja si llegó algo nuevo y el asesor ya estaba abajo (medido antes de pintar), para no
   * sacarlo de lo que está leyendo más arriba.
   */
  private ponerMensajes(items: MetaMensaje[], motivo: 'abrir' | 'refresco'): void {
    const estabaAbajo = this.estaAbajo();
    const ultimoAntes = this.mensajes.length ? this.mensajes[this.mensajes.length - 1].id : null;
    const ultimoAhora = items.length ? items[items.length - 1].id : null;
    const hayNuevos = items.length > this.mensajes.length || ultimoAhora !== ultimoAntes;

    const idioma = this.translate.currentLang || this.translate.defaultLang || 'es';
    this.mensajes = items;
    this.horas = new Map(items.map((m) => [m.id, formatoHora(m.sentAt, idioma)] as [string, string]));
    this.feed = agruparPorDia(items, (m) => m.sentAt, idioma, {
      hoy: this.translate.instant('notificaciones.redes2.hoy'),
      ayer: this.translate.instant('notificaciones.redes2.ayer'),
    });

    if (motivo === 'abrir') this.bajarAlFinal = items.length > 0;
    else if (hayNuevos && estabaAbajo) this.bajarAlFinal = true;
  }

  /** La carga salió bien y la conversación no tiene mensajes. */
  get sinMensajes(): boolean {
    return !this.cargandoMensajes && !this.errorCarga && !!this.ventana && this.mensajes.length === 0;
  }

  horaDe(m: MetaMensaje): string {
    return this.horas.get(m.id) || '';
  }

  esDia(item: ItemFeed<MetaMensaje>): item is SeparadorDia {
    return esSeparadorDia(item);
  }

  esMensaje(item: ItemFeed<MetaMensaje>): item is MensajeEnFeed<MetaMensaje> {
    return esMensajeEnFeed(item);
  }

  trackFeed(_: number, item: ItemFeed<MetaMensaje>): string {
    return item.tipo === 'dia' ? `dia:${item.clave}` : item.mensaje.id;
  }

  /**
   * Bandeja única: con los mensajes ya en pantalla se le dice al servidor hasta cuál entrante se vio (su
   * `sentAt`, nunca la hora del navegador). Sin la bandeja el servidor no manda `threadId` ni `noLeidos` y no
   * se llama a nada: los buzones de siempre quedan igual. Sin entrantes no se llama. Un mismo mensaje no se
   * marca dos veces seguidas (el refresco de 8 s vuelve a pasar por aquí), salvo que el intento anterior
   * fallara por el servidor o la red.
   */
  private marcarLeidoSiHaceFalta(hilo: MetaHilo, items: MetaMensaje[]): void {
    if (!hilo.threadId && typeof hilo.noLeidos !== 'number') return;
    let hasta: string | null = null;
    let hastaMs = 0;
    for (const m of items) {
      if (m.direccion !== 'inbound') continue;
      const t = Date.parse(m.sentAt);
      if (Number.isFinite(t) && t >= hastaMs) {
        hastaMs = t;
        hasta = m.sentAt;
      }
    }
    if (!hasta) return;
    const canal = this.canal;
    const clave = `${canal}|${hilo.identidadHash}`;
    if (this.ultimoMarcado.get(clave) === hasta) return;
    this.ultimoMarcado.set(clave, hasta);
    this.servicio
      .marcarLeido(canal, hilo.identidadHash, hasta)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        if (r.reintentar && this.ultimoMarcado.get(clave) === hasta) this.ultimoMarcado.delete(clave);
      });
  }

  /**
   * ¿Se ofrece adjuntar imagen? Solo en TikTok y solo si el servidor lo permite para este cliente. Sin
   * dato (o con `false`) no se ofrece: es lo seguro, porque TikTok rechaza la imagen donde no se puede.
   * El dato de la conversación abierta manda sobre el del listado.
   */
  private fijarPermiteImagen(hilo: MetaHilo, desdeConversacion: boolean | undefined): void {
    const permite = typeof desdeConversacion === 'boolean' ? desdeConversacion : hilo.permiteImagen === true;
    this.permiteImagen = this.esTiktok && permite;
    if (!this.permiteImagen) {
      this.soltarImagenAdjunta();
      this.errorImagen = null;
    }
  }

  // ─── Imágenes que escribió el cliente (TikTok) ─────────────────────────

  /**
   * Trae las imágenes del cliente que todavía no están: son rutas del propio servidor (`/v1/meta/...`)
   * que piden la sesión, así que se descargan como blob y se muestran con una dirección local. Un mensaje
   * ya descargado, en curso o fallido no se vuelve a pedir en cada refresco.
   */
  private cargarImagenesEntrantes(items: MetaMensaje[]): void {
    if (!this.esTiktok) return;
    const generacion = this.generacionImagenes;

    for (const m of items) {
      const ruta = m.mediaUrl;
      if (m.tipo !== 'image' || !ruta || !ruta.startsWith('/')) continue;
      if (this.imagenesEntrantes.has(m.id) || this.imagenesEnCurso.has(m.id) || this.imagenesFallidas.has(m.id)) continue;

      this.imagenesEnCurso.add(m.id);
      this.servicio
        .imagenEntrante(ruta)
        .pipe(takeUntil(this.destroy$))
        .subscribe((blob) => {
          if (generacion !== this.generacionImagenes) return;
          this.imagenesEnCurso.delete(m.id);
          if (blob) {
            // Solo se marca como segura la dirección que acaba de crear este mismo navegador con la
            // imagen que entregó nuestro servidor: nunca una dirección que venga en un mensaje.
            const crudo = URL.createObjectURL(blob);
            // La imagen agranda la caja: si el asesor estaba abajo, sigue abajo. El alto real llega cuando el
            // navegador la decodifica, así que se vuelve a bajar en su (load).
            if (this.estaAbajo()) {
              this.bajarAlFinal = true;
              this.imagenesParaBajar.add(m.id);
            }
            this.imagenesEntrantes.set(m.id, { crudo, seguro: this.sanitizer.bypassSecurityTrustUrl(crudo) });
          } else {
            this.imagenesFallidas.add(m.id);
          }
        });
    }
  }

  private soltarImagenesEntrantes(): void {
    this.imagenesEntrantes.forEach((imagen) => URL.revokeObjectURL(imagen.crudo));
    this.imagenesEntrantes.clear();
    this.imagenesEnCurso.clear();
    this.imagenesFallidas.clear();
    this.imagenesParaBajar.clear();
    this.generacionImagenes += 1;
  }

  /** La imagen del cliente ya descargada, lista para el `<img>`; null mientras llega o si no se pudo. */
  imagenDe(m: MetaMensaje): SafeUrl | null {
    return this.esTiktok ? this.imagenesEntrantes.get(m.id)?.seguro || null : null;
  }

  /** TikTok: publicación que el cliente compartió. `mediaUrl` es su enlace público. */
  esPublicacion(m: MetaMensaje): boolean {
    return this.esTiktok && m.tipo === 'share_post' && /^https?:\/\//i.test(m.mediaUrl || '');
  }

  /**
   * Lo que se dice de un adjunto cuando no hay texto ni imagen que mostrar. En Instagram y Facebook es
   * siempre «Archivo adjunto», como antes; en TikTok distingue sticker, mensaje no soportado y la imagen
   * que está llegando o no llegó.
   */
  textoAdjunto(m: MetaMensaje): string | null {
    if (!this.esTiktok) {
      // Bandeja única: el archivo se ve dentro de la burbuja.
      if (this.vistaArchivo(m)) return null;
      return !m.body && m.mediaUrl ? this.translate.instant('notificaciones.meta.attachment') : null;
    }
    if (this.imagenDe(m) || this.esPublicacion(m)) return null;
    if (m.tipo === 'sticker') return this.translate.instant('notificaciones.meta.tiktokSticker');
    if (m.tipo === 'unsupported') return this.translate.instant('notificaciones.meta.tiktokNoSoportado');
    if (m.tipo === 'image') {
      if (this.imagenesFallidas.has(m.id)) return this.translate.instant('notificaciones.meta.tiktokImagenNoCargo');
      if (m.mediaUrl && m.mediaUrl.startsWith('/')) return this.translate.instant('notificaciones.meta.tiktokCargandoImagen');
    }
    return !m.body && m.mediaUrl ? this.translate.instant('notificaciones.meta.attachment') : null;
  }

  get esTiktok(): boolean {
    return this.canal === 'tiktok';
  }

  // ─── Archivos de Instagram y Facebook (bandeja única) ──────────────────

  /** Con la bandeja única, Instagram y Facebook ven y envían archivos. TikTok sigue con su imagen (D-709). */
  get usaArchivos(): boolean {
    return this.atencion && canalConArchivos(this.canal);
  }

  /** Canal para el adjuntar (solo se usa cuando `usaArchivos`). */
  get canalArchivos(): CanalConArchivos {
    return this.canal === 'facebook' ? 'facebook' : 'instagram';
  }

  /** El servidor dice que pasaron las 24 h: no se adjunta ni se graba. */
  get ventanaCerrada(): boolean {
    return this.ventana?.abierta === false;
  }

  adjuntosDe(m: MetaMensaje): MetaAdjunto[] {
    return Array.isArray(m.adjuntos) ? m.adjuntos : [];
  }

  /** Con la bandeja, los archivos del mensaje se pintan dentro de la burbuja. */
  vistaArchivo(m: MetaMensaje): boolean {
    return this.usaArchivos && this.adjuntosDe(m).length > 0;
  }

  trackAdjunto(i: number, a: MetaAdjunto): string {
    return a.url || a.id || String(i);
  }

  /** La foto de un mensaje terminó de cargar: si el asesor estaba abajo, sigue abajo. */
  alCargarAdjunto(): void {
    if (this.ultimoAbajo) this.irAlFinal();
  }

  /** Texto de ayuda del cuadro: con un archivo listo, el texto sale después del archivo. */
  get claveMarcadorCuadro(): string {
    if (this.usaArchivos && this.adjEstado.conArchivo && this.puedeEscribir) return 'notificaciones.redes3.adjuntos.cuadroConArchivo';
    return this.claveMarcador;
  }

  /** Pegar una captura o un archivo en el cuadro lo adjunta (bandeja única). */
  alPegar(ev: ClipboardEvent): void {
    if (!this.usaArchivos || !this.adjuntar) return;
    const archivo = ev.clipboardData?.files && ev.clipboardData.files[0];
    if (!archivo) return;
    // Texto copiado de otra app (que a veces trae también una imagen): se pega como texto.
    if ((ev.clipboardData?.getData('text/plain') || '').trim()) return;
    ev.preventDefault();
    this.adjuntar.tomarArchivo(archivo);
  }

  private traeArchivos(ev: DragEvent): boolean {
    const tipos = ev.dataTransfer?.types;
    return !!tipos && Array.from(tipos as ArrayLike<string>).includes('Files');
  }

  alArrastrarEncima(ev: DragEvent): void {
    if (!this.usaArchivos || !this.adjuntar || this.errorCarga || !this.traeArchivos(ev)) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    this.arrastrando = true;
  }

  alSalirArrastre(ev: DragEvent): void {
    const actual = ev.currentTarget as HTMLElement | null;
    const hacia = ev.relatedTarget as Node | null;
    if (actual && hacia && actual.contains(hacia)) return;
    this.arrastrando = false;
  }

  alSoltar(ev: DragEvent): void {
    // Sin la bandeja (buzón viejo) o en TikTok el chat no recibe archivos: el navegador se comporta como siempre.
    if (!this.usaArchivos || (!this.arrastrando && !this.traeArchivos(ev))) return;
    ev.preventDefault();
    this.arrastrando = false;
    if (!this.adjuntar) return;
    const archivo = ev.dataTransfer?.files && ev.dataTransfer.files[0];
    if (archivo) this.adjuntar.tomarArchivo(archivo);
  }

  /** Terminó un envío de archivo (de este chat o de otro; el servicio avisa los de otros chats). */
  private alTerminarEnvioArchivo(ev: EventoEnvioRed): void {
    if (!this.hilo || ev.clave !== this.claveChat(this.hilo)) return;
    if (ev.tipo === 'listo') {
      this.bajarAlFinal = true;
      this.refrescarMensajesEnSilencio();
      if (ev.parcial) {
        // Salió el archivo y no el texto: el texto vuelve al cuadro para enviarlo de nuevo.
        if (ev.texto && !(this.borrador || '').trim()) this.borrador = ev.texto;
        this.avisoEnvio = this.translate.instant('notificaciones.redes3.adjuntos.parcial', { canal: this.canalLabel });
      }
      return;
    }
    // Se cortó después de subir: se relee el chat para ver si salió antes de reintentar.
    if (ev.tipo === 'revisar') {
      this.refrescarMensajesEnSilencio();
      return;
    }
    const err: any = ev.error;
    if (esErrorChatConDueno(err)) {
      this.ponerDueno(err.error.owner || null);
      this.toastr.warning(this.textoChatConDueno(), this.translate.instant('notificaciones.whatsapp.detail.ownedTitle'));
    }
  }

  /**
   * TikTok no deja enviar con la cuenta desconectada o vencida: se escribiría a un canal que no responde.
   * (Las conversaciones anteriores se conservan y se pueden leer.)
   */
  get sinConexionParaEnviar(): boolean {
    return this.esTiktok && !this.conectado;
  }

  /**
   * Texto de la ventana en lenguaje llano. La API habla de "messaging window";
   * el operador necesita saber si puede escribir y hasta cuándo.
   */
  get textoVentana(): string {
    if (!this.ventana) return '';
    if (this.esTiktok) return this.textoVentanaTiktok(this.ventana);
    if (!this.ventana.abierta) {
      return this.translate.instant('notificaciones.meta.windowClosed', { nombre: this.nombreContacto });
    }
    const min = this.ventana.minutosRestantes;
    if (min >= 120) return this.translate.instant('notificaciones.meta.windowHours', { horas: Math.floor(min / 60) });
    if (min >= 60) return this.translate.instant('notificaciones.meta.windowOneHour');
    return this.translate.instant('notificaciones.meta.windowMinutes', { min });
  }

  /**
   * La ventana de TikTok (D-709), con sus tres casos: te quedan N mensajes, puedes responder sin límite
   * mientras el cliente siga contestando, o hay que esperar a que escriba de nuevo.
   */
  private textoVentanaTiktok(v: MetaVentana): string {
    if (this.sinConexionParaEnviar) {
      return this.translate.instant('notificaciones.meta.tiktokVentanaSinConexion');
    }
    if (!v.abierta) return this.translate.instant('notificaciones.meta.tiktokVentanaCerrada');

    const hasta = this.fechaCorta(v.venceEn);

    if (v.estado === 'abierta') {
      return hasta
        ? this.translate.instant('notificaciones.meta.tiktokVentanaSinLimite', { hasta })
        : this.translate.instant('notificaciones.meta.tiktokVentanaSinLimiteSinFecha');
    }

    const n = v.restantes;
    if (typeof n !== 'number') return this.translate.instant('notificaciones.meta.tiktokVentanaPuedes');
    if (hasta) {
      return this.translate.instant(
        n === 1 ? 'notificaciones.meta.tiktokVentanaUnMensaje' : 'notificaciones.meta.tiktokVentanaMensajes',
        { n, hasta },
      );
    }
    return this.translate.instant(
      n === 1
        ? 'notificaciones.meta.tiktokVentanaUnMensajeSinFecha'
        : 'notificaciones.meta.tiktokVentanaMensajesSinFecha',
      { n },
    );
  }

  /** «10 nov, 3:45 p. m.», en el idioma de la pantalla. Vacío si no hay fecha válida. */
  private fechaCorta(iso: string | null | undefined): string {
    if (!iso) return '';
    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '';
    try {
      return fecha.toLocaleString(this.translate.currentLang || 'es', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return fecha.toLocaleString();
    }
  }

  /** Con la ventana abierta y, en TikTok, la cuenta conectada. */
  get puedeEscribir(): boolean {
    return (
      Boolean(this.ventana?.abierta) && !this.errorCarga && !this.sinConexionParaEnviar && !this.enviando && !this.soloLectura
    );
  }

  /** Clave del texto de ayuda del campo de respuesta. */
  get claveMarcador(): string {
    if (this.soloLectura) return 'notificaciones.owner.onlyOwner';
    if (this.sinConexionParaEnviar) return 'notificaciones.meta.tiktokReplyReconnect';
    return this.ventana?.abierta ? 'notificaciones.meta.replyPlaceholder' : 'notificaciones.meta.replyClosed';
  }

  /** Para usar dentro de frases («…{nombre} tiene que escribirte»): sin nombre dice «el contacto». */
  get nombreContacto(): string {
    return this.hilo?.contactoNombre || this.translate.instant('notificaciones.meta.theContact');
  }

  /** Título del chat: el nombre del contacto o «Contacto de Instagram», nunca «el contacto» en minúscula. */
  get tituloContacto(): string {
    return (
      (this.hilo?.contactoNombre || '').trim() ||
      this.translate.instant('notificaciones.meta.contactOf', { canal: this.canalLabel })
    );
  }

  get puedeEnviar(): boolean {
    const hayQueEnviar =
      this.borrador.trim().length > 0 ||
      (this.esTiktok && Boolean(this.imagen)) ||
      // Bandeja única: un archivo o una nota listos se envían aunque no haya texto.
      (this.usaArchivos && this.adjEstado.conArchivo);
    return (
      Boolean(this.ventana?.abierta) &&
      !this.errorCarga &&
      !this.sinConexionParaEnviar &&
      hayQueEnviar &&
      !this.enviando &&
      !this.soloLectura &&
      !(this.usaArchivos && this.adjEstado.grabando)
    );
  }

  /** Un mensaje con archivo no se reintenta como texto (su texto saldría solo). */
  puedeReintentar(m: MetaMensaje): boolean {
    return !!m.body && this.adjuntosDe(m).length === 0;
  }

  // ─── Imagen adjunta (TikTok) ───────────────────────────────────────────

  /**
   * Lee la imagen elegida a base64, que es como viaja en la respuesta. Valida tipo y peso antes: 3 MB como
   * máximo, por seguridad (el servidor acepta más, pero TikTok podría rechazarla).
   */
  alElegirImagen(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files && campo.files[0];
    // Se vacía para poder elegir la misma imagen otra vez después de quitarla.
    campo.value = '';
    if (!archivo) return;

    this.errorImagen = null;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenTipo');
      return;
    }
    if (archivo.size > MAX_IMAGEN_MB * 1024 * 1024) {
      this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenPeso', { mb: MAX_IMAGEN_MB });
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const url = typeof lector.result === 'string' ? lector.result : '';
      const coma = url.indexOf(',');
      if (coma < 0) {
        this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenLectura');
        return;
      }
      this.imagen = {
        base64: url.slice(coma + 1),
        mime: archivo.type,
        nombre: archivo.name,
        vistaPrevia: url,
      };
    };
    lector.onerror = () => {
      this.errorImagen = this.translate.instant('notificaciones.meta.tiktokImagenLectura');
    };
    lector.readAsDataURL(archivo);
  }

  quitarImagen(): void {
    this.soltarImagenAdjunta();
    this.errorImagen = null;
  }

  private soltarImagenAdjunta(): void {
    this.imagen = null;
  }

  enviar(): void {
    if (!this.puedeEnviar || !this.hilo) return;

    // Bandeja única: con un archivo listo se envía el archivo y el texto sale después, como otro mensaje. No usa
    // `enviando`: el sondeo de respaldo y la señal del canal en vivo siguen corriendo.
    if (this.usaArchivos && this.adjEstado.conArchivo && this.adjuntar) {
      this.avisoEnvio = null;
      const r = this.adjuntar.enviarElegido((this.borrador || '').trim());
      if (r === 'enviado') {
        this.borrador = '';
        this.bajarAlFinal = true;
      }
      if (r !== 'nada') return;
    }

    const imagen = this.esTiktok ? this.imagen : null;
    const texto = this.borrador.trim();
    this.enviando = true;
    this.avisoEnvio = null;

    this.servicio
      .responder(this.canal, this.hilo.identidadHash, texto, imagen)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.enviando = false;
        if (r.enviado) {
          this.borrador = '';
          this.abrirHilo(this.hilo!);
          return;
        }
        this.alRechazoPorDueno(r);
        this.avisoEnvio = this.explicarFallo(r.motivo, r.mensaje);
        // TikTok mandó la imagen y no el texto: la imagen ya salió (no se reintenta), el texto se conserva
        // para volver a enviarlo y la conversación se refresca para que la imagen aparezca.
        if (r.parcial) {
          this.soltarImagenAdjunta();
          this.refrescarMensajesEnSilencio();
        }
      });
  }

  /**
   * Reenvía un mensaje que falló. Reusa el mismo camino que un envío normal,
   * así que la ventana se vuelve a validar: si ya expiró, el operador recibe la
   * explicación en vez de un segundo fallo mudo.
   */
  reintentar(m: MetaMensaje): void {
    if (!this.hilo || this.enviando || !this.puedeReintentar(m)) return;

    this.enviando = true;
    this.avisoEnvio = null;

    this.servicio
      .responder(this.canal, this.hilo.identidadHash, m.body)
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => {
        this.enviando = false;
        if (r.enviado) {
          this.abrirHilo(this.hilo!);
          return;
        }
        this.alRechazoPorDueno(r);
        this.avisoEnvio = this.explicarFallo(r.motivo, r.mensaje);
      });
  }

  /**
   * Traduce el motivo técnico a algo que el operador entienda y pueda actuar. En TikTok el servidor
   * manda su propio mensaje (ya en palabras sencillas, con el motivo de TikTok si fue quien rechazó):
   * se muestra tal cual.
   */
  private explicarFallo(motivo?: string, mensajeServidor?: string): string {
    if (motivo === 'chat_con_dueno') return this.textoChatConDueno();
    if (this.esTiktok && mensajeServidor) return mensajeServidor;
    switch (motivo) {
      case 'ventana_cerrada':
        return this.esTiktok
          ? this.translate.instant('notificaciones.meta.tiktokFailWindowClosed')
          : this.translate.instant('notificaciones.meta.failWindowClosed', { nombre: this.nombreContacto });
      case 'sin_conexion':
        return this.translate.instant('notificaciones.meta.failNotConnected', { canal: this.canalLabel });
      case 'contacto_desconocido':
        return this.translate.instant('notificaciones.meta.failUnknownContact');
      case 'rechazado_por_meta':
        return this.translate.instant('notificaciones.meta.failRejected', { canal: this.canalLabel });
      default:
        return this.translate.instant('notificaciones.meta.failDefault');
    }
  }

  trackMensaje(_: number, m: MetaMensaje): string {
    return m.id;
  }

  /**
   * Otro asesor ya atiende el chat: se dice quién con el nombre del equipo, en el idioma de la pantalla
   * (no con el texto que arma el servidor).
   */
  private textoChatConDueno(): string {
    const nombre = this.nombreDueno;
    return nombre
      ? this.translate.instant('notificaciones.redes2.chatDeOtro', { nombre })
      : this.translate.instant('notificaciones.whatsapp.detail.ownedByOther');
  }

  /**
   * Error al tomar, soltar o pasar el chat, en palabras del comercio. Se lee el código que manda el servidor,
   * nunca su `message`; lo desconocido o un 5xx da el aviso general.
   */
  private textoErrorDueno(err: any, destino?: string): string {
    const codigo = err?.error && typeof err.error === 'object' ? err.error.error || err.error.code : null;
    switch (codigo) {
      case 'THREAD_NOT_FOUND':
        return this.translate.instant('notificaciones.redes2.errorChatNoExiste');
      case 'TOO_MANY_REQUESTS':
        return this.translate.instant('notificaciones.redes2.errorMuyRapido');
      case 'TARGET_NOT_IN_TEAM':
        return this.translate.instant('notificaciones.redes2.errorFueraDelEquipo');
      case 'LINE_NOT_ALLOWED':
        return this.translate.instant('notificaciones.redes2.errorCanalNoPermitido');
      case 'INVALID_INPUT': {
        // El servidor usa el mismo código para varios casos; el más común se reconoce aquí mismo.
        const actual = (this.duenoActual?.email || '').toLowerCase();
        if (destino && actual && destino.toLowerCase() === actual) {
          return this.translate.instant('notificaciones.redes2.errorYaLoAtiende', { nombre: this.nombreDueno });
        }
        return this.translate.instant('notificaciones.redes2.errorDatosDueno');
      }
      default:
        return err?.status === 429
          ? this.translate.instant('notificaciones.redes2.errorMuyRapido')
          : this.translate.instant('notificaciones.whatsapp.detail.ownerChangeError');
    }
  }

  /**
   * [D-728] Cuadro de escribir igual que en WhatsApp: con la lista de respuestas rápidas abierta las teclas
   * son suyas; si no, Enter envía y Mayús+Enter hace un salto de línea. Mientras se escribe con un teclado
   * de composición (tildes, japonés…) Enter no envía.
   *
   * Con catálogo de respuestas rápidas, un comando a medias («/sal», o la lista cerrada con Esc) no sale con
   * Enter: le llegaría al cliente tal cual. El botón Enviar sí lo manda si el asesor lo quiere.
   */
  alTeclaCuadro(event: KeyboardEvent): void {
    if (this.rapidosLista?.alTecla(event)) return;
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (this.esComandoRapido) return;
    this.enviar();
  }

  /** Lo escrito es solo un comando de respuesta rápida (la misma regla con que se abre la lista). */
  private get esComandoRapido(): boolean {
    return this.atencion && this.rapidos.length > 0 && /^\/[a-z0-9_]*$/i.test(this.borrador || '');
  }

  // ─── Dueño del chat (D-725) ────────────────────────────────────────────

  /** El chat de red que se está viendo: el id que trae la lista o, si falta, el de la forma `red_<canal>__<hash>`. */
  get threadId(): string | null {
    if (!this.hilo) return null;
    return this.hilo.threadId || `red_${this.canal}__${this.hilo.identidadHash}`;
  }

  /** El chat lo atiende otra persona: el campo de respuesta queda en lectura. */
  get soloLectura(): boolean {
    if (!this.atencion || !this.duenoActual) return false;
    return (this.duenoActual.email || '').toLowerCase() !== (this.miEmail || '').toLowerCase();
  }

  /** Nombre de quien atiende el chat, para el texto del campo en lectura. */
  /** [D-728] Nombre del contacto para la variable {cliente}; vacío si no se conoce. */
  get nombreCliente(): string {
    const nombre = (this.hilo?.contactoNombre || '').trim();
    // Un usuario de Instagram («@mafe_92») no es un nombre para saludar: se quita la variable.
    return nombre.startsWith('@') ? '' : nombre;
  }

  /**
   * [D-730] «Usar» de la ayuda de Opttia: pone el texto en el cuadro sin enviar. Con texto escrito pregunta
   * antes de reemplazar; con el cuadro bloqueado (solo lectura, ventana cerrada) no escribe y lo avisa.
   */
  private async aplicarSugerido(texto: string): Promise<void> {
    // Se responde en el turno siguiente: emitir dentro de ngOnChanges cambiaría el padre ya revisado.
    await Promise.resolve();
    // La sugerencia es de ESTE chat: si cambia mientras se espera la pregunta, no se escribe en el otro.
    const chatDeOrigen = `${this.canal}|${this.hilo?.identidadHash}`;
    if (!this.puedeEscribir) {
      this.sugeridoResultado.emit('bloqueado');
      return;
    }
    if ((this.borrador || '').trim()) {
      const r = await Swal.fire({
        title: this.translate.instant('notificaciones.bandeja.ayuda.reemplazarTitulo'),
        text: this.translate.instant('notificaciones.bandeja.ayuda.reemplazarTexto'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: this.translate.instant('notificaciones.bandeja.ayuda.reemplazarSi'),
        cancelButtonText: this.translate.instant('notificaciones.bandeja.ayuda.reemplazarNo'),
        confirmButtonColor: '#5F3FE0',
      });
      if (!r.isConfirmed || chatDeOrigen !== `${this.canal}|${this.hilo?.identidadHash}`) {
        this.sugeridoResultado.emit('cancelado');
        return;
      }
    }
    this.borrador = texto;
    this.sugeridoResultado.emit('usado');
  }

  /** [D-728] El texto de la respuesta rápida elegida reemplaza el comando; no se envía. */
  alElegirRapida(texto: string): void {
    this.borrador = texto;
  }

  get nombreDueno(): string {
    if (!this.duenoActual) return '';
    return nombreConMapa(this.duenoActual.email, this.duenoActual.nombre, this.mapaEquipo);
  }

  /** Correo → nombre del equipo; se rearma solo cuando cambia la lista del equipo. */
  private get mapaEquipo(): Map<string, string> {
    if (this.equipoMapeado !== this.equipo) {
      this.equipoMapeado = this.equipo;
      this.mapaEquipoCache = mapaDeEquipo(this.equipo);
    }
    return this.mapaEquipoCache;
  }
  private equipoMapeado: MiembroEquipo[] | null = null;
  private mapaEquipoCache = new Map<string, string>();

  get esMio(): boolean {
    return !!this.duenoActual && !!this.miEmail && this.duenoActual.email.toLowerCase() === this.miEmail.toLowerCase();
  }

  /** El dueño o quien coordina pasa el chat. */
  get puedePasarChat(): boolean {
    return this.atencion && (this.coordina || this.esMio);
  }

  /** Quién envió el mensaje, para pintarlo junto a la hora; solo con la bandeja única. */
  autorDe(m: MetaMensaje): string {
    if (!this.atencion || m.direccion !== 'outbound') return '';
    // El nombre del equipo primero, luego la copia guardada en el mensaje y al final el correo.
    return nombreConMapa(m.enviadoPor, m.enviadoPorNombre, this.mapaEquipo);
  }

  /** Trae el dueño al día al abrir el chat; un fallo deja el que ya había. */
  private cargarDueno(hilo: MetaHilo): void {
    if (!this.atencion) return;
    const id = this.threadId;
    if (!id) return;
    this.atencionSrv
      .hilo(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (h) => {
          if (this.hilo?.identidadHash !== hilo.identidadHash) return;
          this.duenoActual = h.owner && h.owner.email ? h.owner : null;
          this.duenoCambiado.emit(this.duenoActual);
        },
        error: () => undefined,
      });
  }

  private alRechazoPorDueno(r: { motivo?: string; owner?: DuenoChat | null }): void {
    if (r.motivo === 'chat_con_dueno') this.ponerDueno(r.owner || null);
  }

  tomarChat(): void {
    const id = this.threadId;
    if (id) this.accionDueno(this.atencionSrv.tomar(id), 'notificaciones.whatsapp.detail.ownerTaken');
  }

  soltarChat(): void {
    const id = this.threadId;
    if (id) this.accionDueno(this.atencionSrv.soltar(id), 'notificaciones.whatsapp.detail.ownerReleased');
  }

  /** Pasar el chat: sin dueño y con permiso de coordinar se asigna; con dueño se transfiere con la nota. */
  pasarChat(destino: Transferencia | string): void {
    const id = this.threadId;
    const t: Transferencia = typeof destino === 'string' ? { email: destino, nota: '' } : destino;
    if (!id || (!t?.email && !t?.colaId)) return;
    // [D-727] A una cola: el servidor deja el chat sin dueño y lo reparte según la cola.
    if (t.colaId) {
      this.accionDueno(this.atencionSrv.transferir(id, { colaId: t.colaId, nota: t.nota || '' }), 'notificaciones.owner.queuePassed', t.colaId);
      return;
    }
    const peticion = !this.duenoActual && this.coordina
      ? this.atencionSrv.asignar(id, t.email as string)
      : this.atencionSrv.transferir(id, t.email as string, t.nota || '');
    this.accionDueno(peticion, 'notificaciones.whatsapp.detail.ownerPassed', undefined, t.email);
  }

  private accionDueno(
    peticion: ReturnType<AtencionService['tomar']>,
    exito: string,
    colaId?: string,
    destino?: string,
  ): void {
    if (this.duenoOcupado) return;
    this.duenoOcupado = true;
    peticion.pipe(takeUntil(this.destroy$)).subscribe({
      next: (owner) => {
        this.duenoOcupado = false;
        this.ponerDueno(owner);
        if (colaId) this.colaCambiada.emit(colaId);
        this.toastr.success(this.translate.instant(exito));
      },
      error: (err: any) => {
        this.duenoOcupado = false;
        if (esErrorChatConDueno(err)) {
          this.ponerDueno(err.error.owner || null);
          this.toastr.warning(
            this.duenoActual && this.nombreDueno
              ? this.translate.instant('notificaciones.redes2.chatDeOtro', { nombre: this.nombreDueno })
              : this.translate.instant('notificaciones.whatsapp.detail.alreadyOwned'),
            this.translate.instant('notificaciones.whatsapp.detail.ownedTitle'),
          );
          return;
        }
        // Los 403 ya los avisa el interceptor con el mensaje del servidor.
        if (err?.status === 403) return;
        this.toastr.error(this.textoErrorDueno(err, destino));
      },
    });
  }

  private ponerDueno(owner: DuenoChat | null): void {
    this.duenoActual = owner && owner.email ? owner : null;
    this.duenoCambiado.emit(this.duenoActual);
  }
}
