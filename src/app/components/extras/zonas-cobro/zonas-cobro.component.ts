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
    this.service.getBillingZone().subscribe((x: any) => {
      this.rows = normalizeZonasCobro(x || []);
      this.cargando = false;
    }, () => { this.cargando = false; });
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
}
