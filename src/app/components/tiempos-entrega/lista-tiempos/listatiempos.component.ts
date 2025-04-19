import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TableColumn } from '@swimlane/ngx-datatable';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TiempoEntregaComponent } from '../create/tiempo-entrega/tiempo-entrega.component';

@Component({
  selector: 'app-listatiempos',
  templateUrl: './listatiempos.component.html',
  styleUrls: ['./listatiempos.component.scss']
})
export class ListaTiemposComponent implements OnInit {
  icons: any;
  items: any = [];
  cargando = true;

  columns: TableColumn[] = [
    { name: 'Nombre Interno' },
    { name: 'Nombre externo' },
    { name: 'Dias minimos' },
    { name: 'Forma de entrega' },
    { name: 'Ciudades' },
    { name: 'Activo' },
    { name: 'Acciones' }
  ];

  constructor(
    private router: Router,
    private service: MaestroService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.cargando = true;
    this.service.getTiempoEntrega().subscribe((r: any) => {
      this.items = (r as any[]);
      this.cargando = false;
    });
  }

  editar(row: any) {
    sessionStorage.setItem("tiempoEntregaEdit", JSON.stringify(row));
    this.openTiempoEntregaModal();
  }

  create() {
    sessionStorage.removeItem("tiempoEntregaEdit");
    this.openTiempoEntregaModal();
  }

  openTiempoEntregaModal() {
    const modalRef = this.modalService.open(TiempoEntregaComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.loadData(); // Recargar los datos después de cerrar el modal
      }
    }, (reason) => {
      // Manejar el cierre del modal si es necesario
    });
  }

  eliminarFila(row: any) {
    Swal.fire({
      title: '¿Está seguro de eliminar tiempo de entrega?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteTipoDeEntrega(row).subscribe(r => {
          this.items = this.items.filter((p: any) => p !== row);
          Swal.fire(
            'Eliminado!',
            'El tiempo de entrega ha sido eliminado.',
            'success'
          );
        });
      }
    });
  }
}