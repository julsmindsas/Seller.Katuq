import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { BaseService } from '../base.service';
import { PickingAccionRespuesta, PickingCompletarRequest, PickingRequest, PickingResponse } from '../../../components/picking-packing/models/picking.model';
import { Order, OrderListResponse } from '../../../components/picking-packing/models/order.model';
import { desdeEstadoServidor, EstadoPickingServidor } from '../../../components/picking-packing/picking-mensajes';
import { catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class PickingPackingService extends BaseService {
    constructor(http: HttpClient) {
        super(http);
    }

    // Pedidos
    getOrders(): Observable<OrderListResponse> {
        return this.get<OrderListResponse>('/v1/orders/all');
    }

    /** Un pedido por su número exacto (ej. ORE-001393). */
    getOrderByNroPedido(nroPedido: string): Observable<Order> {
        return this.get<{ success: boolean; data: Order }>(
            '/v1/orders/getOrderByNroPedido/' + encodeURIComponent(nroPedido)
        ).pipe(map(respuesta => respuesta.data));
    }

    /** Búsqueda por número de pedido, completo o parcial. Sin resultados: lista vacía. */
    buscarPedidos(texto: string): Observable<Order[]> {
        return this.get<Order[]>('/v1/orders/byNroPedido/' + encodeURIComponent(texto)).pipe(
            catchError(error => (error && error.status === 404 ? of([] as Order[]) : throwError(() => error)))
        );
    }

    // Picking
    // El servidor consulta el alistamiento POR PEDIDO (no hay consulta por id de picking).
    // Un pedido al que todavía no se le inició el alistamiento responde 404: aquí es `null`.
    getEstadoPicking(ordenId: string): Observable<PickingResponse | null> {
        return this.get<EstadoPickingServidor>(
            '/v1/inventory/picking/estado/' + encodeURIComponent(ordenId)
        ).pipe(
            map(servidor => desdeEstadoServidor(servidor) as PickingResponse),
            catchError(error => (error && error.status === 404 ? of(null) : throwError(() => error)))
        );
    }

    iniciarPicking(data: PickingRequest): Observable<PickingAccionRespuesta> {
        return this.post<PickingAccionRespuesta>('/v1/inventory/picking/iniciar', data);
    }

    completarPicking(data: PickingCompletarRequest): Observable<PickingAccionRespuesta> {
        return this.post<PickingAccionRespuesta>('/v1/inventory/picking/completar', data);
    }

    // Datos auxiliares
    // Las bodegas de la empresa menos las desactivadas. Una bodega sin el campo `active` cuenta como
    // activa (así la trata el servidor al crear bodegas); por eso no se usa /bodegas/active.
    getBodegasDisponibles(): Observable<any[]> {
        return this.get<any[]>('/v1/bodegas/all').pipe(
            map(bodegas => bodegas.filter(bodega => bodega.active !== false))
        );
    }

    getOrdenesPendientes(): Observable<Order[]> {
        return this.get<OrderListResponse>('/v1/orders/pending').pipe(
            map(response => response.orders)
        );
    }

    // Servicios de Packing
    iniciarPacking(data: { ordenId: string, bodegaId: string }): Observable<any> {
        return this.post<any>('/v1/inventory/packing/iniciar', data);
    }

    completarPacking(data: { packingId: string, informacionEmbalaje: any }): Observable<any> {
        return this.post<any>('/v1/inventory/packing/completar', data);
    }

    getEstadoPacking(ordenId: string): Observable<any> {
        return this.get<any>('/v1/inventory/packing/estado/' + ordenId);
    }
}
