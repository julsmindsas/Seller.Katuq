import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearComboComponent } from './crear-combo/crear-combo.component';

@Component({
  selector: 'app-combos',
  templateUrl: './combos.component.html',
  styleUrls: ['./combos.component.scss']
})
export class CombosComponent implements OnInit {
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
    this.service.getCombos().subscribe({
      next: (data: any) => {
        this.rows = data || [];
        this.temp = [...this.rows];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando combos:', error);
        this.cargando = false;
      }
    });
  }

  openCrearModal() {
    const modalRef = this.modalService.open(CrearComboComponent, {
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
    const modalRef = this.modalService.open(CrearComboComponent, {
      size: 'lg',
      centered: true
    });

    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.comboData = row;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    }).catch(() => {});
  }

  eliminar(row: any) {
    // IMPORTANTE: el backend NO borra físicamente — desactiva el documento.
    // Un combo nunca se persiste dentro de un pedido (se explota en líneas
    // normales de producto al agregarlo al carrito), así que desactivarlo no
    // afecta ninguna venta ya realizada.
    Swal.fire({
      title: '¿Desactivar combo?',
      text: `"${row.nombre}" será desactivado y dejará de estar disponible en venta asistida.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.removeCombo(row.id).subscribe({
          next: () => {
            Swal.fire('Desactivado', 'El combo ha sido desactivado', 'success');
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error desactivando combo:', error);
            Swal.fire('Error', 'No se pudo desactivar el combo', 'error');
          }
        });
      }
    });
  }

  /**
   * Borrado permanente (físico). Solo disponible cuando el registro ya está
   * inhabilitado (activo === false).
   */
  eliminarPermanente(row: any) {
    Swal.fire({
      title: '¿Eliminar permanentemente?',
      text: `"${row.nombre}" se eliminará de forma definitiva y no se podrá recuperar.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deletePermanentCombo(row.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El combo se eliminó permanentemente', 'success');
            this.cargarDatos();
          },
          error: (error) => {
            const msg = error?.error?.message || 'No se pudo eliminar el combo';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }

  /** Nombres de hasta 3 productos del combo, con "…" si hay más. */
  resumenProductos(row: any): string {
    const productos = row?.productos || [];
    const nombres = productos.slice(0, 3).map((p: any) => p.nombre).join(', ');
    return productos.length > 3 ? `${nombres}…` : nombres;
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    const temp = this.temp.filter(function (d: any) {
      return d.nombre?.toLowerCase().indexOf(val) !== -1 || !val;
    });

    this.rows = temp;
  }
}
