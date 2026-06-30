import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearDescuentoPromocionComponent } from './crear-descuento-promocion/crear-descuento-promocion.component';

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
    private modalService: NgbModal
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

  openCrearModal() {
    const modalRef = this.modalService.open(CrearDescuentoPromocionComponent, {
      size: 'lg',
      centered: true
    });
    modalRef.componentInstance.mostrarCrear = true;

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
      title: '¿Desactivar descuento?',
      text: `"${row.nombre}" será desactivado. El historial de usos se conservará para preservar la integridad de los pedidos que usaron el código.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteDescuentoPromocion({ id: row.id }).subscribe({
          next: () => {
            Swal.fire('Desactivado', 'El descuento ha sido desactivado', 'success');
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error desactivando:', error);
            Swal.fire('Error', 'No se pudo desactivar el descuento', 'error');
          }
        });
      }
    });
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
