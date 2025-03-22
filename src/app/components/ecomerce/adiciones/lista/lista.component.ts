import { JsonPipe } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista',
  templateUrl: './lista.component.html',
  styleUrls: ['./lista.component.scss']
})
export class ListaComponent implements OnInit {
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
    this.service.getAdiciones().subscribe((r: any) => {
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
    this.router.navigateByUrl("ecommerce/adiciones/crear")
    sessionStorage.setItem("adictionForEdit",JSON.stringify(row));
  }

  deleteAdicion(row){
    const data={
      'cd': row._id
    }
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Esta acción no se puede deshacer!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, estoy seguro',
      cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
    this.service.deleteAdiciones(data).subscribe((res: any) => {
      console.log(res)
      if(res.msg=="delete"){
       Swal.fire({
        title:'Eliminado',
        text:'se elimino con exito la adicion'+''+row._id,
        icon: 'success'
       })
       this.service.getAdiciones().subscribe((r: any) => {
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
      
  })}
  else{
    Swal.fire('Cancelado', 'La acción fue cancelada por el usuario.', 'info');
  }})
}
  create() {
    sessionStorage.removeItem("adictionForEdit");
    this.router.navigateByUrl("ecommerce/adiciones/crear")
    // clear the rows array
  }
}
