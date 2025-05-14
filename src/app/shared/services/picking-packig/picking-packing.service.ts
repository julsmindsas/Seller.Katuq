import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PickingCompletarRequest, PickingRequest, PickingResponse, Producto } from '../../../components/picking-packing/models/picking.model';
import { Order, OrderListResponse } from '../../../components/picking-packing/models/order.model';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class PickingPackingService {
    // Usar una URL base estándar si no existe en environment
    private apiUrl = environment.urlApi + '/v1';

    constructor(private http: HttpClient) { }

    // Pedidos
    getOrders(): Observable<OrderListResponse> {
        const url = `${this.apiUrl}/orders/all`;
        return this.http.get<OrderListResponse>(url);
    }

    getOrderByNroPedido(nroPedido: string): Observable<Order> {
        const url = `${this.apiUrl}/orders/byNroPedido/${nroPedido}`;
        return this.http.get<Order>(url);
    }

    // Picking
    getEstadoPicking(pickingId: string): Observable<PickingResponse> {
        const url = `${this.apiUrl}/picking/${pickingId}`;
        return this.http.get<PickingResponse>(url);
    }

    iniciarPicking(data: PickingRequest): Observable<PickingResponse> {
        const url = `${this.apiUrl}/picking`;
        return this.http.post<PickingResponse>(url, data);
    }

    completarPicking(data: PickingCompletarRequest): Observable<PickingResponse> {
        const url = `${this.apiUrl}/picking/${data.pickingId}/completar`;
        return this.http.post<PickingResponse>(url, data);
    }

    // Datos auxiliares
    getBodegasDisponibles(): Observable<any[]> {
        const url = `${this.apiUrl}/bodegas`;
        return this.http.get<any[]>(url);
    }

    getProductosDisponibles(): Observable<any[]> {
        const url = `${this.apiUrl}/productos`;
        return this.http.get<any[]>(url);
    }

    getOrdenesPendientes(): Observable<Order[]> {
        const url = `${this.apiUrl}/orders/pending`;
        return this.http.get<OrderListResponse>(url).pipe(
            map(response => response.orders)
        );
    }

    // Servicios de Packing
    iniciarPacking(data: { ordenId: string, bodegaId: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/inventory/packing/iniciar`, data);
    }

    completarPacking(data: { packingId: string, informacionEmbalaje: any }): Observable<any> {
        return this.http.post(`${this.apiUrl}/inventory/packing/completar`, data);
    }

    getEstadoPacking(ordenId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/inventory/packing/estado/${ordenId}`);
    }
} 