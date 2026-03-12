import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { PosV2ZReport } from '../../models/pos-v2.models';

@Component({
  selector: 'app-pos-v2-z-report',
  templateUrl: './z-report.component.html',
  styleUrls: ['./z-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZReportComponent implements OnInit {
  report: PosV2ZReport | null = null;
  loading = true;
  error = '';

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
    const register = this.terminalService.getCashRegisterSnapshot();
    const registerId = register?.id || this.terminalService.getLastClosedRegisterId();
    if (!registerId) {
      this.error = 'No hay caja para generar el reporte Z';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = '';
    this.apiService.getZReport(registerId).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error al cargar el reporte Z';
        this.loading = false;
        this.cdr.markForCheck();
      }
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
}
