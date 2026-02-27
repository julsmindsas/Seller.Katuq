import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { PosV2SellerSalesReport } from '../../models/pos-v2.models';
import { Router } from '@angular/router';

interface SellerRow {
  name: string;
  email: string;
  orderCount: number;
  totalSales: number;
  averageTicket: number;
  percentage: number;
}

@Component({
  selector: 'app-pos-v2-sales-by-seller',
  templateUrl: './sales-by-seller.component.html',
  styleUrls: ['./sales-by-seller.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesBySellerComponent implements OnInit {
  sellers: SellerRow[] = [];
  totalSales = 0;
  totalOrders = 0;
  loading = true;
  error = '';

  selectedPeriod: 'today' | 'week' | 'custom' = 'today';
  customFrom = '';
  customTo = '';

  sortColumn: keyof SellerRow = 'totalSales';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private apiService: PosV2ApiService,
    private terminalService: PosV2TerminalService,
    private router: Router,
    private cdr: ChangeDetectorRef
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

    this.loading = true;
    this.error = '';

    const { from, to } = this.getDateRange();

    this.apiService.getSalesBySeller(terminal.id, from, to).subscribe({
      next: (res: PosV2SellerSalesReport) => {
        this.sellers = (res.sellers || []).map(s => ({
          name: s.seller?.nombre || 'Sin vendedor',
          email: s.seller?.email || '',
          orderCount: s.orderCount || 0,
          totalSales: s.totalSales || 0,
          averageTicket: s.averageTicket || 0,
          percentage: s.percentage || 0
        }));
        this.totalSales = this.sellers.reduce((sum, s) => sum + s.totalSales, 0);
        this.totalOrders = this.sellers.reduce((sum, s) => sum + s.orderCount, 0);
        this.sortData();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error al cargar el reporte de ventas por vendedor';
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
      this.loadReport();
    }
  }

  onCustomDateApply(): void {
    if (this.customFrom && this.customTo) {
      this.loadReport();
    }
  }

  toggleSort(column: keyof SellerRow): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.sortData();
    this.cdr.markForCheck();
  }

  private sortData(): void {
    this.sellers.sort((a, b) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];
      const modifier = this.sortDirection === 'asc' ? 1 : -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * modifier;
      }
      return String(valA).localeCompare(String(valB)) * modifier;
    });
  }

  printReport(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/pos-v2']);
  }

  trackByIndex(index: number): number {
    return index;
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'pi pi-sort-alt';
    return this.sortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
  }
}
