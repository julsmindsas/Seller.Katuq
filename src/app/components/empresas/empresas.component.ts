import { Component, ViewChild, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';



@Component({
  selector: 'app-empresas',
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.scss']
})
export class EmpresasComponent implements OnInit {
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
  paises: string[];
  isJulsmind = false;

  constructor(private service: MaestroService, private router: Router) {
    const currentCompany = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');
    this.isJulsmind = currentCompany.nomComercial === 'Julsmind';
  }

  ngOnInit(): void {
    this.cargarDatos()

    if (window.screen.width < 700) {
      this.isMobile = true;
    }

  }

  cargarDatos() {
    this.cargando = true;
    this.service.consultarEmpresas().subscribe({
      next: (datos: any) => {
        this.temp = [...datos];
        this.rows = datos;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error fetching empresas:', err);
        this.cargando = false;
      }
    });

  }

  crearEmpresa() {
    sessionStorage.removeItem('infoFormsCompany')
    this.router.navigateByUrl('empresas/crearEmpresa');
  };
  editarEmpresa(row) {
    console.log(row)
    sessionStorage.setItem('infoFormsCompany', JSON.stringify(row))
    this.router.navigateByUrl('empresas/crearEmpresa')
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
        const res2 = d.emailContactoGeneral.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.nomComercial.toLowerCase().indexOf(val) !== -1 || !val;
        const res4 = d.fijo.toString().toLowerCase().indexOf(val) !== -1 || !val;
        const res5 = d.cel.toString().toLowerCase().indexOf(val) !== -1 || !val;

        const res7 = d.pais.toLowerCase().indexOf(val) !== -1 || !val;

        return res || res1 || res2 || res3 || res4 || res5 || res7
      });
    }

    this.rows = temp;

    this.table.offset = 0;
  }
}
