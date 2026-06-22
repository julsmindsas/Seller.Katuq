import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  CotizacionPublicaService,
  CotizacionPublicaView,
} from "./cotizacion-publica.service";

/**
 * Landing PÚBLICA de aprobación de cotización (spec 008.3).
 * Sin login. Se accede por token opaco (`/c/:token`). El cliente ve su cotización
 * y puede Aceptar/Rechazar confirmando su documento.
 */
@Component({
  selector: "app-cotizacion-publica",
  templateUrl: "./cotizacion-publica.component.html",
  styleUrls: ["./cotizacion-publica.component.scss"],
})
export class CotizacionPublicaComponent implements OnInit {
  token = "";
  loading = true;
  notFound = false;
  cot: CotizacionPublicaView | null = null;

  // UI de acción
  accionActiva: "aceptar" | "rechazar" | null = null;
  documento = "";
  motivo = "";
  enviando = false;
  errorAccion = "";
  resultadoEstado: string | null = null; // estado final tras responder

  private readonly COP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  constructor(
    private route: ActivatedRoute,
    private service: CotizacionPublicaService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") || "";
    if (!this.token) {
      this.notFound = true;
      this.loading = false;
      return;
    }
    this.service.getPublica(this.token).subscribe({
      next: (res) => {
        this.cot = res?.data || null;
        this.notFound = !this.cot;
        this.loading = false;
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
      },
    });
  }

  /** Solo se puede responder si está enviada y no vencida (y no resuelta en esta sesión). */
  get puedeResponder(): boolean {
    return (
      !!this.cot &&
      this.cot.estado === "enviada" &&
      !this.cot.vencida &&
      !this.resultadoEstado
    );
  }

  get estadoMostrado(): string {
    return this.resultadoEstado || this.cot?.estado || "";
  }

  iniciarAccion(accion: "aceptar" | "rechazar"): void {
    this.accionActiva = accion;
    this.errorAccion = "";
    this.documento = "";
    this.motivo = "";
  }

  cancelarAccion(): void {
    this.accionActiva = null;
    this.errorAccion = "";
  }

  confirmar(): void {
    if (!this.accionActiva) return;
    if (!this.documento || !this.documento.trim()) {
      this.errorAccion = "Ingresa tu número de documento para continuar.";
      return;
    }
    this.enviando = true;
    this.errorAccion = "";
    this.service
      .responder(this.token, {
        accion: this.accionActiva,
        documento: this.documento.trim(),
        motivo: this.accionActiva === "rechazar" ? this.motivo?.trim() : undefined,
      })
      .subscribe({
        next: (res) => {
          this.enviando = false;
          this.resultadoEstado = res?.data?.estado || (this.accionActiva === "aceptar" ? "aceptada" : "rechazada");
          this.accionActiva = null;
        },
        error: (err) => {
          this.enviando = false;
          this.errorAccion = err?.error?.message || "No se pudo registrar tu respuesta. Intenta de nuevo.";
        },
      });
  }

  // ---- Helpers de presentación ----
  money(v: number | undefined | null): string {
    return this.COP.format(Number(v) || 0);
  }

  fecha(iso: string | undefined | null): string {
    if (!iso) return "—";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
  }

  estadoLabel(estado: string): string {
    const map: { [k: string]: string } = {
      borrador: "Borrador",
      enviada: "Enviada",
      aceptada: "Aceptada",
      rechazada: "Rechazada",
      vencida: "Vencida",
      convertida: "Convertida en pedido",
    };
    return map[estado] || estado;
  }
}
