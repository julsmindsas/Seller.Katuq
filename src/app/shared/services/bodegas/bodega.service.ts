import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BodegaService {
  // Lista de bodegas actualizable mediante BehaviorSubject
  private bodegasBS = new BehaviorSubject<any[]>([
    {
      id: 1,
      nombre: 'Bodega Principal',
      idBodega: 'BOD-001',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      tipo: 'Física'
    },
    {
      id: 2,
      nombre: 'Bodega Virtual',
      idBodega: 'BOD-002',
      direccion: 'N/A',
      ciudad: 'Virtual',
      departamento: '',
      tipo: 'Transaccional'
    }
  ]);

  // Bodega seleccionada actualmente
  private bodegaSeleccionadaBS = new BehaviorSubject<any>(null);

  constructor() { }

  // Métodos para acceder a las bodegas
  getBodegas(): Observable<any[]> {
    return this.bodegasBS.asObservable();
  }

  actualizarBodegas(bodegas: any[]): void {
    this.bodegasBS.next(bodegas);
  }

  // Métodos para la bodega seleccionada
  getBodegaSeleccionada(): Observable<any> {
    return this.bodegaSeleccionadaBS.asObservable();
  }

  seleccionarBodega(bodega: any): void {
    this.bodegaSeleccionadaBS.next(bodega);
  }

  // Método para agregar una bodega
  agregarBodega(bodega: any): void {
    const bodegas = [...this.bodegasBS.value, bodega];
    this.bodegasBS.next(bodegas);
  }

  // Método para actualizar una bodega
  actualizarBodega(bodega: any): void {
    const bodegas = this.bodegasBS.value.map(b => 
      b.id === bodega.id ? bodega : b
    );
    this.bodegasBS.next(bodegas);
  }

  // Método para eliminar una bodega
  eliminarBodega(id: number): void {
    const bodegas = this.bodegasBS.value.filter(b => b.id !== id);
    this.bodegasBS.next(bodegas);
  }
}