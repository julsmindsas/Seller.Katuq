import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';
import { 
  OrdenDropshipping, 
  OrdenDropshippingSummary,
  EstadoOrdenDropshipping 
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class DropshippingService extends BaseService {

  constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  // Nota: Los productos dropshipping ahora se manejan a través del sistema de productos existente
  // con configuración de dropshipping incluida en cada producto

  // Órdenes Dropshipping
  getOrdenesDropshipping(): Observable<OrdenDropshipping[]> {
    return this.get<OrdenDropshipping[]>('/v1/dropshipping/ordenes');
  }

  getOrdenDropshipping(id: string): Observable<OrdenDropshipping> {
    return this.get<OrdenDropshipping>(`/v1/dropshipping/ordenes/${id}`);
  }

  createOrdenDropshipping(orden: OrdenDropshipping): Observable<any> {
    return this.post<any>('/v1/dropshipping/ordenes', orden);
  }

  updateOrdenDropshipping(id: string, orden: Partial<OrdenDropshipping>): Observable<any> {
    return this.put<any>(`/v1/dropshipping/ordenes/${id}`, orden);
  }

  updateEstadoOrden(id: string, estado: EstadoOrdenDropshipping): Observable<any> {
    const updateData: Partial<OrdenDropshipping> = { estado };
    
    if (estado === 'enviado') {
      updateData.fecha_envio_proveedor = new Date().toISOString();
    } else if (estado === 'entregado') {
      updateData.fecha_entrega_real = new Date().toISOString();
    }

    return this.updateOrdenDropshipping(id, updateData);
  }

  getOrdenesByProveedor(proveedorId: string): Observable<OrdenDropshipping[]> {
    return this.get<OrdenDropshipping[]>(`/v1/dropshipping/ordenes/proveedor/${proveedorId}`);
  }

  getOrdenesByEstado(estado: EstadoOrdenDropshipping): Observable<OrdenDropshipping[]> {
    return this.get<OrdenDropshipping[]>(`/v1/dropshipping/ordenes/estado/${estado}`);
  }

  // Analytics y Summary
  getDropshippingSummary(): Observable<OrdenDropshippingSummary> {
    return this.get<OrdenDropshippingSummary>('/v1/dropshipping/summary');
  }

  // Utilidades
  calcularMargenGanancia(precioProveedor: number, precioVenta: number): number {
    if (precioProveedor === 0) return 0;
    return ((precioVenta - precioProveedor) / precioProveedor) * 100;
  }

  calcularGananciaNeta(orden: OrdenDropshipping): number {
    return orden.total - orden.comision_proveedor - orden.costo_envio;
  }

  // Sincronización de productos (ahora integrada con sistema de productos existente)
  sincronizarProductosProveedor(proveedorId: string): Observable<any> {
    return this.post<any>('/v1/dropshipping/sincronizar-productos', { proveedorId });
  }

  // Crear orden dropshipping desde una venta regular
  crearOrdenDesdeVenta(pedidoId: string, productosDropshipping: any[]): Observable<any> {
    return this.post<any>('/v1/dropshipping/crear-desde-venta', {
      pedidoId,
      productosDropshipping
    });
  }
}