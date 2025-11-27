import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearBodegasComponent } from './crear-bodegas/crear-bodegas.component';
import { SelectorCiudadesCoberturaComponent } from './selector-ciudades-cobertura/selector-ciudades-cobertura.component';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { CiudadCobertura } from '../../../shared/models/inventarios/bodega.model';
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

  abrirModalCobertura(bodega: any): void {
    const modalRef = this.modalService.open(SelectorCiudadesCoberturaComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.ciudadesSeleccionadas = bodega.ciudadesCobertura || [];
    modalRef.componentInstance.coberturaNacional = bodega.coberturaNacional || false;

    modalRef.result.then((result: { coberturaNacional: boolean; ciudadesCobertura: CiudadCobertura[] }) => {
      if (result) {
        const bodegaActualizada = {
          ...bodega,
          coberturaNacional: result.coberturaNacional,
          ciudadesCobertura: result.ciudadesCobertura
        };
        this.cargando = true;
        this.bodegaService.actualizarBodega(bodegaActualizada).subscribe({
          next: () => {
            Swal.fire('Actualizado', 'Cobertura actualizada correctamente.', 'success');
            this.cargarBodegas();
          },
          error: () => {
            Swal.fire('Error', 'Error al actualizar la cobertura.', 'error');
            this.cargando = false;
          }
        });
      }
    }, () => {});
  }

  getCoberturaTooltip(bodega: any): string {
    if (bodega.coberturaNacional) {
      return 'Cobertura Nacional - Atiende todas las ciudades de Colombia';
    }
    if (!bodega.ciudadesCobertura || bodega.ciudadesCobertura.length === 0) {
      return 'Sin ciudades de cobertura';
    }
    const primeras = bodega.ciudadesCobertura.slice(0, 5).map((c: CiudadCobertura) => c.nombre).join(', ');
    if (bodega.ciudadesCobertura.length > 5) {
      return primeras + ` y ${bodega.ciudadesCobertura.length - 5} mas...`;
    }
    return primeras;
  }

  exportarExcel() {
    // Lógica para exportar a Excel
    console.log('Exportando a Excel...');
  }
}
