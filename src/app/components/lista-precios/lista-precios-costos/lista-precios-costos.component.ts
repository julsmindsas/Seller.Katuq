import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProductCostsService } from 'src/app/shared/services/lista-precios/product-costs.service';
import { InventarioService } from 'src/app/shared/services/inventarios/inventario.service';
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

  /** Items del dropdown "Acciones": importar costos + exportar inventario. */
  accionesMenuItems = [
    {
      label: 'Importar Excel de costos',
      icon: 'pi pi-cloud-upload',
      command: () => this.abrirModalImport(),
    },
    {
      label: 'Exportar inventario a Excel',
      icon: 'pi pi-file-excel',
      command: () => this.exportarInventarioExcel(),
    },
  ];
  exportandoExcel = false;

  constructor(
    private costsService: ProductCostsService,
    private inventarioService: InventarioService,
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

  /** Descarga el Excel consolidado del inventario completo (sin filtros). */
  exportarInventarioExcel(): void {
    if (this.exportandoExcel) return;
    this.exportandoExcel = true;
    this.inventarioService.exportarInventarioExcel({ soloInventariables: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error('Error guardando archivo Excel', err);
          }
          this.exportandoExcel = false;
        },
        error: (err) => {
          console.error('Error exportando inventario', err);
          this.exportandoExcel = false;
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
