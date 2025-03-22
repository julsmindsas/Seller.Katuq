import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-rol',
  templateUrl: './rol.component.html',
  styleUrls: ['./rol.component.scss']
})
export class RolComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;

  rows = [];
  temp = [];
  roles = [];

  userRol: any;
  userNit: any;
  NombreUsuario = '';
  Vendedor = 0;
  empresas = [];

  ColumnMode = ColumnMode;

  closeResult: string;

  isMobile = false;
  constructor(private service: MaestroService, private router: Router) {
    this.cargarDatos()
  }
  cargarDatos() {
    this.cargando = false
    this.service.getRol().subscribe((x: any) => {
      const datos = x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      this.roles = datos;
      console.log(this.rows)
      this.cargando = false
    })

  }


  ngOnInit(): void {
  }
  crearRol() {
    localStorage.removeItem('currentRole');
    this.router.navigateByUrl('rol/crearRol');
  }
  editarRol(role: any) {
    localStorage.setItem('currentRole', JSON.stringify(role));
    this.router.navigateByUrl('rol/crearRol');
  }

  eliminarRol(role: any) {
    if (confirm('¿Está seguro de que desea eliminar este rol?')) {
      this.service.deleteRol(role.id).subscribe(() => {
        this.cargarDatos();
      });
    }
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
}
