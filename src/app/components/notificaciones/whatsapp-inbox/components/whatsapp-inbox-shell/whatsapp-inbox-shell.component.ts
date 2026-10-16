import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { CompanyFeaturesService } from "../../../../../shared/services/company-features.service";
import { LoaderService } from "../../../../../shared/services/loader.service";
import { MessagingLinesService } from "../../../../../shared/services/messaging/messaging-lines.service";
import {
  DuenoChat,
  MessagingLine,
  MiembroEquipo,
} from "../../../../../shared/services/messaging/messaging.models";
import { esFamiliaAdministrador } from "../../../../../shared/utils/roles";
import { WhatsappThread, claveChat } from "../../models/whatsapp-thread.model";

/**
 * Shell del inbox de WhatsApp — layout Master-Detail responsive (spec 009 UI).
 *
 * Desktop (>=1024px): lista (35%) + detalle (65%).
 * Mobile (<1024px):  solo lista, o solo detalle si hay `selectedPhoneHash`.
 *
 * El componente mantiene el estado de selección y lo propaga a la lista y al
 * detalle por @Input/@Output, sin tocar el `WhatsappInboxService` directamente.
 *
 * [D-437] Con la bandera `whatsappMultiNumero` carga las líneas del comercio
 * (filtro de la lista) y el equipo (para pasar un chat). Un chat se identifica
 * por número + cliente: el mismo cliente en dos números son dos chats.
 *
 * La pantalla muestra su propio "Cargando…" y refresca cada pocos segundos,
 * así que suprime el overlay global de carga mientras está montada (D-072).
 *
 * Layout hack: el wrapper `.page-body` global tiene min-height fijo (~682px)
 * que genera overflow cuando montamos un componente full-height. Mientras el
 * shell vive, neutralizamos ese min-height; al destruirse, revertimos.
 */
@Component({
  selector: "app-whatsapp-inbox-shell",
  templateUrl: "./whatsapp-inbox-shell.component.html",
  styleUrls: ["./whatsapp-inbox-shell.component.scss"],
})
export class WhatsappInboxShellComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  /** Hash del teléfono del hilo seleccionado (deep-link o click en lista). */
  selectedPhoneHash: string | null = null;
  /** [D-437] Línea del chat abierto (`null` = número compartido de Katuq). */
  selectedLineId: string | null = null;
  /** [D-437] Datos del chat abierto que trae la lista (línea y dueño). */
  seleccion: WhatsappThread | null = null;

  /** [D-437] Varios números por comercio encendido para la empresa. */
  readonly multiNumero: boolean;
  readonly esAdministrador: boolean;
  readonly miEmail: string;
  lineas: MessagingLine[] = [];
  equipo: MiembroEquipo[] = [];

  /**
   * Vista activa del panel izquierdo: los hilos de siempre o los pedidos que
   * lleva el bot. El detalle de la derecha es el mismo en ambas — cambiar de
   * pestaña no pierde la conversación abierta.
   */
  vista: "conversaciones" | "pedidos" = "conversaciones";

  private pageBodyEl: HTMLElement | null = null;
  private pageBodyOriginal: { minHeight: string; height: string } | null = null;
  private footerEl: HTMLElement | null = null;
  private footerOriginalDisplay: string = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly host: ElementRef<HTMLElement>,
    private readonly loader: LoaderService,
    private readonly lineasService: MessagingLinesService,
    features: CompanyFeaturesService,
  ) {
    this.multiNumero = features.isEnabled("whatsappMultiNumero");
    const usuario = this.leerUsuario();
    this.esAdministrador = esFamiliaAdministrador(usuario["rol"]);
    this.miEmail = String(usuario["email"] || "");
  }

  ngOnInit(): void {
    this.loader.suppressGlobalLoader();
    // Deep-link: `/whatsapp-inbox/inbox/:phoneHash?lineId=`.
    this.route.paramMap.subscribe((params) => {
      const hash = params.get("phoneHash");
      if (hash) {
        this.selectedPhoneHash = hash;
        this.selectedLineId = this.route.snapshot.queryParamMap.get("lineId") || null;
        this.seleccion = null;
      }
    });
    if (this.multiNumero) this.cargarLineas();
  }

  /** Líneas y equipo del comercio. Si falla, el buzón sigue sin filtro por número. */
  private cargarLineas(): void {
    this.lineasService.listar().subscribe({
      next: (res) => {
        this.lineas = res.lines;
        this.equipo = res.equipo;
      },
      error: () => undefined,
    });
  }

  private leerUsuario(): Record<string, unknown> {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u && typeof u === "object" ? u : {};
    } catch {
      return {};
    }
  }

  ngAfterViewInit(): void {
    // Neutralizar min-height del .page-body global mientras el shell está activo.
    // El layout de Katuq inyecta `.page-body { min-height: calc(100vh - 2px) !important }`
    // vía ViewEncapsulation; para ganarle hay que usar setProperty con !important
    // (la asignación simple `el.style.minHeight = "0"` pierde frente al !important).
    let el: HTMLElement | null = this.host.nativeElement.parentElement;
    while (el && !el.classList.contains("page-body")) {
      el = el.parentElement;
    }
    if (el) {
      this.pageBodyEl = el;
      this.pageBodyOriginal = {
        minHeight: el.style.minHeight,
        height: el.style.height,
      };
      el.style.setProperty("min-height", "0", "important");
      el.style.setProperty("height", "auto", "important");
    }

    // Ocultar footer de Katuq mientras el visor está activo (libera ~60px de espacio).
    const footer = document.querySelector("footer");
    if (footer instanceof HTMLElement) {
      this.footerEl = footer;
      this.footerOriginalDisplay = footer.style.display;
      footer.style.setProperty("display", "none", "important");
    }
  }

  ngOnDestroy(): void {
    this.loader.releaseGlobalLoader();
    if (this.pageBodyEl) {
      this.pageBodyEl.style.removeProperty("min-height");
      this.pageBodyEl.style.removeProperty("height");
      if (this.pageBodyOriginal?.minHeight) {
        this.pageBodyEl.style.minHeight = this.pageBodyOriginal.minHeight;
      }
      if (this.pageBodyOriginal?.height) {
        this.pageBodyEl.style.height = this.pageBodyOriginal.height;
      }
    }
    if (this.footerEl) {
      this.footerEl.style.removeProperty("display");
      if (this.footerOriginalDisplay) {
        this.footerEl.style.display = this.footerOriginalDisplay;
      }
    }
  }

  onThreadSelected(thread: WhatsappThread): void {
    this.selectedPhoneHash = thread.phoneHash;
    this.selectedLineId = thread.line?.id || null;
    this.seleccion = thread;
  }

  /** Vista "Pedidos": las sesiones del bot son del número compartido. */
  onSesionSelected(phoneHash: string): void {
    this.selectedPhoneHash = phoneHash;
    this.selectedLineId = null;
    this.seleccion = null;
  }

  /** La lista se refrescó y trae datos nuevos del chat abierto (por ejemplo, otro dueño). */
  onSeleccionRefrescada(thread: WhatsappThread): void {
    if (this.claveSeleccion === claveChat(thread.phoneHash, thread.line?.id)) {
      this.seleccion = thread;
    }
  }

  /** El detalle cambió el dueño del chat abierto (tomar, soltar, pasar o un 409). */
  onDuenoCambiado(owner: DuenoChat | null): void {
    if (this.seleccion) this.seleccion = { ...this.seleccion, owner };
  }

  get claveSeleccion(): string | null {
    return this.selectedPhoneHash ? claveChat(this.selectedPhoneHash, this.selectedLineId) : null;
  }

  setVista(vista: "conversaciones" | "pedidos"): void {
    this.vista = vista;
  }

  /** Mobile: volver al listado cuando el usuario cierra el detalle. */
  onBackToList(): void {
    this.selectedPhoneHash = null;
    this.selectedLineId = null;
    this.seleccion = null;
  }
}
