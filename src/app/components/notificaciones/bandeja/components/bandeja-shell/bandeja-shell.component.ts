import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ChatNotasComponent } from "../../../inbox-core/chat-notas/chat-notas.component";
import { TranslateService } from "@ngx-translate/core";
import { Subject, Subscription, asyncScheduler, interval } from "rxjs";
import { takeUntil, throttleTime } from "rxjs/operators";

import { CompanyFeaturesService } from "../../../../../shared/services/company-features.service";
import { LoaderService } from "../../../../../shared/services/loader.service";
import { AtencionService } from "../../../../../shared/services/messaging/atencion.service";
import { ItemRelacionado } from "../../../../../shared/services/messaging/messaging.models";
import { MessagingLinesService } from "../../../../../shared/services/messaging/messaging-lines.service";
import {
  BandejaEnVivoService,
  ChatAbiertoEnVivo,
  EstadoEnVivo,
  EventoChatEnVivo,
  SONDEO_RESPALDO_MS,
  eventoEsDelChat,
  eventoTocaMensajes,
} from "../../../../../shared/services/messaging/bandeja-en-vivo.service";
import {
  AccionHilo,
  AjustesAtencion,
  CatalogosAtencion,
  ColaAtencion,
  ColaBasica,
  DuenoChat,
  EstadoAsesor,
  EtiquetaChat,
  FiltrosInformeAtencion,
  InformeAtencion,
  LineaDeCola,
  MessagingLine,
  MiembroAtencion,
  MiembroEquipo,
  NotaChat,
  RespuestaRapida,
  ResumenAtencion,
  ResultadoUsoSugerencia,
  TextoSugerido,
} from "../../../../../shared/services/messaging/messaging.models";
import { ResultadoUso } from "../../../inbox-core/chat-ayuda/chat-ayuda.component";
import { NavService } from "../../../../../shared/services/nav.service";
import { esFamiliaAdministrador } from "../../../../../shared/utils/roles";
import { MetaInboxService } from "../../../meta-inbox/meta-inbox.service";
import { MetaConexiones, MetaHilo } from "../../../meta-inbox/models/meta-thread.model";
import { WhatsappThread } from "../../../whatsapp-inbox/models/whatsapp-thread.model";
import { BandejaService } from "../../bandeja.service";
import { CANAL_BANDEJA_LABEL, CANALES_BANDEJA, RUTA_MENU_CANAL } from "../../bandeja.canales";
import {
  CanalBandeja,
  CargaBandeja,
  ConversacionResumen,
} from "../../bandeja.models";
import { claveRelacionado, desdeRelacionado, mezclar } from "../../bandeja.util";
import { normalizarCola } from "../../bandeja.colas";
import { construirCsv } from "../bandeja-informes/bandeja-informes.util";

/** Vistas de la bandeja: la lista de chats o, para quien coordina, las pestañas Equipo e Informes (D-729). */
export type VistaBandeja = "chats" | "equipo" | "informes";

/** Cada cuánto se vuelve a leer la lista: el mismo intervalo de la lista del buzón de WhatsApp. */
const REFRESCO_MS = 5000;

/**
 * Con el canal en vivo, la lista se confirma por HTTP como mucho cada 3 s por página de WhatsApp abierta: la
 * fila ya cambió en memoria al llegar el evento, y la lista comparte con el envío el cupo de consultas del
 * buzón de WhatsApp (90 por minuto por usuario).
 */
const CONFIRMA_EN_VIVO_MS = 3000;

/**
 * Bandeja única («Todos los mensajes»): una sola lista con los chats de WhatsApp, Instagram, Facebook y
 * TikTok, y a la derecha la misma conversación que abre cada buzón. Aquí no se envía nada: la respuesta
 * sale por el canal y el número de la conversación, desde el detalle de ese canal.
 *
 * Qué canales se consultan: los que el usuario tiene en su menú «Mensajes» (TikTok ya viene con su
 * bandera) y, en redes, los que están conectados. Un canal sin conectar no es error: no se pide.
 *
 * La pantalla muestra su propio «Cargando…» y refresca sola, así que suprime el overlay global de carga
 * mientras está montada (igual que los buzones de hoy).
 */
@Component({
  selector: "app-bandeja-shell",
  templateUrl: "./bandeja-shell.component.html",
  styleUrls: ["./bandeja-shell.component.scss"],
})
export class BandejaShellComponent implements OnInit, OnDestroy {
  /** Canales que el usuario puede ver y están conectados (los que se consultan). */
  canales: CanalBandeja[] = [];
  carga: CargaBandeja | null = null;
  cargando = true;
  cargandoMas = false;
  /** La conversación abierta. */
  seleccion: ConversacionResumen | null = null;

  /** Bandera `whatsappMultiNumero`: líneas, chip del número y selector. */
  readonly multiNumero: boolean;
  readonly esAdministrador: boolean;
  readonly miEmail: string;
  lineas: MessagingLine[] = [];
  equipo: MiembroEquipo[] = [];

  // ─── Atención multiagente (D-725). Si `/atencion/yo` falla, todo queda como antes ───
  atencion = false;
  coordina = false;
  esAdmin = false;
  estado: EstadoAsesor = "disponible";
  cambiandoEstado = false;
  errorEstado = false;
  asesores: MiembroAtencion[] = [];
  vista: VistaBandeja = "chats";
  /** Filtro por asesor: correo, 'sin-asignar' o null. */
  asesor: string | null = null;

  /** Filtro por cola (D-727): id o null. */
  cola: string | null = null;
  /** Colas del comercio. Campos estables: no se recrean en cada revisión ni en cada refresco sin cambios. */
  colas: ColaAtencion[] = [];
  colasActivas: ColaBasica[] = [];
  lineasCola: LineaDeCola[] = [];
  guardandoColas = false;
  colasGuardadoOk = false;
  errorColas = "";
  private colasFirma = "";

  // ─── Cerrar con motivo, etiquetas y respuestas rápidas (D-728). Campos estables: nunca arreglos de un getter ───
  /** Catálogos del comercio. Se cargan una vez (y al guardar); la firma evita recrearlos sin cambios. */
  motivosCierre: string[] = [];
  cierreAutoHoras = 0;
  etiquetasCat: EtiquetaChat[] = [];
  rapidos: RespuestaRapida[] = [];
  miNombre = "";
  private catalogosFirma = "";
  /** Qué tarjeta de Equipo está guardando ('motivos' | 'etiquetas' | 'rapidos') y cuál guardó bien; vacío = ninguna. */
  guardandoCat = "";
  okCat = "";
  /** Error 422 del servidor y a qué tarjeta pertenece. */
  errorCatClave = "";
  errorCatMensaje = "";
  /** Acciones del chat abierto: cerrar, abrir de nuevo y etiquetar. */
  ocupadoCierre = false;
  errorCierre = "";
  ocupadoEtiquetas = false;
  errorEtiquetas = "";
  /** Misma referencia siempre: lo que reciben los hijos cuando el chat no trae etiquetas. */
  private readonly sinEtiquetas: string[] = [];

  // ─── Informes de atención (fase H, D-729). Solo lectura; campos estables ───
  /** Se crea al entrar por primera vez y después solo se oculta: conserva filtros y resultados. */
  informesVisto = false;
  informe: InformeAtencion | null = null;
  informeCargando = false;
  informeError = false;
  informeMensaje = "";
  descargandoInforme = false;
  errorDescargaInforme = false;
  informeTruncado = false;
  /** Cada lectura invalida la anterior: una respuesta tardía no pisa a la nueva. */
  private informeSeq = 0;

  resumen: ResumenAtencion | null = null;
  resumenCargando = false;
  resumenError = false;
  guardandoAjustes = false;
  ajustesGuardados = false;
  errorAjustes = false;

  // Ayuda de Opttia (D-730): texto que «Usar» pone en el cuadro de escribir y lo que el cuadro contestó.
  // Son campos estables (no se arman en la plantilla) y se sueltan al cambiar de chat.
  textoSugerido: TextoSugerido | null = null;
  resultadoUso: ResultadoUso | null = null;
  private sugeridoN = 0;

  // Notas internas del chat abierto
  notasAbiertas = false;
  notas: NotaChat[] = [];
  notasCargando = false;
  notasError = false;
  notasGuardando = false;
  errorNota = false;

  // ─── Canal en vivo (solo con `bandejaUnica`; sin él o sin la ruta en el servidor, todo queda como antes) ───
  /** Conectado: la lista y el chat abierto se refrescan al llegar un evento y el sondeo baja a uno lento. */
  enVivo = false;
  /** Para el indicador «En vivo» / «Reconectando…». */
  estadoEnVivo: EstadoEnVivo = "apagado";
  /** Cada cambio le pide al chat abierto releer sus mensajes en silencio. */
  senalDetalle = 0;
  private detallePendiente = false;
  private notasPendiente = false;
  private readonly rafaga$ = new Subject<void>();
  /** Un refresco en vivo pedido mientras otra carga iba en camino: se hace al terminar esa. */
  private recargaEnVivoPendiente = false;
  /**
   * Cuándo se hizo la última carga completa (lista, resumen y colas). El sondeo de respaldo se mide contra esta
   * y no contra los refrescos en vivo, que son solo de la lista: si no, con tráfico el resumen nunca se refresca.
   */
  private ultimoRefrescoCompleto = 0;
  /** Confirmación por HTTP de la lista en vivo: cuándo salió la última y la que espera su turno. */
  private ultimaConfirmacion = 0;
  private temporizadorConfirmacion: ReturnType<typeof setTimeout> | null = null;
  /**
   * Eventos aplicados en memoria mientras una carga iba en camino. Esa carga pudo leer el servidor antes del
   * evento: al llegar se le vuelven a aplicar, para que la fila no salte atrás y luego adelante.
   */
  private eventosEnCarga: EventoChatEnVivo[] = [];

  private conexiones: MetaConexiones | null = null;
  private refrescoSub?: Subscription;
  private cargaSub?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly bandeja: BandejaService,
    private readonly meta: MetaInboxService,
    private readonly nav: NavService,
    private readonly lineasService: MessagingLinesService,
    private readonly atencionSrv: AtencionService,
    private readonly loader: LoaderService,
    private readonly translate: TranslateService,
    private readonly enVivoSrv: BandejaEnVivoService,
    features: CompanyFeaturesService,
  ) {
    this.multiNumero = features.isEnabled("whatsappMultiNumero");
    const usuario = this.leerUsuario();
    this.esAdministrador = esFamiliaAdministrador(usuario["rol"]);
    this.miEmail = String(usuario["email"] || "");
  }

  ngOnInit(): void {
    this.loader.suppressGlobalLoader();
    this.loader.ocultarBarraSuperior();
    this.cargarAtencion();
    this.elegirCanalesYCargar();
    this.refrescoSub = interval(REFRESCO_MS).subscribe(() => {
      // Con la pestaña oculta no se pollea (D-117); al volver, el siguiente tick refresca.
      if (document.hidden || this.cargando || this.cargandoMas) return;
      // Con el canal en vivo conectado este sondeo queda de respaldo: como mucho cada 30 s. Salvo con chats del
      // número compartido de WhatsApp, que no producen eventos: ahí sigue el de siempre.
      if (this.enVivo && !this.hayWhatsappSinHilo() && Date.now() - this.ultimoRefrescoCompleto < SONDEO_RESPALDO_MS) return;
      this.cargar(true);
    });
    this.escucharEnVivo();
  }

  // ─── Canal en vivo ───

  /**
   * Cada evento pone al día la fila en memoria (si ya está en la lista) y, si con eso no basta, pide una
   * confirmación por HTTP de la lista (como mucho cada 3 s por página de WhatsApp). Si el evento trae mensajes
   * nuevos del chat abierto, el detalle los relee (agrupado: uno cada 400 ms como mucho).
   */
  private escucharEnVivo(): void {
    this.enVivoSrv.conectado$.pipe(takeUntil(this.destroy$)).subscribe((v) => (this.enVivo = v));
    this.enVivoSrv.estado$.pipe(takeUntil(this.destroy$)).subscribe((e) => (this.estadoEnVivo = e));
    this.enVivoSrv.eventos$.pipe(takeUntil(this.destroy$)).subscribe((e) => this.alEventoEnVivo(e));
    this.enVivoSrv.recargar$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.programarConfirmacion(true);
      this.detallePendiente = !!this.seleccion;
      this.notasPendiente = this.notasAbiertas;
      this.rafaga$.next();
    });
    this.rafaga$
      .pipe(throttleTime(400, asyncScheduler, { leading: true, trailing: true }), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.detallePendiente) this.senalDetalle++;
        if (this.notasPendiente && this.notasAbiertas) this.cargarNotas(true);
        this.detallePendiente = false;
        this.notasPendiente = false;
      });
  }

  private alEventoEnVivo(e: EventoChatEnVivo): void {
    if (!this.canales.includes(e.canal)) return;
    const delAbierto = eventoEsDelChat(e, this.chatAbiertoEnVivo());
    // Todo motivo cambia la fila: «estado» es que el chat se cerró o se reabrió.
    if (this.cargaEnCurso()) this.eventosEnCarga.push(e);
    const r = this.carga ? aplicarEventoEnVivo(this.carga, e, this.claveSeleccion) : null;
    if (r && r.carga !== this.carga) {
      this.carga = r.carga;
      // La barra del chat abierto (dueño, cerrado) sigue a su fila.
      if (delAbierto) this.actualizarSeleccion();
    }
    if (!r || !r.completo) this.programarConfirmacion();
    if (delAbierto) {
      if (e.motivo === "nota") this.notasPendiente = true;
      if (eventoTocaMensajes(e)) this.detallePendiente = true;
      if (this.notasPendiente || this.detallePendiente) this.rafaga$.next();
    }
  }

  private chatAbiertoEnVivo(): ChatAbiertoEnVivo | null {
    const s = this.seleccion;
    return s ? chatEnVivoDe(s) : null;
  }

  /** Chats de WhatsApp del número compartido de Katuq: no tienen hilo y no producen eventos en vivo. */
  private hayWhatsappSinHilo(): boolean {
    if (!this.canales.includes("whatsapp")) return false;
    if (!this.multiNumero) return true;
    return this.conversaciones.some((c) => c.canal === "whatsapp" && !c.threadId);
  }

  private cargaEnCurso(): boolean {
    return this.cargando || this.cargandoMas || (!!this.cargaSub && !this.cargaSub.closed);
  }

  /**
   * Confirmación por HTTP de la lista en vivo: la primera sale enseguida y las siguientes esperan su turno
   * (`CONFIRMA_EN_VIVO_MS` por página de WhatsApp). `ya` (el servidor pidió recargar) no espera.
   */
  private programarConfirmacion(ya = false): void {
    if (this.temporizadorConfirmacion) {
      if (!ya) return;
      clearTimeout(this.temporizadorConfirmacion);
      this.temporizadorConfirmacion = null;
    }
    const intervalo = CONFIRMA_EN_VIVO_MS * Math.max(1, this.carga?.paginasWhatsapp ?? 1);
    const espera = ya ? 0 : this.ultimaConfirmacion + intervalo - Date.now();
    if (espera <= 0) {
      this.confirmarEnVivo();
      return;
    }
    this.temporizadorConfirmacion = setTimeout(() => {
      this.temporizadorConfirmacion = null;
      this.confirmarEnVivo();
    }, espera);
  }

  private confirmarEnVivo(): void {
    this.ultimaConfirmacion = Date.now();
    this.refrescarEnVivo();
  }

  /**
   * Refresco en silencio solo de la lista (el resumen y las colas siguen con el sondeo). Uno a la vez: si
   * otra carga va en camino, se pide otra confirmación al terminar, así una ráfaga no cancela todas las cargas.
   */
  private refrescarEnVivo(): void {
    if (this.cargaEnCurso()) {
      this.recargaEnVivoPendiente = true;
      return;
    }
    this.cargar(true, true);
  }

  /** Terminó una carga: si se pidió confirmar mientras iba en camino, se pide en su turno. */
  private seguirConfirmacionPendiente(): void {
    if (!this.recargaEnVivoPendiente) return;
    this.recargaEnVivoPendiente = false;
    this.programarConfirmacion();
  }

  /** Vuelve a aplicar sobre una carga recién llegada los eventos que llegaron mientras iba en camino. */
  private conEventosEnCarga(carga: CargaBandeja): CargaBandeja {
    let r = carga;
    for (const e of this.eventosEnCarga) r = aplicarEventoEnVivo(r, e, this.claveSeleccion).carga;
    this.eventosEnCarga = [];
    return r;
  }

  ngOnDestroy(): void {
    if (this.temporizadorConfirmacion) clearTimeout(this.temporizadorConfirmacion);
    this.temporizadorConfirmacion = null;
    this.loader.releaseGlobalLoader();
    this.loader.mostrarBarraSuperior();
    this.refrescoSub?.unsubscribe();
    this.cargaSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get conversaciones(): ConversacionResumen[] {
    return this.carga?.conversaciones ?? [];
  }

  /** Ningún canal pedido pudo cargarse y no hay nada que mostrar: se ofrece reintentar. */
  get errorCarga(): boolean {
    return (
      !!this.carga &&
      this.canales.length > 0 &&
      this.carga.canalesCaidos.length >= this.canales.length &&
      this.carga.conversaciones.length === 0
    );
  }

  /** Id del hilo de atención del chat abierto; sin él (número compartido) no hay notas ni dueño. */
  get threadIdAbierto(): string | null {
    return this.seleccion?.threadId || null;
  }

  // ─── Otros chats de este cliente: viven en la barra también en el número compartido (sin threadId) ───

  /** El botón ya sabe si tiene algo que mostrar: sin eso, y sin hilo propio, la barra no se pinta. */
  relacionadosVisible = false;

  get relCanal(): CanalBandeja | null {
    return this.atencion ? this.seleccion?.canal ?? null : null;
  }

  get relHash(): string | null {
    const s = this.seleccion;
    if (!this.atencion || !s) return null;
    return s.canal === "whatsapp" ? s.origen.phoneHash || null : s.origen.identidadHash || null;
  }

  /** Solo WhatsApp con número propio; el número compartido va sin línea. */
  get relLineId(): string | null {
    const s = this.seleccion;
    return s && s.canal === "whatsapp" ? s.lineId || null : null;
  }

  get barraVisible(): boolean {
    return !!this.seleccion && this.atencion && (this.puedeVerNotas || this.relacionadosVisible);
  }

  alCambiarRelacionadosVisible(visible: boolean): void {
    this.relacionadosVisible = visible;
  }

  /** Abre un chat relacionado por el mismo camino de la lista; si no está cargado, con una fila mínima. */
  abrirRelacionado(item: ItemRelacionado): void {
    const clave = claveRelacionado(item);
    this.abrir(this.conversaciones.find((c) => c.clave === clave) ?? desdeRelacionado(item));
  }

  get puedeVerNotas(): boolean {
    return this.atencion && !!this.threadIdAbierto;
  }

  get dueno(): DuenoChat | null {
    return this.seleccion?.dueno || null;
  }

  /** Etiquetas del chat abierto; la misma referencia mientras el chat no cambie. */
  get etiquetasAbiertas(): string[] {
    return this.seleccion?.etiquetas ?? this.sinEtiquetas;
  }

  get cerradoAbierto(): boolean {
    return !!this.seleccion?.cerrado;
  }

  get motivoAbierto(): string {
    return this.seleccion?.motivoCierre || "";
  }

  get claveSeleccion(): string | null {
    return this.seleccion?.clave ?? null;
  }

  /** El hilo de WhatsApp abierto, tal cual lo trae la lista de hoy. */
  get whatsappAbierto(): WhatsappThread | null {
    return this.seleccion?.canal === "whatsapp" ? this.seleccion.origen : null;
  }

  /** El hilo de redes abierto, tal cual lo trae el buzón de hoy. */
  get redAbierta(): MetaHilo | null {
    return this.seleccion && this.seleccion.canal !== "whatsapp" ? this.seleccion.origen : null;
  }

  get redConectada(): boolean {
    const canal = this.redAbierta?.canal;
    return !!canal && this.conexiones?.[canal]?.estado === "conectado";
  }

  abrir(conversacion: ConversacionResumen): void {
    // Marcado visual de «leído», como el buzón de WhatsApp; el detalle lo confirma al servidor.
    if ((conversacion.sinLeer || 0) > 0) {
      conversacion.sinLeer = 0;
      if (conversacion.canal === "whatsapp") {
        conversacion.origen.unreadCount = 0;
      } else {
        conversacion.origen.noLeidos = 0;
        // El refresco de 10 s no debe devolver la insignia antes de que el servidor confirme.
        this.bandeja.recordarLeidoLocal(conversacion.clave, conversacion.ultimoEn);
      }
    }
    this.seleccion = conversacion;
    this.reiniciarNotas();
    this.reiniciarAcciones();
    // Si el catálogo no llegó la primera vez, se vuelve a pedir al abrir un chat.
    if (this.atencion && !this.motivosCierre.length) this.cargarCatalogos();
  }

  /** Mobile: de vuelta a la lista. */
  volver(): void {
    this.seleccion = null;
    this.reiniciarNotas();
    this.reiniciarAcciones();
  }

  /** El detalle cambió el dueño del chat abierto (tomar, soltar, pasar o un 409). */
  onDuenoCambiado(dueno: DuenoChat | null): void {
    const abierta = this.seleccion;
    if (!abierta) return;
    if (abierta.canal === "whatsapp") {
      this.seleccion = {
        ...abierta,
        dueno: dueno || undefined,
        origen: { ...abierta.origen, owner: dueno },
      };
      this.cargar(true);
      return;
    }
    // Redes: el detalle recarga la conversación si su `hilo` cambia de objeto y pisaría lo que se escribe.
    // Por eso se conserva el mismo objeto y solo se actualiza su dueño.
    const igual = (abierta.dueno?.email || "").toLowerCase() === (dueno?.email || "").toLowerCase();
    abierta.origen.owner = dueno;
    this.seleccion = { ...abierta, dueno: dueno || undefined };
    if (!igual) this.cargar(true);
  }

  // ─── Pestañas, filtro por asesor y estado ───

  cambiarVista(vista: VistaBandeja): void {
    if ((vista === "equipo" || vista === "informes") && !this.coordina) return;
    this.vista = vista;
    if (vista === "informes" && !this.informesVisto) {
      this.informesVisto = true;
      this.consultarInforme({}); // rango por defecto del servidor: los últimos 7 días
    }
    // Al entrar a Equipo se trae el catálogo al día (lo escrito en una tarjeta no se pisa: ver `sucio`).
    if (vista === "equipo" && this.esAdmin) this.cargarCatalogos();
  }

  /** Lee el informe (D-729). Un error 422 muestra el mensaje del servidor; lo anterior se conserva a la vista. */
  consultarInforme(filtros: FiltrosInformeAtencion): void {
    const seq = ++this.informeSeq;
    this.informeCargando = true;
    this.informeError = false;
    this.informeMensaje = "";
    this.atencionSrv
      .informe(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (seq !== this.informeSeq) return;
          this.informe = res;
          this.informeCargando = false;
          this.informeTruncado = false;
        },
        error: (err) => {
          if (seq !== this.informeSeq) return;
          this.informeCargando = false;
          this.informeError = true;
          const m = err?.status === 422 ? err?.error?.message : "";
          this.informeMensaje = typeof m === "string" ? m : "";
        },
      });
  }

  /** Pide todas las filas (`pagina=0`) y arma el CSV en el navegador. Nada se guarda en el servidor. */
  descargarInforme(filtros: FiltrosInformeAtencion): void {
    if (this.descargandoInforme) return;
    this.descargandoInforme = true;
    this.errorDescargaInforme = false;
    this.informeTruncado = false;
    this.atencionSrv
      .informe({ ...filtros, pagina: 0 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.descargandoInforme = false;
          this.informeTruncado = !!res.truncado;
          const csv = construirCsv(res.filas || [], {
            cabeceras: [
              "notificaciones.bandeja.informes.colCanal",
              "notificaciones.bandeja.informes.colNumero",
              "notificaciones.bandeja.informes.colContacto",
              "notificaciones.bandeja.informes.colAsesor",
              "notificaciones.bandeja.informes.colCola",
              "notificaciones.bandeja.informes.colEtiquetas",
              "notificaciones.bandeja.informes.colCreacion",
              "notificaciones.bandeja.informes.colUltimo",
              "notificaciones.bandeja.informes.colEstado",
              "notificaciones.bandeja.informes.colMotivo",
              "notificaciones.bandeja.informes.colCerroPor",
              "notificaciones.bandeja.informes.colDuracionMin",
              "notificaciones.bandeja.informes.colPrimeraSeg",
            ].map((k) => this.traducir(k)),
            abierto: this.traducir("notificaciones.bandeja.informes.estado.abierto"),
            cerrado: this.traducir("notificaciones.bandeja.informes.estado.cerrado"),
            sistema: this.traducir("notificaciones.bandeja.informes.sistema"),
            nombreCanal: (c) => CANAL_BANDEJA_LABEL[c as CanalBandeja] || c,
            nombreLinea: (id) => (this.lineasCola.find((l) => l.id === id) || { nombre: "" }).nombre || CANAL_BANDEJA_LABEL[String(id).replace(/^red_/, "") as CanalBandeja] || id,
          });
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `informe-atencion-${res.rango.desde}-${res.rango.hasta}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: () => {
          this.descargandoInforme = false;
          this.errorDescargaInforme = true;
        },
      });
  }

  elegirAsesor(asesor: string | null): void {
    this.asesor = asesor;
  }

  elegirCola(cola: string | null): void {
    this.cola = cola;
  }

  /** Desde la pestaña Equipo: filtra la lista por esa cola y vuelve a Chats. */
  verChatsDeCola(cola: string): void {
    this.cola = cola;
    this.asesor = null;
    this.vista = "chats";
  }

  /** Manda la lista completa de colas. Un 422 deja su mensaje en el editor, que sigue abierto. */
  guardarColas(lista: ColaAtencion[]): void {
    if (this.guardandoColas) return;
    this.guardandoColas = true;
    this.colasGuardadoOk = false;
    this.errorColas = "";
    this.atencionSrv
      .guardarColas(lista)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (guardadas) => {
          this.guardandoColas = false;
          // La respuesta del guardado ya trae la lista con sus ids: se usa de una vez, antes de cerrar el editor.
          if (Array.isArray(guardadas)) {
            const previas = new Map(this.colas.map((c) => [c.id, c.enHorario]));
            this.colas = guardadas.map((c) => normalizarCola({ ...c, enHorario: c.enHorario ?? previas.get(c.id) }));
            this.colasActivas = this.colas.filter((c) => c.activa).map((c) => ({
              id: c.id as string,
              nombre: c.nombre,
              activa: true,
              enHorario: c.enHorario,
            }));
            this.colasFirma = "";
          }
          this.colasGuardadoOk = true;
          // Refresco de fondo: trae el horario en vivo y los números.
          this.cargarColas();
          if (this.coordina) this.cargarResumen();
        },
        error: (err) => {
          this.guardandoColas = false;
          this.errorColas = err?.error?.message || this.traducir("notificaciones.bandeja.colas.errorGuardar");
        },
      });
  }

  /** El detalle pasó el chat abierto a una cola: se anota en el chat y se refresca la lista. */
  onColaCambiada(colaId: string): void {
    const abierta = this.seleccion;
    if (!abierta) return;
    if (abierta.canal === "whatsapp") {
      this.seleccion = { ...abierta, colaId, origen: { ...abierta.origen, colaId } };
    } else {
      // Redes: mismo objeto de `hilo` (ver `onDuenoCambiado`); solo se anota la cola.
      abierta.origen.colaId = colaId;
      this.seleccion = { ...abierta, colaId };
    }
    this.cargar(true);
  }

  /** Desde la pestaña Equipo: filtra la lista por ese asesor y vuelve a Chats. */
  verChatsDe(asesor: string): void {
    this.asesor = asesor;
    this.cola = null;
    this.vista = "chats";
  }

  cambiarEstado(estado: EstadoAsesor): void {
    if (this.cambiandoEstado || estado === this.estado) return;
    this.cambiandoEstado = true;
    this.errorEstado = false;
    this.atencionSrv
      .cambiarEstado(estado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nuevo) => {
          this.estado = nuevo;
          this.cambiandoEstado = false;
          if (this.coordina) this.cargarResumen();
        },
        error: () => {
          this.cambiandoEstado = false;
          this.errorEstado = true;
        },
      });
  }

  guardarAjustes(ajustes: AjustesAtencion): void {
    if (this.guardandoAjustes) return;
    this.guardandoAjustes = true;
    this.ajustesGuardados = false;
    this.errorAjustes = false;
    this.atencionSrv
      .guardarAjustes(ajustes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nuevos) => {
          this.guardandoAjustes = false;
          this.ajustesGuardados = true;
          if (this.resumen) this.resumen = { ...this.resumen, ajustes: nuevos || ajustes };
        },
        error: () => {
          this.guardandoAjustes = false;
          this.errorAjustes = true;
        },
      });
  }

  // ─── Cerrar con motivo, etiquetas y catálogos (D-728) ───

  /** Cierra el chat abierto con un motivo del catálogo; un 403/409/422 se muestra en la barra. */
  cerrarChat(motivo: string): void {
    const id = this.threadIdAbierto;
    if (!id || this.ocupadoCierre) return;
    this.ocupadoCierre = true;
    this.errorCierre = "";
    this.atencionSrv
      .cerrar(id, motivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.ocupadoCierre = false;
          this.aplicarAccion(id, res);
        },
        error: (err) => {
          if (this.threadIdAbierto !== id) return;
          this.ocupadoCierre = false;
          this.errorCierre = this.mensajeDe(err, "notificaciones.bandeja.cierre.errorCerrar");
        },
      });
  }

  /** Abre de nuevo el chat cerrado (no se asigna a nadie). */
  reabrirChat(): void {
    const id = this.threadIdAbierto;
    if (!id || this.ocupadoCierre) return;
    this.ocupadoCierre = true;
    this.errorCierre = "";
    this.atencionSrv
      .reabrir(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.ocupadoCierre = false;
          this.aplicarAccion(id, res);
        },
        error: (err) => {
          if (this.threadIdAbierto !== id) return;
          this.ocupadoCierre = false;
          this.errorCierre = this.mensajeDe(err, "notificaciones.bandeja.cierre.errorAbrir");
        },
      });
  }

  etiquetarChat(ids: string[]): void {
    const id = this.threadIdAbierto;
    if (!id || this.ocupadoEtiquetas) return;
    this.ocupadoEtiquetas = true;
    this.errorEtiquetas = "";
    this.atencionSrv
      .etiquetar(id, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.ocupadoEtiquetas = false;
          this.aplicarAccion(id, res);
        },
        error: (err) => {
          if (this.threadIdAbierto !== id) return;
          this.ocupadoEtiquetas = false;
          this.errorEtiquetas = this.mensajeDe(err, "notificaciones.bandeja.etiquetas.errorGuardar");
        },
      });
  }

  /**
   * Guarda un pedazo de los catálogos (solo el administrador). Un 422 deja su mensaje en la tarjeta que lo
   * envió y la tarjeta sigue abierta con lo escrito.
   */
  guardarCatalogos(clave: string, parcial: Partial<CatalogosAtencion>): void {
    if (this.guardandoCat) return;
    this.guardandoCat = clave;
    this.okCat = "";
    this.errorCatClave = "";
    this.errorCatMensaje = "";
    this.atencionSrv
      .guardarCatalogos(parcial)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nuevos) => {
          this.guardandoCat = "";
          this.okCat = clave;
          this.catalogosFirma = "";
          this.aplicarCatalogos(nuevos);
        },
        error: (err) => {
          this.guardandoCat = "";
          this.errorCatClave = clave;
          this.errorCatMensaje = this.mensajeDe(err, "notificaciones.bandeja.catalogos.errorGuardar");
        },
      });
  }

  /** El mensaje del servidor (422 en español) o el texto general. */
  private mensajeDe(err: any, claveGeneral: string): string {
    const m = err?.error?.message;
    return typeof m === "string" && m.trim() ? m : this.traducir(claveGeneral);
  }

  /** Lo que respondió el servidor se anota en el chat abierto y se refresca la lista (cerrado y etiquetas). */
  private aplicarAccion(threadId: string, res: AccionHilo): void {
    const abierta = this.seleccion;
    if (!abierta || abierta.threadId !== threadId) {
      this.cargar(true);
      return;
    }
    const cerrado = !!res.cierre;
    const motivoCierre = res.cierre?.motivo || undefined;
    const etiquetas = res.etiquetas;
    if (abierta.canal === "whatsapp") {
      this.seleccion = {
        ...abierta,
        cerrado,
        motivoCierre,
        etiquetas,
        dueno: res.owner || undefined,
        origen: { ...abierta.origen, cerrado, motivoCierre: motivoCierre || null, etiquetas, owner: res.owner },
      };
    } else {
      // Redes: mismo objeto de `hilo` (ver `onDuenoCambiado`); solo se anotan los datos nuevos.
      abierta.origen.cerrado = cerrado;
      abierta.origen.motivoCierre = motivoCierre || null;
      abierta.origen.etiquetas = etiquetas;
      abierta.origen.owner = res.owner;
      this.seleccion = { ...abierta, cerrado, motivoCierre, etiquetas, dueno: res.owner || undefined };
    }
    this.cargar(true);
  }

  /** «Usar» de la ayuda de Opttia: el chat abierto lo pone en su cuadro sin enviar (D-730). */
  usarSugerencia(texto: string): void {
    this.resultadoUso = null;
    this.textoSugerido = { texto, n: ++this.sugeridoN };
  }

  /** El cuadro del chat abierto dice qué pasó con la sugerencia (usada, bloqueado o cancelada). */
  alResultadoSugerido(estado: ResultadoUsoSugerencia): void {
    this.resultadoUso = { estado, n: ++this.sugeridoN };
  }

  private reiniciarAcciones(): void {
    this.textoSugerido = null;
    this.resultadoUso = null;
    this.ocupadoCierre = false;
    this.errorCierre = "";
    this.ocupadoEtiquetas = false;
    this.errorEtiquetas = "";
  }

  /** Catálogos, para todos. Un fallo conserva los anteriores; sin cambios se conservan los mismos arreglos. */
  private cargarCatalogos(): void {
    if (!this.atencion) return;
    this.atencionSrv
      .catalogos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (c) => {
          const firma = JSON.stringify(c);
          if (firma === this.catalogosFirma) return;
          this.catalogosFirma = firma;
          this.aplicarCatalogos(c);
        },
        error: () => undefined,
      });
  }

  private aplicarCatalogos(c: CatalogosAtencion): void {
    this.motivosCierre = c.motivosCierre;
    this.cierreAutoHoras = c.cierreAutoHoras;
    this.etiquetasCat = c.etiquetas;
    this.rapidos = c.rapidos;
  }

  // ─── Notas internas ───

  alternarNotas(): void {
    this.notasAbiertas = !this.notasAbiertas;
    if (this.notasAbiertas) this.cargarNotas(false);
  }

  @ViewChild(ChatNotasComponent) private cuadroNotas?: ChatNotasComponent;

  agregarNota(nota: { texto: string; menciones: string[] }): void {
    const id = this.threadIdAbierto;
    if (!id || this.notasGuardando) return;
    this.notasGuardando = true;
    this.errorNota = false;
    this.atencionSrv
      .agregarNota(id, nota.texto, nota.menciones)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (creada) => {
          // Si ya se abrió otro chat, no se pisa su estado.
          if (this.threadIdAbierto !== id) return;
          this.notasGuardando = false;
          if (creada) this.notas = [...this.notas, creada];
          this.cuadroNotas?.limpiar();
        },
        error: () => {
          if (this.threadIdAbierto !== id) return;
          this.notasGuardando = false;
          this.errorNota = true;
        },
      });
  }

  reintentarNotas(): void {
    this.cargarNotas(false);
  }

  private reiniciarNotas(): void {
    this.notas = [];
    this.notasError = false;
    this.errorNota = false;
    this.notasGuardando = false;
    this.notasCargando = false;
    if (this.notasAbiertas && this.puedeVerNotas) this.cargarNotas(false);
  }

  /** En silencio (refresco) no muestra «Cargando…» ni borra lo que hay si falla. */
  private cargarNotas(enSilencio: boolean): void {
    const id = this.threadIdAbierto;
    if (!this.atencion || !id) return;
    if (!enSilencio) {
      this.notasCargando = true;
      this.notasError = false;
    }
    this.atencionSrv
      .hilo(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (h) => {
          if (this.threadIdAbierto !== id) return;
          this.notasCargando = false;
          if (!(enSilencio && this.notasGuardando)) this.notas = h.notas || [];
        },
        error: () => {
          if (this.threadIdAbierto !== id) return;
          this.notasCargando = false;
          if (!enSilencio) this.notasError = true;
        },
      });
  }

  // ─── Atención: quién soy, el equipo y el resumen ───

  /** Pide quién es el usuario y su equipo. Un fallo deja la bandeja como estaba (sin atención). */
  private cargarAtencion(): void {
    this.atencionSrv
      .yo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (yo) => {
          this.atencion = true;
          this.coordina = !!yo.coordina;
          this.esAdmin = !!yo.esAdmin;
          this.estado = yo.estado === "ausente" ? "ausente" : "disponible";
          this.miNombre = yo.nombre || "";
          this.cargarCatalogos();
          this.atencionSrv
            .equipo()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (equipo) => {
                this.asesores = equipo;
                this.equipo = equipo.map((m) => ({ email: m.email, nombre: m.nombre, rol: m.rol }));
              },
              error: () => undefined,
            });
          if (this.coordina) this.cargarResumen();
          this.cargarColas();
        },
        error: () => undefined,
      });
  }

  /**
   * Colas, para todos. Un fallo conserva las anteriores; si la lista no cambió se conserva el mismo
   * arreglo, para no recrear lo que reciben los componentes hijos.
   */
  private cargarColas(): void {
    if (!this.atencion) return;
    this.atencionSrv
      .colas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const firma = JSON.stringify(res);
          if (firma === this.colasFirma) return;
          this.colasFirma = firma;
          this.colas = res.colas.map((c) => normalizarCola(c));
          this.colasActivas = this.colas.filter((c) => c.activa).map((c) => ({
            id: c.id as string,
            nombre: c.nombre,
            activa: true,
            enHorario: c.enHorario,
          }));
          this.lineasCola = res.lineas;
          // Si la cola filtrada ya no existe, el filtro se suelta.
          if (this.cola && !this.colas.some((c) => c.id === this.cola)) this.cola = null;
        },
        error: () => undefined,
      });
  }

  private traducir(clave: string): string {
    return this.translate.instant(clave);
  }

  /** Quien coordina: cifras y carga por asesor. Un fallo conserva las cifras anteriores. */
  private cargarResumen(): void {
    if (!this.atencion || !this.coordina) return;
    if (!this.resumen) this.resumenCargando = true;
    this.atencionSrv
      .resumen()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.resumen = r;
          this.resumenCargando = false;
          this.resumenError = false;
        },
        error: () => {
          this.resumenCargando = false;
          this.resumenError = true;
        },
      });
  }

  reintentarResumen(): void {
    this.cargarResumen();
  }

  verMas(): void {
    if (!this.carga || this.cargandoMas) return;
    this.cargandoMas = true;
    this.cargaSub?.unsubscribe();
    this.eventosEnCarga = [];
    this.cargaSub = this.bandeja
      .verMasWhatsapp(this.carga)
      .pipe(takeUntil(this.destroy$))
      .subscribe((carga) => {
        // La página se sumó a la carga de cuando se pidió: los eventos de mientras tanto se vuelven a aplicar.
        this.carga = this.conEventosEnCarga(carga);
        this.cargandoMas = false;
        this.actualizarSeleccion();
        // Llegaron eventos en vivo mientras se traía la página: se confirma con un refresco en silencio.
        this.seguirConfirmacionPendiente();
      });
  }

  reintentar(): void {
    this.cargar(false);
  }

  /** Líneas y equipo del comercio. Si falla, la bandeja sigue sin selector de número. */
  private cargarLineas(): void {
    this.lineasService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.lineas = res.lines;
          if (!this.asesores.length) this.equipo = res.equipo;
        },
        error: () => undefined,
      });
  }

  /**
   * Canales del menú «Mensajes» del usuario, y de ellos los conectados. La lista de conexiones se pide una
   * sola vez; si no llega, se consultan todos los autorizados (un canal sin cuenta devuelve vacío).
   */
  private elegirCanalesYCargar(): void {
    const autorizados = this.canalesAutorizados();
    const redes = autorizados.filter((c) => c !== "whatsapp");
    if (!redes.length) {
      this.canales = autorizados;
      this.cargarLineasSiHayWhatsapp();
      this.cargar(false);
      return;
    }
    this.meta
      .obtenerConexiones()
      .pipe(takeUntil(this.destroy$))
      .subscribe((conexiones) => {
        this.conexiones = conexiones;
        this.canales = autorizados.filter(
          (c) => c === "whatsapp" || !conexiones || (conexiones[c]?.estado ?? "sin_conectar") !== "sin_conectar",
        );
        this.cargarLineasSiHayWhatsapp();
        this.cargar(false);
      });
  }

  /** Las líneas son datos del canal WhatsApp: solo se piden si el usuario lo tiene en su menú. */
  private cargarLineasSiHayWhatsapp(): void {
    if (this.multiNumero && this.canales.includes("whatsapp")) this.cargarLineas();
  }

  /** Los buzones que el menú de este usuario ofrece hoy, en el orden de los filtros. */
  private canalesAutorizados(): CanalBandeja[] {
    const grupo = this.nav.getMenuItems().find((i) => i.id === "mensajes");
    const rutas = new Set((grupo?.children || []).map((h) => NavService.normalizarRuta(h.path)));
    return CANALES_BANDEJA.filter((c) => rutas.has(RUTA_MENU_CANAL[c]));
  }

  /**
   * Trae la lista. En silencio (refresco) no muestra «Cargando…», no pisa lo que ya hay si todo falla y,
   * si un canal falla, conserva sus chats de la carga anterior en vez de hacerlos desaparecer.
   */
  private cargar(enSilencio: boolean, soloLista = false): void {
    // «Ver más» en curso: no se le quita la carga de las manos; el siguiente refresco lo recoge.
    if (enSilencio && this.cargandoMas) return;
    if (!enSilencio) this.cargando = true;
    this.cargaSub?.unsubscribe();
    if (!soloLista) this.ultimoRefrescoCompleto = Date.now();
    // Esta carga ya trae lo que un refresco en vivo pendiente iba a pedir, y lo que ya se aplicó en memoria.
    this.recargaEnVivoPendiente = false;
    this.eventosEnCarga = [];
    const previa = this.carga;
    this.cargaSub = this.bandeja
      .cargar(this.canales, previa?.paginasWhatsapp ?? 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe((nueva) => {
        const lista = enSilencio && previa ? this.conservarCaidos(previa, nueva) : nueva;
        this.carga = this.conEventosEnCarga(lista);
        this.cargando = false;
        this.actualizarSeleccion();
        // Llegaron eventos mientras esta carga iba en camino: otra confirmación, en su turno.
        this.seguirConfirmacionPendiente();
      });
    if (soloLista) return;
    // El resumen y las notas se refrescan junto con la lista.
    this.cargarResumen();
    this.cargarColas();
    if (this.notasAbiertas && enSilencio) this.cargarNotas(true);
  }

  private conservarCaidos(previa: CargaBandeja, nueva: CargaBandeja): CargaBandeja {
    if (!nueva.canalesCaidos.length) return nueva;
    const caidosPrevios = previa.conversaciones.filter((c) => nueva.canalesCaidos.includes(c.canal));
    const whatsappCaido = nueva.canalesCaidos.includes("whatsapp");
    return {
      ...nueva,
      conversaciones: mezclar([nueva.conversaciones, caidosPrevios]),
      paginasWhatsapp: whatsappCaido ? previa.paginasWhatsapp : nueva.paginasWhatsapp,
      hayMasWhatsapp: whatsappCaido ? previa.hayMasWhatsapp : nueva.hayMasWhatsapp,
    };
  }

  /**
   * Tras refrescar, el chat abierto sigue abierto. En WhatsApp se toma su dato nuevo (por ejemplo, otro
   * dueño); en redes se deja el mismo objeto, porque el detalle recarga la conversación cada vez que su
   * `hilo` cambia y pisaría lo que el asesor está escribiendo.
   */
  private actualizarSeleccion(): void {
    const abierta = this.seleccion;
    if (!abierta) return;
    const nueva = this.conversaciones.find((c) => c.clave === abierta.clave);
    if (!nueva) return;
    if (abierta.canal === "whatsapp") {
      this.seleccion = nueva;
      return;
    }
    // Redes: mismo objeto de `hilo`; solo se pone al día el dueño (el detalle lo recibe como entrada).
    const antes = (abierta.dueno?.email || "").toLowerCase();
    const ahora = (nueva.dueno?.email || "").toLowerCase();
    if (antes !== ahora) {
      abierta.origen.owner = nueva.dueno || null;
      this.seleccion = { ...abierta, dueno: nueva.dueno };
    }
    // D-728: cerrado, motivo y etiquetas también se ponen al día sin cambiar el objeto de `hilo`.
    const actual = this.seleccion as typeof abierta;
    const etNuevas = (nueva.etiquetas || []).join("|");
    if (!!actual.cerrado !== !!nueva.cerrado || (actual.motivoCierre || "") !== (nueva.motivoCierre || "") || (actual.etiquetas || []).join("|") !== etNuevas) {
      abierta.origen.cerrado = !!nueva.cerrado;
      abierta.origen.motivoCierre = nueva.motivoCierre || null;
      abierta.origen.etiquetas = nueva.etiquetas || [];
      this.seleccion = { ...actual, cerrado: nueva.cerrado, motivoCierre: nueva.motivoCierre, etiquetas: nueva.etiquetas };
    }
  }

  private leerUsuario(): Record<string, unknown> {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u && typeof u === "object" ? u : {};
    } catch {
      return {};
    }
  }
}

/** Lo mínimo de una fila para saber si un evento en vivo es suyo. */
function chatEnVivoDe(c: ConversacionResumen): ChatAbiertoEnVivo {
  return c.canal === "whatsapp"
    ? { canal: "whatsapp", hash: c.origen.phoneHash, lineId: c.lineId || null, threadId: c.threadId || null }
    : { canal: c.canal, hash: c.origen.identidadHash, threadId: c.threadId || null };
}

/**
 * Aplica un evento en vivo a la fila que ya está en la lista y la reordena por hora, como la carga. No agrega
 * filas: las nuevas llegan con la confirmación. Si el evento coincide con más de una fila (el mismo cliente en
 * dos números sin línea en el evento), no toca nada.
 *
 * `completo` dice si con esto la fila ya quedó como la dejaría el servidor; si no (fila nueva, varias
 * coincidencias, sin texto, estado o etiquetas que el evento no trae completos), hay que confirmar por HTTP.
 * Se puede volver a aplicar el mismo evento sin efecto doble (la insignia solo sube con un mensaje más nuevo).
 */
function aplicarEventoEnVivo(
  carga: CargaBandeja,
  e: EventoChatEnVivo,
  claveAbierta: string | null,
): { carga: CargaBandeja; completo: boolean } {
  const indices: number[] = [];
  carga.conversaciones.forEach((c, i) => {
    if (eventoEsDelChat(e, chatEnVivoDe(c))) indices.push(i);
  });
  // «nota» no cambia nada de la lista.
  const sinLista = e.motivo === "nota" && !e.puestaAlDia;
  if (indices.length !== 1) return { carga, completo: sinLista };
  const actual = carga.conversaciones[indices[0]];
  const abierta = actual.clave === claveAbierta;
  const cambios: Partial<ConversacionBaseEnVivo> = {};
  let completo = !e.puestaAlDia;
  const hora = e.hora && Number.isFinite(Date.parse(e.hora)) ? e.hora : null;
  const horaMs = hora ? Date.parse(hora) : 0;
  const actualMs = Date.parse(actual.ultimoEn) || 0;

  if (e.motivo === "entrante" || e.motivo === "saliente") {
    // Sin texto (la puesta al día no lo trae) la fila no se mueve: la confirmación la ordena con su texto.
    if (hora && e.textoCorto !== null && horaMs >= actualMs) {
      cambios.ultimoEn = hora;
      cambios.ultimaDireccion = e.motivo === "entrante" ? "inbound" : "outbound";
      cambios.resumen = e.textoCorto;
    } else if (!hora || e.textoCorto === null) {
      // Con hora vieja (la fila ya trae algo más nuevo) no hay nada que confirmar.
      completo = false;
    }
    if (e.motivo === "entrante" && !abierta && e.noLeidos === null && actual.canal === "whatsapp") {
      // WhatsApp no manda su cuenta de no leídos: se suma uno (solo con un mensaje más nuevo que la fila) y
      // la confirmación trae la cifra del servidor.
      if (hora && e.textoCorto !== null && horaMs > actualMs) cambios.sinLeer = (actual.sinLeer || 0) + 1;
      completo = false;
    }
  } else if (e.motivo === "dueno") {
    cambios.dueno = e.asesor ? { email: e.asesor.email, nombre: e.asesor.nombre || e.asesor.email } : undefined;
    // El reparto también puede cambiar la cola, que el evento no trae.
    completo = false;
  } else if (e.motivo !== "nota") {
    // estado (cierre o reapertura), leido, etiquetas o un motivo desconocido: lo que el evento trae se aplica,
    // el resto (motivo del cierre, etiquetas, no leídos de WhatsApp) llega con la confirmación.
    completo = false;
  }
  if (e.estado === "cerrado" || e.estado === "abierto") {
    const cerrado = e.estado === "cerrado";
    if (!!actual.cerrado !== cerrado) {
      cambios.cerrado = cerrado;
      if (!cerrado) cambios.motivoCierre = undefined;
      // Cerrar deja el chat sin dueño.
      if (cerrado && e.motivo === "estado") cambios.dueno = undefined;
    }
  }
  // El chat abierto no muestra insignia: el detalle lo marca como leído.
  if (e.noLeidos !== null && !abierta) cambios.sinLeer = e.noLeidos;
  if (!Object.keys(cambios).length) return { carga, completo };

  const nueva = { ...actual, ...cambios } as ConversacionResumen;
  if ("dueno" in cambios || "cerrado" in cambios) {
    // El detalle lee el dueño y el cierre del hilo original: se pone al día una copia (nunca el mismo objeto).
    const dueno = nueva.dueno || null;
    const cerrado = !!nueva.cerrado;
    if (nueva.canal === "whatsapp") {
      nueva.origen = { ...nueva.origen, owner: dueno, cerrado, motivoCierre: cerrado ? nueva.origen.motivoCierre : null };
    } else {
      // Mismo cambio, otro tipo de hilo (redes).
      nueva.origen = { ...nueva.origen, owner: dueno, cerrado, motivoCierre: cerrado ? nueva.origen.motivoCierre : null };
    }
  }
  const lista = carga.conversaciones.slice();
  lista[indices[0]] = nueva;
  return { carga: { ...carga, conversaciones: mezclar([lista]) }, completo };
}

/** Campos de la fila que un evento en vivo puede cambiar. */
interface ConversacionBaseEnVivo {
  ultimoEn: string;
  ultimaDireccion: "inbound" | "outbound";
  resumen: string;
  sinLeer: number;
  dueno: DuenoChat | undefined;
  cerrado: boolean;
  motivoCierre: string | undefined;
}
