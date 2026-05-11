import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProductCostsService } from 'src/app/shared/services/lista-precios/product-costs.service';
import { ImportarCostosModalComponent } from '../importar-costos-modal/importar-costos-modal.component';

interface ImportSummary {
  id: string;
  fileName: string | null;
  fuente: string;
  importedAtISO?: string;
  importedAt?: any;
  importedBy?: string;
  totalProcesados?: number;
  totalFallidos?: number;
  summary?: {
    matched?: number;
    unmatched?: number;
    noChange?: number;
    deltaTotal?: number;
    costoTotalAntes?: number;
    costoTotalDespues?: number;
  };
}

@Component({
  selector: 'app-lista-precios-costos',
  templateUrl: './lista-precios-costos.component.html',
  styleUrls: ['./lista-precios-costos.component.scss'],
})
export class ListaPreciosCostosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  cargando = false;
  imports: ImportSummary[] = [];
  ultimoImport: ImportSummary | null = null;

  constructor(
    private costsService: ProductCostsService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.cargarImports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarImports() {
    this.cargando = true;
    this.costsService.listImports(20).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.imports = res?.imports || [];
        this.ultimoImport = this.imports[0] || null;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  abrirModalImport() {
    const modalRef = this.modalService.open(ImportarCostosModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.result.then(
      (res) => {
        if (res?.result === 'applied') {
          this.cargarImports();
        }
      },
      () => {},
    );
  }

  formatCOP(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return '$0';
    return `$${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  }

  formatDate(t: any): string {
    if (!t) return '—';
    if (typeof t === 'string') return new Date(t).toLocaleString('es-CO');
    if (t._seconds) return new Date(t._seconds * 1000).toLocaleString('es-CO');
    if (t.seconds) return new Date(t.seconds * 1000).toLocaleString('es-CO');
    return '—';
  }
}
