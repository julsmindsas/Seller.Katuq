import { Component, OnInit } from '@angular/core';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-bodega-detalle',
  templateUrl: './bodega-detalle.component.html',
  styleUrls: ['./bodega-detalle.component.scss']
})
export class BodegaDetalleComponent implements OnInit {
  bodegas: any[] = [];
  bodegaSeleccionadaId = '';
  bodegaInfo: any = null;
  productos: any[] = [];
  totales: any = { totalSKUs: 0, totalUnidades: 0, valorTotal: 0, agotados: 0 };
  pagination: any = { page: 1, totalPages: 0, totalItems: 0, limit: 20 };
  searchTerm = '';
  loading = false;
  loadingBodegas = false;

  private _searchTimeout: any;

  constructor(
    private inventarioService: InventarioService,
    private bodegaService: BodegaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargarBodegas();
  }

  cargarBodegas(): void {
    this.loadingBodegas = true;
    this.bodegaService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        this.loadingBodegas = false;
        if (bodegas.length === 1) {
          this.bodegaSeleccionadaId = bodegas[0].idBodega;
          this.cargarDetalle();
        }
      },
      error: () => {
        this.toastr.error('Error al cargar bodegas');
        this.loadingBodegas = false;
      }
    });
  }

  onBodegaChange(): void {
    if (this.bodegaSeleccionadaId) {
      this.pagination.page = 1;
      this.searchTerm = '';
      this.cargarDetalle();
    } else {
      this.productos = [];
      this.bodegaInfo = null;
      this.totales = { totalSKUs: 0, totalUnidades: 0, valorTotal: 0, agotados: 0 };
    }
  }

  onSearchInput(): void {
    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      this.pagination.page = 1;
      this.cargarDetalle();
    }, 500);
  }

  cargarDetalle(): void {
    if (!this.bodegaSeleccionadaId) return;
    this.loading = true;

    this.inventarioService.getBodegaDetalle({
      bodegaId: this.bodegaSeleccionadaId,
      search: this.searchTerm?.trim() || undefined,
      page: this.pagination.page,
      limit: this.pagination.limit
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.bodegaInfo = res.bodega;
          this.productos = res.productos;
          this.totales = res.totales;
          this.pagination = { ...this.pagination, ...res.pagination };
        } else {
          this.toastr.error('Error al cargar detalle');
        }
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Error al cargar detalle de bodega');
        this.loading = false;
      }
    });
  }

  onPageChange(event: any): void {
    const page = Math.floor((event.first || 0) / (event.rows || this.pagination.limit)) + 1;
    this.pagination.page = page;
    this.pagination.limit = event.rows || this.pagination.limit;
    this.cargarDetalle();
  }

  exportarExcel(): void {
    if (!this.productos.length) return;
    const data = this.productos.map(p => ({
      'Referencia': p.referencia,
      'Nombre': p.nombre,
      'Cantidad': p.cantidad,
      'Precio Unitario': p.precioUnitario,
      'Valor Total': p.valorTotal
    }));
    data.push({
      'Referencia': '',
      'Nombre': 'TOTALES',
      'Cantidad': this.totales.totalUnidades,
      'Precio Unitario': '',
      'Valor Total': this.totales.valorTotal
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    const nombre = this.bodegaInfo?.nombre || 'bodega';
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Inventario_${nombre}_${fecha}.xlsx`);
  }
}
