import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-formas-pago',
  templateUrl: './formas-pago.component.html',
  styleUrls: ['./formas-pago.component.scss']
})
export class FormasPagoComponent implements OnInit {

  constructor(private service: MaestroService, private router: Router) { this.cargarDatos() }
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
  isMobile = false;
  ngOnInit(): void {
  }
  crearFormasPago() {
    sessionStorage.removeItem('payEdit')
    this.router.navigateByUrl('extras/formasPago/crearFormasPago');
  };
  cargarDatos() {
    this.cargando = true
    this.service.consultarFormaPago().subscribe((x: any) => {
      const datos = x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      console.log(this.rows)
      this.cargando = false
    })

  }
  columns = [
    { field: 'online', header: 'Clasificación' },
    { field: 'nombre', header: 'Nombre' },
    { field: 'posicion', header: 'Posición' },
    { field: 'integracion', header: 'Integración' },
    { field: 'activo', header: 'Activo' }
  ];
  updateFilter(event: any) {

    const val = event.target.value.toLowerCase();

    let temp: any;

    if (this.isMobile) {
      temp = this.temp.filter(function (d) {
        const res1 = d.id.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.nombre.toLowerCase().indexOf(val) !== -1 || !val;
        return res1 || res3;
      });
    } else {
      temp = this.temp.filter(function (d) {
        const res = d.id.toLowerCase().indexOf(val) !== -1 || !val;
        const res1 = d.online.toLowerCase().indexOf(val) !== -1 || !val;
        const res2 = d.nombre.toLowerCase().indexOf(val) !== -1 || !val;
        const res3 = d.posicion.toLowerCase().indexOf(val) !== -1 || !val;
        const res4 = d.integracion.toLowerCase().indexOf(val) !== -1 || !val;
        const res5 = d.activo.toLowerCase().indexOf(val) !== -1 || !val;


        return res || res1 || res2 || res3 || res4 || res5
      });
    }

    this.rows = temp;

    this.table.offset = 0;
  }

  editar(row) {

    this.router.navigateByUrl("extras/formasPago/crearFormasPago")
    sessionStorage.setItem("payEdit", JSON.stringify(row));
  }

  deletePayMethod(row) {

    this.service.deleteFormaPago(row).subscribe(r => {
      console.log(r)
      Swal.fire('Eliminado', 'Item Eliminado con exito', 'success')
      this.cargarDatos()
    })

  }





}
