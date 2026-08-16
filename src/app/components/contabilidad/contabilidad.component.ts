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

  constructor(private bookkeeping: BookkeepingService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  get isReady(): boolean {
    return this.overview?.settings?.setupStatus === 'ready';
  }

  get filteredEntries(): JournalEntry[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.entries;
    return this.entries.filter((entry) => [entry.number, entry.description, entry.documentNumber, entry.sourceType]
      .filter(Boolean).join(' ').toLowerCase().includes(term));
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
        error: (error) => this.error = this.errorMessage(error, 'No fue posible cargar la contabilidad.'),
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
      error: (error) => this.error = this.errorMessage(error, 'No fue posible cargar los libros del período.'),
    });
  }

  initialize(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Crear el plan contable inicial?',
      html: '<p>Katuq preparará 14 cuentas básicas para ventas, recaudos, IVA, clientes, caja, bancos, inventario y gastos.</p><p class="mb-0"><strong>Todavía no contabilizará automáticamente:</strong> primero podrá revisarlas.</p>',
      showCancelButton: true,
      confirmButtonText: 'Sí, preparar contabilidad',
      cancelButtonText: 'Ahora no',
      confirmButtonColor: '#2f6fed',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.saving = true;
      this.bookkeeping.initialize().pipe(finalize(() => this.saving = false)).subscribe({
        next: () => {
          this.activeTab = 'settings';
          this.loadAll();
          Swal.fire({ icon: 'success', title: 'Plan inicial preparado', text: 'Revise las siete cuentas principales y active cuando estén correctas.' });
        },
        error: (error) => Swal.fire({ icon: 'error', title: 'No se pudo preparar', text: this.errorMessage(error, 'Inténtelo nuevamente.') }),
      });
    });
  }

  activate(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Confirmar y activar contabilidad',
      html: '<p>Desde este momento las facturas, notas DIAN y pagos aprobados crearán comprobantes contabilizados.</p><p>Confirme que revisó las cuentas con la persona responsable de la contabilidad.</p>',
      input: 'checkbox',
      inputValue: 0,
      inputPlaceholder: 'Sí, revisé las cuentas principales',
      inputValidator: (value) => value ? null : 'Debe confirmar la revisión para continuar.',
      showCancelButton: true,
      confirmButtonText: 'Activar contabilidad',
      cancelButtonText: 'Seguir revisando',
      confirmButtonColor: '#198754',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.saving = true;
      this.bookkeeping.activate(this.accountMapping).pipe(finalize(() => this.saving = false)).subscribe({
        next: (response) => {
          this.activeTab = 'summary';
          this.loadAll();
          const created = (response?.sync?.dian?.created || 0) + (response?.sync?.treasury?.created || 0);
          Swal.fire({ icon: 'success', title: 'Contabilidad activada', text: `${created} movimiento${created === 1 ? '' : 's'} anterior${created === 1 ? '' : 'es'} fue${created === 1 ? '' : 'ron'} incorporado${created === 1 ? '' : 's'}.` });
        },
        error: (error) => Swal.fire({ icon: 'error', title: 'No se pudo activar', text: this.errorMessage(error, 'Revise las cuentas e inténtelo nuevamente.') }),
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
        Swal.fire({ icon: 'success', title: 'Configuración guardada', timer: 1600, showConfirmButton: false });
      },
      error: (error) => Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: this.errorMessage(error, 'Revise la selección de cuentas.') }),
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
        Swal.fire({ icon: 'success', title: 'Movimientos revisados', text: `Nuevos: ${created}. Ya existentes: ${existing}. Históricos incompletos: ${skipped}.` });
      },
      error: (error) => Swal.fire({ icon: 'error', title: 'No se pudo sincronizar', text: this.errorMessage(error, 'Inténtelo nuevamente.') }),
    });
  }

  saveManualEntry(): void {
    const totals = this.manualTotals;
    if (!this.manual.description.trim() || totals.debit <= 0 || Math.abs(totals.difference) > 0.009) {
      Swal.fire({ icon: 'info', title: 'El comprobante todavía no está listo', text: 'Escriba el concepto y verifique que débitos y créditos sean iguales.' });
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
          Swal.fire({ icon: 'success', title: 'Comprobante contabilizado', timer: 1800, showConfirmButton: false });
        },
        error: (error) => Swal.fire({ icon: 'error', title: 'No se pudo contabilizar', text: this.errorMessage(error, 'Revise los movimientos.') }),
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
