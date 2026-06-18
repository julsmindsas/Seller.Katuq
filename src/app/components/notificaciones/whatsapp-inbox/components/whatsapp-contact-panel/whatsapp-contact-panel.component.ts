import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { forkJoin } from "rxjs";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import {
  ContactProfile,
  Order,
} from "../../models/whatsapp-thread.model";

/**
 * Panel lateral de contacto (009.5.1 — demo).
 *
 * 3 secciones colapsables (HTML <details> nativo, sin PrimeNG):
 *   1) Identidad.
 *   2) Historial de pedidos.
 *   3) Lead CRM (con rating si aún no hay lead).
 *
 * Banner amarillo arriba: "Demo — datos de ejemplo".
 */
@Component({
  selector: "app-whatsapp-contact-panel",
  templateUrl: "./whatsapp-contact-panel.component.html",
  styleUrls: ["./whatsapp-contact-panel.component.scss"],
})
export class WhatsappContactPanelComponent implements OnChanges {
  @Input() phoneHash: string | null = null;

  profile: ContactProfile | null = null;
  orders: Order[] = [];
  loading = false;

  /**
   * Rating local — refleja `lead.score` o `ratingDraft.score`. Si el operador
   * hace click en una estrella, se actualiza optimísticamente y se llama al
   * mock `rateContact`.
   */
  ratingScore = 0;
  ratingHover = 0;

  constructor(private readonly inbox: WhatsappInboxService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["phoneHash"]) {
      this.loadAll();
    }
  }

  /** Nombre principal a mostrar en la cabecera de identidad. */
  get displayName(): string {
    if (!this.profile) {
      return "";
    }
    return (
      this.profile.clienteNombre ||
      this.profile.profileName ||
      "Contacto sin nombre"
    );
  }

  /** Iniciales para el avatar grande. */
  get initials(): string {
    const name = this.displayName;
    if (!name) {
      return "?";
    }
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }

  /** Estado de la calificación: si tiene lead o ratingDraft o nada. */
  get hasLead(): boolean {
    return !!this.profile?.lead;
  }

  get hasRatingDraft(): boolean {
    return !!this.profile?.ratingDraft && !this.hasLead;
  }

  /** Lista limitada a 10 pedidos. */
  get visibleOrders(): Order[] {
    return this.orders.slice(0, 10);
  }

  /** Colores chip por estado (ej: confirmado, despachado, cancelado). */
  estadoChipClass(estado: string): string {
    const e = (estado || "").toLowerCase();
    if (e.includes("cancel") || e.includes("rechaz")) {
      return "is-danger";
    }
    if (e.includes("despach") || e.includes("entreg")) {
      return "is-success";
    }
    if (e.includes("confirm") || e.includes("prepar")) {
      return "is-info";
    }
    return "is-neutral";
  }

  onHoverStar(score: number): void {
    this.ratingHover = score;
  }

  onLeaveStars(): void {
    this.ratingHover = 0;
  }

  onRate(score: number): void {
    if (!this.phoneHash) {
      return;
    }
    this.ratingScore = score;
    this.inbox.rateContact(this.phoneHash, score).subscribe({
      next: () => {
        // Actualiza el ratingDraft local para que la UI sea consistente al
        // colapsar/expandir la sección.
        if (this.profile) {
          this.profile = {
            ...this.profile,
            ratingDraft: { score, updatedAt: new Date().toISOString() },
          };
        }
      },
      error: () => undefined,
    });
  }

  trackByOrder(_: number, order: Order): string {
    return order.orderId;
  }

  private loadAll(): void {
    if (!this.phoneHash) {
      this.profile = null;
      this.orders = [];
      this.ratingScore = 0;
      return;
    }
    this.loading = true;
    const hash = this.phoneHash;
    forkJoin({
      profile: this.inbox.getContactProfile(hash),
      orders: this.inbox.getContactOrders(hash),
    }).subscribe({
      next: ({ profile, orders }) => {
        this.profile = profile;
        this.orders = orders;
        this.ratingScore =
          profile.lead?.score ?? profile.ratingDraft?.score ?? 0;
        this.loading = false;
      },
      error: () => {
        this.profile = null;
        this.orders = [];
        this.ratingScore = 0;
        this.loading = false;
      },
    });
  }
}
