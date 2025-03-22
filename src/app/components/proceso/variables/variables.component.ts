import { Component, OnInit,ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
@Component({
  selector: 'app-variables',
  templateUrl: './variables.component.html',
  styleUrls: ['./variables.component.scss']
})
export class VariablesComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
  isMobile = false;
  constructor(private service:MaestroService,private router:Router) {this.cargarDatos() }

  ngOnInit(): void {
  }
  cargarDatos(){
    this.cargando=true
    this.service.consultarVariables().subscribe((x: any) => {
      const datos=x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      console.log(this.rows)
      this.cargando=false
    })

  }
  crearVariables() {
    this.router.navigateByUrl('proceso/variables/crear-variables');
  };
  updateFilter(event: any) {

    const val = event.target.value.toLowerCase();

    let temp: any;

    if (this.isMobile) {
      temp = this.temp.filter(function (d) {
        const res1 = d.id.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.titulo.toLowerCase().indexOf(val) !== -1 || !val;
        return res1 || res3;
      });
    } else {
      temp = this.temp.filter(function (d) {
        const res = d.id.toLowerCase().indexOf(val) !== -1 || !val;
        const res1 = d.titulo.toLowerCase().indexOf(val) !== -1 || !val;
        const res2 = d.variable.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.valor.toLowerCase().indexOf(val) !== -1 || !val;
        

        return res || res1 || res2 || res3
      });
    }

    this.rows = temp;

    this.table.offset = 0;
  }
}
