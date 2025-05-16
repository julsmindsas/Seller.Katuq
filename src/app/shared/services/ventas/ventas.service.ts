import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { Producto } from '../../models/productos/Producto';
import { Pedido } from '../../../components/ventas/modelo/pedido';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  getProductByNumber(productNumber: string) {
    return this.post<any>('/v1/catalog/getProductByNumber', { productNumber });
  }

  validateCupon(cupon: any) {
    return this.post<any>('/v1/cupones/validatecupon', cupon);
  }

  createOrder(orderTemplate: any) {
    return this.post<any>('/v1/orders/create', orderTemplate);
  }

  editOrder(order: Pedido): Observable<any> {
    return this.post<any>('/v1/orders/edit', order);
  }

  getOrders() {
    const empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');
    const id = empresaActual.nomComercial;
    return this.get<Pedido[]>('/v1/orders/all/' + id);

  }

  getOrdersByFilter(filter: any) {
    return this.post<Pedido[]>('/v1/orders/all/filter', filter);
  }
  getOrdersByNroPedido(nroPedido: any) {
    return this.get<Pedido[]>('/v1/orders/byNroPedido/' + nroPedido);
  }



  enviarCorreoConfirmacionPedido(orderTemplate: any): Observable<any> {
    return this.post<any>('/v1/orders/sendEmail', orderTemplate);
  }


  //preorders
  savePreOrders(order: Pedido) {
    return localStorage.setItem(`preOrder_${order.nroPedido}`, JSON.stringify(order));
  }

  getPreOrders() {
    return Object.keys(localStorage)
      .filter(key => key.includes('preOrder_'))
      .map(key => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }).filter(Boolean);
  }

  getPreOrder(nroPedido: string) {
    const preOrder = localStorage.getItem(`preOrder_${nroPedido}`);
    return preOrder ? JSON.parse(preOrder) : null;
  }

  removePreOrder(nroPedido: string) {
    localStorage.removeItem(`preOrder_${nroPedido}`);
  }
  // fin preorders

  /**
   * Actualiza el estado de pago de un pedido específico
   * @param numeroPedido Número de pedido a actualizar
   * @param estadoPago Nuevo estado de pago (Pendiente, Aprobado, Rechazado)
   */
  updateOrderPaymentStatus(numeroPedido: string, estadoPago: any): Observable<any> {
    return this.post<any>('/v1/orders/updateOrder', { numeroPedido, estadoPago });
  }


  getOrderStatus(numeroPedido: string): Observable<any> {
    return this.get<any>(`/v1/orders/status/${numeroPedido}`);
  }

  realizarCierreCaja(cierreData: any): Observable<any> {
    return this.post<any>('/v1/orders/cash-closing', cierreData);
  }

  getCashClosingHistory(filter: any) {
    return this.post<any>('/v1/orders/cash-closing-history', filter);
  }

  getDatosEntregas(documento: string): Observable<any> {
    return this.post<any>(`/v1/client/getDatosEntregas`, { documento });
  }

  getDatosFacturacion(documento: string): Observable<any> {
    return this.post<any>(`/v1/client/getDatosFacturacion`, { documento });
  }

  findProduct(term: string) {
    return this.post<any>('/v1/catalog/searchProduct', { term });
  }

  getOrderById(orderId: string) {
    return this.post<any>('/v1/orders/getById', { orderId });
  }

}
