import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BodegaService {
  private apiUrl = environment.urlApi + '/v1/bodegas';
  // Bodega seleccionada actualmente
  private bodegaSeleccionadaBS = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) { }

  // Obtener todas las bodegas
  getBodegas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`);
  }

  // Obtener bodegas activas
  getActiveBodegas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/active`);
  }

  // Obtener bodega por nombre
  getBodegaByName(nombre: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/byName`, { nombre });
  }

  // Métodos para la bodega seleccionada
  getBodegaSeleccionada(): Observable<any> {
    return this.bodegaSeleccionadaBS.asObservable();
  }

  seleccionarBodega(bodega: any): void {
    this.bodegaSeleccionadaBS.next(bodega);
  }

  // Crear bodega
  agregarBodega(bodega: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, bodega);
  }

  // Editar bodega
  actualizarBodega(bodega: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/edit`, bodega);
  }

  // Eliminar bodega
  eliminarBodega(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/remove`, { id });
  }
}