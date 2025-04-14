import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MovimientoInventario } from '../../../components/inventarios/model/movimientoinventario';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private apiUrl = environment.urlApi + '/v1';
  private firebaseApiUrl = '';

  constructor(private http: HttpClient) { }

  /**
   * Registra un movimiento de inventario en el sistema
   * @param movimientos Lista de movimientos de inventario
   * @returns Observable con el resultado de la operación
   */
  registrarMovimientoInventario(movimientos: MovimientoInventario[]): Observable<any> {
    const url = `${this.apiUrl}/inventario/movimientos`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post(url, { movimientos }, { headers });
  }

  /**
   * Obtiene el historial de movimientos de un producto
   * @param productId ID del producto
   * @returns Observable con el historial de movimientos
   */
  obtenerHistorialMovimientos(productId: string): Observable<MovimientoInventario[]> {
    const url = `${this.apiUrl}/inventario/movimientos/${productId}`;
    
    return this.http.get<MovimientoInventario[]>(url);
  }

  /**
   * Obtiene el historial de movimientos por bodega
   * @param bodegaId ID de la bodega
   * @returns Observable con el historial de movimientos
   */
  obtenerMovimientosPorBodega(bodegaId: string): Observable<MovimientoInventario[]> {
    const url = `${this.apiUrl}/inventario/movimientos/bodega/${bodegaId}`;
    
    return this.http.get<MovimientoInventario[]>(url);
  }

  /**
   * Obtener el inventario actual por bodega
   * @param bodegaId ID de la bodega
   * @returns Observable con el inventario actual
   */
  obtenerInventarioPorBodega(bodegaId: string): Observable<any> {
    const url = `${this.apiUrl}/inventario/bodega/${bodegaId}`;
    
    return this.http.get<any>(url);
  }
}