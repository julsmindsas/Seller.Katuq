import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = true;

  rows = [];
  temp: any[] = [];

  userRol: any;
  userNit: any;
  NombreUsuario = '';
  Vendedor = 0;
  empresas = [];

  ColumnMode = ColumnMode;

  closeResult: string;

  isMobile = false;
  usuarios: any;
  constructor(private service: MaestroService, private router: Router) {
    this.cargarDatos()

  }
  cargarDatos() {
    this.cargando = true
    this.service.consultarUsuarios().subscribe((x: any) => {
      const datos = x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      this.usuarios = datos;
      localStorage.setItem('usuarios', JSON.stringify(datos)); // Guardar en localStorage
      console.log(this.rows)
      this.cargando = false
    })

  }

  ngOnInit(): void {
    if (window.screen.width < 700) {
      this.isMobile = true;
    }
    console.log(this.rows)
  }
  crearUsuario() {
    this.router.navigateByUrl('usuarios/crearUsuario');
  };

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
    this.router.navigateByUrl('usuarios/editarUsuario/' + row.id);
  }

  editarUsuario(usuario: any) {
    localStorage.setItem('currentUsuario', JSON.stringify(usuario));
    this.router.navigate(['usuarios/crearUsuario']);
  }

}
