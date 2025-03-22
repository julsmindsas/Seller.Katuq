
import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { PedidoParaProduccion } from '../../models/produccion/Produccion';
import { Observable } from 'rxjs';
// import { Pedido } from 'src/app/components/ventas/modelo/pedido';

@Injectable({ providedIn: 'root' })
export class LogisticaService extends BaseService {
 
    constructor(public http: HttpClient) {
        super(http);
    }

    //trasportadores
    getTransportadores(): Observable<any> {
        return this.get('/v1/logistica/vendors/all');
    }
    getTransportadora(id: number): Observable<any> {
        return this.post('/v1/logistica/vendors', { id: id });
    }
    createTrasportadora(transportadora: any): Observable<any> {
        return this.post('/v1/logistica/vendors/create', transportadora);
    }
    deleteTrasportadora(id: any): Observable<any> {
        return this.post('/v1/logistica/vendors/delete', id);
    }

    //shipping orders
    getShippingOrders(): Observable<any> {
        return this.get('/v1/logistica/shippingorders/all');
    }
    getShippingOrder(id: number): Observable<any> {
        return this.post('/v1/logistica/shippingorders/get', { nroShippingOrder: id });
    }
    createShippingOrder(shippingOrder: any): Observable<any> {
        return this.post('/v1/logistica/shippingorders/create', shippingOrder);
    }

    dispatchShippingOrder(shippingOrder: any): Observable<any> {
        return this.post('/v1/logistica/shippingorders/dispatch', shippingOrder);
    }



}