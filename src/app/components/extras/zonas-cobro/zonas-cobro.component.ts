import { Component, OnInit } from '@angular/core';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearZonasCobroComponent } from './crear-zonas-cobro/crear-zonas-cobro.component';
import { ZonaCobro, normalizeZonasCobro } from 'src/app/shared/util/zona-cobro.util';

/**
 * Lista de zonas de cobro (spec 011 v2, T-08). Una fila por zona-paquete
 * (nombre, valor, impuesto, total, nº municipios). El detalle expandible muestra
 * los municipios que cubre, con buscador. Tolera docs legacy vía normalizeZonasCobro.
 */
@Component({
  selector: 'app-zonas-cobro',
  templateUrl: './zonas-cobro.component.html',
  styleUrls: ['./zonas-cobro.component.scss']
})
export class ZonasCobroComponent implements OnInit {
  cargando = false;
  rows: ZonaCobro[] = [];
  // Buscador de municipios por zona expandida (keyed por cd).
  filtroMunicipio: { [cd: string]: string } = {};
  // Selección múltiple (spec 011.1, D-054). Ligada a [(selection)] de la tabla;
  // el check del encabezado marca la PÁGINA visible (decisión del usuario).
  seleccionadas: ZonaCobro[] = [];

  constructor(
    private service: MaestroService,
    private modalService: NgbModal
  ) {
    this.cargarDatos();
  }

  ngOnInit(): void {
    sessionStorage.removeItem('billingZoneEdit');
  }

  cargarDatos(): void {
    this.cargando = true;
    this.seleccionadas = []; // limpia selección al recargar (los cd pueden cambiar)
    this.service.getBillingZone().subscribe((x: any) => {
      // Orden por fecha de creación DESC: la zona recién creada queda en la 1ª página.
      // Las que no tengan date_add van al final.
      this.rows = normalizeZonasCobro(x || []).sort((a, b) => this.ts(b) - this.ts(a));
      this.cargando = false;
    }, () => { this.cargando = false; });
  }

  /** Timestamp (ms) de date_add para ordenar; 0 si falta o es inválido. */
  private ts(z: ZonaCobro): number {
    const t = z && z.date_add ? Date.parse(z.date_add) : NaN;
    return isNaN(t) ? 0 : t;
  }

  /** Total de municipios en un conjunto de zonas (para los mensajes de confirmación). */
  private totalMunicipios(zonas: ZonaCobro[]): number {
    return (zonas || []).reduce((acc, z) => acc + (z.municipios?.length || 0), 0);
  }

  /** Municipios de una zona filtrados por el buscador de su detalle. */
  municipiosFiltrados(row: ZonaCobro): any[] {
    const q = (this.filtroMunicipio[row.cd] || '').trim().toLowerCase();
    const munis = row.municipios || [];
    if (!q) { return munis; }
    return munis.filter(m =>
      (m.ciudad || '').toLowerCase().includes(q) ||
      (m.departamento || '').toLowerCase().includes(q) ||
      (m.codigoDane || '').toLowerCase().includes(q)
    );
  }

  crearZonaCobro(): void {
    sessionStorage.removeItem('billingZoneEdit');
    this.openZonasCobroModal();
  }

  edit(row: ZonaCobro): void {
    sessionStorage.setItem('billingZoneEdit', JSON.stringify(row));
    this.openZonasCobroModal();
  }

  openZonasCobroModal(): void {
    const modalRef = this.modalService.open(CrearZonasCobroComponent, {
      size: 'lg', backdrop: 'static', keyboard: false
    });
    modalRef.result.then((result) => {
      if (result === 'success') { this.cargarDatos(); }
    }, () => { /* cierre sin cambios */ });
  }

  deleteBillingZone(row: ZonaCobro): void {
    Swal.fire({
      title: '¿Está seguro de eliminar esta zona de cobro?',
      text: `Se eliminará "${row.nombreZonaCobro}" con sus ${row.municipios?.length || 0} municipios.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteBillingZone(row).subscribe(() => {
          Swal.fire('Eliminado!', 'La zona de cobro ha sido eliminada.', 'success');
          this.cargarDatos();
        });
      }
    });
  }

  /** Borra las zonas marcadas con checkbox (spec 011.1, D-054). Una sola petición. */
  borrarSeleccionadas(): void {
    const n = this.seleccionadas.length;
    if (n === 0) { return; }
    const munis = this.totalMunicipios(this.seleccionadas);
    Swal.fire({
      title: `¿Eliminar ${n} zona${n === 1 ? '' : 's'} de cobro?`,
      text: `Se eliminarán ${n} zona${n === 1 ? '' : 's'} con ${munis} municipio${munis === 1 ? '' : 's'} en total. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (!result.isConfirmed) { return; }
      const cds = this.seleccionadas.map(z => z.cd).filter((cd): cd is string => !!cd);
      this.service.deleteBillingZonesBatch({ cds }).subscribe((r: any) => {
        Swal.fire('Eliminadas!', `Se eliminaron ${r?.deleted ?? cds.length} zonas de cobro.`, 'success');
        this.cargarDatos();
      }, () => {
        Swal.fire('Error', 'No se pudieron eliminar las zonas seleccionadas.', 'error');
      });
    });
  }

  /**
   * Borra TODAS las zonas de la empresa (spec 011.1, D-054). Confirmación reforzada:
   * el operador debe escribir la palabra ELIMINAR para habilitar el borrado.
   */
  borrarTodas(): void {
    const total = this.rows.length;
    if (total === 0) { return; }
    Swal.fire({
      title: '¿Eliminar TODAS las zonas de cobro?',
      html: `Vas a eliminar <b>${total}</b> zona${total === 1 ? '' : 's'} de cobro de esta empresa. ` +
        `Esta acción es <b>irreversible</b>.<br><br>Escribe <b>ELIMINAR</b> para confirmar:`,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'ELIMINAR',
      showCancelButton: true,
      confirmButtonText: 'Eliminar todas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true,
      inputValidator: (value) => (value === 'ELIMINAR' ? null : 'Escribe ELIMINAR (en mayúsculas) para confirmar')
    }).then((result) => {
      if (!result.isConfirmed || result.value !== 'ELIMINAR') { return; }
      this.service.deleteBillingZonesBatch({ all: true }).subscribe((r: any) => {
        Swal.fire('Eliminadas!', `Se eliminaron ${r?.deleted ?? total} zonas de cobro.`, 'success');
        this.cargarDatos();
      }, () => {
        Swal.fire('Error', 'No se pudieron eliminar las zonas.', 'error');
      });
    });
  }
}
