import { Component, OnInit } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { TranslateService } from "@ngx-translate/core";
import { normalizarRol, esFamiliaAdministrador } from "../../../shared/utils/roles";
import { ESTADOS_LEAD, EstadoLead, LeadLanding, LeadsLandingService, PersonaDelEquipo } from "./leads-landing.service";

/**
 * Bandeja «Leads de landing» (D-633, KLAN-E1, fase 1; bandera `landingsV2`): las personas que dejaron
 * sus datos en una landing, con su estado y a quién del equipo se le asignó. Vive en Sitio web porque
 * los leads salen de los sitios tipo landing; son los mismos prospectos del CRM del comercio.
 *
 * Asignar es de quien administra (el servidor lo exige); cualquiera de la empresa ve la bandeja y
 * cambia el estado.
 */
@Component({
  selector: "app-leads-landing",
  templateUrl: "./leads-landing.component.html",
  styleUrls: ["./leads-landing.component.scss"],
})
export class LeadsLandingComponent implements OnInit {
  readonly ESTADOS = ESTADOS_LEAD;
  readonly CLASE_ESTADO: Record<EstadoLead, string> = {
    nuevo: "cfg-pill--info",
    contactado: "cfg-pill--warn",
    "en-seguimiento": "cfg-pill--warn",
    ganado: "cfg-pill--ok",
    perdido: "cfg-pill--neutro",
  };

  leads: LeadLanding[] = [];
  conteo: Record<string, number> = {};
  equipo: PersonaDelEquipo[] = [];
  recortado = false;
  cargando = false;
  error = false;
  /** Ids con un cambio en curso, para no permitir dos a la vez sobre el mismo lead. */
  guardando = new Set<string>();

  filtroEstado = "";
  filtroAsignado = "";

  readonly puedeAsignar = LeadsLandingComponent.rolPuedeAsignar();

  constructor(
    private readonly service: LeadsLandingService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargar();
    if (this.puedeAsignar) {
      this.service.equipo().subscribe({
        next: (r) => (this.equipo = r && r.success && r.data ? r.data.equipo || [] : []),
        error: () => (this.equipo = []),
      });
    }
  }

  /** Espejo de las rutas del servidor (requireRole): la familia Administrador y Director Comercial. */
  private static rolPuedeAsignar(): boolean {
    try {
      const rol = (JSON.parse(localStorage.getItem("user") || "{}") || {}).rol;
      return esFamiliaAdministrador(rol) || normalizarRol(rol) === "director comercial";
    } catch {
      return false;
    }
  }

  get total(): number {
    return Object.values(this.conteo).reduce((a, b) => a + b, 0);
  }

  get hayFiltro(): boolean {
    return !!(this.filtroEstado || this.filtroAsignado);
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.service.listar({ estado: this.filtroEstado, asignado: this.filtroAsignado }).subscribe({
      next: (r) => {
        this.cargando = false;
        const d = r && r.success ? r.data : null;
        this.error = !d;
        this.leads = d ? d.leads : [];
        this.conteo = d ? d.conteo : {};
        this.recortado = !!(d && d.recortado);
      },
      error: () => {
        this.cargando = false;
        this.error = true;
      },
    });
  }

  elegirEstado(estado: string): void {
    this.filtroEstado = this.filtroEstado === estado ? "" : estado;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroEstado = "";
    this.filtroAsignado = "";
    this.cargar();
  }

  cambiarEstado(lead: LeadLanding, estado: string): void {
    if (estado === lead.estado || !this.ESTADOS.includes(estado as EstadoLead) || this.guardando.has(lead.id)) return;
    const anterior = lead.estado;
    this.guardando.add(lead.id);
    this.service.cambiarEstado(lead.id, estado as EstadoLead).subscribe({
      next: () => {
        this.guardando.delete(lead.id);
        lead.estado = estado as EstadoLead;
        this.conteo[anterior] = Math.max(0, (this.conteo[anterior] || 0) - 1);
        this.conteo[estado] = (this.conteo[estado] || 0) + 1;
        this.toastr.success(this.translate.instant("sitiosLeads.estadoCambiado"));
        if (this.filtroEstado) this.cargar();
      },
      error: (e) => this.falla(lead.id, e, "sitiosLeads.errorEstado"),
    });
  }

  asignar(lead: LeadLanding, email: string): void {
    if ((email || "") === (lead.asignadoA || "") || this.guardando.has(lead.id)) return;
    this.guardando.add(lead.id);
    this.service.asignar(lead.id, email).subscribe({
      next: () => {
        this.guardando.delete(lead.id);
        const persona = this.equipo.find((p) => p.email === email);
        lead.asignadoA = persona ? persona.email : null;
        lead.asignadoNombre = persona ? persona.nombre : "";
        this.toastr.success(this.translate.instant("sitiosLeads.asignado"));
        if (this.filtroAsignado) this.cargar();
      },
      error: (e) => this.falla(lead.id, e, "sitiosLeads.errorAsignar"),
    });
  }

  private falla(id: string, e: any, claveGenerica: string): void {
    this.guardando.delete(id);
    const mensaje = e && e.error && typeof e.error.message === "string" ? e.error.message : this.translate.instant(claveGenerica);
    this.toastr.error(mensaje);
    this.cargar();
  }

  porId(_: number, l: LeadLanding): string {
    return l.id;
  }

  fecha(iso: string | null): string {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString(this.translate.currentLang || "es", { day: "numeric", month: "short", year: "numeric" });
  }

  campana(l: LeadLanding): string {
    const c = l.campana;
    return c ? [c.utm_source, c.utm_campaign].filter(Boolean).join(" · ") : "";
  }
}
