import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Pedido } from '../../../components/ventas/modelo/pedido';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProduccionNewService extends BaseService {
  constructor(httpClient: HttpClient) {
    super(httpClient);
    console.log('ProduccionNewService inicializado correctamente');
  }

  /**
   * Obtiene los pedidos según los filtros aplicados, procesados para el módulo de producción
   */
  getOrdersByFiltersFlatProduct(filter: any): Observable<{ orders: any[], ordersRaw: Pedido[] }> {
    console.log('Ejecutando getOrdersByFiltersFlatProduct con filtro:', filter);
    return this.post<{ orders: any[], ordersRaw: Pedido[] }>('/v1/orders/all/filterflatproduct', filter)
      .pipe(
        tap(
          response => console.log('Respuesta recibida correctamente'),
          error => console.error('Error en la petición:', error)
        )
      );
  }

  /**
   * Método de diagnóstico para verificar el funcionamiento del interceptor
   */
  diagnosticoInterceptor(): Observable<any> {
    console.log('Ejecutando prueba de interceptor desde ProduccionNewService');
    return this.post<any>('/v1/test-endpoint', { test: 'data' })
      .pipe(
        tap(
          () => console.log('La petición pasó correctamente por el interceptor'),
          error => console.error('Error en prueba de interceptor:', error)
        )
      );
  }
} 