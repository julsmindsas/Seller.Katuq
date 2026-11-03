import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearOcasionesComponent } from './crear-ocasiones/crear-ocasiones.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-generos',
  templateUrl: './ocasiones.component.html',
  styleUrls: ['./ocasiones.component.scss']
})
export class OcasionesComponent implements OnInit {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = false;
  rows = [];
  temp = [];
  ColumnMode = ColumnMode;
  isMobile = false;
  constructor(private service:MaestroService,private modalService: NgbModal) {this.cargarDatos() }
  cargarDatos(){
    this.cargando=true
    this.service.consultarOcasion().subscribe((x: any) => {
      const datos=x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      console.log(this.rows)
      this.cargando=false
    })

  }
  ngOnInit(): void {
  }
  // crearOcasiones() {
  //   this.router.navigateByUrl('proceso/ocasiones/crear-ocasiones');
  // };
  // editarOcasiones(row){
  //   console.log(row)
  //   sessionStorage.setItem('infoFormsOcasion',JSON.stringify(row))
  //   this.router.navigateByUrl('proceso/ocasiones/crear-ocasiones')
  // }
  openCrearModal() {
    const modalRef = this.modalService.open(CrearOcasionesComponent, { 
      size: 'lg',
      centered: true
    });
    modalRef.componentInstance.mostrarCrear = true;

    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    });
  }

  openEditarModal(row: any) {
    const modalRef = this.modalService.open(CrearOcasionesComponent, { 
      size: 'lg',
      centered: true
    });
    
    // Proporciona los datos usando la propiedad componentInstance
    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.ocasionData = row; // Cambia el nombre de la propiedad
  
    modalRef.result.then((result) => {
      if (result === 'success') {
        this.cargarDatos();
      }
    });
  }
  deleteOcasiones(row){

    this.service.deleteOcasion(row).subscribe(r=> {console.log(r)
      if(r){
      Swal.fire({
        title: 'Eliminado!',
        text: 'Eliminado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })
      this.cargarDatos()
    }});
      

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
