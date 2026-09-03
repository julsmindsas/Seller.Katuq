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
  /** id -> true mientras viaja el cambio de estado, para no dispararlo dos veces. */
  guardandoActivo: { [id: string]: boolean } = {};
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

  /**
   * Prende/apaga el tipo desde el listado, sin abrir el modal.
   *
   * Es la salida para quien NO quiere borrar: un tipo apagado deja de ofrecerse
   * al crear clientes y de contar como precio base, pero los precios que los
   * productos tienen cargados a su nombre quedan intactos y vuelven al
   * prenderlo. La papelera, en cambio, borra.
   *
   * Se manda solo `{ id, active }` a propósito: `/edit` hace un update parcial,
   * así que reenviar nombre/descripción/esPrecioBase solo abriría la puerta a
   * pisar con datos viejos de la fila lo que alguien más haya cambiado.
   */
  toggleActivo(row: any) {
    const nuevoEstado = row.active === false;

    // Optimista: la fila ya se pintó con el clic del usuario. Si el backend
    // falla se revierte abajo, y como `[checked]` está ligado a `row.active`,
    // el cambio de valor devuelve el interruptor a su lugar.
    row.active = nuevoEstado;
    this.guardandoActivo[row.id] = true;

    this.service.editTipoCliente({ id: row.id, active: nuevoEstado }).subscribe({
      next: () => {
        this.guardandoActivo[row.id] = false;
        Swal.fire({
          icon: 'success',
          title: nuevoEstado ? 'Tipo de cliente activado' : 'Tipo de cliente desactivado',
          text: nuevoEstado
            ? 'Vuelve a estar disponible al crear clientes.'
            : 'Ya no se ofrece al crear clientes. Sus precios quedan guardados.',
          toast: true,
          position: 'top-end',
          timer: 2600,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error cambiando el estado:', error);
        row.active = !nuevoEstado;
        this.guardandoActivo[row.id] = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo cambiar el estado del tipo de cliente', 'error');
      }
    });
  }

  deleteTipoCliente(row: any) {
    // Eliminar borra el tipo. Para quitarlo de circulación sin perder los
    // precios que los productos tienen cargados a su nombre está el interruptor
    // de la columna Activo, que es reversible — por eso se ofrece acá.
    const avisoPrecioBase = row?.esPrecioBase
      ? '<br><br><b>Además define el precio base de la empresa</b>, así que los productos se quedan sin lista base hasta que marques otra.'
      : '';

    Swal.fire({
      title: `¿Eliminar "${row?.nombre || 'este tipo de cliente'}"?`,
      html: 'Se pierden los precios que los productos tengan cargados para este tipo y no se puede deshacer.' +
            avisoPrecioBase +
            '<br><br>Si solo quieres dejar de usarlo y conservar sus precios, cancela y apaga el interruptor de la columna <b>Activo</b>.',
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
            Swal.fire('Error', error?.error?.error || 'No se pudo eliminar el tipo de cliente', 'error');
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
