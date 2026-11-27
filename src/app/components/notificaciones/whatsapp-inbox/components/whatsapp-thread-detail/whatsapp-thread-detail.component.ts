import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { Subscription, forkJoin, interval, of } from "rxjs";
import { catchError, finalize } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";
import { TranslateService } from "@ngx-translate/core";
import Swal from "sweetalert2";

import { AtencionService } from "../../../../../shared/services/messaging/atencion.service";
import { MessagingThreadsService } from "../../../../../shared/services/messaging/messaging-threads.service";
import {
  DuenoChat,
  MiembroEquipo,
  ColaBasica,
  RespuestaRapida,
  ResultadoUsoSugerencia,
  TextoSugerido,
  Transferencia,
  esErrorChatConDueno,
} from "../../../../../shared/services/messaging/messaging.models";

import { ChatRapidosComponent } from "../../../inbox-core/chat-rapidos/chat-rapidos.component";
import { mapaDeEquipo, nombreConMapa } from "../../../inbox-core/chat-dueno/nombre-asesor";
import { inicialesDe } from "../../../inbox-core/iniciales";
import { SONDEO_RESPALDO_MS } from "../../../../../shared/services/messaging/bandeja-en-vivo.service";
import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import { claveDeErrorChat } from "../../errores-envio";
import {
  BotThreadState,
  ContactProfile,
  MediaInfo,
  UbicacionMensaje,
  VentanaChat,
  WhatsappMessage,
  WhatsappThread,
  claveChat,
} from "../../models/whatsapp-thread.model";
import { CacheAdjuntos } from "../../adjuntos/cache-adjuntos";
import { EnvioAdjuntoService, EventoEnvioAdjunto } from "../../adjuntos/envio-adjunto.service";
import { EstadoAdjuntar, WaAdjuntarComponent } from "../../adjuntos/wa-adjuntar/wa-adjuntar.component";
import { enlaceMapa } from "../../adjuntos/adjuntos.util";

/** Ventana de 24 h de WhatsApp desde el último mensaje del cliente (guía visual; el servidor decide). */
const VENTANA_MS = 24 * 60 * 60 * 1000;
/** Con menos de estas horas por delante, la franja avisa cuánto queda. */
const HORAS_AVISO_VENTANA = 6;
/** Distancia al final (px) con la que el asesor sigue «abajo» y lo nuevo lo baja. */
const MARGEN_FINAL_PX = 80;
/**
 * Id del reintento de un saliente fallido: `retry-<id del fallido>`. El servidor guarda el envío como
 * `reply-retry-<id>`, así que el chat sabe que ese fallido ya se reintentó (y un segundo clic es el mismo envío).
 */
const PREFIJO_REINTENTO = "retry-";

/** Idioma de la pantalla → formato de fechas del navegador. */
const LOCALE_POR_IDIOMA: Record<string, string> = {
  es: "es-CO",
  en: "en-US",
  pt: "pt-BR",
  de: "de-DE",
};

/**
 * Motivos con que el asistente pasa un chat a una persona → clave de traducción. Los motivos que
 * guarda el servidor son códigos o frases técnicas; uno que no esté aquí no se muestra.
 */
const MOTIVOS_TRASPASO: Array<{ prueba: RegExp; clave: string }> = [
  { prueba: /^pedido_directo_/, clave: "notificaciones.wa2.motivos.pedidoDirecto" },
  { prueba: /^pedido_sin_link$/, clave: "notificaciones.wa2.motivos.sinLink" },
  { prueba: /^pidió un asesor/i, clave: "notificaciones.wa2.motivos.pidioAsesor" },
  { prueba: /^sin saldo/i, clave: "notificaciones.wa2.motivos.sinSaldo" },
  { prueba: /^cita solicitada sin agenda/i, clave: "notificaciones.wa2.motivos.citaSinAgenda" },
  { prueba: /^(cita:|agenda_)/i, clave: "notificaciones.wa2.motivos.cita" },
  { prueba: /^el asistente no respondió/i, clave: "notificaciones.wa2.motivos.asistenteNoRespondio" },
  { prueba: /^no se pudo enviar la respuesta/i, clave: "notificaciones.wa2.motivos.envioFallo" },
  { prueba: /^tope de /i, clave: "notificaciones.wa2.motivos.tope" },
  { prueba: /^cotización /i, clave: "notificaciones.wa2.motivos.cotizacion" },
  { prueba: /^falló el cierre/i, clave: "notificaciones.wa2.motivos.cierreFallo" },
  { prueba: /^tomada desde el buzón/i, clave: "notificaciones.wa2.motivos.tomadaBuzon" },
  { prueba: /^un vendedor respondió/i, clave: "notificaciones.wa2.motivos.respondioBuzon" },
];

/** Franja de la ventana de 24 h encima del cuadro de escribir. */
interface GuiaVentana {
  clave: string;
  params?: Record<string, unknown>;
  vencida: boolean;
}

/**
 * Plantilla de respuesta rápida (chip del composer).
 * `sandboxBody` ya viene renderizado (sin variables {{ }}). Las 6 plantillas
 * son las mismas del catálogo demo del módulo, hardcodeadas localmente para
 * no acoplar el composer a la persistencia de plantillas (spec 009.7).
 */
interface QuickTemplate {
  id: string;
  label: string;
  sandboxBody: string;
}

/**
 * Item del feed del chat. Puede ser un separador de fecha o un mensaje.
 * Permite al template iterar una sola vez sobre items mixtos.
 */
interface DateSeparatorItem {
  kind: "date";
  label: string;
  key: string;
}

interface MessageItem {
  kind: "message";
  msg: WhatsappMessage;
  grouped: boolean;
}

type FeedItem = DateSeparatorItem | MessageItem;

/**
 * Detalle del hilo (panel derecho del shell).
 *
 * Responsabilidades:
 *  - Cargar mensajes + perfil del contacto cada vez que cambia `phoneHash`.
 *  - Render tipo chat (burbujas izquierda/derecha) con separadores de día
 *    y agrupación visual de mensajes consecutivos del mismo emisor.
 *  - Auto-scroll al último mensaje al renderizar.
 *  - Marcar el hilo como visto (botón explícito + onLoad).
 *  - Toggle del panel de contacto (renderizado al lado, no modal).
 *  - [D-437] Chats de un número del comercio (`lineId`): etiqueta del número,
 *    franja de dueño (tomar, soltar, pasar) y redactor en solo lectura cuando
 *    el chat lo atiende otra persona. Quien decide es el servidor (409
 *    `CHAT_CON_DUENO`).
 */
@Component({
  selector: "app-whatsapp-thread-detail",
  templateUrl: "./whatsapp-thread-detail.component.html",
  styleUrls: ["./whatsapp-thread-detail.component.scss"],
})
export class WhatsappThreadDetailComponent
  implements OnChanges, AfterViewChecked, OnDestroy
{
  @Input() phoneHash: string | null = null;
  /** [D-437] Número del comercio del chat; `null` = número compartido de Katuq. */
  @Input() lineId: string | null = null;
  /** [D-437] Datos del chat que trae la lista (línea, dueño y threadId). */
  @Input() chat: WhatsappThread | null = null;
  /** [D-437] Bandera `whatsappMultiNumero` del comercio. */
  @Input() multiNumero = false;
  @Input() equipo: MiembroEquipo[] = [];
  @Input() esAdministrador = false;
  @Input() miEmail = "";
  /** [D-725] Bandeja única con `bandejaUnica`: dueño por AtencionService, pasar con nota y autor de cada saliente. Sin ella, igual que antes. */
  @Input() atencion = false;
  /** [D-725] Quien coordina (administrador o supervisor); solo cuenta con `atencion`. */
  @Input() coordina = false;

  /** Emitido cuando el usuario quiere volver a la lista (mobile). */
  @Output() backToList = new EventEmitter<void>();
  /** [D-437] Cambió el dueño del chat abierto. */
  @Output() duenoCambiado = new EventEmitter<DuenoChat | null>();
  /** [D-727] Colas activas a las que se puede pasar el chat (campo estable de quien aloja). */
  @Input() colas: ColaBasica[] = [];
  /** [D-727] El chat pasó a una cola (id) tras pasarlo con éxito. */
  @Output() colaCambiada = new EventEmitter<string>();

  /** [D-728] Respuestas rápidas con comando (campo estable de quien aloja). Con catálogo no vacío se ocultan las 6 fijas; sin él todo queda igual. */
  @Input() rapidos: RespuestaRapida[] = [];
  /** [D-728] Nombre de quien escribe, para la variable {asesor}. */
  @Input() miNombre = "";
  /** [D-730] Texto que la ayuda de Opttia quiere en el cuadro de escribir; `n` cambia en cada uso. */
  @Input() textoSugerido: TextoSugerido | null = null;
  /** [D-730] Qué pasó con la sugerencia: usada, cuadro bloqueado o el asesor no quiso reemplazar. */
  @Output() sugeridoResultado = new EventEmitter<ResultadoUsoSugerencia>();

  /** Canal en vivo conectado (lo dice quien aloja): el sondeo baja a uno lento de respaldo. */
  @Input() enVivo = false;
  /** Cada cambio pide refrescar ya los mensajes en silencio (llegó un evento de este chat). */
  @Input() senalRefresco = 0;

  @ViewChild("messagesContainer") messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild(ChatRapidosComponent) rapidosLista?: ChatRapidosComponent;
  /** Bandeja única: clip, micrófono y envío de archivos del cuadro de escribir. */
  @ViewChild(WaAdjuntarComponent) adjuntar?: WaAdjuntarComponent;

  // ─── Archivos (bandeja única, solo con `atencion`) ───────────────────────
  /** Archivos ya bajados de este chat (blob local); se sueltan al cambiar de chat y al salir. */
  readonly cache: CacheAdjuntos;
  /** Ventana de 24 h según el servidor (con la bandera); null = no se sabe y no se bloquea nada. */
  ventana: VentanaChat | null = null;
  /** Lo que tiene el adjuntar: archivo o nota listos, o grabando. */
  adjEstado: EstadoAdjuntar = { conArchivo: false, voz: false, grabando: false };
  /** Se arrastra un archivo sobre el chat («Suelta para adjuntar»). */
  arrastrando = false;
  private envioSub: Subscription;

  messages: WhatsappMessage[] = [];
  feedItems: FeedItem[] = [];
  profile: ContactProfile | null = null;
  loading = false;
  /**
   * La carga del chat abierto falló: se muestra el aviso con Reintentar y no se puede escribir. Nunca se deja
   * a la vista el chat anterior (su nombre o sus mensajes) mientras el cuadro le escribe al nuevo.
   */
  errorCarga = false;
  /** El servidor dijo que hay mensajes más viejos que los cargados (la ventana de 24 h no se adivina con ellos). */
  private hayAnteriores = false;
  contactPanelOpen = false;

  // ─── Bot de pedidos ────────────────────────────────────────────────────
  /** Estado del bot para este hilo (null = sin bot o sin cargar). */
  botState: BotThreadState | null = null;

  /**
   * Texto del pedido que creó el bot: número, total y si está pagado (spec
   * kai-metricas, D22). Sin total legible (0 o ausente) usa el texto sin él.
   */
  get claveDelPedidoDelBot(): string {
    const p = this.botState?.pedidoCreado;
    const pagado = p?.estadoPago === 'Aprobado';
    const conTotal = Number(p?.total) > 0;
    const base = pagado ? 'notificaciones.whatsapp.detail.botOrderApproved' : 'notificaciones.whatsapp.detail.botOrderPending';
    return conTotal ? `${base}Total` : base;
  }
  /** Lock del botón tomar/devolver mientras responde el backend. */
  botActionBusy = false;

  // ─── Dueño del chat (D-437) ─────────────────────────────────────────────
  /** Quién atiende el chat; `null` = sin asignar. */
  dueno: DuenoChat | null = null;
  /** Lock de tomar / soltar / pasar mientras responde el servidor. */
  duenoOcupado = false;

  // ─── Composer ──────────────────────────────────────────────────────────
  /** Texto en edición del composer. Two-way binding con el textarea. */
  composerText = "";
  /** Lock visual durante el POST /reply. */
  sending = false;
  /** [D-118] Id idempotente del mensaje en curso (se reusa en reintentos). */
  private pendingClientMessageId: string | null = null;
  /** [D-118] Texto al que corresponde pendingClientMessageId. */
  private pendingForText: string | null = null;
  /** Fallidos de este chat que ya se reintentaron con éxito: su botón «Reintentar» deja de verse. */
  private reintentados = new Set<string>();
  /** Dropdown de plantillas abierto/cerrado. */
  templatesOpen = false;
  /** 6 plantillas rápidas con sandboxBody ya renderizado. */
  readonly quickTemplates: QuickTemplate[] = [
    {
      id: "saludo",
      label: "notificaciones.whatsapp.templates.greeting",
      sandboxBody:
        "Hola, gracias por escribirnos. ¿En qué te podemos ayudar hoy?",
    },
    {
      id: "pedido-recibido",
      label: "notificaciones.whatsapp.templates.orderReceived",
      sandboxBody:
        "¡Confirmamos la recepción de tu pedido! Lo estamos preparando y te avisaremos cuando salga.",
    },
    {
      id: "despacho",
      label: "notificaciones.whatsapp.templates.shipping",
      sandboxBody:
        "Tu pedido ya va en camino con el transportador. Te avisamos cualquier novedad.",
    },
    {
      id: "pago-pendiente",
      label: "notificaciones.whatsapp.templates.paymentPending",
      sandboxBody:
        "Notamos que el pago de tu pedido aún está pendiente. ¿Te ayudamos a completarlo?",
    },
    {
      id: "stock",
      label: "notificaciones.whatsapp.templates.outOfStock",
      sandboxBody:
        "Lamentamos informarte que el producto está agotado por el momento. ¿Te interesa una alternativa?",
    },
    {
      id: "cierre",
      label: "notificaciones.whatsapp.templates.closing",
      sandboxBody:
        "Gracias por tu mensaje. Si necesitas algo más, estamos aquí para ayudarte.",
    },
  ];

  /** Flag para correr el auto-scroll una sola vez tras un load. */
  private needsScroll = false;
  /** Suscripción del polling cada 4s; se cancela en ngOnDestroy. */
  private refreshSub: Subscription | null = null;
  /** Cuándo se pidieron los mensajes por última vez (para el sondeo lento con el canal en vivo). */
  private ultimoRefresco = 0;
  /** Sube con cada carga completa (`loadAll`): un refresco que iba en camino antes de ella se descarta. */
  private refrescoSeq = 0;
  /** Un refresco a la vez; si se pide otro mientras tanto, se hace uno más al terminar (no se descartan). */
  private refrescoEnCurso = false;
  private refrescoPendiente = false;
  private refrescoPendienteConSync = false;
  /** Llegó un evento en vivo mientras `loadAll` iba en camino. */
  private senalDuranteCarga = false;
  /** Cuándo se pidió por última vez la sincronización con Kapso (con el canal en vivo va solo en el sondeo lento). */
  private ultimoSync = 0;
  /** Sube con cada cambio de chat: la respuesta de un envío o de una carga del chat anterior se reconoce y se descarta. */
  private chatSeq = 0;
  /** Tras enviar, el próximo refresco baja al final aunque el asesor estuviera leyendo más arriba. */
  private bajarTrasEnvio = false;
  /** El perfil falló en la carga: los refrescos lo vuelven a pedir, uno a la vez y cada 30 s como mucho. */
  private perfilEnCurso = false;
  private ultimoIntentoPerfil = 0;
  /** Correo → nombre del equipo (autor de cada mensaje, dueño y franja del bot). */
  private mapaEquipo = new Map<string, string>();

  constructor(
    private readonly inbox: WhatsappInboxService,
    private readonly toastr: ToastrService,
    private readonly hilos: MessagingThreadsService,
    private readonly atencionSrv: AtencionService,
    private readonly translate: TranslateService,
    private readonly envios: EnvioAdjuntoService,
    sanitizer: DomSanitizer,
  ) {
    this.cache = new CacheAdjuntos(inbox, sanitizer);
    this.envioSub = this.envios.eventos$.subscribe((ev) => this.alTerminarEnvioArchivo(ev));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["textoSugerido"] && !changes["textoSugerido"].firstChange && this.textoSugerido) {
      void this.aplicarSugerido(this.textoSugerido.texto);
    }
    if (changes["equipo"]) {
      this.mapaEquipo = mapaDeEquipo(this.equipo);
    }
    if (changes["chat"] || changes["phoneHash"] || changes["lineId"]) {
      this.dueno = this.chat?.owner || null;
    }
    if (changes["phoneHash"] || changes["lineId"]) {
      this.contactPanelOpen = false;
      this.composerText = "";
      this.templatesOpen = false;
      this.arrastrando = false;
      this.envios.chatVisible = this.phoneHash ? this.claveActual : null;
      this.vaciarChat();
      this.loadAll();
      this.restartAutoRefresh();
    } else if (changes["senalRefresco"] && !changes["senalRefresco"].firstChange && !this.sending) {
      // El evento ya dice que el mensaje está guardado: no hace falta pedir la sincronización con Kapso.
      // Con la carga del chat en camino, se relee al terminar (esa respuesta pudo salir antes del evento).
      if (this.loading) this.senalDuranteCarga = true;
      else this.refreshMessages(false);
    }
  }

  ngAfterViewChecked(): void {
    if (this.needsScroll && this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.needsScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.cache.soltar();
    this.envioSub.unsubscribe();
    if (this.envios.chatVisible === this.claveActual) this.envios.chatVisible = null;
  }

  /** Clave de este chat (mismo cliente en otro número es otro chat). */
  get claveActual(): string {
    return claveChat(this.phoneHash || "", this.lineId);
  }

  /** El servidor dice que pasaron las 24 h: no se adjunta ni se graba (sin plantilla no sale nada). */
  get ventanaCerrada(): boolean {
    return this.ventana?.abierta === false;
  }

  /** Con la bandeja, el archivo o la ubicación se pintan dentro de la burbuja. */
  conArchivo(msg: WhatsappMessage): boolean {
    return !!(msg.adjuntos?.length || msg.ubicacion);
  }

  vistaArchivo(msg: WhatsappMessage): boolean {
    return this.atencion && this.conArchivo(msg);
  }

  /** Sin la bandeja (buzón viejo), un mensaje con archivo y sin texto dice «Foto», «Audio»… como siempre. */
  esPlaceholder(msg: WhatsappMessage): boolean {
    return !!msg.mediaPlaceholder || (!this.atencion && this.conArchivo(msg) && !(msg.body || "").trim());
  }

  trackAdjunto(_: number, a: MediaInfo): string {
    return a.url || a.id;
  }

  mapaDe(u: UbicacionMensaje): string {
    return enlaceMapa(u.lat, u.lng);
  }

  /** Enviar se habilita con texto o con un archivo listo (no mientras se graba ni con el chat de otra persona). */
  get puedeEnviar(): boolean {
    if (this.sending || this.soloLectura || this.adjEstado.grabando) return false;
    return !!(this.composerText || "").trim() || (this.atencion && this.adjEstado.conArchivo);
  }

  /** Texto de ayuda del cuadro: con un archivo es el pie de foto; con una nota de voz no se escribe. */
  get placeholderComposer(): string {
    if (this.atencion && this.adjEstado.voz) return "notificaciones.wa2.adjuntos.cuadroVoz";
    if (this.atencion && this.adjEstado.conArchivo) return "notificaciones.wa2.adjuntos.cuadroPie";
    return "notificaciones.whatsapp.detail.composerPlaceholder";
  }

  /** Pegar una captura o un archivo en el cuadro lo adjunta (bandeja única). */
  alPegar(ev: ClipboardEvent): void {
    if (!this.atencion || !this.adjuntar) return;
    const archivo = ev.clipboardData?.files && ev.clipboardData.files[0];
    if (!archivo) return;
    // Texto copiado de otra app (que a veces trae también una imagen): se pega como texto.
    if ((ev.clipboardData?.getData("text/plain") || "").trim()) return;
    ev.preventDefault();
    this.adjuntar.tomarArchivo(archivo);
  }

  private traeArchivos(ev: DragEvent): boolean {
    const tipos = ev.dataTransfer?.types;
    return !!tipos && Array.from(tipos as ArrayLike<string>).includes("Files");
  }

  alArrastrarEncima(ev: DragEvent): void {
    if (!this.atencion || !this.adjuntar || !this.canShowComposer || !this.traeArchivos(ev)) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
    this.arrastrando = true;
  }

  alSalirArrastre(ev: DragEvent): void {
    const actual = ev.currentTarget as HTMLElement | null;
    const hacia = ev.relatedTarget as Node | null;
    if (actual && hacia && actual.contains(hacia)) return;
    this.arrastrando = false;
  }

  alSoltar(ev: DragEvent): void {
    // Sin la bandeja (buzón viejo) el chat no recibe archivos: el navegador se comporta como siempre.
    if (!this.atencion || (!this.arrastrando && !this.traeArchivos(ev))) return;
    ev.preventDefault();
    this.arrastrando = false;
    if (!this.adjuntar) return;
    const archivo = ev.dataTransfer?.files && ev.dataTransfer.files[0];
    if (archivo) this.adjuntar.tomarArchivo(archivo);
  }

  /** Terminó un envío de archivo (de este chat o de otro; el servicio avisa los de otros chats). */
  private alTerminarEnvioArchivo(ev: EventoEnvioAdjunto): void {
    if (!this.phoneHash || ev.clave !== this.claveActual) return;
    const hash = this.phoneHash;
    if (ev.tipo === "listo") {
      this.bajarTrasEnvio = true;
      this.refreshMessages();
      // Responder a mano le quita el hilo al bot (lo marca el servidor).
      this.cargarEstadoBot(hash);
      if (ev.aviso === "voz_pesada") {
        this.toastr.warning(this.translate.instant("notificaciones.wa2.adjuntos.voz.pesada"));
      }
      return;
    }
    // Se cortó después de subir: se relee el chat para ver si salió antes de reintentar.
    if (ev.tipo === "revisar") {
      this.refreshMessages(false);
      return;
    }
    const err: any = ev.error;
    if (esErrorChatConDueno(err)) {
      this.ponerDueno(err.error.owner || null);
      this.toastr.warning(this.textoChatConDueno(err.error.owner), this.translate.instant("notificaciones.whatsapp.detail.ownedTitle"));
    }
  }

  toggleContactPanel(): void {
    this.contactPanelOpen = !this.contactPanelOpen;
  }

  markAsRead(): void {
    if (!this.phoneHash) {
      return;
    }
    this.inbox.markThreadViewed(this.phoneHash, this.lineId).subscribe({
      error: () => undefined,
    });
  }

  onBack(): void {
    this.backToList.emit();
  }

  /**
   * La fila de la lista, solo si es de ESTE chat (mismo cliente y mismo número). Nunca se pinta el nombre de
   * otro chat mientras el cuadro de escribir le escribe a este.
   */
  private get chatActual(): WhatsappThread | null {
    const c = this.chat;
    if (!c || !this.phoneHash || c.phoneHash !== this.phoneHash) return null;
    if ((c.line?.id || null) !== (this.lineId || null)) return null;
    return c;
  }

  /** Nombre real del contacto (ficha, perfil de WhatsApp o la fila); vacío si no tiene. */
  private get nombreReal(): string {
    const p = this.profile;
    return (p?.clienteNombre || p?.profileName || this.chatActual?.contactName || "").trim();
  }

  get headerName(): string {
    return (
      this.nombreReal ||
      this.profile?.phoneMasked ||
      this.chatActual?.phoneMasked ||
      this.translate.instant('notificaciones.whatsapp.detail.contact')
    );
  }

  /** Número enmascarado bajo el nombre; no se repite si ya es el título. */
  get telefonoCabecera(): string {
    const tel = this.profile?.phoneMasked || this.chatActual?.phoneMasked || "";
    return tel && tel !== this.headerName ? tel : "";
  }

  /** Iniciales del nombre real; vacío = la vista pone el ícono de persona. */
  get headerInitials(): string {
    return inicialesDe(this.nombreReal);
  }

  /**
   * QueryParams para "Ver datos del cliente" — usa el nombre del cliente como
   * filtro de búsqueda si está registrado. Sin nombre, abre el módulo sin
   * filtro pero ya posicionado en /ventas/clienteslista.
   */
  get clientLinkParams(): Record<string, string> {
    const name = this.profile?.clienteNombre;
    return name ? { buscar: name } : {};
  }

  trackFeedItem(_: number, item: FeedItem): string {
    return item.kind === "date" ? `d:${item.key}` : `m:${item.msg.id}`;
  }

  isDateItem(item: FeedItem): item is DateSeparatorItem {
    return item.kind === "date";
  }

  isMessageItem(item: FeedItem): item is MessageItem {
    return item.kind === "message";
  }

  /** Etiqueta del placeholder de media. */
  mediaLabel(msg: WhatsappMessage): string {
    switch (msg.type) {
      case "image":
        return this.translate.instant('notificaciones.whatsapp.media.image');
      case "audio":
        return this.translate.instant('notificaciones.whatsapp.media.audio');
      case "video":
        return this.translate.instant('notificaciones.wa2.media.video');
      case "document":
        return this.translate.instant('notificaciones.whatsapp.media.document');
      case "sticker":
        return this.translate.instant('notificaciones.whatsapp.media.sticker');
      case "location":
        return this.translate.instant('notificaciones.wa2.adjuntos.ubicacion');
      default:
        return this.translate.instant('notificaciones.whatsapp.media.attachment');
    }
  }

  /** Icono para el status de mensajes outbound. */
  statusIcon(status: string): string {
    switch (status) {
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      case "failed":
        return "✕";
      default:
        return "";
    }
  }

  /** Estado del saliente leído en palabras (lector de pantalla), no el valor crudo («delivered»). */
  statusLabel(status: string): string {
    // Claves literales (no armadas en ejecución) para que el revisor de textos las encuentre.
    switch (status) {
      case "sent":
        return this.translate.instant("notificaciones.wa2.estado.sent");
      case "delivered":
        return this.translate.instant("notificaciones.wa2.estado.delivered");
      case "read":
        return this.translate.instant("notificaciones.wa2.estado.read");
      case "failed":
        return this.translate.instant("notificaciones.wa2.estado.failed");
      default:
        return "";
    }
  }

  /** Formato de fechas del idioma de la pantalla. */
  private get locale(): string {
    const idioma = (this.translate.currentLang || this.translate.defaultLang || "es").slice(0, 2);
    return LOCALE_POR_IDIOMA[idioma] || idioma;
  }

  /** Hora del mensaje en el idioma de la pantalla («3:45 p. m.», «3:45 PM»). */
  formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "";
    }
    try {
      return d.toLocaleTimeString(this.locale, { hour: "numeric", minute: "2-digit" });
    } catch {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }

  // ─── Composer ────────────────────────────────────────────────────────
  /**
   * Submit del composer. Hace POST /reply, en éxito limpia el textarea
   * y recarga mensajes para que aparezca el saliente recién enviado (la
   * burbuja muestra su estado; ya no sale el aviso «Mensaje enviado»).
   * Si falla, dispara un aviso con el error en palabras del comercio.
   */
  onSend(event: Event): void {
    event.preventDefault();
    // Bandeja única: con un archivo o una nota listos, se envía el archivo con el texto como pie de foto.
    if (this.atencion && this.adjEstado.conArchivo && this.adjuntar) {
      if (this.soloLectura) return;
      const r = this.adjuntar.enviarElegido(this.adjEstado.voz ? "" : (this.composerText || "").trim());
      if (r === "enviado") {
        if (!this.adjEstado.voz) this.composerText = "";
        this.bajarTrasEnvio = true;
      }
      if (r !== "nada") return;
    }
    this.enviarTexto((this.composerText || "").trim(), true);
  }

  /**
   * Un saliente fallido escrito a mano se puede volver a enviar desde su burbuja. Solo si el servidor guardó el
   * texto real (`textoReintentable`): un envío fallido sin texto llega con una etiqueta («Respuesta enviada») que
   * nadie escribió. Tampoco si ya se reintentó con éxito (en esta vista o porque el chat trae su reintento).
   */
  puedeReintentar(msg: WhatsappMessage): boolean {
    return (
      msg.direction === "outbound" &&
      msg.status === "failed" &&
      msg.textoReintentable === true &&
      !msg.esBot &&
      !msg.plantilla &&
      // Un archivo no se reintenta como texto (su pie de foto saldría solo).
      !this.conArchivo(msg) &&
      !!(msg.body || "").trim() &&
      !this.yaReintentado(msg) &&
      this.canShowComposer &&
      !this.soloLectura
    );
  }

  /** «Reintentar» de un mensaje que no se envió: mismo camino que un envío normal (el servidor revisa la ventana). */
  reintentar(msg: WhatsappMessage): void {
    if (!this.puedeReintentar(msg)) return;
    // Id fijo por mensaje fallido: varios clics (o un clic tras volver a abrir el chat) son el mismo envío.
    this.enviarTexto((msg.body || "").trim(), false, `${PREFIJO_REINTENTO}${msg.id}`, msg.id);
  }

  /** El reintento de `msg` ya salió: se marcó en esta vista o su saliente (`…retry-<id>`) está en el chat. */
  private yaReintentado(msg: WhatsappMessage): boolean {
    if (this.reintentados.has(msg.id)) return true;
    const marca = `${PREFIJO_REINTENTO}${msg.id}`;
    return this.messages.some(
      (m) => m.id !== msg.id && m.direction === "outbound" && m.status !== "failed" && String(m.id || "").endsWith(marca),
    );
  }

  /**
   * Envía `text` al chat abierto. `desdeCuadro`: el texto salió del cuadro de escribir y se limpia al enviar
   * (un reintento desde la burbuja no toca lo que el asesor esté escribiendo). `idFijo` y `reintentoDe`: un
   * reintento desde la burbuja lleva su propio id (no toca el del cuadro) y, si sale, esconde el botón.
   */
  private enviarTexto(text: string, desdeCuadro: boolean, idFijo?: string, reintentoDe?: string): void {
    if (!this.phoneHash || !text || this.sending) {
      return;
    }
    // [D-437] Chat de otra persona: el servidor lo rechazaría (409).
    if (this.soloLectura) {
      return;
    }
    const hash = this.phoneHash;
    const lineId = this.lineId;
    const seq = this.chatSeq;
    // [D-118] Id estable por mensaje lógico: si el envío falla (o el operador
    // no sabe si salió) y reintenta el MISMO texto, se reusa el id y el
    // backend no dispara un segundo mensaje real. Texto editado → id nuevo.
    if (!idFijo && (!this.pendingClientMessageId || this.pendingForText !== text)) {
      this.pendingClientMessageId =
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      this.pendingForText = text;
    }
    const clientMessageId = idFijo || (this.pendingClientMessageId as string);
    this.sending = true;
    this.inbox
      .sendReply(hash, text, clientMessageId, lineId)
      .subscribe({
        next: () => {
          // El asesor ya pasó a otro chat: el de ahora no se toca (su cuadro y su estado son suyos).
          if (seq !== this.chatSeq) return;
          if (reintentoDe) {
            this.reintentados.add(reintentoDe);
          } else {
            this.pendingClientMessageId = null;
            this.pendingForText = null;
          }
          if (desdeCuadro) this.composerText = "";
          this.sending = false;
          this.bajarTrasEnvio = true;
          // Recargar para ver el saliente en el feed.
          this.refreshMessages();
          // Responder a mano le quita el hilo al bot (lo marca el backend);
          // refrescar el estado para que la franja cambie de una.
          this.cargarEstadoBot(hash);
        },
        error: (err: any) => {
          if (seq !== this.chatSeq) {
            // Falló el envío del chat anterior: se avisa sin culpar al chat abierto.
            if (!esErrorChatConDueno(err) && err?.status !== 403) {
              this.toastr.error(this.translate.instant("notificaciones.wa2.errores.otroChat"), this.translate.instant('notificaciones.whatsapp.detail.sendErrorTitle'));
            }
            return;
          }
          this.sending = false;
          // [D-437] El chat lo atiende otra persona: se pinta su nombre y el redactor queda en lectura.
          if (esErrorChatConDueno(err)) {
            this.ponerDueno(err.error.owner || null);
            this.toastr.warning(this.textoChatConDueno(err.error.owner), this.translate.instant('notificaciones.whatsapp.detail.ownedTitle'));
            return;
          }
          // Los 403 ya los avisa el interceptor con el mensaje del servidor.
          if (err?.status === 403) return;
          this.toastr.error(
            this.translate.instant(claveDeErrorChat(err)),
            this.translate.instant('notificaciones.whatsapp.detail.sendErrorTitle'),
          );
        },
      });
  }

  /** «Este chat lo atiende Ana» con el nombre del equipo; sin dueño legible, el texto general. */
  private textoChatConDueno(owner: DuenoChat | null | undefined): string {
    const nombre = owner ? nombreConMapa(owner.email, owner.nombre, this.mapaEquipo) : "";
    return nombre
      ? this.translate.instant("notificaciones.wa2.errores.chatConDueno", { nombre })
      : this.translate.instant('notificaciones.whatsapp.detail.ownedByOther');
  }

  /**
   * Enter envía. Shift+Enter inserta salto de línea (comportamiento default
   * del textarea, así que solo bloqueamos cuando NO hay shift).
   */
  onEnterPress(event: Event): void {
    // [D-728] Con la lista de respuestas rápidas abierta, Enter elige y no envía.
    if (this.rapidosLista?.abierta || event.defaultPrevented) return;
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.shiftKey) {
      return; // permitir newline
    }
    event.preventDefault();
    this.onSend(event);
  }

  /** Abrir/cerrar dropdown de plantillas. */
  toggleTemplates(): void {
    this.templatesOpen = !this.templatesOpen;
  }

  /**
   * Click en una plantilla: llena el composer con el `sandboxBody` renderizado
   * y cierra el dropdown. No envía automáticamente — el operador puede editar.
   */
  applyTemplate(tpl: QuickTemplate): void {
    this.composerText = tpl.sandboxBody;
    this.templatesOpen = false;
  }

  /**
   * [D-728] Nombre del contacto para la variable {cliente}: el mismo del encabezado (ficha o perfil de WhatsApp)
   * y, si no, el de la fila. Vacío si no tiene uno real: nunca el número enmascarado.
   */
  get nombreCliente(): string {
    return this.nombreReal;
  }

  /** [D-728] Con catálogo de respuestas rápidas, las 6 fijas del código se ocultan. */
  get verFijas(): boolean {
    return !(this.atencion && this.rapidos.length > 0);
  }

  /** [D-728] Las teclas del cuadro pasan primero por la lista de respuestas rápidas (flechas, Enter, Esc). */
  alTeclaRapidos(event: Event): void {
    this.rapidosLista?.alTecla(event as KeyboardEvent);
  }

  /**
   * [D-730] «Usar» de la ayuda de Opttia: pone el texto en el cuadro sin enviar. Con texto escrito pregunta
   * antes de reemplazar; con el cuadro bloqueado no escribe y lo avisa para que se muestre el texto.
   */
  private async aplicarSugerido(texto: string): Promise<void> {
    // Se responde en el turno siguiente: emitir dentro de ngOnChanges cambiaría el padre ya revisado.
    await Promise.resolve();
    // La sugerencia es de ESTE chat: si cambia mientras se espera la pregunta, no se escribe en el otro.
    const chatDeOrigen = `${this.lineId}|${this.phoneHash}`;
    if (this.soloLectura || this.sending || !this.canShowComposer) {
      this.sugeridoResultado.emit("bloqueado");
      return;
    }
    if ((this.composerText || "").trim()) {
      const r = await Swal.fire({
        title: this.translate.instant("notificaciones.bandeja.ayuda.reemplazarTitulo"),
        text: this.translate.instant("notificaciones.bandeja.ayuda.reemplazarTexto"),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: this.translate.instant("notificaciones.bandeja.ayuda.reemplazarSi"),
        cancelButtonText: this.translate.instant("notificaciones.bandeja.ayuda.reemplazarNo"),
        confirmButtonColor: "#5F3FE0",
      });
      if (!r.isConfirmed || chatDeOrigen !== `${this.lineId}|${this.phoneHash}`) {
        this.sugeridoResultado.emit("cancelado");
        return;
      }
    }
    this.composerText = texto;
    this.sugeridoResultado.emit("usado");
  }

  /** [D-728] El texto de la respuesta rápida elegida reemplaza el comando; no se envía. */
  alElegirRapida(texto: string): void {
    this.composerText = texto;
  }

  /** True si la UI debe mostrar el composer (hay hilo abierto, cargado bien y con mensajes). */
  get canShowComposer(): boolean {
    return !!this.phoneHash && !this.loading && !this.errorCarga && this.messages.length > 0;
  }

  /**
   * Franja de la ventana de 24 h: cuánto queda para responder sin plantilla, o que ya pasó. Es solo una guía
   * con los mensajes cargados; quien decide si se puede enviar sigue siendo el servidor.
   */
  get guiaVentana(): GuiaVentana | null {
    if (!this.canShowComposer || this.soloLectura) return null;
    let ultimoEntrante = 0;
    for (const m of this.messages) {
      if (m.direction !== "inbound") continue;
      const t = new Date(m.sentAt).getTime();
      if (!Number.isNaN(t) && t > ultimoEntrante) ultimoEntrante = t;
    }
    if (!ultimoEntrante) {
      // Con mensajes más viejos sin cargar no se sabe cuándo escribió el cliente: mejor no decir nada.
      return this.hayAnteriores ? null : { clave: "notificaciones.wa2.ventana.sinEntrantes", vencida: true };
    }
    const restante = ultimoEntrante + VENTANA_MS - Date.now();
    if (restante <= 0) return { clave: "notificaciones.wa2.ventana.vencida", vencida: true };
    const horas = Math.floor(restante / (60 * 60 * 1000));
    if (horas >= HORAS_AVISO_VENTANA) return null;
    if (horas < 1) return { clave: "notificaciones.wa2.ventana.menosDeUna", vencida: false };
    return { clave: "notificaciones.wa2.ventana.quedan", params: { n: horas }, vencida: false };
  }

  /** «Reintentar» del aviso de error: vuelve a cargar el chat abierto. */
  reintentarCarga(): void {
    this.vaciarChat();
    this.loadAll();
  }

  /** ¿El asesor está mirando el final de la caja? Se pregunta antes de pintar lo nuevo. */
  private cercaDelFinal(): boolean {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= MARGEN_FINAL_PX;
  }

  // ─── Auto-refresh ────────────────────────────────────────────────────
  /**
   * Recargar mensajes sin re-pedir el perfil ni mover el `loading` flag.
   * Usado por el polling y tras enviar una respuesta.
   */
  private refreshMessages(conSync = true): void {
    if (!this.phoneHash) {
      return;
    }
    this.ultimoRefresco = Date.now();
    // Uno a la vez: si ya va uno en camino, se pide otro al terminar. Así una ráfaga de eventos más rápida que
    // la respuesta no descarta todas las lecturas.
    if (this.refrescoEnCurso) {
      this.refrescoPendiente = true;
      this.refrescoPendienteConSync = this.refrescoPendienteConSync || conSync;
      return;
    }
    const hash = this.phoneHash;
    const lineId = this.lineId;
    const seq = this.refrescoSeq;
    this.refrescoEnCurso = true;
    const siguiente = () => {
      this.refrescoEnCurso = false;
      if (!this.refrescoPendiente) return;
      const sync = this.refrescoPendienteConSync;
      this.refrescoPendiente = false;
      this.refrescoPendienteConSync = false;
      this.refreshMessages(sync);
    };
    // Antes del refresh, pedir al backend que sincronice inbounds desde Kapso
    // (best-effort, el servicio ignora el error).
    if (conSync) {
      this.ultimoSync = Date.now();
      this.inbox.syncInbound().subscribe();
    }
    this.reintentarPerfil(hash, lineId, seq);
    this.inbox.getMessages(hash, lineId).pipe(finalize(siguiente)).subscribe({
      next: (page) => {
        // Si el chat cambió mientras respondía, se descarta.
        if (this.phoneHash !== hash || this.lineId !== lineId) return;
        // Una carga completa empezó después de este pedido: la suya manda.
        if (seq !== this.refrescoSeq) return;
        const items = page.items;
        if (items.length === 0) return; // mantener estado anterior si vacío
        // La carga había fallado y este refresco sí trajo el chat: se quita el aviso.
        const veniaDeError = this.errorCarga;
        this.errorCarga = false;
        this.hayAnteriores = !!page.hasMore;
        this.ventana = page.ventana ?? null;
        // Nuevos = los que no estaban (por id): con la página llena el total no crece aunque lleguen mensajes.
        const previos = new Set(veniaDeError ? [] : this.messages.map((m) => m.id));
        const nuevos = items.filter((m) => !previos.has(m.id));
        // Lo nuevo baja la pantalla solo si el asesor ya estaba abajo (o acaba de enviar): si subió a leer, se queda.
        const abajo = veniaDeError || this.bajarTrasEnvio || this.cercaDelFinal();
        this.messages = items;
        this.feedItems = this.buildFeedItems(items);
        if (nuevos.length > 0 && abajo) {
          this.needsScroll = true;
          this.bajarTrasEnvio = false;
        }
        // Si llegaron ENTRANTES nuevos con el chat abierto, marcarlos vistos
        // de una — antes el badge de la lista crecía aunque el operador
        // estuviera leyendo el hilo ("abro el chat y no se quitan").
        if (nuevos.some((m) => m.direction === "inbound")) {
          this.markAsRead();
        }
      },
      error: () => undefined,
    });
  }

  /**
   * Polling cada 4s. No refresca en mitad de un envío. Con texto a medias sí
   * refresca (el asesor debe ver lo que el cliente sigue escribiendo); la
   * pantalla solo baja al final cuando llegan mensajes nuevos. Con el canal en
   * vivo conectado queda de respaldo: un refresco cada 30 s como mucho.
   * La sincronización con Kapso va en cada vuelta solo con el canal caído; con
   * el canal conectado, en el sondeo lento (cada 30 s como mucho).
   */
  private restartAutoRefresh(): void {
    this.stopAutoRefresh();
    if (!this.phoneHash) {
      return;
    }
    this.refreshSub = interval(4000).subscribe(() => {
      // [D-117] Pestaña oculta → no pollear (cada tick cuesta lecturas
      // Firestore del hilo completo); al volver, el siguiente tick refresca.
      if (document.hidden) return;
      if (this.sending) return;
      // Con el canal en vivo este sondeo queda de respaldo, pero solo en chats de una línea propia: los del
      // número compartido de Katuq (sin línea) no tienen hilo y no producen eventos, así que siguen cada 4 s.
      if (this.enVivo && this.lineId && Date.now() - this.ultimoRefresco < SONDEO_RESPALDO_MS) return;
      const conSync = !this.enVivo || Date.now() - this.ultimoSync >= SONDEO_RESPALDO_MS;
      this.refreshMessages(conSync);
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = null;
    }
  }

  // ─── Bot de pedidos ─────────────────────────────────────────────────────

  /** Carga (o refresca) el estado del bot para el hilo. Nunca bloquea el chat. */
  private cargarEstadoBot(hash: string): void {
    const lineId = this.lineId;
    this.inbox.getBotState(hash, lineId).subscribe({
      next: (estado) => {
        // Si el hilo cambió mientras respondía, se descarta.
        if (this.phoneHash === hash && this.lineId === lineId) this.botState = estado;
      },
      error: () => undefined,
    });
  }

  /**
   * «Atendido por el bot» solo si el servidor lo dice y nadie del equipo tomó el chat. Tras «Tomar» la
   * pastilla se quita de una (el bot ya no contesta cuando hay dueño; aquí solo cambia lo que se ve).
   */
  get botAtiende(): boolean {
    return !!this.botState?.atendiendoBot && !this.dueno;
  }

  /** Texto de la franja de traspaso: quién lleva el chat, en palabras y sin códigos. */
  get textoTraspaso(): string {
    const tomadaPor = (this.botState?.tomadaPor || "").trim();
    if (!tomadaPor) return this.translate.instant("notificaciones.wa2.franja.botNoAtiende");
    if (tomadaPor === "sin_asignar" || tomadaPor === "unknown") {
      return this.translate.instant("notificaciones.wa2.franja.botHandedOver");
    }
    const nombre = tomadaPor.includes("@")
      ? nombreConMapa(tomadaPor, null, this.mapaEquipo)
      : this.translate.instant("notificaciones.whatsapp.detail.someoneElse");
    return this.translate.instant("notificaciones.whatsapp.detail.handledBy", { nombre });
  }

  /** Motivo del traspaso traducido; vacío si el servidor guardó uno que no se sabe contar. */
  get motivoTraspasoTexto(): string {
    const motivo = (this.botState?.motivoTraspaso || "").trim();
    if (!motivo) return "";
    const conocido = MOTIVOS_TRASPASO.find((m) => m.prueba.test(motivo));
    return conocido ? this.translate.instant(conocido.clave) : "";
  }

  /** El vendedor se queda con la conversación; el bot se calla en este hilo. */
  tomarConversacion(): void {
    if (!this.phoneHash || this.botActionBusy) return;
    const hash = this.phoneHash;
    this.botActionBusy = true;
    this.inbox.tomarConversacion(hash, this.lineId).subscribe({
      next: () => {
        this.botActionBusy = false;
        this.toastr.success(this.translate.instant('notificaciones.whatsapp.detail.tookConversation'));
        this.cargarEstadoBot(hash);
      },
      error: () => {
        this.botActionBusy = false;
        this.toastr.error(this.translate.instant('notificaciones.whatsapp.detail.takeError'));
      },
    });
  }

  /** Le devuelve la conversación al bot (arranca con la cuenta de turnos en cero). */
  devolverAlBot(): void {
    if (!this.phoneHash || this.botActionBusy) return;
    const hash = this.phoneHash;
    this.botActionBusy = true;
    this.inbox.devolverAlBot(hash, this.lineId).subscribe({
      next: () => {
        this.botActionBusy = false;
        this.toastr.success(this.translate.instant('notificaciones.whatsapp.detail.returnedToBot'));
        this.cargarEstadoBot(hash);
      },
      error: () => {
        this.botActionBusy = false;
        this.toastr.error(this.translate.instant('notificaciones.whatsapp.detail.returnError'));
      },
    });
  }

  private loadAll(): void {
    if (!this.phoneHash) {
      this.messages = [];
      this.feedItems = [];
      this.profile = null;
      this.botState = null;
      this.loading = false;
      this.errorCarga = false;
      return;
    }
    this.loading = true;
    this.errorCarga = false;
    const hash = this.phoneHash;
    const lineId = this.lineId;
    const seq = ++this.refrescoSeq;
    this.ultimoRefresco = Date.now();
    this.senalDuranteCarga = false;
    this.ultimoIntentoPerfil = Date.now();
    this.cargarEstadoBot(hash);
    forkJoin([
      this.inbox.getMessages(hash, lineId),
      // Una falla del perfil no tumba los mensajes: la cabecera usa la fila de la lista y el refresco lo reintenta.
      this.inbox.getContactProfile(hash, lineId).pipe(catchError(() => of(null))),
    ]).subscribe({
      next: ([page, profile]) => {
        if (this.phoneHash !== hash || this.lineId !== lineId || seq !== this.refrescoSeq) return;
        this.messages = page.items;
        this.feedItems = this.buildFeedItems(page.items);
        this.hayAnteriores = !!page.hasMore;
        this.ventana = page.ventana ?? null;
        this.profile = profile;
        this.loading = false;
        this.needsScroll = true;
        this.inbox
          .markThreadViewed(hash, lineId)
          .subscribe({ error: () => undefined });
        if (this.senalDuranteCarga) {
          this.senalDuranteCarga = false;
          this.refreshMessages(false);
        }
      },
      // Si fallan los mensajes, el chat queda vacío con el aviso y Reintentar; nunca con lo del chat anterior.
      error: () => {
        if (this.phoneHash !== hash || this.lineId !== lineId || seq !== this.refrescoSeq) return;
        this.messages = [];
        this.feedItems = [];
        this.loading = false;
        this.errorCarga = true;
        this.senalDuranteCarga = false;
      },
    });
  }

  /**
   * Deja el detalle en blanco al cambiar de chat (o al reintentar): mensajes, perfil, estado del bot, el envío en
   * curso y su id idempotente. Así nada del chat anterior se ve ni se reusa en el nuevo.
   */
  private vaciarChat(): void {
    this.chatSeq++;
    // Los archivos bajados del chat anterior se sueltan (revoke) y una descarga tardía se descarta.
    this.cache.soltar();
    this.ventana = null;
    // El adjuntar se vuelve a crear vacío al cargar (lo elegido o grabado era de antes).
    this.adjEstado = { conArchivo: false, voz: false, grabando: false };
    this.messages = [];
    this.feedItems = [];
    this.profile = null;
    this.botState = null;
    this.errorCarga = false;
    this.hayAnteriores = false;
    this.sending = false;
    this.pendingClientMessageId = null;
    this.pendingForText = null;
    this.reintentados.clear();
    this.bajarTrasEnvio = false;
    this.needsScroll = false;
  }

  /** El perfil falló en la carga: un refresco lo vuelve a pedir (uno a la vez, cada 30 s como mucho). */
  private reintentarPerfil(hash: string, lineId: string | null, seq: number): void {
    if (this.profile || this.loading || this.perfilEnCurso) return;
    if (Date.now() - this.ultimoIntentoPerfil < SONDEO_RESPALDO_MS) return;
    this.perfilEnCurso = true;
    this.ultimoIntentoPerfil = Date.now();
    this.inbox
      .getContactProfile(hash, lineId)
      .pipe(finalize(() => (this.perfilEnCurso = false)))
      .subscribe({
        next: (perfil) => {
          if (this.phoneHash !== hash || this.lineId !== lineId || seq !== this.refrescoSeq) return;
          this.profile = perfil;
        },
        error: () => undefined,
      });
  }

  // ─── Dueño del chat (D-437) ───────────────────────────────────────────

  /** La franja de dueño se ve en chats de un número del comercio, con la bandera encendida. */
  get mostrarDueno(): boolean {
    return (this.multiNumero || this.atencion) && !!this.lineId && !!this.chat?.threadId;
  }

  /** El chat lo atiende otra persona: el redactor queda en lectura. */
  get soloLectura(): boolean {
    if (!this.dueno) return false;
    return (this.dueno.email || "").toLowerCase() !== (this.miEmail || "").toLowerCase();
  }

  get motivoLectura(): string {
    const nombre =
      (this.dueno ? nombreConMapa(this.dueno.email, this.dueno.nombre, this.mapaEquipo) : "") ||
      this.translate.instant('notificaciones.whatsapp.detail.someoneElse');
    return this.esAdministrador || (this.atencion && this.coordina)
      ? this.translate.instant('notificaciones.whatsapp.detail.readOnlyAdmin', { nombre })
      : this.translate.instant('notificaciones.whatsapp.detail.readOnly', { nombre });
  }

  tomarChat(): void {
    const threadId = this.chat?.threadId;
    if (!threadId) return;
    this.accionDueno(this.atencion ? this.atencionSrv.tomar(threadId) : this.hilos.tomar(threadId), "notificaciones.whatsapp.detail.ownerTaken");
  }

  soltarChat(): void {
    const threadId = this.chat?.threadId;
    if (!threadId) return;
    this.accionDueno(this.atencion ? this.atencionSrv.soltar(threadId) : this.hilos.soltar(threadId), "notificaciones.whatsapp.detail.ownerReleased");
  }

  /** Sin `atencion` llega el correo (como hoy); con ella, `{ email, nota }`. */
  pasarChat(destino: string | Transferencia): void {
    const threadId = this.chat?.threadId;
    const t: Transferencia = typeof destino === "string" ? { email: destino, nota: "" } : destino;
    if (!threadId || (!t?.email && !t?.colaId)) return;
    if (!this.atencion) {
      this.accionDueno(this.hilos.asignar(threadId, t.email as string), "notificaciones.whatsapp.detail.ownerPassed");
      return;
    }
    // [D-727] A una cola: el servidor deja el chat sin dueño y lo reparte según la cola.
    if (t.colaId) {
      this.accionDueno(this.atencionSrv.transferir(threadId, { colaId: t.colaId, nota: t.nota || "" }), "notificaciones.owner.queuePassed", t.colaId);
      return;
    }
    // Sin dueño solo quien coordina puede dar el chat (asignar); con dueño se transfiere con la nota.
    const peticion = !this.dueno && this.coordina
      ? this.atencionSrv.asignar(threadId, t.email as string)
      : this.atencionSrv.transferir(threadId, t.email as string, t.nota || "");
    this.accionDueno(peticion, "notificaciones.whatsapp.detail.ownerPassed");
  }

  /** [D-725] El dueño o quien coordina pasa el chat (con `atencion`). */
  get puedePasarChat(): boolean {
    return this.atencion && (this.coordina || !!(this.dueno && !this.soloLectura));
  }

  /**
   * [D-725] «· Nombre» del saliente: el nombre del equipo, luego el que guardó el mensaje y al final el correo
   * (como en redes). Vacío sin `atencion`, en los entrantes y en los del bot.
   */
  autorDe(msg: WhatsappMessage): string {
    if (!this.atencion || msg.direction !== "outbound") return "";
    const por = (msg.sentBy || "").trim();
    if (por === "bot") return "";
    return nombreConMapa(por, msg.sentByName, this.mapaEquipo);
  }

  private accionDueno(peticion: ReturnType<AtencionService["tomar"]>, exito: string, colaId?: string): void {
    if (this.duenoOcupado) return;
    this.duenoOcupado = true;
    const hash = this.phoneHash;
    // La respuesta es del chat donde se tocó: si el asesor ya abrió otro, no se le pinta (ni se le guarda) ese dueño.
    const seq = this.chatSeq;
    peticion.subscribe({
      next: (owner) => {
        this.duenoOcupado = false;
        if (seq !== this.chatSeq) return;
        this.ponerDueno(owner);
        if (colaId) this.colaCambiada.emit(colaId);
        this.toastr.success(this.translate.instant(exito));
        // Tomar, soltar o pasar cambia quién responde: se relee el estado real del bot para la pastilla y la franja.
        if (hash && hash === this.phoneHash) this.cargarEstadoBot(hash);
      },
      error: (err: any) => {
        this.duenoOcupado = false;
        if (seq !== this.chatSeq) {
          // Falló en el chat anterior: se avisa sin tocar el abierto.
          if (!esErrorChatConDueno(err) && err?.status !== 403) {
            this.toastr.error(this.translate.instant("notificaciones.wa2.errores.otroChatDueno"));
          }
          return;
        }
        if (esErrorChatConDueno(err)) {
          this.ponerDueno(err.error.owner || null);
          this.toastr.warning(this.textoChatConDueno(err.error.owner), this.translate.instant('notificaciones.whatsapp.detail.ownedTitle'));
          return;
        }
        // Los 403 ya los avisa el interceptor con el mensaje del servidor.
        if (err?.status === 403) return;
        this.toastr.error(this.translate.instant(claveDeErrorChat(err, 'notificaciones.whatsapp.detail.ownerChangeError')));
      },
    });
  }

  private ponerDueno(owner: DuenoChat | null): void {
    this.dueno = owner && owner.email ? owner : null;
    this.duenoCambiado.emit(this.dueno);
  }

  /**
   * Construye el feed mixto con separadores de día + mensajes agrupados.
   *
   * - Cada cambio de día inserta un `DateSeparatorItem` ("Hoy", "Ayer" o
   *   fecha corta tipo "Lun, 15 jun").
   * - Mensajes consecutivos del mismo emisor llevan `grouped=true` para que
   *   visualmente se peguen (border-radius compactado).
   */
  private buildFeedItems(messages: WhatsappMessage[]): FeedItem[] {
    const items: FeedItem[] = [];
    let lastDayKey = "";
    let lastDirection = "";

    for (const msg of messages) {
      const d = new Date(msg.sentAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDayKey) {
        items.push({
          kind: "date",
          label: this.formatDay(d),
          key: dayKey,
        });
        lastDayKey = dayKey;
        lastDirection = ""; // reset agrupación al cambiar de día
      }
      const grouped =
        lastDirection === msg.direction && items.length > 0;
      items.push({ kind: "message", msg, grouped });
      lastDirection = msg.direction;
    }
    return items;
  }

  private formatDay(d: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return this.translate.instant('notificaciones.whatsapp.detail.today');
    if (diffDays === 1) return this.translate.instant('notificaciones.whatsapp.detail.yesterday');
    // Fechas en el idioma de la pantalla (antes siempre en español de Colombia).
    const locale = this.locale;
    const fecha = (opciones: Intl.DateTimeFormatOptions): string => {
      try {
        return day.toLocaleDateString(locale, opciones);
      } catch {
        return day.toLocaleDateString(undefined, opciones);
      }
    };
    if (diffDays > 1 && diffDays < 7) {
      return fecha({ weekday: "long" }).replace(/^./, (c) => c.toLocaleUpperCase());
    }
    const opciones: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
    if (day.getFullYear() !== today.getFullYear()) opciones.year = "numeric";
    return fecha(opciones);
  }
}
