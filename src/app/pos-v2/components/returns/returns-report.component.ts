import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { PosV2ReturnOrder } from '../../models/pos-v2.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pos-v2-returns-report',
  templateUrl: './returns-report.component.html',
  styleUrls: ['./returns-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReturnsReportComponent implements OnInit {
  returns: PosV2ReturnOrder[] = [];
  loading = true;
  error = '';
  showReturnDialog = false;

  selectedPeriod: 'today' | 'week' | 'custom' = 'today';
  customFrom = '';
  customTo = '';

  readonly reasonLabels: Record<string, string> = {
    defective: 'Defectuoso',
    exchange: 'Cambio',
    regret: 'Arrepentimiento',
    price_error: 'Error de precio',
    other: 'Otro'
  };

  constructor(
    private apiService: PosV2ApiService,
    private terminalService: PosV2TerminalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReturns();
  }

  get totalRefunded(): number {
    return this.returns.reduce((sum, r) => sum + (r.returnInfo?.totalRefunded || 0), 0);
  }

  get mostCommonReason(): string {
    if (!this.returns.length) return '-';
    const counts: Record<string, number> = {};
    this.returns.forEach(r => {
      const reason = r.returnInfo?.reason || 'other';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? (this.reasonLabels[top[0]] || top[0]) : '-';
  }

  loadReturns(): void {
    const terminal = this.terminalService.getTerminalSnapshot();
    if (!terminal?.id) {
      this.error = 'No hay terminal seleccionado';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = '';

    const { from, to } = this.getDateRange();

    this.apiService.getReturns(terminal.id, from, to).subscribe({
      next: (response) => {
        this.returns = response?.returns || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error al cargar las devoluciones';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getDateRange(): { from?: string; to?: string } {
    const now = new Date();
    if (this.selectedPeriod === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: todayStart.toISOString(), to: now.toISOString() };
    }
    if (this.selectedPeriod === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return { from: weekStart.toISOString(), to: now.toISOString() };
    }
    return {
      from: this.customFrom ? new Date(this.customFrom).toISOString() : undefined,
      to: this.customTo ? new Date(this.customTo).toISOString() : undefined
    };
  }

  onPeriodChange(period: 'today' | 'week' | 'custom'): void {
    this.selectedPeriod = period;
    if (period !== 'custom') {
      this.loadReturns();
    }
  }

  onCustomDateApply(): void {
    if (this.customFrom && this.customTo) {
      this.loadReturns();
    }
  }

  openReturnDialog(): void {
    this.showReturnDialog = true;
    this.cdr.markForCheck();
  }

  onReturnCreated(): void {
    this.showReturnDialog = false;
    this.loadReturns();
  }

  onReturnDialogClosed(): void {
    this.showReturnDialog = false;
    this.cdr.markForCheck();
  }

  printReport(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/pos-v2']);
  }

  trackByReturnId(index: number, item: PosV2ReturnOrder): string {
    return item._id;
  }

  getReasonLabel(reason: string | undefined): string {
    if (!reason) return '-';
    return this.reasonLabels[reason] || reason;
  }
}
