import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject, Subscription, interval } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { CompanyFeaturesService } from "../../../../../shared/services/company-features.service";
import { LoaderService } from "../../../../../shared/services/loader.service";
import { MessagingLinesService } from "../../../../../shared/services/messaging/messaging-lines.service";
import {
  DuenoChat,
  MessagingLine,
  MiembroEquipo,
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

  private conexiones: MetaConexiones | null = null;
  private refrescoSub?: Subscription;
  private cargaSub?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly bandeja: BandejaService,
    private readonly meta: MetaInboxService,
    private readonly nav: NavService,
    private readonly lineasService: MessagingLinesService,
    private readonly loader: LoaderService,
    features: CompanyFeaturesService,
  ) {
    this.multiNumero = features.isEnabled("whatsappMultiNumero");
    const usuario = this.leerUsuario();
    this.esAdministrador = esFamiliaAdministrador(usuario["rol"]);
    this.miEmail = String(usuario["email"] || "");
  }

  ngOnInit(): void {
    this.loader.suppressGlobalLoader();
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
  }

  /** Mobile: de vuelta a la lista. */
  volver(): void {
    this.seleccion = null;
  }

  /** El detalle de WhatsApp cambió el dueño del chat abierto (tomar, soltar, pasar o un 409). */
  onDuenoCambiado(dueno: DuenoChat | null): void {
    const abierta = this.seleccion;
    if (abierta?.canal !== "whatsapp") return;
    this.seleccion = {
      ...abierta,
      dueno: dueno || undefined,
      origen: { ...abierta.origen, owner: dueno },
    };
    this.cargar(true);
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
          this.equipo = res.equipo;
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
    if (!abierta || abierta.canal !== "whatsapp") return;
    const nueva = this.conversaciones.find((c) => c.clave === abierta.clave);
    if (nueva) this.seleccion = nueva;
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
