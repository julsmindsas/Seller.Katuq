import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from '@swimlane/ngx-datatable';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

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
  constructor(private router: Router, private service: MaestroService) {
    this.cargando = true;
    this.service.getTipoEntrega().subscribe((r: any) => {
      this.cargando = false;
      this.temp = [...r];
      this.rows = (r as any[]).sort((a, b) => {
        const nameA = parseInt(a.posicion); // ignore upper and lowercase
        const nameB = parseInt(b.posicion); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      this.cargando = false;
    })
  }

  ngOnInit(): void {

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
        return  res1 || res3 ;
      });
    }

    this.rows = temp;

    this.table.offset = 0;
  }


  editar(row) {
    sessionStorage.setItem("formaEntregaEdit",JSON.stringify(row));
    this.router.navigateByUrl("/formasEntrega/tipoentrega")
  }
  create() {
    sessionStorage.removeItem("formaEntregaEdit");

    this.router.navigateByUrl("/formasEntrega/tipoentrega")
    // clear the rows array
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
        })
      }
    });
  }
}
