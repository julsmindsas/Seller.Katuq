import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ChatNotasComponent } from "../../../inbox-core/chat-notas/chat-notas.component";
import { TranslateService } from "@ngx-translate/core";
import { Subject, Subscription, interval } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { CompanyFeaturesService } from "../../../../../shared/services/company-features.service";
import { LoaderService } from "../../../../../shared/services/loader.service";
import { AtencionService } from "../../../../../shared/services/messaging/atencion.service";
import { MessagingLinesService } from "../../../../../shared/services/messaging/messaging-lines.service";
import {
  AjustesAtencion,
  ColaAtencion,
  ColaBasica,
  DuenoChat,
  EstadoAsesor,
  LineaDeCola,
  MessagingLine,
  MiembroAtencion,
  MiembroEquipo,
  NotaChat,
  ResumenAtencion,
} from "../../../../../shared/services/messaging/messaging.models";
import { NavService } from "../../../../../shared/services/nav.service";
import { esFamiliaAdministrador } from "../../../../../shared/utils/roles";
import { MetaInboxService } from "../../../meta-inbox/meta-inbox.service";
import { MetaConexiones, MetaHilo } from "../../../meta-inbox/models/meta-thread.model";
import { WhatsappThread } from "../../../whatsapp-inbox/models/whatsapp-thread.model";
import { BandejaService } from "../../bandeja.service";
import { CANALES_BANDEJA, RUTA_MENU_CANAL } from "../../bandeja.canales";
import {
  CanalBandeja,
  CargaBandeja,
  ConversacionResumen,
} from "../../bandeja.models";
import { mezclar } from "../../bandeja.util";
import { normalizarCola } from "../../bandeja.colas";

/** Vistas de la bandeja: la lista de chats o, para quien coordina, la pestaña Equipo. */
export type VistaBandeja = "chats" | "equipo";

/** Cada cuánto se vuelve a leer la lista: el mismo intervalo de la lista del buzón de WhatsApp. */
const REFRESCO_MS = 10000;

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

  resumen: ResumenAtencion | null = null;
  resumenCargando = false;
  resumenError = false;
  guardandoAjustes = false;
  ajustesGuardados = false;
  errorAjustes = false;

  // Notas internas del chat abierto
  notasAbiertas = false;
  notas: NotaChat[] = [];
  notasCargando = false;
  notasError = false;
  notasGuardando = false;
  errorNota = false;

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
    features: CompanyFeaturesService,
  ) {
    this.multiNumero = features.isEnabled("whatsappMultiNumero");
    const usuario = this.leerUsuario();
    this.esAdministrador = esFamiliaAdministrador(usuario["rol"]);
    this.miEmail = String(usuario["email"] || "");
  }

  ngOnInit(): void {
    this.loader.suppressGlobalLoader();
    this.cargarAtencion();
    this.elegirCanalesYCargar();
    this.refrescoSub = interval(REFRESCO_MS).subscribe(() => {
      // Con la pestaña oculta no se pollea (D-117); al volver, el siguiente tick refresca.
      if (document.hidden || this.cargando || this.cargandoMas) return;
      this.cargar(true);
    });
  }

  ngOnDestroy(): void {
    this.loader.releaseGlobalLoader();
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

  get puedeVerNotas(): boolean {
    return this.atencion && !!this.threadIdAbierto;
  }

  get dueno(): DuenoChat | null {
    return this.seleccion?.dueno || null;
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
    if (conversacion.canal === "whatsapp" && (conversacion.sinLeer || 0) > 0) {
      conversacion.sinLeer = 0;
      conversacion.origen.unreadCount = 0;
    }
    this.seleccion = conversacion;
    this.reiniciarNotas();
  }

  /** Mobile: de vuelta a la lista. */
  volver(): void {
    this.seleccion = null;
    this.reiniciarNotas();
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
    if (vista === "equipo" && !this.coordina) return;
    this.vista = vista;
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
    this.cargaSub = this.bandeja
      .verMasWhatsapp(this.carga)
      .pipe(takeUntil(this.destroy$))
      .subscribe((carga) => {
        this.carga = carga;
        this.cargandoMas = false;
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
  private cargar(enSilencio: boolean): void {
    // «Ver más» en curso: no se le quita la carga de las manos; el siguiente refresco lo recoge.
    if (enSilencio && this.cargandoMas) return;
    if (!enSilencio) this.cargando = true;
    this.cargaSub?.unsubscribe();
    const previa = this.carga;
    this.cargaSub = this.bandeja
      .cargar(this.canales, previa?.paginasWhatsapp ?? 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe((nueva) => {
        this.carga = enSilencio && previa ? this.conservarCaidos(previa, nueva) : nueva;
        this.cargando = false;
        this.actualizarSeleccion();
      });
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
