import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-generos',
  templateUrl: './generos.component.html',
  styleUrls: ['./generos.component.scss']
})
export class GenerosComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
  isMobile = false;
  constructor(private service: MaestroService, private router: Router) {
    this.cargarDatos()
  }
  cargarDatos() {
    this.cargando = true
    this.service.consultarGenero().subscribe((x: any) => {
      const datos = x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      console.log(this.rows)
      this.cargando = false
    })

  }
  ngOnInit(): void {
  }
  crearGeneros() {
    this.router.navigateByUrl('proceso/generos/crear-generos');
  };
  editarGeneros(row) {
    console.log(row)
    sessionStorage.setItem('infoFormsGender', JSON.stringify(row))
    this.router.navigateByUrl('proceso/generos/crear-generos')
  }
  deleteGeneros(row) {
    Swal.fire({
      title: 'Esta seguro de eliminar el genero?',
      text: "No podra revertir los cambios!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {

        this.service.deleteGenrre(row).subscribe(r => {
          console.log(r)
          if (r) {
            Swal.fire({
              title: 'Eliminado!',
              text: 'Eliminado con exito',
              icon: 'success',
              confirmButtonText: 'Ok'
            })
            this.cargarDatos()
          }
        });

      }
    });

  }
  updateFilter(event: any) {

    const val = event.target.value.toLowerCase();

    let temp: any;

    if (this.isMobile) {
      temp = this.temp.filter(function (d) {
        const res1 = d.id.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.name.toLowerCase().indexOf(val) !== -1 || !val;
        return res1 || res3;
      });
    } else {
      temp = this.temp.filter(function (d) {
        const res = d.id.toLowerCase().indexOf(val) !== -1 || !val;
        const res1 = d.name.toLowerCase().indexOf(val) !== -1 || !val;
        const res2 = d.position.toLowerCase().indexOf(val) !== -1 || !val;


        return res || res1 || res2
      });
    }

    this.rows = temp;

    this.table.offset = 0;
  }
}
