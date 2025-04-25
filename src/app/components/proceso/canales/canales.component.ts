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
    // Simular carga de datos ya que no hay servicio aún
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    // Como no hay servicio aún, vamos a usar datos de ejemplo
    setTimeout(() => {
      this.rows = [
        { id: 1, name: 'POS', tipo: 'Físico', bodega: 'Bodega Principal', activo: true },
        { id: 2, name: 'Mercado Libre', tipo: 'Marketplace', bodega: 'Bodega E-commerce', activo: true },
        { id: 3, name: 'Rappi', tipo: 'Delivery', bodega: 'Bodega Principal', activo: false },
        { id: 4, name: 'VTEX', tipo: 'E-commerce', bodega: 'Bodega E-commerce', activo: true },
        { id: 5, name: 'Venta Asistida', tipo: 'Físico', bodega: 'Bodega Principal', activo: true }
      ];
      this.temp = [...this.rows];
      this.cargando = false;
    }, 1000);
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

  deleteCanal(row: any) {
    Swal.fire({
      title: '¿Está seguro?',
      text: "¡No podrá revertir esta acción!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Aquí iría la llamada al servicio para eliminar
        // Como no hay servicio, simulamos la eliminación
        this.rows = this.rows.filter(item => item.id !== row.id);
        this.temp = [...this.rows];
        
        Swal.fire(
          '¡Eliminado!',
          'El canal ha sido eliminado.',
          'success'
        );
      }
    });
  }
} 