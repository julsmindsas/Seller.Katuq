import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { PedidoParaProduccion } from '../../models/produccion/Produccion';
import { Observable, tap } from 'rxjs';
import { Pedido } from '../../../components/ventas/modelo/pedido';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProduccionService extends BaseService {
    constructor(http: HttpClient) {
        super(http);
        console.log('ProduccionService inicializado con API_URL:', environment.urlApi);
    }

    getOrdersByFiltersFlatProduct(filter: any): Observable<{ orders: PedidoParaProduccion[], ordersRaw: Pedido[] }> {
        console.log('Enviando filtro a producción:', filter);
        
        // Esta URL se imprime solo para propósitos de depuración
        const url = `${environment.urlApi}/v1/orders/all/filterflatproduct`;
        console.log('URL completa que se va a llamar:', url);
        
        return this.post<{ orders: PedidoParaProduccion[], ordersRaw: Pedido[] }>('/v1/orders/all/filterflatproduct', filter)
            .pipe(
                tap(
                    response => console.log('Respuesta recibida correctamente'),
                    error => console.error('Error en la petición:', error)
                )
            );
    }
    
    // Método de prueba directo para verificar el interceptor
    testInterceptor(): Observable<any> {
        console.log('Iniciando prueba directa del interceptor...');
        
        // Comprobación 1: Usando método heredado de BaseService
        console.log('Prueba 1: Usando método post heredado de BaseService');
        return this.post<any>('/v1/test-endpoint', { test: 'data' })
            .pipe(
                tap(
                    () => console.log('Prueba 1 completada - La petición pasó por el interceptor correctamente'),
                    error => console.error('Error en Prueba 1:', error)
                )
            );
            
        // Nota: Para la Prueba 2, usar http directo, descomentar el siguiente código y comentar el return anterior
        /*
        // Comprobación 2: Usando HttpClient directamente
        console.log('Prueba 2: Usando HttpClient directamente');
        const directUrl = `${environment.urlApi}/v1/test-endpoint`;
        console.log('URL directa:', directUrl);
        return this.http.post<any>(directUrl, { test: 'direct' })
            .pipe(
                tap(
                    () => console.log('Prueba 2 completada - La petición directa pasó por el interceptor'),
                    error => console.error('Error en Prueba 2:', error)
                )
            );
        */
    }
}