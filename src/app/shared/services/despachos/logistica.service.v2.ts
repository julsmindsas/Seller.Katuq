import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LogisticaServiceV2 extends BaseService {
    private apiUrl = environment.urlApi;

    constructor(public http: HttpClient) {
        super(http);
    }

    // Transportadores
    getTransportadores(): Observable<any> {
        return this.http.get(`${this.apiUrl}/v1/logistica/vendors/all`);
    }

    getTransportadora(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors`, { id });
    }

    createTrasportadora(transportadora: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors/create`, transportadora);
    }

    updateTrasportadora(transportadora: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors/update`, transportadora);
    }

    deleteTrasportadora(id: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors/delete`, id);
    }

    // Órdenes de envío
    getShippingOrders(): Observable<any> {
        return this.http.get(`${this.apiUrl}/v1/logistica/shippingorders/all`);
    }

    getShippingOrder(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/get`, { nroShippingOrder: id });
    }

    createShippingOrder(shippingOrder: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/create`, shippingOrder);
    }

    updateShippingOrder(nroShippingOrder: number | string, shippingOrder: any): Observable<any> {
        const payload = { nroShippingOrder, ...shippingOrder };
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/update`, payload);
    }

    dispatchShippingOrder(shippingOrder: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/dispatch`, shippingOrder);
    }

    // Shipments (transportadoras)
    createShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments`, shipment);
    }

    findShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/find`, shipment);
    }

    updateShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/update`, shipment);
    }

    deleteShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/delete`, shipment);
    }

    trackShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/track`, shipment);
    }

    // Nuevo método para seguimiento de pedidos despachados
    trackDespachado(companyId: string, provider: string, order: string, options: any = {}): Observable<any> {
        const payload = { companyId, provider, order, options };
        return this.http.post(`${this.apiUrl}/v1/logistics/despachados/track`, payload);
    }

} 