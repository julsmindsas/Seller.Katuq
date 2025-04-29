import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearCanalesComponent } from './crear-canales/crear-canales.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-canales',
  templateUrl: './canales.component.html',
  styleUrls: ['./canales.component.scss']
})
export class CanalesComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows: any[] = [];
  temp: any[] = [];
  ColumnMode = ColumnMode;
  isMobile = false;
  selectedColumns: any[] = [];

  constructor(
    private service: MaestroService,
    private modalService: NgbModal
  ) { }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.service.getCanales().subscribe({
      next: (response) => {
        this.rows = response;
        this.temp = [...this.rows];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar canales:', error);
        this.cargando = false;
        
        // Mostrar mensaje de error
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los canales. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  openCrearModal() {
    const modalRef = this.modalService.open(CrearCanalesComponent, { 
      size: 'lg',
      centered: true
    });
    modalRef.componentInstance.mostrarCrear = true;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    }, (reason) => {
      // Manejo del caso cuando se cierra sin guardar
    });
  }

  openEditarModal(row: any) {
    const modalRef = this.modalService.open(CrearCanalesComponent, { 
      size: 'lg',
      centered: true
    });
    
    // Proporciona los datos usando la propiedad componentInstance
    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.canalData = row;
  
    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    }, (reason) => {
      // Manejo del caso cuando se cierra sin guardar
    });
  }

  eliminarCanal(row: any) {
    Swal.fire({
      title: '¿Está seguro?',
      text: "¡El canal cambiara de estado a desactivado!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        
        this.service.eliminarCanal(row.id).subscribe({
          next: () => {
            this.cargarDatos();
            Swal.fire(
              '¡Eliminado!',
              'El canal ha sido desactivado correctamente.',
              'success'
            );
          },
          error: (error) => {
            console.error('Error al eliminar canal:', error);
            this.cargando = false;
            Swal.fire(
              'Error',
              'Ocurrió un error al eliminar el canal. Por favor, intente nuevamente.',
              'error'
            );
          }
        });
      }
    });
  }
} 