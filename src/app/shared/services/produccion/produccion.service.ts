import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { PedidoParaProduccion } from '../../models/produccion/Produccion';
import { Observable } from 'rxjs';
import { Pedido } from 'src/app/components/ventas/modelo/pedido';
@Injectable({ providedIn: 'root' })
export class ProduccionService extends BaseService {
    constructor(public http: HttpClient) {
        super(http);
    }

    getOrdersByFiltersFlatProduct(filter: any): Observable<{orders: PedidoParaProduccion[], ordersRaw: Pedido[]}> {
        return this.post<{orders: PedidoParaProduccion[], ordersRaw: Pedido[]}>('/v1/orders/all/filterflatproduct', filter);
    }


}