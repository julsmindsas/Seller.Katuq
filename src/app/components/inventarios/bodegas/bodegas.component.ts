import { Component,OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {CrearBodegasComponent} from './crear-bodegas/crear-bodegas.component';
@Component({
  selector: 'app-bodegas',
  templateUrl: './bodegas.component.html',
  styleUrls: ['./bodegas.component.scss']
})
export class BodegasComponent implements OnInit {
ngOnInit(): void {
  
}
  bodegas: any[] = [
    {
      id: 1,
      nombre: 'Bodega Principal',
      idBodega: 'BOD-001',
      direccion: 'Calle 123 #45-67',
      coordenadas: '4.60971, -74.08175',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      pais: 'Colombia',
      tipo: 'Física'
    },
    {
      id: 2,
      nombre: 'Bodega Virtual',
      idBodega: 'BOD-002',
      direccion: 'N/A',
      coordenadas: '',
      ciudad: 'Virtual',
      departamento: '',
      pais: '',
      tipo: 'Transaccional'
    }
  ];

  constructor(private modalService: NgbModal) {}

  abrirModalCrear() {
    const modalRef = this.modalService.open(CrearBodegasComponent, { 
      size: 'lg',
      centered: true
    });
    
    modalRef.result.then((result) => {
      if (result) {
        this.bodegas.push(result); // Agrega la nueva bodega
      }
    });
  }

  abrirModalEditar(bodega: any) {
    const modalRef = this.modalService.open(CrearBodegasComponent, { 
      size: 'lg',
      centered: true
    });
    
    modalRef.componentInstance.bodegaData = bodega;
    modalRef.componentInstance.isEditMode = true;
    
    modalRef.result.then((result) => {
      if (result) {
        const index = this.bodegas.findIndex(b => b.id === result.id);
        if (index !== -1) {
          this.bodegas[index] = result; // Actualiza la bodega
        }
      }
    });
  }

  eliminarBodega(bodega: any) {
    this.bodegas = this.bodegas.filter(b => b.id !== bodega.id);
  }
}
