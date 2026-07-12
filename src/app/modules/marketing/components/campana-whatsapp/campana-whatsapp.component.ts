import { Component, OnInit } from '@angular/core';
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

interface ResultadoEnvio {
  nombre: string;
  phone: string;
  ok: boolean;
  error?: string;
}

/** Tope de destinatarios por campaña en el MVP (envío secuencial front-driven). */
const MAX_DESTINATARIOS = 100;
/** Pausa entre envíos para respetar el throttle "send" del backend. */
const DELAY_ENTRE_ENVIOS_MS = 700;

/**
 * Campaña de WhatsApp (spec 022 fase 2 — D-091).
 *
 * Wizard: 1) audiencia desde CRM → 2) plantilla HSM aprobada + variables
 * (fijas o personalizadas con el nombre) → 3) confirmación con costo estimado
 * vs saldo prepago → envío secuencial reutilizando `start-conversation`
 * (Kapso + débito $priceCOP/msg server-side, mismo camino que el inbox).
 *
 * MVP consciente: sin persistencia de campaña (no colecciones nuevas) — los
 * resultados viven en la pantalla; cerrar la pestaña detiene el envío.
 */
@Component({
  selector: 'app-campana-whatsapp',
  templateUrl: './campana-whatsapp.component.html',
  styleUrls: ['./campana-whatsapp.component.scss'],
})
export class CampanaWhatsappComponent implements OnInit {
  readonly MAX_DESTINATARIOS = MAX_DESTINATARIOS;

  paso: 1 | 2 | 3 = 1;

  // --- Paso 1: audiencia (CRM) ---
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
  balance: WhatsappBalance | null = null;
  loadingBalance = false;
  enviando = false;
  envioTerminado = false;
  progreso = 0;
  resultados: ResultadoEnvio[] = [];

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

  onEtapaChange(): void {
    this.cargarAudiencia();
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

  async enviarCampana(): Promise<void> {
    const t = this.selectedTemplate;
    if (!t || this.enviando || this.saldoInsuficiente) return;

    const lote = this.seleccionados.slice(0, MAX_DESTINATARIOS);
    this.enviando = true;
    this.envioTerminado = false;
    this.resultados = [];
    this.progreso = 0;

    for (let i = 0; i < lote.length; i++) {
      const dest = lote[i];
      const variables = this.variableConfigs.map((cfg) => this.resolverVariable(cfg, dest));
      try {
        await this.marketing
          .startConversation(dest.phone, t.name, t.language, variables)
          .toPromise();
        this.resultados.push({ nombre: dest.nombre, phone: dest.phone, ok: true });
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'Error de envío';
        this.resultados.push({ nombre: dest.nombre, phone: dest.phone, ok: false, error: msg });
        // Si el backend reporta falta de saldo, no seguir quemando el lote.
        if (String(msg).toLowerCase().includes('saldo')) break;
      }
      this.progreso = Math.round(((i + 1) / lote.length) * 100);
      if (i < lote.length - 1) {
        await this.pausa(DELAY_ENTRE_ENVIOS_MS);
      }
    }

    this.enviando = false;
    this.envioTerminado = true;
    this.cargarBalance(); // refrescar saldo tras la campaña
  }

  get enviadosOk(): number {
    return this.resultados.filter((r) => r.ok).length;
  }

  get enviadosError(): number {
    return this.resultados.filter((r) => !r.ok).length;
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

  private pausa(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
