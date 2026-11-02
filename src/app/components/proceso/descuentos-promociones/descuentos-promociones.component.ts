import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { CrearDescuentoPromocionComponent } from './crear-descuento-promocion/crear-descuento-promocion.component';
import { HistorialRedencionesComponent } from './historial-redenciones/historial-redenciones.component';

@Component({
  selector: 'app-descuentos-promociones',
  templateUrl: './descuentos-promociones.component.html',
  styleUrls: ['./descuentos-promociones.component.scss']
})
export class DescuentosPromocionesComponent implements OnInit {
  cargando = false;
  rows = [];
  temp = [];
  isMobile = false;

  constructor(
    private service: MaestroService,
    private modalService: NgbModal,
    private translate: TranslateService
  ) {
    this.cargarDatos();
  }

  ngOnInit(): void {}

  cargarDatos() {
    this.cargando = true;
    this.service.consultarDescuentosPromociones().subscribe({
      next: (data: any) => {
        this.rows = data || [];
        this.temp = [...this.rows];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando descuentos y promociones:', error);
        this.cargando = false;
      }
    });
  }

  openCrearModal(naturaleza: 'codigo' | 'promocion' = 'codigo') {
    const modalRef = this.modalService.open(CrearDescuentoPromocionComponent, {
      size: 'lg',
      centered: true
    });
    modalRef.componentInstance.mostrarCrear = true;
    modalRef.componentInstance.naturaleza = naturaleza;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    }).catch(() => {});
  }

  openEditarModal(row: any) {
    const modalRef = this.modalService.open(CrearDescuentoPromocionComponent, {
      size: 'lg',
      centered: true
    });

    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.descuentoData = row;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    }).catch(() => {});
  }

  eliminar(row: any) {
    // IMPORTANTE: el backend NO borra físicamente — desactiva el documento
    // para preservar el historial de redenciones ligado al código
    Swal.fire({
      title: this.translate.instant('proceso.descuentosPromociones.desactivarTitulo'),
      text: this.translate.instant('proceso.descuentosPromociones.desactivarTexto', { nombre: row.nombre }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('proceso.descuentosPromociones.siDesactivar'),
      cancelButtonText: this.translate.instant('comun.cancelar')
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteDescuentoPromocion({ id: row.id }).subscribe({
          next: () => {
            Swal.fire(this.translate.instant('proceso.descuentosPromociones.desactivado'), this.translate.instant('proceso.descuentosPromociones.desactivadoTexto'), 'success');
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error desactivando:', error);
            Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.descuentosPromociones.errorDesactivar'), 'error');
          }
        });
      }
    });
  }

  /**
   * Borrado permanente (físico). Solo disponible cuando el registro ya está
   * inhabilitado (activo === false). El historial de redenciones se conserva.
   */
  eliminarPermanente(row: any) {
    const esPromocion = row.naturaleza === 'promocion';
    Swal.fire({
      title: this.translate.instant('proceso.descuentosPromociones.eliminarPermanenteTitulo'),
      text: this.translate.instant('proceso.descuentosPromociones.eliminarPermanenteTexto', { nombre: row.nombre }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('proceso.comun.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deletePermanentDescuentoPromocion({ id: row.id }).subscribe({
          next: () => {
            Swal.fire(this.translate.instant('proceso.descuentosPromociones.eliminado'), this.translate.instant(esPromocion ? 'proceso.descuentosPromociones.eliminadaPromocion' : 'proceso.descuentosPromociones.eliminadoCodigo'), 'success');
            this.cargarDatos();
          },
          error: (error) => {
            const msg = error?.error?.message || this.translate.instant(esPromocion ? 'proceso.descuentosPromociones.errorEliminarPromocion' : 'proceso.descuentosPromociones.errorEliminarCodigo');
            Swal.fire(this.translate.instant('comun.error'), msg, 'error');
          }
        });
      }
    });
  }

  /** true si el código ya tiene al menos una redención. */
  fueRedimido(row: any): boolean {
    return (row?.usosActuales || 0) > 0;
  }

  /** Abre el modal con el historial de redenciones del código. */
  verHistorial(row: any) {
    const modalRef = this.modalService.open(HistorialRedencionesComponent, {
      size: 'lg',
      centered: true
    });
    modalRef.componentInstance.descuento = row;
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    const temp = this.temp.filter(function (d) {
      const res1 = d.nombre?.toLowerCase().indexOf(val) !== -1 || !val;
      const res2 = d.codigoPersonalizado?.toLowerCase().indexOf(val) !== -1 || !val;
      return res1 || res2;
    });

    this.rows = temp;
  }

  /** Clave de traducción del badge de cada estado (el estado no cambia). */
  readonly estadoClaves: Record<string, string> = {
    vigente: 'proceso.descuentosPromociones.estadoVigente',
    agotado: 'proceso.descuentosPromociones.estadoAgotado',
    vencido: 'proceso.descuentosPromociones.estadoVencido',
    inactivo: 'proceso.descuentosPromociones.estadoInactivo',
  };

  // 4 estados posibles para el badge
  getEstado(row: any): 'vigente' | 'agotado' | 'vencido' | 'inactivo' {
    if (!row.activo) { return 'inactivo'; }
    if (row.limiteUsos !== null && row.limiteUsos !== undefined && row.usosActuales >= row.limiteUsos) { return 'agotado'; }
    const hoy = new Date().toISOString().split('T')[0];
    if (row.fechaFin < hoy) { return 'vencido'; }
    if (row.fechaInicio <= hoy && row.fechaFin >= hoy) { return 'vigente'; }
    return 'inactivo';
  }
}
