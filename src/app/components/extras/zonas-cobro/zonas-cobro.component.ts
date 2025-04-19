import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearZonasCobroComponent } from './crear-zonas-cobro/crear-zonas-cobro.component';

@Component({
  selector: 'app-zonas-cobro',
  templateUrl: './zonas-cobro.component.html',
  styleUrls: ['./zonas-cobro.component.scss']
})
export class ZonasCobroComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
  isMobile = false;

  columns = [
    { field: 'ciudad', header: 'Ciudad' },
    { field: 'nombreZonaCobro', header: 'Nombre' },
    { field: 'valorZonaCobro', header: 'Valor' },
    { field: 'impuestoZonaCobro', header: 'Porcentaje Imp' },
    { field: 'impuesto', header: 'Impuesto' },
    { field: 'total', header: 'Total' }
  ];

  constructor(
    private router: Router,
    private service: MaestroService,
    private modalService: NgbModal
  ) {
    this.cargarDatos();
  }

  ngOnInit(): void {
    sessionStorage.removeItem('billingZoneEdit');
  }

  cargarDatos() {
    this.cargando = true;
    this.service.getBillingZone().subscribe((x: any) => {
      const datos = x;
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      this.cargando = false;
    });
  }

  crearZonaCobro() {
    sessionStorage.removeItem('billingZoneEdit');
    this.openZonasCobroModal();
  }

  edit(row) {
    sessionStorage.setItem("billingZoneEdit", JSON.stringify(row));
    this.openZonasCobroModal();
  }

  openZonasCobroModal() {
    const modalRef = this.modalService.open(CrearZonasCobroComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos(); // Recargar los datos después de cerrar el modal
      }
    }, (reason) => {
      // Manejar el cierre del modal si es necesario
    });
  }

  deleteBillingZone(row) {
    Swal.fire({
      title: '¿Está seguro de eliminar esta zona de cobro?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteBillingZone(row).subscribe(r => {
          Swal.fire(
            'Eliminado!',
            'La zona de cobro ha sido eliminada.',
            'success'
          );
          this.cargarDatos();
        });
      }
    });
  }
}