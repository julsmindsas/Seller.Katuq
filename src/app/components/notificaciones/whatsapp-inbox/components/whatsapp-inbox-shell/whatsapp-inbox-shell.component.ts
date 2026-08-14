import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";

/**
 * Shell del inbox de WhatsApp — layout Master-Detail responsive (spec 009 UI).
 *
 * Desktop (>=1024px): lista (35%) + detalle (65%).
 * Mobile (<1024px):  solo lista, o solo detalle si hay `selectedPhoneHash`.
 *
 * El componente mantiene el estado de selección y lo propaga a la lista y al
 * detalle por @Input/@Output, sin tocar el `WhatsappInboxService` directamente.
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
  ) {}

  ngOnInit(): void {
    // Deep-link: `/whatsapp-inbox/inbox/:phoneHash`.
    this.route.paramMap.subscribe((params) => {
      const hash = params.get("phoneHash");
      if (hash) {
        this.selectedPhoneHash = hash;
      }
    });
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

  onThreadSelected(phoneHash: string): void {
    this.selectedPhoneHash = phoneHash;
  }

  setVista(vista: "conversaciones" | "pedidos"): void {
    this.vista = vista;
  }

  /** Mobile: volver al listado cuando el usuario cierra el detalle. */
  onBackToList(): void {
    this.selectedPhoneHash = null;
  }
}
