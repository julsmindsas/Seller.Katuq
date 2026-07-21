import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CrmService } from '../../../../components/crm/services/crm.service';
import { CrmLead, CrmStage } from '../../../../components/crm/models/crm.models';
import {
  KapsoTemplate,
  MarketingService,
  WhatsappBalance,
} from '../../services/marketing.service';

/** Destinatario resuelto de la audiencia (lead CRM con teléfono válido). */
interface Destinatario {
  leadId: string;
  nombre: string;
  phone: string; // solo dígitos, con indicativo
  email: string;
  selected: boolean;
}

/** Config de una variable de la plantilla: texto fijo o nombre del contacto. */
interface VariableConfig {
  mode: 'fijo' | 'nombre';
  value: string;
}

/** Tope por campaña = límite por request del API de Broadcasts de Kapso. */
const MAX_DESTINATARIOS = 1000;

/**
 * Campaña de WhatsApp (spec 022 fase 2 — D-091; envío server-side D-097).
 *
 * Wizard: 1) audiencia (clientes o leads CRM) → 2) plantilla HSM aprobada +
 * variables (fijas o personalizadas con el nombre) → 3) confirmación con
 * costo estimado vs saldo prepago → UNA llamada a POST /campaigns/broadcast
 * (Kapso Broadcasts: crea + destinatarios + envía o programa + debita,
 * todo server-side). El envío sobrevive al navegador; el front solo pollea
 * el progreso. Sin colección de campañas: el historial se agrega desde
 * whatsapp_usage por campaignId (D-096).
 */
@Component({
  selector: 'app-campana-whatsapp',
  templateUrl: './campana-whatsapp.component.html',
  styleUrls: ['./campana-whatsapp.component.scss'],
})
export class CampanaWhatsappComponent implements OnInit, OnDestroy {
  readonly MAX_DESTINATARIOS = MAX_DESTINATARIOS;

  paso: 1 | 2 | 3 = 1;

  // --- Paso 1: audiencia ---
  /** Fuente de audiencia: clientes registrados (default — siempre tienen
   *  teléfono) o leads del CRM. */
  fuente: 'clientes' | 'crm' = 'clientes';
  filtroNombre = '';
  loadingAudiencia = false;
  errorAudiencia = false;
  stages: CrmStage[] = [];
  etapaSeleccionada = '';
  destinatarios: Destinatario[] = [];
  leadsSinTelefono = 0;

  // --- Paso 2: plantilla ---
  loadingTemplates = false;
  errorTemplates = '';
  templates: KapsoTemplate[] = [];
  selectedTemplateName = '';
  variableConfigs: VariableConfig[] = [];

  // --- Paso 3: confirmación + envío ---
  nombreCampana = '';
  /** [D-097] Momento de envío: ya mismo o programado. */
  cuandoEnviar: 'ahora' | 'programar' = 'ahora';
  fechaProgramada = ''; // datetime-local
  balance: WhatsappBalance | null = null;
  loadingBalance = false;
  enviando = false;
  envioTerminado = false;
  progreso = 0;
  /** Estado del broadcast lanzado (server-side, Kapso). */
  broadcastStatus = '';
  broadcastMensaje = '';
  broadcastErrores: string[] = [];
  private pollTimer: any = null;

  constructor(
    private crm: CrmService,
    private marketing: MarketingService,
  ) {}

  ngOnInit(): void {
    this.cargarAudiencia();
  }

  // =====================================================================
  // Paso 1 — Audiencia
  // =====================================================================
  cargarAudiencia(): void {
    if (this.fuente === 'clientes') {
      this.cargarClientes();
    } else {
      this.cargarLeadsCrm();
    }
  }

  /** Audiencia desde clientes registrados (default). */
  private cargarClientes(): void {
    this.loadingAudiencia = true;
    this.errorAudiencia = false;
    this.marketing.getClients().subscribe({
      next: (data: any[]) => {
        const rows = Array.isArray(data) ? data : [];
        const mapped = rows.map((c) => ({
          leadId: c.cd || c.id || c.documento || '',
          nombre:
            [c.nombres_completos, c.apellidos_completos].filter(Boolean).join(' ').trim() ||
            c.nombre || 'Sin nombre',
          phone: this.normalizarPhone(
            c.numero_celular_whatsapp || c.numero_celular_comprador || c.telefono || c.celular,
          ),
          email: (c.correo_electronico_comprador || c.email || '').trim().toLowerCase(),
          selected: false,
        }));
        this.leadsSinTelefono = mapped.filter((d) => !d.phone).length;
        this.destinatarios = mapped.filter((d) => !!d.phone);
        this.loadingAudiencia = false;
      },
      error: () => {
        this.errorAudiencia = true;
        this.loadingAudiencia = false;
      },
    });
  }

  /** Audiencia desde leads del CRM (con etapa opcional). */
  private cargarLeadsCrm(): void {
    this.loadingAudiencia = true;
    this.errorAudiencia = false;

    const filters: Record<string, any> = { limit: 500 };
    if (this.etapaSeleccionada) filters['stage'] = this.etapaSeleccionada;

    forkJoin({
      stages: this.crm.getStages().pipe(catchError(() => of({ stages: [] as CrmStage[], entityType: '' }))),
      leads: this.crm.getLeads(filters),
    }).subscribe({
      next: ({ stages, leads }) => {
        this.stages = (stages?.stages || []).filter((s) => s.active !== false);
        const data: CrmLead[] = leads?.data || [];
        this.leadsSinTelefono = data.filter((l) => !this.normalizarPhone(l.phone)).length;
        this.destinatarios = data
          .map((l) => ({
            leadId: l.id,
            nombre: l.name || 'Sin nombre',
            phone: this.normalizarPhone(l.phone),
            email: (l.email || '').trim().toLowerCase(),
            selected: false,
          }))
          .filter((d) => !!d.phone);
        this.loadingAudiencia = false;
      },
      error: () => {
        this.errorAudiencia = true;
        this.loadingAudiencia = false;
      },
    });
  }

  onFuenteChange(): void {
    this.filtroNombre = '';
    this.destinatarios = [];
    this.cargarAudiencia();
  }

  onEtapaChange(): void {
    this.cargarAudiencia();
  }

  /** Destinatarios visibles según el filtro de búsqueda local. */
  get destinatariosVisibles(): Destinatario[] {
    const q = (this.filtroNombre || '').trim().toLowerCase();
    if (!q) return this.destinatarios;
    return this.destinatarios.filter(
      (d) => d.nombre.toLowerCase().includes(q) || d.phone.includes(q),
    );
  }

  toggleTodos(checked: boolean): void {
    if (!checked) {
      this.destinatarios.forEach((d) => (d.selected = false));
      return;
    }
    // Dedup por teléfono al seleccionar todo (un número no se cobra 2 veces)
    // y respetando el tope del MVP.
    const vistos = new Set<string>();
    for (const d of this.destinatarios) {
      if (vistos.size >= MAX_DESTINATARIOS || vistos.has(d.phone)) {
        d.selected = false;
        continue;
      }
      d.selected = true;
      vistos.add(d.phone);
    }
  }

  get seleccionados(): Destinatario[] {
    const vistos = new Set<string>();
    return this.destinatarios.filter((d) => {
      if (!d.selected || vistos.has(d.phone)) return false;
      vistos.add(d.phone);
      return true;
    });
  }

  get excedeTope(): boolean {
    return this.seleccionados.length > MAX_DESTINATARIOS;
  }

  irAPlantilla(): void {
    if (this.seleccionados.length === 0 || this.excedeTope) return;
    this.paso = 2;
    if (this.templates.length === 0) this.cargarTemplates();
  }

  // =====================================================================
  // Paso 2 — Plantilla
  // =====================================================================
  private cargarTemplates(): void {
    this.loadingTemplates = true;
    this.errorTemplates = '';
    this.marketing.getKapsoTemplates().subscribe({
      next: (resp) => {
        this.templates = (resp?.items || []).filter((t) => t.status === 'APPROVED' || !t.status);
        this.loadingTemplates = false;
      },
      error: () => {
        this.errorTemplates = 'No se pudieron cargar las plantillas. Verifica la configuración Kapso del comercio en /integrations.';
        this.loadingTemplates = false;
      },
    });
  }

  get selectedTemplate(): KapsoTemplate | null {
    return this.templates.find((t) => t.name === this.selectedTemplateName) || null;
  }

  onTemplateChange(): void {
    const t = this.selectedTemplate;
    this.variableConfigs = t
      ? t.variables.map(() => ({ mode: 'fijo' as const, value: '' }))
      : [];
  }

  /** Preview con el primer destinatario seleccionado como ejemplo. */
  get previewText(): string {
    const t = this.selectedTemplate;
    if (!t) return '';
    const ejemplo = this.seleccionados[0];
    return (t.bodyText || '').replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => {
      const idx = parseInt(n, 10) - 1;
      const cfg = this.variableConfigs[idx];
      if (!cfg) return `{{${n}}}`;
      const v = this.resolverVariable(cfg, ejemplo);
      return v || `{{${n}}}`;
    });
  }

  get plantillaLista(): boolean {
    const t = this.selectedTemplate;
    if (!t) return false;
    return this.variableConfigs.every(
      (c) => c.mode === 'nombre' || (c.value || '').trim().length > 0,
    );
  }

  irAConfirmacion(): void {
    if (!this.plantillaLista) return;
    if (!this.nombreCampana.trim()) {
      const t = this.selectedTemplate;
      const hoy = new Date().toISOString().slice(0, 10);
      this.nombreCampana = `${t?.name || 'Campaña'} ${hoy}`;
    }
    this.paso = 3;
    this.cargarBalance();
  }

  // =====================================================================
  // Paso 3 — Confirmación + envío
  // =====================================================================
  private cargarBalance(): void {
    this.loadingBalance = true;
    this.marketing.getWhatsappBalance().subscribe({
      next: (b) => {
        this.balance = b;
        this.loadingBalance = false;
      },
      error: () => {
        this.balance = null;
        this.loadingBalance = false;
      },
    });
  }

  get costoEstimado(): number {
    return this.seleccionados.length * (this.balance?.priceCOP || 80);
  }

  get saldoInsuficiente(): boolean {
    return !!this.balance && this.balance.balanceCOP < this.costoEstimado;
  }

  /** ¿La programación es inválida (modo programar sin fecha futura)? */
  get programacionInvalida(): boolean {
    if (this.cuandoEnviar !== 'programar') return false;
    if (!this.fechaProgramada) return true;
    return new Date(this.fechaProgramada).getTime() <= Date.now();
  }

  /**
   * [D-097 fase 3] Lanza la campaña vía Kapso Broadcasts: UNA llamada al
   * backend (crea broadcast + destinatarios con variables por contacto +
   * envía o programa + debita saldo). El envío corre server-side — cerrar
   * el navegador ya no lo detiene. El progreso se consulta por polling.
   */
  enviarCampana(): void {
    const t = this.selectedTemplate;
    if (!t || this.enviando || this.saldoInsuficiente || this.programacionInvalida) return;

    const lote = this.seleccionados.slice(0, MAX_DESTINATARIOS);
    this.enviando = true;
    this.envioTerminado = false;
    this.progreso = 0;
    this.broadcastStatus = '';
    this.broadcastMensaje = '';
    this.broadcastErrores = [];

    const nombre = this.nombreCampana.trim() || `${t.name} ${new Date().toISOString().slice(0, 10)}`;
    const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const campaignId = `${slug}-${Date.now().toString(36)}`;
    const scheduledAt = this.cuandoEnviar === 'programar'
      ? new Date(this.fechaProgramada).toISOString()
      : undefined;

    const recipients = lote.map((dest) => ({
      phone: dest.phone,
      variables: this.variableConfigs.map((cfg) => this.resolverVariable(cfg, dest)),
    }));

    this.marketing
      .launchBroadcast({ name: nombre, templateId: t.id, templateName: t.name, recipients, scheduledAt, campaignId })
      .subscribe({
        next: (r) => {
          this.broadcastErrores = r.erroresKapso || [];
          const excluidos = (r as any).excluidosNoContactar || 0;
          if (excluidos > 0) {
            this.broadcastErrores = [
              `${excluidos} contacto(s) excluido(s): pidieron no ser contactados.`,
              ...this.broadcastErrores,
            ];
          }
          if (scheduledAt) {
            this.enviando = false;
            this.envioTerminado = true;
            this.broadcastStatus = 'scheduled';
            this.progreso = 100;
            this.broadcastMensaje = `Campaña programada para ${new Date(scheduledAt).toLocaleString('es-CO')} — ${r.destinatarios} contactos. Puedes cerrar esta página.`;
            this.cargarBalance();
          } else {
            this.broadcastStatus = r.status || 'sending';
            this.broadcastMensaje = `Enviando a ${r.destinatarios} contactos desde el servidor — puedes cerrar esta página, el envío continúa.`;
            this.pollProgreso(r.broadcastId, lote.length);
          }
        },
        error: (err) => {
          this.enviando = false;
          this.envioTerminado = true;
          this.broadcastStatus = 'failed';
          this.broadcastMensaje = err?.error?.message || err?.message || 'No se pudo lanzar la campaña.';
        },
      });
  }

  /** Polling del progreso del broadcast (cada 3s, máx ~3 min). */
  private pollProgreso(broadcastId: string, total: number, intentos = 0): void {
    if (intentos > 60) {
      this.enviando = false;
      this.envioTerminado = true;
      this.broadcastMensaje = 'El envío sigue en curso en el servidor — revisa el historial en unos minutos.';
      return;
    }
    this.pollTimer = setTimeout(() => {
      this.marketing.getBroadcastStatus(broadcastId).subscribe({
        next: (s) => {
          const tot = s.totalRecipients || total;
          this.progreso = tot > 0 ? Math.round((s.sentCount / tot) * 100) : 0;
          this.broadcastStatus = s.status;
          if (s.status === 'completed' || s.status === 'failed' || s.status === 'stopped') {
            this.enviando = false;
            this.envioTerminado = true;
            this.progreso = s.status === 'completed' ? 100 : this.progreso;
            this.broadcastMensaje = s.status === 'completed'
              ? `Campaña enviada: ${s.sentCount} de ${tot} mensajes.`
              : `El envío terminó con estado "${s.status}" (${s.sentCount}/${tot}).`;
            this.cargarBalance();
          } else {
            this.pollProgreso(broadcastId, total, intentos + 1);
          }
        },
        error: () => this.pollProgreso(broadcastId, total, intentos + 1),
      });
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  volverAlPaso(p: 1 | 2): void {
    if (this.enviando) return;
    this.paso = p;
  }

  // =====================================================================
  // Export de audiencias para plataformas de anuncios (D-092 — ads nivel 1).
  // Genera el CSV que Meta Ads (Públicos personalizados) y Google Ads
  // (Customer Match) aceptan para retargeting/lookalikes. La plataforma
  // hashea los datos al subirlos; aquí solo se formatea.
  // =====================================================================
  exportarAudiencia(formato: 'meta' | 'google'): void {
    // Exporta la selección; si no hay nada seleccionado, toda la audiencia filtrada (dedup).
    const vistos = new Set<string>();
    const base = (this.seleccionados.length > 0 ? this.seleccionados : this.destinatarios).filter(
      (d) => {
        if (vistos.has(d.phone)) return false;
        vistos.add(d.phone);
        return true;
      },
    );
    if (base.length === 0) return;

    let headers: string[];
    let rows: string[][];
    if (formato === 'meta') {
      headers = ['phone', 'email', 'fn', 'ln', 'country'];
      rows = base.map((d) => {
        const { fn, ln } = this.splitNombre(d.nombre);
        return [d.phone, d.email, fn, ln, 'CO'];
      });
    } else {
      headers = ['Phone', 'Email', 'First Name', 'Last Name', 'Country'];
      rows = base.map((d) => {
        const { fn, ln } = this.splitNombre(d.nombre);
        return [`+${d.phone}`, d.email, fn, ln, 'CO'];
      });
    }

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const etapa = this.etapaSeleccionada || 'todas';
    const nombre = `audiencia-${formato}-${etapa}-${base.length}.csv`;
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  private splitNombre(nombre: string): { fn: string; ln: string } {
    const partes = (nombre || '').trim().split(/\s+/);
    return { fn: partes[0] || '', ln: partes.slice(1).join(' ') };
  }

  // =====================================================================
  private resolverVariable(cfg: VariableConfig, dest?: Destinatario): string {
    if (cfg.mode === 'nombre') return dest?.nombre || 'Cliente';
    return (cfg.value || '').trim();
  }

  private normalizarPhone(raw?: string): string {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 10) return '';
    // Celular colombiano de 10 dígitos sin indicativo → prepone 57 (mismo criterio del inbox).
    return digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
  }
}
