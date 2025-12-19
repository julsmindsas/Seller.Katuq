import { Component, ViewChild, OnInit } from '@angular/core';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearTipoClienteComponent } from './crear-tipo-cliente/crear-tipo-cliente.component';

@Component({
  selector: 'app-tipos-cliente',
  templateUrl: './tipos-cliente.component.html',
  styleUrls: ['./tipos-cliente.component.scss']
})
export class TiposClienteComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
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
    this.service.consultarTiposCliente().subscribe({
      next: (data: any) => {
        this.rows = data || [];
        this.temp = [...this.rows];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando tipos de cliente:', error);
        this.cargando = false;
      }
    });
  }

  openCrearModal() {
    const modalRef = this.modalService.open(CrearTipoClienteComponent, { 
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
    const modalRef = this.modalService.open(CrearTipoClienteComponent, { 
      size: 'lg',
      centered: true
    });
    
    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.tipoClienteData = row;
  
    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    }).catch(() => {});
  }

  deleteTipoCliente(row: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteTipoCliente({ id: row.id }).subscribe({
          next: () => {
            Swal.fire('Eliminado!', 'El tipo de cliente ha sido eliminado', 'success');
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error eliminando:', error);
            Swal.fire('Error', 'No se pudo eliminar el tipo de cliente', 'error');
          }
        });
      }
    });
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    const temp = this.temp.filter(function (d) {
      const res1 = d.nombre?.toLowerCase().indexOf(val) !== -1 || !val;
      const res2 = d.descripcion?.toLowerCase().indexOf(val) !== -1 || !val;
      return res1 || res2;
    });

    this.rows = temp;

    if (this.table) {
      this.table.offset = 0;
    }
  }
}
