// Importaciones de Angular core
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Importaciones de modelos
import { Cotizacion } from './cotizaciones.component';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {

  // URL base de la API
  private apiUrl = environment.urlApi;
  
  // Headers HTTP por defecto
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  /**
 * Actualiza el estado de una cotización específica
 */
public actualizarEstadoCotizacion(idCotizacion: string, nuevoEstado: string): Observable<any> {
  const url = `${this.apiUrl}/cotizaciones/${idCotizacion}/estado`;
  
  const datos = {
    estadoCotizacion: nuevoEstado,
    fechaActualizacion: new Date().toISOString()
  };
  
  return this.http.put<any>(url, datos).pipe(
    catchError(this.handleError<any>('actualizarEstadoCotizacion', { success: false, message: 'Error al actualizar estado' }))
  );
}

  /**
   * Obtiene todas las cotizaciones de la empresa
   */
  public obtenerCotizaciones(page: number = 1, limit: number = 10, estado?: string, asesor?: string): Observable<any> {
    let url = `${this.apiUrl}/v1/cotizaciones/all?page=${page}&limit=${limit}`;
    
    if (estado) {
      url += `&estado=${estado}`;
    }
    
    if (asesor) {
      url += `&asesor=${asesor}`;
    }
    
    return this.http.get(url, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerCotizaciones', { success: false, data: [], pagination: null }))
      );
  }

  /**
   * Obtiene una cotización por ID
   */
  public obtenerCotizacion(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/cotizaciones/${id}`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerCotizacion', { success: false, data: null }))
      );
  }

  /**
   * Obtiene una cotización por número
   */
  public obtenerCotizacionPorNumero(numero: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/cotizaciones/number/${numero}`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerCotizacionPorNumero', { success: false, data: null }))
      );
  }

  /**
   * Crea una nueva cotización
   */
  public crearCotizacion(cotizacionData: any): Observable<any> {
    const payload = {
      cliente: cotizacionData.cliente,
      items: cotizacionData.items,
      fechaVencimiento: cotizacionData.fechaVencimiento,
      validezDias: cotizacionData.validezDias || 30,
      formaDePago: cotizacionData.formaDePago || 'Contado',
      observaciones: cotizacionData.observaciones || '',
      asesorAsignado: cotizacionData.asesorAsignado || null
    };

    return this.http.post(`${this.apiUrl}/v1/cotizaciones/create`, payload, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('crearCotizacion', { success: false, message: 'Error al crear cotización' }))
      );
  }

  /**
   * Edita una cotización existente
   */
  public editarCotizacion(cotizacionData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/v1/cotizaciones/edit`, cotizacionData, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('editarCotizacion', { success: false, message: 'Error al editar cotización' }))
      );
  }

  /**
   * Elimina una cotización
   */
  public eliminarCotizacion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/v1/cotizaciones/delete?id=${id}`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('eliminarCotizacion', { success: false, message: 'Error al eliminar cotización' }))
      );
  }

  /**
   * Filtrado avanzado de cotizaciones
   */
  public filtrarCotizaciones(filtros: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/v1/cotizaciones/filter`, filtros, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('filtrarCotizaciones', { success: false, data: [] }))
      );
  }

  /**
   * Convierte una cotización a pedido
   */
  public convertirCotizacionAPedido(cotizacionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/v1/cotizaciones/convertir-pedido`, { cotizacionId }, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('convertirCotizacionAPedido', { success: false, message: 'Error al convertir cotización' }))
      );
  }

  /**
   * Obtiene estadísticas de cotizaciones
   */
  public obtenerEstadisticas(fechaInicio: string, fechaFin: string): Observable<any> {
    const url = `${this.apiUrl}/v1/cotizaciones/estadisticas/resumen?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    return this.http.get(url, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerEstadisticas', { success: false, data: null }))
      );
  }

  /**
   * Envía una cotización por email
   */
  public enviarCotizacionEmail(id: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/v1/cotizaciones/${id}/enviar`, { email }, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('enviarCotizacionEmail', { success: false, message: 'Error al enviar cotización' }))
      );
  }

  /**
   * Maneja errores HTTP
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Retornar un resultado por defecto para que la aplicación siga funcionando
      return of(result as T);
    };
  }
} 