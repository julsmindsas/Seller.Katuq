import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from '@swimlane/ngx-datatable';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TipoEntregaComponent } from '../tipo-entrega.component';

@Component({
  selector: 'app-list-tipo-entrega',
  templateUrl: './list-tipo-entrega.component.html',
  styleUrls: ['./list-tipo-entrega.component.scss']
})
export class ListTipoEntregaComponent implements OnInit {

  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  icons: any;
  cargando = false;
  rows: any = [];
  ColumnMode = ColumnMode;

  closeResult: string;
  temp: any;
  isMobile: any;
  
  constructor(
    private router: Router, 
    private service: MaestroService,
    private modalService: NgbModal
  ) {
    this.cargando = true;
    this.loadData();
  }

  ngOnInit(): void {}

  loadData() {
    this.service.getTipoEntrega().subscribe((r: any) => {
      this.cargando = false;
      this.temp = [...r];
      this.rows = (r as any[]).sort((a, b) => {
        const nameA = parseInt(a.posicion);
        const nameB = parseInt(b.posicion);
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });
    });
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();
    let temp: any;

    if (this.isMobile) {
      temp = this.temp.filter(function (d) {
        const res1 = d.nombreExterno.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.nombreInterno.toLowerCase().indexOf(val) !== -1 || !val;
        return res1 || res3;
      });
    } else {
      temp = this.temp.filter(function (d) {
        const res1 = d.nombreExterno.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.nombreInterno.toLowerCase().indexOf(val) !== -1 || !val;
        return res1 || res3;
      });
    }

    this.rows = temp;
    this.table.offset = 0;
  }

  editar(row) {
    sessionStorage.setItem("formaEntregaEdit", JSON.stringify(row));
    this.openModal();
  }

  create() {
    sessionStorage.removeItem("formaEntregaEdit");
    this.openModal();
  }

  openModal() {
    const modalRef = this.modalService.open(TipoEntregaComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargando = true;
        this.loadData(); // Recargar los datos después de cerrar el modal
      }
    }, (reason) => {
      // Manejar el cierre del modal si es necesario
    });
  }

  eliminarFila(row) {
    Swal.fire({
      title: '¿Está seguro de eliminar el tipo de entrega?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteTipoDeEntrega(row).subscribe(r => {
          this.rows = this.rows.filter((p: any) => p !== row);
          Swal.fire(
            'Eliminado!',
            'El tipo de entrega ha sido eliminado.',
            'success'
          );
        });
      }
    });
  }
}