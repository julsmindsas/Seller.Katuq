// Importaciones de Angular core
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Importaciones de modelos
import { Cotizacion } from './cotizaciones.component';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CotizacionesService {

  // URL base de la API
  private apiUrl = 'https://api.katuq.com'; // TODO: Configurar en environment
  
  // Headers HTTP por defecto
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todas las cotizaciones de la empresa
   */
  public obtenerCotizaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerCotizaciones', { cotizaciones: [] }))
      );
  }

  /**
   * Obtiene una cotización por ID
   */
  public obtenerCotizacion(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones/${id}`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerCotizacion', { cotizacion: null }))
      );
  }

  /**
   * Crea una nueva cotización
   */
  public crearCotizacion(cotizacion: Cotizacion): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones`, cotizacion, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('crearCotizacion', { cotizacion: null }))
      );
  }

  /**
   * Actualiza una cotización existente
   */
  public actualizarCotizacion(id: string, cotizacion: Cotizacion): Observable<any> {
    return this.http.put(`${this.apiUrl}/cotizaciones/${id}`, cotizacion, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('actualizarCotizacion', { cotizacion: null }))
      );
  }

  /**
   * Elimina una cotización
   */
  public eliminarCotizacion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cotizaciones/${id}`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('eliminarCotizacion', { success: false }))
      );
  }

  /**
   * Cambia el estado de una cotización
   */
  public cambiarEstadoCotizacion(id: string, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cotizaciones/${id}/estado`, { estado }, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('cambiarEstadoCotizacion', { success: false }))
      );
  }

  /**
   * Genera el PDF de una cotización
   */
  public generarPDFCotizacion(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones/${id}/pdf`, { responseType: 'blob' })
      .pipe(
        catchError(this.handleError<any>('generarPDFCotizacion', null))
      );
  }

  /**
   * Envía una cotización por email
   */
  public enviarCotizacionEmail(id: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones/${id}/enviar`, { email }, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('enviarCotizacionEmail', { success: false }))
      );
  }

  /**
   * Duplica una cotización existente
   */
  public duplicarCotizacion(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones/${id}/duplicar`, {}, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('duplicarCotizacion', { cotizacion: null }))
      );
  }

  /**
   * Convierte una cotización en pedido
   */
  public convertirCotizacionEnPedido(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones/${id}/convertir-pedido`, {}, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('convertirCotizacionEnPedido', { pedido: null }))
      );
  }

  /**
   * Obtiene estadísticas de cotizaciones
   */
  public obtenerEstadisticasCotizaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones/estadisticas`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerEstadisticasCotizaciones', { estadisticas: {} }))
      );
  }

  /**
   * Busca cotizaciones por filtros
   */
  public buscarCotizaciones(filtros: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones/buscar`, filtros, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('buscarCotizaciones', { cotizaciones: [] }))
      );
  }

  /**
   * Obtiene el historial de una cotización
   */
  public obtenerHistorialCotizacion(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones/${id}/historial`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerHistorialCotizacion', { historial: [] }))
      );
  }

  /**
   * Valida una cotización antes de guardar
   */
  public validarCotizacion(cotizacion: Cotizacion): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones/validar`, cotizacion, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('validarCotizacion', { valid: false, errors: [] }))
      );
  }

  /**
   * Obtiene plantillas de cotizaciones
   */
  public obtenerPlantillasCotizaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones/plantillas`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerPlantillasCotizaciones', { plantillas: [] }))
      );
  }

  /**
   * Genera un número de cotización único
   */
  public generarNumeroCotizacion(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cotizaciones/generar-numero`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('generarNumeroCotizacion', { numero: 'COT-' + Date.now() }))
      );
  }

  /**
   * Maneja errores de las operaciones HTTP
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      
      // Registrar el error en el servicio de logging si existe
      this.log(`${operation} failed: ${error.message}`);
      
      // Retornar un resultado vacío para que la aplicación siga funcionando
      return of(result as T);
    };
  }

  /**
   * Registra mensajes en la consola
   */
  private log(message: string): void {
    console.log(`CotizacionesService: ${message}`);
  }

  /**
   * Obtiene configuración de cotizaciones
   */
  public obtenerConfiguracionCotizaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/configuracion/cotizaciones`, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('obtenerConfiguracionCotizaciones', { 
          configuracion: {
            validezDefecto: 30,
            impuestoDefecto: 19,
            moneda: 'COP',
            formatoNumero: 'COT-{YYYY}-{MM}-{####}'
          }
        }))
      );
  }

  /**
   * Actualiza configuración de cotizaciones
   */
  public actualizarConfiguracionCotizaciones(configuracion: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/configuracion/cotizaciones`, configuracion, this.httpOptions)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('actualizarConfiguracionCotizaciones', { success: false }))
      );
  }

  /**
   * Exporta cotizaciones a Excel
   */
  public exportarCotizacionesExcel(filtros?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cotizaciones/exportar/excel`, filtros || {}, { 
      responseType: 'blob',
      headers: this.httpOptions.headers
    })
      .pipe(
        catchError(this.handleError<any>('exportarCotizacionesExcel', null))
      );
  }

  /**
   * Importa cotizaciones desde Excel
   */
  public importarCotizacionesExcel(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    return this.http.post(`${this.apiUrl}/cotizaciones/importar/excel`, formData)
      .pipe(
        map((response: any) => response),
        catchError(this.handleError<any>('importarCotizacionesExcel', { success: false, errores: [] }))
      );
  }
} 