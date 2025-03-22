import { Component, OnInit,ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-zonas-cobro',
  templateUrl: './zonas-cobro.component.html',
  styleUrls: ['./zonas-cobro.component.scss']
})
export class ZonasCobroComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
  isMobile = false;
  constructor(private router:Router,private service:MaestroService) {this.cargarDatos() }
  
  columns = [
    { field: 'ciudad', header: 'Ciudad' },
    { field: 'nombreZonaCobro', header: 'Nombre' },
    { field: 'valorZonaCobro', header: 'Valor' },
    { field: 'impuestoZonaCobro', header: 'Porcentaje Imp' },
    { field: 'impuesto', header: 'Impuesto' },
    { field: 'total', header: 'Total' }
  ];

  ngOnInit(): void {
    sessionStorage.removeItem('billingZoneEdit')
  }
  cargarDatos(){
    this.cargando=true
    this.service.getBillingZone().subscribe((x: any) => {
      const datos=x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      console.log(this.rows)
      this.cargando=false
    })

  }
  crearZonaCobro(){
    this.router.navigateByUrl('extras/zonasCobro/crearZonasCobro');
  }
  edit(row){
    this.router.navigateByUrl("extras/zonasCobro/crearZonasCobro")
    sessionStorage.setItem("billingZoneEdit",JSON.stringify(row));


  }
  deleteBillingZone(row){
    this.service.deleteBillingZone(row).subscribe(r=> {
      console.log(r)
      this.router.navigateByUrl('extras/zonasCobro')
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'

      })
      this.cargarDatos()
    });


  }

}
