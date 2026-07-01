import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import Swal from 'sweetalert2';

/**
 * Mapeo de bodegas Katuq ↔ bodegas (warehouses) de SIIGO. (D-045 / D-046)
 *
 * Katuq es la fuente de verdad: las bodegas Katuq son las filas primarias; cada una
 * referencia su equivalente en SIIGO (id numérico). Este mapeo alimenta el campo
 * `warehouse` de la factura para que SIIGO descuente de la bodega correcta.
 *
 * - "Consultar bodegas de SIIGO": LEE el catálogo SIIGO (read-only, no importa nada a Katuq)
 *   para poblar el selector. SIIGO no tiene webhook de bodegas → sin tiempo real, es pull.
 * - "Auto-emparejar por nombre": conveniencia para pre-llenar coincidencias exactas de nombre.
 * - Persistencia quirúrgica en `warehouses.integrations.siigo.warehouseId` (dot-notation, no
 *   pisa otras integraciones). Multi-tenant: todo por la empresa logueada.
 */
interface SiigoWarehouse {
  id: number;
  name: string;
  active: boolean;
  has_movements?: boolean;
}

interface MappingRow {
  docId: string;
  idBodega: string;
  nombre: string;
  tipo?: string;
  selectedWarehouseId: number | null;
  originalWarehouseId: number | null;
  status: 'ok' | 'sin-mapear' | 'roto';
  saving?: boolean;
}

@Component({
  selector: 'app-siigo-bodega-mapping',
  templateUrl: './siigo-bodega-mapping.component.html',
  styleUrls: ['./siigo-bodega-mapping.component.scss']
})
export class SiigoBodegaMappingComponent implements OnInit {
  loading = false;
  loadingWarehouses = false;
  saving = false;

  rows: MappingRow[] = [];
  siigoWarehouses: SiigoWarehouse[] = [];
  /** Bodegas SIIGO sin equivalente mapeado en Katuq (informativo). */
  unmatchedSiigo: SiigoWarehouse[] = [];

  constructor(
    private bodegaService: BodegaService,
    private integrationsService: IntegrationsService,
    public activeModal: NgbActiveModal
  ) { }

  ngOnInit(): void {
    this.cargarBodegasKatuq();
  }

  /** Cierra el modal. */
  cerrar(): void {
    this.activeModal.dismiss();
  }

  /** Carga las bodegas de Katuq (filas primarias) y luego consulta las de SIIGO. */
  cargarBodegasKatuq(): void {
    this.loading = true;
    this.bodegaService.getBodegas().subscribe({
      next: (bodegas: any[]) => {
        this.rows = (bodegas || [])
          .filter(b => b && (b.idBodega || b.id))
          .map(b => {
            const mappedId = b?.integrations?.siigo?.warehouseId;
            const numId = (mappedId !== undefined && mappedId !== null && mappedId !== '')
              ? Number(mappedId)
              : null;
            return {
              docId: b.id || b.cd,
              idBodega: b.idBodega,
              nombre: b.nombre,
              tipo: b.tipo,
              selectedWarehouseId: numId,
              originalWarehouseId: numId,
              status: 'sin-mapear'
            } as MappingRow;
          });
        // Encadena la consulta del catálogo SIIGO (también recalcula estados).
        this.consultarBodegasSiigo();
      },
      error: () => {
        this.loading = false;
        this.toast('error', 'No se pudieron cargar las bodegas de Katuq');
      }
    });
  }

  /**
   * Lee el catálogo de bodegas de SIIGO (pull on-demand). NO importa ni modifica
   * las bodegas de Katuq: solo obtiene los IDs de SIIGO para el selector.
   */
  consultarBodegasSiigo(): void {
    this.loadingWarehouses = true;
    this.integrationsService.getSiigoWarehouses().subscribe({
      next: (resp: any) => {
        const data = resp?.data || resp?.warehouses || [];
        this.siigoWarehouses = (Array.isArray(data) ? data : [])
          .map((w: any) => ({
            id: Number(w.id),
            name: w.name,
            active: w.active !== false,
            has_movements: w.has_movements
          }))
          .filter((w: SiigoWarehouse) => !Number.isNaN(w.id));
        this.recomputeStatus();
        this.computeUnmatched();
        this.loadingWarehouses = false;
        this.loading = false;
      },
      error: () => {
        this.loadingWarehouses = false;
        this.loading = false;
        this.toast('error', 'No se pudieron consultar las bodegas de SIIGO. Verificá la configuración de la integración.');
      }
    });
  }

  /** Recalcula el badge de estado por fila contra el catálogo SIIGO vivo. */
  recomputeStatus(): void {
    const byId = new Map(this.siigoWarehouses.map(w => [w.id, w]));
    this.rows.forEach(r => {
      if (r.selectedWarehouseId === null) {
        r.status = 'sin-mapear';
        return;
      }
      const w = byId.get(Number(r.selectedWarehouseId));
      r.status = (w && w.active) ? 'ok' : 'roto';
    });
  }

  /** Bodegas SIIGO que ningún Katuq referencia (informativo). */
  computeUnmatched(): void {
    const mapped = new Set(
      this.rows.map(r => r.selectedWarehouseId).filter(v => v !== null).map(Number)
    );
    this.unmatchedSiigo = this.siigoWarehouses.filter(w => !mapped.has(w.id));
  }

  onSelectChange(): void {
    this.recomputeStatus();
    this.computeUnmatched();
  }

  /** Pre-llena el mapeo cuando el nombre de la bodega Katuq coincide con uno de SIIGO. */
  autoMatchByName(): void {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    const byName = new Map(this.siigoWarehouses.map(w => [norm(w.name), w]));
    let matched = 0;
    this.rows.forEach(r => {
      if (r.selectedWarehouseId === null) {
        const w = byName.get(norm(r.nombre));
        if (w) {
          r.selectedWarehouseId = w.id;
          matched++;
        }
      }
    });
    this.recomputeStatus();
    this.computeUnmatched();
    this.toast(
      matched > 0 ? 'success' : 'info',
      matched > 0
        ? `${matched} bodega(s) emparejada(s) por nombre. Revisá y guardá.`
        : 'No se encontraron coincidencias exactas por nombre.'
    );
  }

  /** Filas con cambios sin guardar. */
  get dirtyRows(): MappingRow[] {
    return this.rows.filter(r => Number(r.selectedWarehouseId) !== Number(r.originalWarehouseId));
  }

  get hayCatalogoSiigo(): boolean {
    return this.siigoWarehouses.length > 0;
  }

  /** Persiste un mapeo (o lo limpia) de forma quirúrgica vía dot-notation. */
  private buildPayload(row: MappingRow): any {
    const w = this.siigoWarehouses.find(x => x.id === Number(row.selectedWarehouseId));
    const payload: any = { id: row.docId };
    payload['integrations.siigo.warehouseId'] = row.selectedWarehouseId === null ? null : Number(row.selectedWarehouseId);
    payload['integrations.siigo.warehouseName'] = row.selectedWarehouseId === null ? null : (w?.name || null);
    payload['integrations.siigo.mappedAt'] = new Date().toISOString();
    return payload;
  }

  guardarFila(row: MappingRow): void {
    row.saving = true;
    this.bodegaService.actualizarBodega(this.buildPayload(row)).subscribe({
      next: () => {
        row.originalWarehouseId = row.selectedWarehouseId;
        row.saving = false;
        this.recomputeStatus();
        this.toast('success', `Bodega "${row.nombre}" guardada`);
      },
      error: () => {
        row.saving = false;
        this.toast('error', `No se pudo guardar "${row.nombre}"`);
      }
    });
  }

  guardarTodo(): void {
    const dirty = this.dirtyRows;
    if (!dirty.length) {
      this.toast('info', 'No hay cambios para guardar.');
      return;
    }
    this.saving = true;
    let done = 0;
    let ok = 0;
    const finish = () => {
      done++;
      if (done === dirty.length) {
        this.saving = false;
        this.recomputeStatus();
        this.toast(ok === dirty.length ? 'success' : 'warning', `${ok}/${dirty.length} bodega(s) guardada(s)`);
      }
    };
    dirty.forEach(row => {
      this.bodegaService.actualizarBodega(this.buildPayload(row)).subscribe({
        next: () => { row.originalWarehouseId = row.selectedWarehouseId; ok++; finish(); },
        error: () => { finish(); }
      });
    });
  }

  limpiarFila(row: MappingRow): void {
    row.selectedWarehouseId = null;
    this.onSelectChange();
  }

  private toast(icon: 'success' | 'error' | 'info' | 'warning', title: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true
    });
  }
}
