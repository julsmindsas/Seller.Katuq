import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { DragulaService } from 'ng2-dragula';
import { CrmService } from '../../services/crm.service';
import * as XLSX from 'xlsx';
import { CrmLead, CrmStats, getStageSeverity, getPrioritySeverity } from '../../models/crm.models';

@Component({
  selector: 'app-crm-list',
  templateUrl: './crm-list.component.html',
  styleUrls: ['./crm-list.component.scss'],
})
export class CrmListComponent implements OnInit, OnDestroy {
  // Data
  leads: CrmLead[] = [];
  stats: CrmStats | null = null;
  stages: string[] = [];
  entityType = 'client';
  leadsByStage: Record<string, CrmLead[]> = {};

  // UI
  loading = true;
  searchTerm = '';
  viewMode: 'kanban' | 'table' = 'kanban';
  selectedStage: string | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private crmService: CrmService,
    private messageService: MessageService,
    private dragulaService: DragulaService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm = term;
        this.groupByStage();
      });

    // Setup dragula for kanban drag-and-drop
    this.setupDragula();

    // Load data
    this.crmService.getStages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.stages = r.stages;
          this.entityType = r.entityType;
        },
      });

    this.loadLeads();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // No hacer dragulaService.destroy — la directiva [dragula] maneja el lifecycle
  }

  // ─── Dragula setup ─────────────────────────────────────────

  private setupDragula(): void {
    // Solo escuchar el evento drop — la directiva [dragula] crea el grupo
    this.dragulaService.dropModel('crm-kanban')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ el, target, item }) => {
        if (!target) return;
        const newStage = target.getAttribute('data-stage');
        const leadId = item?.id || el?.getAttribute('data-lead-id');
        if (leadId && newStage) {
          this.onStageDrop(leadId, newStage);
        }
      });
  }

  // ─── Data ──────────────────────────────────────────────────

  loadLeads(): void {
    this.loading = true;
    this.crmService.getLeads({ limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.leads = res.data || [];
        this.groupByStage();
        this.loading = false;
      });
  }

  loadStats(): void {
    this.crmService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => { this.stats = stats; });
  }

  groupByStage(): void {
    const filtered = this.searchTerm
      ? this.leads.filter(l =>
          (l.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (l.email || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (l.nit || '').includes(this.searchTerm)
        )
      : this.leads;

    this.leadsByStage = {};
    for (const stage of this.stages) {
      this.leadsByStage[stage] = filtered.filter(l => l.stage === stage);
    }

    // Leads sin stage van al primero
    const noStage = filtered.filter(l => !this.stages.includes(l.stage));
    if (noStage.length > 0 && this.stages.length > 0) {
      this.leadsByStage[this.stages[0]] = [
        ...noStage,
        ...(this.leadsByStage[this.stages[0]] || []),
      ];
    }
  }

  // ─── Actions ───────────────────────────────────────────────

  onStageDrop(leadId: string, newStage: string): void {
    this.crmService.updatePipeline(leadId, { stage: newStage })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          // Update local data
          const lead = this.leads.find(l => l.id === leadId);
          if (lead) lead.stage = newStage;
          this.messageService.add({ severity: 'success', summary: 'Etapa actualizada' });
          this.loadStats();
        } else {
          // Revert: reload
          this.loadLeads();
        }
      });
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  viewDetail(lead: CrmLead): void {
    this.router.navigate(['/crm/detail', lead.id]);
  }

  // ─── Helpers ───────────────────────────────────────────────

  getStageSeverity = getStageSeverity;
  getPrioritySeverity = getPrioritySeverity;

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  getStageCount(stage: string): number {
    return (this.leadsByStage[stage] || []).length;
  }

  getTitle(): string {
    return this.entityType === 'company' ? 'Pipeline Empresas' : 'Pipeline Clientes';
  }

  trackById(index: number, item: CrmLead): string {
    return item.id;
  }

  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      // Company stages
      registro: '#6b7280', contactado: '#3b82f6', demo: '#8b5cf6',
      trial: '#D35400', activo: '#27AE60', premium: '#7c3aed', churned: '#d12b38',
      // Client stages
      nuevo: '#6b7280', calificado: '#27AE60', propuesta: '#3b82f6',
      negociacion: '#D35400', convertido: '#7c3aed', perdido: '#d12b38',
    };
    return colors[stage] || '#6b7280';
  }

  getStageBgColor(stage: string): string {
    const colors: Record<string, string> = {
      registro: '#f1f3f5', contactado: '#eff6ff', demo: '#f5f3ff',
      trial: '#fff7ed', activo: '#f0fdf4', premium: '#faf5ff', churned: '#fef2f2',
      nuevo: '#f1f3f5', calificado: '#f0fdf4', propuesta: '#eff6ff',
      negociacion: '#fff7ed', convertido: '#faf5ff', perdido: '#fef2f2',
    };
    return colors[stage] || '#f1f3f5';
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '#6b7280', medium: '#D35400', high: '#d12b38', urgent: '#d12b38',
    };
    return colors[priority] || '#6b7280';
  }

  getPriorityBgColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '#f1f3f5', medium: '#fff7ed', high: '#fef2f2', urgent: '#fef2f2',
    };
    return colors[priority] || '#f1f3f5';
  }

  getStageValue(stage: string): number {
    return (this.leadsByStage[stage] || []).reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  }

  get filteredLeads(): CrmLead[] {
    let list = this.leads;
    if (this.selectedStage) {
      list = list.filter(l => l.stage === this.selectedStage);
    }
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(l =>
        (l.name || '').toLowerCase().includes(t) ||
        (l.email || '').toLowerCase().includes(t) ||
        (l.nit || '').includes(t)
      );
    }
    return list;
  }

  onStageFilter(): void {
    this.groupByStage();
  }

  formatCurrency(value: number): string {
    if (!value) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(value);
  }

  // ─── Export ────────────────────────────────────────────────

  exportToExcel(): void {
    const data = this.filteredLeads.map(l => ({
      'Nombre': l.name || '',
      'Email': l.email || '',
      'Teléfono': l.phone || '',
      'NIT/Doc': l.nit || '',
      'Etapa': this.capitalize(l.stage),
      'Prioridad': l.priority || '',
      'Asignado': l.assignedTo || '',
      'Valor Estimado': l.estimatedValue || 0,
      'Plan': l.subscriptionPlan || '',
      'Estado': l.activo ? 'Activo' : 'Inactivo',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
      { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CRM Pipeline');

    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `crm-pipeline-${ts}.xlsx`);
    this.messageService.add({ severity: 'success', summary: 'Exportado', detail: `${data.length} leads exportados` });
  }

  // ─── Import ────────────────────────────────────────────────

  onFileImport(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          this.messageService.add({ severity: 'warn', summary: 'Archivo vacío' });
          return;
        }

        // Detect column mapping from headers
        const columns = Object.keys(rows[0]);
        const mapping = this.detectColumnMapping(columns);

        let imported = 0;
        let skipped = 0;
        const total = rows.length;

        this.messageService.add({
          severity: 'info', summary: 'Importando', detail: `Procesando ${total} registros...`,
        });

        rows.forEach((row, i) => {
          const name = this.getRowValue(row, mapping.name);
          if (!name) { skipped++; return; }

          const leadData: any = {
            name,
            email: this.getRowValue(row, mapping.email) || null,
            phone: this.cleanPhone(this.getRowValue(row, mapping.phone)),
            source: this.detectSource(row, mapping),
            stage: this.mapImportStage(this.getRowValue(row, mapping.stage)),
            priority: 'medium',
            // Extra data from Facebook Ads or custom formats
            notes: this.buildImportNotes(row, mapping),
          };

          // Check if exists by email or phone
          const existing = this.leads.find(l =>
            (leadData.email && l.email?.toLowerCase() === leadData.email.toLowerCase()) ||
            (leadData.phone && l.phone === leadData.phone) ||
            (l.name?.toLowerCase() === name.toLowerCase())
          );

          if (existing) {
            // Update pipeline for existing lead
            this.crmService.updatePipeline(existing.id, {
              stage: leadData.stage !== this.stages[0] ? leadData.stage : undefined,
              source: leadData.source,
            }).pipe(takeUntil(this.destroy$)).subscribe();
          } else {
            // Create new lead via import endpoint
            this.crmService.importLead(leadData)
              .pipe(takeUntil(this.destroy$)).subscribe();
          }
          imported++;
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Importación completada',
          detail: `${imported} procesados, ${skipped} sin nombre (omitidos)`,
          life: 5000,
        });

        // Reload after a delay to let backend process
        setTimeout(() => this.loadLeads(), 2000);
        setTimeout(() => this.loadStats(), 2500);
      } catch (err) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo leer el archivo' });
      }

      event.target.value = '';
    };

    reader.readAsBinaryString(file);
  }

  /**
   * Detect which columns map to which CRM fields.
   * Handles: Facebook Ads, Katuq export, generic CSV, any format.
   */
  private detectColumnMapping(columns: string[]): Record<string, string | null> {
    const find = (patterns: string[]): string | null => {
      for (const col of columns) {
        const lower = col.toLowerCase().replace(/[_\-\.]/g, ' ').trim();
        for (const p of patterns) {
          if (lower.includes(p)) return col;
        }
      }
      return null;
    };

    return {
      name: find(['nombre completo', 'nombre_completo', 'full name', 'nombre', 'name', 'empresa', 'company']),
      email: find(['correo', 'email', 'e-mail', 'mail']),
      phone: find(['teléfono', 'telefono', 'número de teléfono', 'numero de telefono', 'phone', 'celular', 'cel', 'whatsapp']),
      stage: find(['etapa', 'stage', 'lead status', 'lead_status', 'status', 'estado']),
      role: find(['rol', 'role', 'cargo', 'cuál es tu rol']),
      employees: find(['personas', 'empleados', 'employees', 'cuántas personas']),
      operating: find(['operación', 'operacion', 'operating', 'actualmente']),
      campaign: find(['campaign name', 'campaign_name', 'campaña']),
      adName: find(['ad name', 'ad_name', 'anuncio']),
      source: find(['platform', 'plataforma', 'fuente', 'source']),
    };
  }

  private getRowValue(row: any, columnName: string | null): string {
    if (!columnName) return '';
    const val = row[columnName];
    return val != null ? String(val).trim() : '';
  }

  private cleanPhone(phone: string): string | null {
    if (!phone) return null;
    // Remove everything except digits and +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Add Colombia prefix if needed
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '+57' + cleaned;
    }
    return cleaned || null;
  }

  private detectSource(row: any, mapping: Record<string, string | null>): string {
    const platform = this.getRowValue(row, mapping.source).toLowerCase();
    const campaign = this.getRowValue(row, mapping.campaign).toLowerCase();

    if (platform.includes('facebook') || platform.includes('instagram') || campaign) return 'social_media';
    if (platform.includes('google')) return 'web';
    return 'manual';
  }

  private buildImportNotes(row: any, mapping: Record<string, string | null>): string {
    const parts: string[] = [];
    const role = this.getRowValue(row, mapping.role);
    const employees = this.getRowValue(row, mapping.employees);
    const operating = this.getRowValue(row, mapping.operating);
    const campaign = this.getRowValue(row, mapping.campaign);
    const adName = this.getRowValue(row, mapping.adName);

    if (role) parts.push(`Rol: ${role}`);
    if (employees) parts.push(`Empleados: ${employees}`);
    if (operating) parts.push(`En operación: ${operating}`);
    if (campaign) parts.push(`Campaña: ${campaign}`);
    if (adName) parts.push(`Anuncio: ${adName}`);

    return parts.join(' | ');
  }

  private mapImportStage(value: string): string {
    const v = (value || '').toLowerCase().trim();
    const map: Record<string, string> = {
      'registro': 'registro', 'contactado': 'contactado', 'demo': 'demo',
      'trial': 'trial', 'activo': 'activo', 'premium': 'premium', 'churned': 'churned',
      'nuevo': 'nuevo', 'calificado': 'calificado', 'propuesta': 'propuesta',
      'negociacion': 'negociacion', 'negociación': 'negociacion',
      'convertido': 'convertido', 'perdido': 'perdido',
    };
    return map[v] || this.stages[0] || 'nuevo';
  }
}
