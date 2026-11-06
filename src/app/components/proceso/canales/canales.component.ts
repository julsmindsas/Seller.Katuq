import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
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
    private modalService: NgbModal,
    private translate: TranslateService
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
          title: this.translate.instant('comun.error'),
          text: this.translate.instant('proceso.canales.errorCargar'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.aceptar')
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
      title: this.translate.instant('proceso.comun.estaSeguro'),
      text: this.translate.instant('proceso.canales.confirmarDesactivar'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.translate.instant('proceso.comun.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar')
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        
        this.service.eliminarCanal(row.id).subscribe({
          next: () => {
            this.cargarDatos();
            Swal.fire(
              this.translate.instant('proceso.comun.eliminado'),
              this.translate.instant('proceso.canales.desactivado'),
              'success'
            );
          },
          error: (error) => {
            console.error('Error al eliminar canal:', error);
            this.cargando = false;
            Swal.fire(
              this.translate.instant('comun.error'),
              this.translate.instant('proceso.canales.errorEliminar'),
              'error'
            );
          }
        });
      }
    });
  }
} 