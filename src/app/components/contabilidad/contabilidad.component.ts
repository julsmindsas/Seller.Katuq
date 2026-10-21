import { Component, OnInit } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { BookkeepingService } from '../../shared/services/bookkeeping/bookkeeping.service';
import {
  BookkeepingAccount,
  BookkeepingOverview,
  JournalEntry,
  JournalLine,
  TrialBalance,
} from '../../shared/services/bookkeeping/bookkeeping.models';

import { TranslateService } from '@ngx-translate/core';
type AccountingTab = 'summary' | 'journal' | 'balance' | 'settings';

@Component({
  selector: 'app-contabilidad',
  templateUrl: './contabilidad.component.html',
  styleUrls: ['./contabilidad.component.scss'],
})
export class ContabilidadComponent implements OnInit {
  activeTab: AccountingTab = 'summary';
  loading = true;
  saving = false;
  error = '';
  overview: BookkeepingOverview | null = null;
  accounts: BookkeepingAccount[] = [];
  entries: JournalEntry[] = [];
  balance: TrialBalance | null = null;
  accountMapping: { [purpose: string]: string } = {};
  showManualEntry = false;
  expandedEntryId = '';
  search = '';
  entryFilter: 'all' | 'posted' | 'draft' = 'all';
  periodFrom = `${new Date().getFullYear()}-01-01`;
  periodTo = new Date().toISOString().slice(0, 10);
  manual = this.emptyManualEntry();

  readonly mappings = [
    { key: 'receivables', label: 'Clientes por cobrar', help: 'A dónde va el total que el cliente queda debiendo.' },
    { key: 'salesRevenue', label: 'Ingresos por ventas', help: 'A dónde va el valor de la venta antes de IVA.' },
    { key: 'vatPayable', label: 'IVA generado', help: 'A dónde va el IVA cobrado en las ventas.' },
    { key: 'salesReturns', label: 'Devoluciones en ventas', help: 'Se usa cuando una nota crédito disminuye la venta.' },
    { key: 'cash', label: 'Pagos recibidos en efectivo', help: 'Caja donde se registra el dinero físico recibido.' },
    { key: 'banks', label: 'Pagos por banco o pasarela', help: 'Transferencias, tarjetas, Nequi, Wompi y otros recaudos no efectivos.' },
    { key: 'customerAdvances', label: 'Anticipos de clientes', help: 'Dinero recibido antes de facturar o por encima del saldo pendiente.' },
  ];

  constructor(private bookkeeping: BookkeepingService, private translate: TranslateService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  get isReady(): boolean {
    return this.overview?.settings?.setupStatus === 'ready';
  }

  get filteredEntries(): JournalEntry[] {
    const term = this.search.trim().toLowerCase();
    return this.entries.filter((entry) => {
      if (this.entryFilter !== 'all' && entry.status !== this.entryFilter) return false;
      if (!term) return true;
      return [entry.number, entry.description, entry.documentNumber, entry.sourceType]
        .filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }

  get postedCount(): number { return this.entries.filter((entry) => entry.status === 'posted').length; }
  get draftCount(): number { return this.entries.filter((entry) => entry.status === 'draft').length; }
  get balanceOk(): boolean { return (this.balance?.difference || 0) === 0; }

  get nextTask(): { tone: 'warning' | 'danger' | 'success' | 'info'; icon: string; title: string; description: string; button: string } {
    if (!this.isReady) {
      return { tone: 'warning', icon: 'pi-shield', title: 'La contabilidad está preparada, pero aún no está activa',
        description: 'Revisa las cuentas principales. Mientras tanto, documentos y recaudos quedan como borradores y no afectan el balance.',
        button: 'Revisar y activar' };
    }
    if (!this.balanceOk) {
      return { tone: 'danger', icon: 'pi-exclamation-triangle', title: 'El balance del período no cuadra',
        description: 'Débitos y créditos no coinciden. Revisa los comprobantes del período antes de cerrar.',
        button: 'Ver balance' };
    }
    const drafts = this.overview?.journal?.drafts || 0;
    if (drafts > 0) {
      return { tone: 'info', icon: 'pi-pencil', title: `Hay ${drafts} comprobante${drafts === 1 ? '' : 's'} por revisar`,
        description: 'Son documentos creados antes de activar la contabilidad. Puedes consultarlos en Comprobantes.',
        button: 'Ver comprobantes' };
    }
    return { tone: 'success', icon: 'pi-check-circle', title: 'Los libros están al día',
      description: 'No hay borradores pendientes y el balance del período está cuadrado. Las facturas, notas DIAN y pagos aprobados se contabilizan solos.',
      button: 'Ver balance' };
  }

  doNextTask(): void {
    if (!this.isReady) { this.selectTab('settings'); return; }
    if (!this.balanceOk) { this.selectTab('balance'); return; }
    if ((this.overview?.journal?.drafts || 0) > 0) { this.entryFilter = 'draft'; this.selectTab('journal'); return; }
    this.selectTab('balance');
  }

  openManualEntry(): void {
    this.selectTab('journal');
    this.showManualEntry = true;
  }

  openEntry(entry: JournalEntry): void {
    this.selectTab('journal');
    this.entryFilter = 'all';
    this.search = '';
    this.expandedEntryId = entry.id;
  }

  get manualTotals(): { debit: number; credit: number; difference: number } {
    const debit = this.round(this.manual.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
    const credit = this.round(this.manual.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
    return { debit, credit, difference: this.round(debit - credit) };
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.bookkeeping.getOverview(this.periodFrom, this.periodTo)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (overview) => {
          this.overview = overview;
          if (!overview.initialized) return;
          this.accountMapping = { ...(overview.settings?.accountMapping || {}) };
          this.loadDetails();
        },
        error: (error) => this.error = this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.noFuePosibleCargarLa')),
      });
  }

  loadDetails(): void {
    forkJoin({
      accounts: this.bookkeeping.listAccounts(true),
      entries: this.bookkeeping.listJournal(),
      balance: this.bookkeeping.getTrialBalance(this.periodFrom, this.periodTo),
    }).subscribe({
      next: ({ accounts, entries, balance }) => {
        this.accounts = accounts;
        this.entries = entries;
        this.balance = balance;
      },
      error: (error) => this.error = this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.noFuePosibleCargarLos')),
    });
  }

  initialize(): void {
    Swal.fire({
      icon: 'question',
      title: this.translate.instant('contabilidad.contabilidad.crearElPlanContableInicial'),
      html: this.translate.instant('contabilidad.contabilidad.katuqPreparara14CuentasBasicas'),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('contabilidad.contabilidad.siPrepararContabilidad'),
      cancelButtonText: this.translate.instant('contabilidad.contabilidad.ahoraNo'),
      confirmButtonColor: '#6c4ce0',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.saving = true;
      this.bookkeeping.initialize().pipe(finalize(() => this.saving = false)).subscribe({
        next: () => {
          this.activeTab = 'settings';
          this.loadAll();
          Swal.fire({ icon: 'success', title: this.translate.instant('contabilidad.contabilidad.planInicialPreparado'), text: this.translate.instant('contabilidad.contabilidad.reviseLasSieteCuentasPrincipales') });
        },
        error: (error) => Swal.fire({ icon: 'error', title: this.translate.instant('contabilidad.contabilidad.noSePudoPreparar'), text: this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.intenteloNuevamente')) }),
      });
    });
  }

  activate(): void {
    Swal.fire({
      icon: 'warning',
      title: this.translate.instant('contabilidad.contabilidad.confirmarYActivarContabilidad'),
      html: this.translate.instant('contabilidad.contabilidad.desdeEsteMomentoLasFacturas'),
      input: 'checkbox',
      inputValue: 0,
      inputPlaceholder: this.translate.instant('contabilidad.contabilidad.siReviseLasCuentasPrincipales'),
      inputValidator: (value) => value ? null : this.translate.instant('contabilidad.contabilidad.debeConfirmarLaRevisionPara'),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('contabilidad.contabilidad.activarContabilidad'),
      cancelButtonText: this.translate.instant('contabilidad.contabilidad.seguirRevisando'),
      confirmButtonColor: '#198754',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.saving = true;
      this.bookkeeping.activate(this.accountMapping).pipe(finalize(() => this.saving = false)).subscribe({
        next: (response) => {
          this.activeTab = 'summary';
          this.loadAll();
          const created = (response?.sync?.dian?.created || 0) + (response?.sync?.treasury?.created || 0);
          Swal.fire({ icon: 'success', title: this.translate.instant('contabilidad.contabilidad.contabilidadActivada'), text: this.translate.instant(created === 1 ? 'contabilidad.contabilidad.movimientoAnteriorIncorporado' : 'contabilidad.contabilidad.movimientosAnterioresIncorporados', { cantidad: created }) });
        },
        error: (error) => Swal.fire({ icon: 'error', title: this.translate.instant('contabilidad.contabilidad.noSePudoActivar'), text: this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.reviseLasCuentasEIntentelo')) }),
      });
    });
  }

  saveMapping(): void {
    this.saving = true;
    this.bookkeeping.updateSettings({
      accountMapping: this.accountMapping,
      setupStatus: this.overview?.settings?.setupStatus || 'needsReview',
      autoPostDian: this.overview?.settings?.autoPostDian === true,
      autoPostTreasury: this.overview?.settings?.autoPostTreasury === true,
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.loadAll();
        Swal.fire({ icon: 'success', title: this.translate.instant('contabilidad.contabilidad.configuracionGuardada'), timer: 1600, showConfirmButton: false });
      },
      error: (error) => Swal.fire({ icon: 'error', title: this.translate.instant('contabilidad.contabilidad.noSePudoGuardar'), text: this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.reviseLaSeleccionDeCuentas')) }),
    });
  }

  syncMovements(): void {
    this.saving = true;
    this.bookkeeping.syncAll().pipe(finalize(() => this.saving = false)).subscribe({
      next: (response) => {
        this.loadAll();
        const data = response?.data || {};
        const created = (data.dian?.created || 0) + (data.treasury?.created || 0);
        const existing = (data.dian?.existing || 0) + (data.treasury?.existing || 0);
        const skipped = (data.dian?.skipped || 0) + (data.treasury?.skipped || 0);
        Swal.fire({ icon: 'success', title: this.translate.instant('contabilidad.contabilidad.movimientosRevisados'), text: this.translate.instant('contabilidad.contabilidad.nuevosYaExistentesHistoricosIncompletos', { nuevos: created, existentes: existing, omitidos: skipped }) });
      },
      error: (error) => Swal.fire({ icon: 'error', title: this.translate.instant('contabilidad.contabilidad.noSePudoSincronizar'), text: this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.intenteloNuevamente')) }),
    });
  }

  saveManualEntry(): void {
    const totals = this.manualTotals;
    if (!this.manual.description.trim() || totals.debit <= 0 || Math.abs(totals.difference) > 0.009) {
      Swal.fire({ icon: 'info', title: this.translate.instant('contabilidad.contabilidad.elComprobanteTodaviaNoEsta'), text: this.translate.instant('contabilidad.contabilidad.escribaElConceptoYVerifique') });
      return;
    }
    this.saving = true;
    const lines = this.manual.lines.filter((line) => line.accountCode && (Number(line.debit) > 0 || Number(line.credit) > 0));
    this.bookkeeping.createJournal({ date: this.manual.date, description: this.manual.description, lines })
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.manual = this.emptyManualEntry();
          this.showManualEntry = false;
          this.loadAll();
          Swal.fire({ icon: 'success', title: this.translate.instant('contabilidad.contabilidad.comprobanteContabilizado'), timer: 1800, showConfirmButton: false });
        },
        error: (error) => Swal.fire({ icon: 'error', title: this.translate.instant('contabilidad.contabilidad.noSePudoContabilizar'), text: this.errorMessage(error, this.translate.instant('contabilidad.contabilidad.reviseLosMovimientos')) }),
      });
  }

  addLine(): void {
    this.manual.lines.push({ accountCode: '', description: '', debit: 0, credit: 0 });
  }

  removeLine(index: number): void {
    if (this.manual.lines.length > 2) this.manual.lines.splice(index, 1);
  }

  selectTab(tab: AccountingTab): void {
    this.activeTab = tab;
  }

  toggleEntry(entry: JournalEntry): void {
    this.expandedEntryId = this.expandedEntryId === entry.id ? '' : entry.id;
  }

  sourceLabel(source: string): string {
    const labels: { [key: string]: string } = {
      dian_invoice: 'Factura DIAN',
      dian_creditNote: 'Nota crédito DIAN',
      dian_debitNote: 'Nota débito DIAN',
      treasury_payment: 'Pago de Tesorería',
      customer_advance_application: 'Aplicación de anticipo',
      manual: 'Manual',
    };
    return labels[source] || source;
  }

  accountTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      asset: 'Activo', liability: 'Pasivo', equity: 'Patrimonio', revenue: 'Ingreso',
      contra_revenue: 'Devolución', expense: 'Gasto', cost: 'Costo', memorandum: 'Orden',
    };
    return labels[type] || type;
  }

  trackById(_: number, item: { id?: string; code?: string }): string {
    return item.id || item.code || '';
  }

  private emptyManualEntry(): { date: string; description: string; lines: JournalLine[] } {
    return {
      date: new Date().toISOString().slice(0, 10),
      description: '',
      lines: [
        { accountCode: '', description: '', debit: 0, credit: 0 },
        { accountCode: '', description: '', debit: 0, credit: 0 },
      ],
    };
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
