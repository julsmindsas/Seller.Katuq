import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { Subscription, interval } from "rxjs";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import { BotSesionResumen } from "../../models/whatsapp-thread.model";

/**
 * Vista "Pedidos" del buzón de WhatsApp: las conversaciones que el bot de
 * pedidos atiende o atendió, con su carrito, su estado y su cotización.
 *
 * Es la lista IZQUIERDA cuando el operador cambia a la pestaña Pedidos; al
 * hacer clic se abre a la derecha la MISMA conversación de siempre (el detalle
 * del hilo ya trae la franja del bot, el carrito y tomar/devolver).
 *
 * Los nombres y el teléfono enmascarado no viven en la sesión del bot (que
 * solo conoce el hash): se cruzan contra el listado de hilos que el buzón ya
 * sabe pedir. Si el cruce falla, la tarjeta se muestra con el hash recortado —
 * fea pero funcional, nunca rota.
 */
@Component({
  selector: "app-whatsapp-pedidos-list",
  templateUrl: "./whatsapp-pedidos-list.component.html",
  styleUrls: ["./whatsapp-pedidos-list.component.scss"],
})
export class WhatsappPedidosListComponent implements OnInit, OnDestroy {
  @Input() selectedPhoneHash: string | null = null;
  @Output() sesionSelected = new EventEmitter<string>();

  sesiones: BotSesionResumen[] = [];
  loading = true;
  /** Filtro por estado: todo | bot | humano | cerrada. */
  filtro: "todo" | "bot" | "humano" | "cerrada" = "todo";

  private refreshSub: Subscription | null = null;

  constructor(private readonly inbox: WhatsappInboxService) {}

  ngOnInit(): void {
    this.cargar();
    // Mismo criterio de polling del detalle: barato, y parado con la pestaña oculta.
    this.refreshSub = interval(15000).subscribe(() => {
      if (document.hidden) return;
      this.cargar(true);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  cargar(silencioso = false): void {
    if (!silencioso) this.loading = true;
    this.inbox.getBotSesiones().subscribe({
      next: (sesiones) => {
        this.loading = false;
        this.enriquecer(sesiones);
      },
      error: () => {
        this.loading = false;
        this.sesiones = [];
      },
    });
  }

  /** Cruza las sesiones con el listado de hilos para nombre y teléfono. */
  private enriquecer(sesiones: BotSesionResumen[]): void {
    if (sesiones.length === 0) {
      this.sesiones = [];
      return;
    }
    this.inbox.getThreads({}).subscribe({
      next: (page) => {
        const porHash = new Map(
          (page.items || []).map((t) => [t.phoneHash, t]),
        );
        this.sesiones = sesiones.map((s) => {
          const hilo = porHash.get(s.phoneHash);
          return {
            ...s,
            contactName:
              hilo?.contactName || `Contacto ${s.phoneHash.slice(0, 6)}…`,
            phoneMasked: hilo?.phoneMasked || "",
          };
        });
      },
      error: () => {
        this.sesiones = sesiones.map((s) => ({
          ...s,
          contactName: `Contacto ${s.phoneHash.slice(0, 6)}…`,
          phoneMasked: "",
        }));
      },
    });
  }

  get filtradas(): BotSesionResumen[] {
    if (this.filtro === "todo") return this.sesiones;
    return this.sesiones.filter((s) => s.estado === this.filtro);
  }

  contar(estado: "todo" | "bot" | "humano" | "cerrada"): number {
    if (estado === "todo") return this.sesiones.length;
    return this.sesiones.filter((s) => s.estado === estado).length;
  }

  setFiltro(f: "todo" | "bot" | "humano" | "cerrada"): void {
    this.filtro = f;
  }

  seleccionar(s: BotSesionResumen): void {
    this.sesionSelected.emit(s.phoneHash);
  }

  estadoEtiqueta(s: BotSesionResumen): string {
    if (s.estado === "cerrada") return "Cotización lista";
    if (s.estado === "humano") return "Con un asesor";
    return "Atendiendo el bot";
  }

  haceCuanto(ms?: number | null): string {
    if (!ms) return "";
    const diff = Date.now() - ms;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "ahora";
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.floor(h / 24)} d`;
  }

  trackSesion(_i: number, s: BotSesionResumen): string {
    return s.phoneHash;
  }
}
