import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MovimientoInventario, MovimientosResponse } from '../../../components/inventarios/model/movimientoinventario';
import { TipoMovimientoInventario } from '../../../components/inventarios/enums/tipos-movimiento.enum';
import { Bodega } from '../../models/inventarios/bodega.model';
import { Traslado } from '../../models/inventarios/traslado.model';

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
    const url = `${this.apiUrl}/inventory/movimientos`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, { movimientos }, { headers });
  }

  /**
   * Ingresa productos al inventario
   * @param bodegaId ID de la bodega
   * @param productos Lista de productos a ingresar
   * @param tipoMovimiento Tipo de movimiento de inventario
   * @returns Observable con el resultado de la operación
   */
  ingresarProductos(bodegaId: string, productos: any[], tipoMovimiento: TipoMovimientoInventario, observaciones: string): Observable<any> {
    const url = `${this.apiUrl}/inventory/ingresar-multiples`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, {
      bodegaId,
      productos,
      tipoMovimiento,
      observaciones
    }, { headers });
  }

  /**
   * Obtiene el historial de movimientos de un producto
   * @param productId ID del producto
   * @returns Observable con el historial de movimientos
   */
  obtenerHistorialMovimientos(productId: string): Observable<MovimientoInventario[]> {
    const url = `${this.apiUrl}/inventory/movimientos/${productId}`;

    return this.http.get<MovimientoInventario[]>(url);
  }

  /**
   * Obtiene el historial de movimientos por bodega
   * @param bodegaId ID de la bodega
   * @returns Observable con el historial de movimientos
   */
  obtenerMovimientosPorBodega(bodegaId: string): Observable<MovimientoInventario[]> {
    const url = `${this.apiUrl}/inventory/movimientos/bodega/${bodegaId}`;

    return this.http.get<MovimientoInventario[]>(url);
  }

  /**
   * Obtener el inventario actual por bodega
   * @param bodegaId ID de la bodega
   * @returns Observable con el inventario actual
   */
  obtenerInventarioPorBodega(bodegaId: string): Observable<any> {
    const url = `${this.apiUrl}/inventory/bodega/${bodegaId}`;

    return this.http.get<any>(url);
  }

  getBodegas(): Observable<Bodega[]> {
    return this.http.get<Bodega[]>(`${this.apiUrl}/bodegas/all`);
  }

  getProductosBodega(bodegaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bodegas/${bodegaId}/productos`);
  }

  realizarTraslado(traslado: Traslado): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventory/traslados`, traslado);
  }

  getHistorialMovimientos(filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    bodegaId?: string;
    productoId?: string;
    limit?: number;
    lastDoc?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Observable<MovimientosResponse> {
    let params = new HttpParams();

    if (filtros.fechaInicio) {
      params = params.set('fechaInicio', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      params = params.set('fechaFin', filtros.fechaFin);
    }
    if (filtros.bodegaId) {
      params = params.set('bodegaId', filtros.bodegaId);
    }
    if (filtros.productoId) {
      params = params.set('productoId', filtros.productoId);
    }
    if (filtros.limit) {
      params = params.set('limit', filtros.limit.toString());
    }
    if (filtros.lastDoc) {
      params = params.set('lastDoc', filtros.lastDoc);
    }
    if (filtros.orderBy) {
      params = params.set('orderBy', filtros.orderBy);
    }
    if (filtros.orderDirection) {
      params = params.set('orderDirection', filtros.orderDirection);
    }

    return this.http.get<MovimientosResponse>(`${this.apiUrl}/inventory/historial`, { params });
  }

  exportarExcelHistorial(filtros: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/exportar-historial`, filtros, {
      responseType: 'blob'
    });
  }

  getProductos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/productos/all`);
  }

  getMovimientoDetalle(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/movimiento/${id}`);
  }
}