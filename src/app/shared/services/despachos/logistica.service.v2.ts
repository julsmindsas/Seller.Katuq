import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LogisticaServiceV2 extends BaseService {
    private apiUrl = environment.urlApi ;

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

    dispatchShippingOrder(shippingOrder: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/dispatch`, shippingOrder);
    }
} 