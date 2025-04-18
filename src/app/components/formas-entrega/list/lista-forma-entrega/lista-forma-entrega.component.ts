import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service'
import { FormaEntregaCreateComponent } from '../../forma-entrega-create/forma-entrega-create.component';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'; 
@Component({
  selector: 'app-lista-forma-entrega',
  templateUrl: './lista-forma-entrega.component.html',
  styleUrls: ['./lista-forma-entrega.component.scss']
})
export class ListaFormaEntregaComponent implements OnInit {
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
    this.service.getFormaEntrega().subscribe((r: any) => {
      this.cargando = false;
      this.temp = [...r];
      this.rows = (r as any[]).sort((a, b) => {
        const nameA = parseInt(a.posicion);
        const nameB = parseInt(b.posicion);
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });
      this.cargando = false;
    });
  }

  ngOnInit(): void {

  }

  updateFilter(event: any) {

    const val = event.target.value.toLowerCase();

    let temp: any;

    if (this.isMobile) {
      temp = this.temp.filter(function (d) {
        const res1 = d.nombre.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.nomComercial.toLowerCase().indexOf(val) !== -1 || !val;
        return res1 || res3;
      });
    } else {
      temp = this.temp.filter(function (d) {
        const res = d.nit.toLowerCase().indexOf(val) !== -1 || !val;
        const res1 = d.nombre.toLowerCase().indexOf(val) !== -1 || !val;
        const res2 = d.email.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.nomComercial.toLowerCase().indexOf(val) !== -1 || !val;
        const res4 = d.fijo.toString().toLowerCase().indexOf(val) !== -1 || !val;
        const res5 = d.cel.toString().toLowerCase().indexOf(val) !== -1 || !val;
        const res6 = d.direccion.toLowerCase().indexOf(val) !== -1 || !val;
        const res7 = d.pais.toLowerCase().indexOf(val) !== -1 || !val;
        const res8 = d.departamento.toLowerCase().indexOf(val) !== -1 || !val;
        const res9 = d.ciudad.toLowerCase().indexOf(val) !== -1 || !val;
        return res || res1 || res2 || res3 || res4 || res5 || res6 || res7 || res8 || res9;
      });
    }

    this.rows = temp;

    this.table.offset = 0;
  }


  editar(row) {
    sessionStorage.setItem("formaEntrega", JSON.stringify(row));
    const modalRef = this.modalService.open(FormaEntregaCreateComponent, {
      size: 'xl',
      backdrop: 'static'
    });
    
    modalRef.result.then((result) => {
      if (result === 'success') {
        // Recargar los datos después de editar
        this.cargando = true;
        this.service.getFormaEntrega().subscribe((r: any) => {
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
    }, (reason) => {
      // Se cerró el modal con cancelar
    });
  }
  create() {
    sessionStorage.removeItem("formaEntrega");
    const modalRef = this.modalService.open(FormaEntregaCreateComponent, {
      size: 'xl',
      backdrop: 'static'
    });
    
    modalRef.result.then((result) => {
      if (result === 'success') {
        // Recargar los datos después de guardar
        this.cargando = true;
        this.service.getFormaEntrega().subscribe((r: any) => {
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
    }, (reason) => {
      // Se cerró el modal con cancelar
    });
  }
  eliminarFila(row) {
    Swal.fire({
      title: '¿Está seguro de eliminar la forma de entrega?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteFormaEntrega(row).subscribe(r => {
          this.rows = this.rows.filter((p: any) => p !== row);
        })
      }
    });
  }


}
