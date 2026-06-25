import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { forkJoin } from "rxjs";
import { ToastrService } from "ngx-toastr";

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
  savingToCrm = false;

  constructor(
    private readonly inbox: WhatsappInboxService,
    private readonly toastr: ToastrService,
  ) {}

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
      this.profile.phoneMasked ||
      "Contacto"
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

  /**
   * QueryParams para "Ver todos los pedidos": rango amplio (1 año atrás → hoy)
   * y filtra por nombre del cliente si está registrado. Si no hay nombre,
   * abre el módulo con el rango pero sin texto.
   */
  get allOrdersQueryParams(): Record<string, string> {
    const range = this.wideRangeParams();
    const name = this.profile?.clienteNombre;
    return name ? { buscar: name, ...range } : range;
  }

  /**
   * QueryParams para abrir un pedido específico: usa la fecha del pedido como
   * centro del rango (±2 días) para asegurar que entra en el filtro de fechas
   * del listado, sin abrir un rango innecesariamente amplio.
   */
  orderQueryParams(order: Order): Record<string, string> {
    const params: Record<string, string> = { buscar: order.nroPedido };
    if (order.fechaCreacion) {
      const d = new Date(order.fechaCreacion);
      if (!Number.isNaN(d.getTime())) {
        const ini = new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000);
        const fin = new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000);
        params["fechaInicial"] = this.toIsoDate(ini);
        params["fechaFinal"] = this.toIsoDate(fin);
      }
    }
    return params;
  }

  private wideRangeParams(): Record<string, string> {
    const today = new Date();
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);
    return {
      fechaInicial: this.toIsoDate(start),
      fechaFinal: this.toIsoDate(today),
    };
  }

  private toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

  /** Guarda el contacto WhatsApp como un nuevo Lead en el CRM de Katuq. */
  saveToCrm(): void {
    if (!this.profile || this.savingToCrm) return;
    this.savingToCrm = true;

    const phone = this.profile.phoneMasked
      ? this.profile.phoneMasked.replace(/\*/g, "")
      : "";
    // Construir un nombre razonable.
    const name =
      this.profile.clienteNombre ||
      this.profile.profileName ||
      `Contacto WhatsApp ${phone || ""}`.trim();

    const userStr = localStorage.getItem("user") || "{}";
    let token = "", company = "", nit = "", email = "", authCode = "";
    try {
      const u = JSON.parse(userStr);
      token = u.token || "";
      company = u.company || "";
      nit = u.nit || "";
      email = u.email || "";
      authCode = u.authorizationCode || "";
    } catch {}

    const headers: HeadersInit = {
      "Authorization": "Bearer " + token,
      "company": company,
      "user": nit,
      "usage-code": authCode,
      "email": email,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const body = {
      name,
      phone,
      phoneNormalized: phone,
      source: "whatsapp_inbox",
      sourceDetail: "Capturado desde el visor de Conversaciones WhatsApp",
      profileName: this.profile.profileName || null,
      ratingScore: this.ratingScore || null,
      whatsappPhoneHash: this.profile.phoneHash,
    };

    fetch("http://localhost:3300/v1/crm/leads/import", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((resp: any) => {
        this.savingToCrm = false;
        const leadId =
          resp?.data?.id || resp?.data?.leadId || resp?.id || "new-lead";
        this.toastr.success(
          "El contacto fue guardado como Lead en el CRM.",
          "Guardado en CRM",
        );
        // Reflejar el cambio localmente: ahora el panel debe mostrar "Lead".
        if (this.profile) {
          this.profile = {
            ...this.profile,
            lead: {
              leadId,
              name,
              stage: resp?.data?.stage || "Nuevo",
              ownerName: resp?.data?.ownerName || email || "Sin asignar",
              ownerEmail: resp?.data?.ownerEmail || email || "",
              score: this.ratingScore || undefined,
            } as any,
          };
        }
      })
      .catch(async (err) => {
        this.savingToCrm = false;
        let message = "No se pudo guardar el lead. Intenta de nuevo.";
        try {
          const j = err && err.json ? await err.json() : null;
          if (j?.error) message = j.error;
        } catch {}
        this.toastr.error(message, "Guardar en CRM");
      });
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
    // Fetch directo (workaround del HMR singleton cacheado).
    const userStr = localStorage.getItem("user") || "{}";
    let token = "", company = "", nit = "", email = "", authCode = "";
    try {
      const u = JSON.parse(userStr);
      token = u.token || "";
      company = u.company || "";
      nit = u.nit || "";
      email = u.email || "";
      authCode = u.authorizationCode || "";
    } catch {}
    const headers: HeadersInit = {
      "Authorization": "Bearer " + token,
      "company": company,
      "user": nit,
      "usage-code": authCode,
      "email": email,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    const base = "http://localhost:3300/v1/whatsapp/conversations/" +
      encodeURIComponent(hash);
    Promise.all([
      fetch(base + "/profile", { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject(r),
      ),
      fetch(base + "/orders", { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject(r),
      ),
    ])
      .then(([profResp, ordersResp]: any[]) => {
        const profile: any = {
          phoneHash: profResp?.phoneHash || hash,
          phoneMasked: profResp?.phoneMasked || "+??***????",
          clienteNombre: profResp?.clienteNombre || null,
          profileName: profResp?.profileName || null,
          isClienteRegistrado: !!profResp?.isClienteRegistrado,
          hasOrderHistory: !!profResp?.hasOrderHistory,
          lead: profResp?.lead || null,
          ratingDraft: profResp?.ratingDraft || null,
        };
        const orders = (ordersResp?.items || []).map((o: any) => ({
          orderId: o.id,
          nroPedido: o.numero || "S/N",
          estado: o.estado || o.estadoProceso || "—",
          total: o.total || 0,
          fechaCreacion: o.fechaCreacion,
          currency: "COP",
          deepLink: `/ventas/detalle/${o.id}`,
        }));
        this.profile = profile;
        this.orders = orders;
        this.ratingScore =
          profile.lead?.score ?? profile.ratingDraft?.score ?? 0;
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
      });
  }
}
