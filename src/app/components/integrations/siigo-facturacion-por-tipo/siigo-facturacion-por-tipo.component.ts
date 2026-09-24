import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IntegrationsService } from '../integrations.service';

interface TipoFactura {
  id: number;
  nombre: string;
  electronica: boolean;
  vendedorPorProducto: boolean;
  centroCostoObligatorio: boolean;
}

interface OpcionSiigo {
  id: number;
  nombre: string;
}

interface AjusteTipo {
  costCenterId: number | null;
  sellerId: number | null;
}

/**
 * Ticket 1052: centro de costo y vendedor con que Katuq factura en cada tipo de factura
 * del SIIGO del comercio. Cada tipo puede ser una sede con su propio centro de costo y sus
 * vendedores (ALMACEN BOMBAS). Se guarda en la configuración de SIIGO como
 * `documentTypeSettings: { <idTipo>: { costCenterId, sellerId } }`, sin tocar las
 * credenciales (el backend fusiona con lo guardado).
 */
@Component({
  selector: 'app-siigo-facturacion-por-tipo',
  templateUrl: './siigo-facturacion-por-tipo.component.html',
  styleUrls: ['./siigo-facturacion-por-tipo.component.scss']
})
export class SiigoFacturacionPorTipoComponent implements OnInit, OnDestroy {
  tipos: TipoFactura[] = [];
  centros: OpcionSiigo[] = [];
  vendedores: OpcionSiigo[] = [];
  ajustes: Record<number, AjusteTipo> = {};
  cargando = true;
  guardando = false;
  errorCarga = '';

  private destroy$ = new Subject<void>();

  constructor(private integrationsService: IntegrationsService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = '';
    forkJoin({
      tipos: this.integrationsService.getSiigoDocumentTypes().pipe(catchError(() => of(null))),
      centros: this.integrationsService.getSiigoCostCenters().pipe(catchError(() => of(null))),
      vendedores: this.integrationsService.getSiigoSellers().pipe(catchError(() => of(null))),
      config: this.integrationsService.loadSiigoConfig().pipe(catchError(() => of(null)))
    })
      .pipe(takeUntil(this.destroy$), finalize(() => (this.cargando = false)))
      .subscribe(({ tipos, centros, vendedores, config }) => {
        const listaTipos = this.lista(tipos?.data, 'documentTypes');
        if (!tipos || listaTipos.length === 0) {
          this.errorCarga = 'No se pudieron leer los tipos de factura de tu SIIGO. Revisa la conexión e inténtalo de nuevo.';
          return;
        }
        this.tipos = listaTipos
          .filter((t: any) => t && t.active !== false)
          .map((t: any) => ({
            id: Number(t.id),
            nombre: t.name || `Tipo ${t.id}`,
            electronica: t.electronic_type === 'ElectronicInvoice',
            vendedorPorProducto: t.seller_by_item === true,
            centroCostoObligatorio: t.cost_center_mandatory === true
          }))
          .sort((a: TipoFactura, b: TipoFactura) => Number(b.electronica) - Number(a.electronica));

        this.centros = this.lista(centros?.data, 'costCenters')
          .filter((c: any) => c && c.active !== false)
          .map((c: any) => ({ id: Number(c.id), nombre: [c.code, c.name].filter(Boolean).join(' · ') || `Centro ${c.id}` }));
        this.vendedores = this.lista(vendedores?.data, 'sellers')
          .map((v: any) => ({ id: Number(v.id), nombre: v.nombre || v.first_name || `Vendedor ${v.id}` }));

        const guardado = (config?.config?.config ?? config?.config ?? {}).documentTypeSettings || {};
        this.ajustes = {};
        for (const t of this.tipos) {
          const g = guardado[String(t.id)] || {};
          this.ajustes[t.id] = { costCenterId: this.id(g.costCenterId), sellerId: this.id(g.sellerId) };
        }
      });
  }

  /** Un tipo que exige centro de costo y no lo tiene: SIIGO rechazaría sus facturas. */
  faltaCentro(t: TipoFactura): boolean {
    return t.centroCostoObligatorio && !this.ajustes[t.id]?.costCenterId;
  }

  guardar(): void {
    const documentTypeSettings: Record<string, AjusteTipo> = {};
    for (const t of this.tipos) {
      const a = this.ajustes[t.id];
      if (a && (a.costCenterId || a.sellerId)) {
        documentTypeSettings[String(t.id)] = { costCenterId: this.id(a.costCenterId), sellerId: this.id(a.sellerId) };
      }
    }
    this.guardando = true;
    this.integrationsService.saveSiigoConfig({ documentTypeSettings })
      .pipe(takeUntil(this.destroy$), finalize(() => (this.guardando = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Guardado', text: 'Katuq va a facturar con este centro de costo y este vendedor en cada tipo de factura.', timer: 2500, showConfirmButton: false });
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err?.error?.message || 'Inténtalo de nuevo en un momento.' });
        }
      });
  }

  private lista(data: any, llave: string): any[] {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data[llave])) return data[llave];
    return [];
  }

  private id(valor: any): number | null {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
}
