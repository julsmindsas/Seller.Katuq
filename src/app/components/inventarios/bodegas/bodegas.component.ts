import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearBodegasComponent } from './crear-bodegas/crear-bodegas.component';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bodegas',
  templateUrl: './bodegas.component.html',
  styleUrls: ['./bodegas.component.scss']
})
export class BodegasComponent implements OnInit {
  cargando: boolean = false;
  bodegas: any[] = [];
  selectedColumns: any[] = [];

  constructor(
    private modalService: NgbModal,
    private bodegaService: BodegaService
  ) { }

  ngOnInit(): void {
    this.cargarBodegas();
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe(bodegas => {
      this.bodegas = bodegas;
      this.cargando = false;
    });
  }

  abrirModalCrear() {
    const modalRef = this.modalService.open(CrearBodegasComponent, {
      size: 'xl',
      centered: true
    });

    modalRef.result.then((result) => {
      if (result) {
        this.cargarBodegas();
      }
    }, () => { });
  }

  abrirModalEditar(bodega: any) {
    const modalRef = this.modalService.open(CrearBodegasComponent, {
      size: 'xl',
      backdrop: 'static',

      centered: true
    });

    modalRef.componentInstance.bodegaData = bodega;
    modalRef.componentInstance.isEditMode = true;

    modalRef.result.then((result) => {
      if (result) {
        this.bodegaService.actualizarBodega(result);
      }
    }, () => { });
  }

  eliminarBodega(bodega: any) {
    Swal.fire({
      title: '¿Está seguro de eliminar esta bodega?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        this.bodegaService.eliminarBodega(bodega.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Bodega eliminada correctamente.', 'success');
            this.cargarBodegas();
          },
          error: () => {
            Swal.fire('Error', 'Ocurrió un error al eliminar la bodega.', 'error');
            this.cargando = false;
          }
        });
      }
    });
  }

  exportarExcel() {
    // Lógica para exportar a Excel
    console.log('Exportando a Excel...');
  }
}
