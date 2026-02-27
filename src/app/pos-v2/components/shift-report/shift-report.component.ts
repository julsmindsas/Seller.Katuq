import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { PosV2ShiftReport } from '../../models/pos-v2.models';

@Component({
  selector: 'app-pos-v2-shift-report',
  templateUrl: './shift-report.component.html',
  styleUrls: ['./shift-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftReportComponent implements OnInit {
  report: PosV2ShiftReport | null = null;
  loading = true;
  error = '';

  /** Resolved terminal name for display (from terminal service snapshot). */
  terminalName = '';

  constructor(
    private apiService: PosV2ApiService,
    private terminalService: PosV2TerminalService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    const terminal = this.terminalService.getTerminalSnapshot();
    if (!terminal?.id) {
      this.error = 'No hay terminal seleccionado';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.terminalName = terminal.name || 'Terminal';
    this.loading = true;
    this.error = '';
    this.apiService.getShiftReport(terminal.id).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error al cargar el reporte';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get expectedCash(): number {
    if (!this.report) return 0;
    const register = this.terminalService.getCashRegisterSnapshot();
    const initial = register?.initialAmount || 0;
    const cashEntry = this.report.salesByPaymentMethod?.['Efectivo'];
    const cashSales = cashEntry?.total || 0;
    const cashIn = this.getCashMovementTotal('in');
    const cashOut = this.getCashMovementTotal('out');
    return initial + cashSales + cashIn - cashOut;
  }

  get salesMethodEntries(): { method: string; count: number; total: number }[] {
    if (!this.report?.salesByPaymentMethod) return [];
    return Object.entries(this.report.salesByPaymentMethod)
      .filter(([, entry]) => entry.total > 0)
      .map(([method, entry]) => ({
        method,
        count: entry.count,
        total: entry.total
      }));
  }

  getCashMovementTotal(type: 'in' | 'out'): number {
    if (!this.report?.cashMovements) return 0;
    return this.report.cashMovements
      .filter(m => m.type === type)
      .reduce((sum, m) => sum + m.amount, 0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  printReport(): void {
    window.print();
  }

  goToZReport(): void {
    this.router.navigate(['/pos-v2/z-report']);
  }

  goToSalesBySeller(): void {
    this.router.navigate(['/pos-v2/sales-by-seller']);
  }

  goToReturns(): void {
    this.router.navigate(['/pos-v2/returns']);
  }

  goBack(): void {
    this.router.navigate(['/pos-v2']);
  }
}
