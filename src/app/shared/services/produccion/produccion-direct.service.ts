import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Pedido } from '../../../components/ventas/modelo/pedido';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProduccionDirectService {
  constructor(private httpClient: HttpClient) {
    console.log('ProduccionDirectService inicializado correctamente');
  }

  /**
   * Obtiene los pedidos según los filtros aplicados, procesados para el módulo de producción
   * Implementación directa sin BaseService
   */
  getOrdersByFiltersFlatProduct(filter: any): Observable<{ orders: any[], ordersRaw: Pedido[] }> {
    console.log('ProduccionDirectService: Ejecutando getOrdersByFiltersFlatProduct con filtro:', filter);
    const url = `${environment.urlApi}/v1/orders/all/filterflatproduct`;
    console.log('URL completa:', url);
    
    return this.httpClient.post<{ orders: any[], ordersRaw: Pedido[] }>(url, filter)
      .pipe(
        tap(
          response => console.log('Respuesta recibida correctamente en ProduccionDirectService'),
          error => console.error('Error en la petición en ProduccionDirectService:', error)
        )
      );
  }

  /**
   * Método de diagnóstico para verificar el funcionamiento del interceptor
   */
  diagnosticoInterceptor(): Observable<any> {
    console.log('Ejecutando prueba de interceptor desde ProduccionDirectService');
    const url = `${environment.urlApi}/v1/test-endpoint`;
    console.log('URL de prueba:', url);
    
    return this.httpClient.post<any>(url, { test: 'data', service: 'ProduccionDirectService' })
      .pipe(
        tap(
          () => console.log('La petición directa pasó correctamente por el interceptor'),
          error => console.error('Error en prueba de interceptor directa:', error)
        )
      );
  }
} 