import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { Producto } from '../../models/productos/Producto';
import { Pedido } from '../../../components/ventas/modelo/pedido';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
@Injectable({
  providedIn: 'root'
})
export class VentasService extends BaseService {
  getOrdersPOSByFilter(filter: any) {
    return this.post<POSPedido[]>('/v1/orders/pos/all/filter', filter);
  }
  getTopVentasPorDiaEntreFechas(fechaInicio: string, fechaFin: string) {
    return this.get<any>('/v1/orders/getVentasPorFecha?startDate=' + fechaInicio + '&endDate=' + fechaFin);
  }
  getTop10ProductosMenosVendidos() {
    return this.post<any>('/v1/orders/getTop10ProductosMenosVendidos', {});
  }
  getTop10ProductosMasVendidos() {
    return this.post<any>('/v1/orders/getTop10ProductosMasVendidos', {});
  }
  validateNroPedido(nroPedido: string) {
    return this.get<any>('/v1/orders/validateNroPedido/' + nroPedido);
  }
  despacharOrden(pedidosSeleccionados: Pedido[]) {
    return this.post<any>('/v1/orders/dispatch', pedidosSeleccionados);
  }
  crearTransportador(nuevoTransportador: any) {
    return this.post<any>('/v1/transportadores/create', nuevoTransportador);
  }
  generarOrdenEnvio(nuevaOrdenEnvio: any) {
    return this.post<any>('/v1/orders/createShippingOrder', nuevaOrdenEnvio);
  }
  deleteOrder(order: Pedido) {
    return this.post<any>('/v1/orders/delete', order);
  }


  getNextRef(id: any) {
    return this.post<any>('/v1/orders/getnextConsecutive', { company: id });
  }

  constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  public getProducts() {
    return this.get<Producto[]>('/v1/productos/all');
  }

  public getProductsByFilter(filter: any) {
    return this.post<Producto[]>('/v1/productos/all/filter', filter);
  }

  getProductByNumber(numberProduct: string) {
    return this.get<Producto[]>('/v1/productos/getByNumber/' + numberProduct);
  }

  validateCupon(cupon: any) {
    return this.post<any>('/v1/cupones/validatecupon', cupon);
  }

  createOrder(order: any) {
    return this.post<any>('/v1/orders/create', order);
  }

  editOrder(order: Pedido) {
    return this.post<any>('/v1/orders/edit', order);
  }

  getOrders() {
    const empresaActual = JSON.parse(sessionStorage.getItem("currentCompany"));
    const id = empresaActual.nomComercial;
    return this.get<Pedido[]>('/v1/orders/all/' + id);

  }

  getOrdersByFilter(filter: any) {
    return this.post<Pedido[]>('/v1/orders/all/filter', filter);
  }
  getOrdersByNroPedido(nroPedido: any) {
    return this.get<Pedido[]>('/v1/orders/byNroPedido/' + nroPedido);
  }



  enviarCorreoConfirmacionPedido(orderTemplate: any) {
    return this.post<any>('/v1/orders/sendEmail', orderTemplate);
  }


  //preorders
  savePreOrders(pedido: Pedido) {
    let preorders: Pedido[] = JSON.parse(localStorage.getItem('preorder')) || [];
    const index = preorders.findIndex(pre => pre.referencia === pedido.referencia);
    if (index !== -1) {
      preorders[index] = pedido;
    } else {
      preorders.push(pedido);
    }
    localStorage.setItem('preorder', JSON.stringify(preorders));
  }

  getPreOrders() {
    return JSON.parse(localStorage.getItem('preorder'));
  }
  getPreOrdersByRef(ref: string) {
    const preorder = JSON.parse(localStorage.getItem('preorder')).filter((pre: any) => pre.referencia === ref)[0];
  }

  removePreOrder(referencia: string) {
    // let preorders = JSON.parse(localStorage.getItem('preorder'));
    // preorders = preorders.filter((pre: any) => pre.referencia !== referencia);
    // localStorage.setItem('preorder', JSON.stringify(preorders));
    console.log('se intenteo remover ')
  }
  // fin preorders


}
