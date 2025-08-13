import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { 
  ProductoDropshipping, 
  OrdenDropshipping, 
  OrdenDropshippingSummary,
  EstadoOrdenDropshipping 
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class DropshippingService {

  private mockProductos: ProductoDropshipping[] = [];
  private mockOrdenes: OrdenDropshipping[] = [];

  constructor() {}

  // Productos Dropshipping
  getProductosDropshipping(): Observable<ProductoDropshipping[]> {
    return of(this.mockProductos);
  }

  getProductoDropshipping(id: string): Observable<ProductoDropshipping> {
    const producto = this.mockProductos.find(p => p.id === id);
    return of(producto!);
  }

  createProductoDropshipping(producto: ProductoDropshipping): Observable<string> {
    const newId = (this.mockProductos.length + 1).toString();
    producto.id = newId;
    producto.fecha_creacion = new Date().toISOString();
    producto.fecha_actualizacion = new Date().toISOString();
    producto.sincronizado = false;
    this.mockProductos.push(producto);
    return of(newId);
  }

  updateProductoDropshipping(id: string, producto: Partial<ProductoDropshipping>): Observable<void> {
    const index = this.mockProductos.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockProductos[index] = {
        ...this.mockProductos[index],
        ...producto,
        fecha_actualizacion: new Date().toISOString()
      };
    }
    return of(void 0);
  }

  deleteProductoDropshipping(id: string): Observable<void> {
    const index = this.mockProductos.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockProductos.splice(index, 1);
    }
    return of(void 0);
  }

  getProductosByProveedor(proveedorId: string): Observable<ProductoDropshipping[]> {
    return of(this.mockProductos.filter(p => p.proveedor_id === proveedorId));
  }

  // Órdenes Dropshipping
  getOrdenesDropshipping(): Observable<OrdenDropshipping[]> {
    return of(this.mockOrdenes);
  }

  getOrdenDropshipping(id: string): Observable<OrdenDropshipping> {
    const orden = this.mockOrdenes.find(o => o.id === id);
    return of(orden!);
  }

  createOrdenDropshipping(orden: OrdenDropshipping): Observable<string> {
    const newId = (this.mockOrdenes.length + 1).toString();
    orden.id = newId;
    orden.fecha_creacion = new Date().toISOString();
    orden.numero_orden = this.generateOrderNumber();
    this.mockOrdenes.push(orden);
    return of(newId);
  }

  updateOrdenDropshipping(id: string, orden: Partial<OrdenDropshipping>): Observable<void> {
    const index = this.mockOrdenes.findIndex(o => o.id === id);
    if (index !== -1) {
      this.mockOrdenes[index] = { ...this.mockOrdenes[index], ...orden };
    }
    return of(void 0);
  }

  updateEstadoOrden(id: string, estado: EstadoOrdenDropshipping): Observable<void> {
    const updateData: Partial<OrdenDropshipping> = { estado };
    
    if (estado === 'enviado') {
      updateData.fecha_envio_proveedor = new Date().toISOString();
    } else if (estado === 'entregado') {
      updateData.fecha_entrega_real = new Date().toISOString();
    }

    return this.updateOrdenDropshipping(id, updateData);
  }

  getOrdenesByProveedor(proveedorId: string): Observable<OrdenDropshipping[]> {
    return of(this.mockOrdenes.filter(o => o.proveedor_id === proveedorId));
  }

  getOrdenesByEstado(estado: EstadoOrdenDropshipping): Observable<OrdenDropshipping[]> {
    return of(this.mockOrdenes.filter(o => o.estado === estado));
  }

  // Analytics y Summary
  getDropshippingSummary(): Observable<OrdenDropshippingSummary> {
    // TODO: Implementar lógica real con Firebase queries
    return of({
      total_ordenes: 0,
      ordenes_pendientes: 0,
      ordenes_en_proceso: 0,
      ordenes_entregadas: 0,
      valor_total_mes: 0,
      ganancia_total_mes: 0
    });
  }

  // Utilidades
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DS-${timestamp}-${random}`;
  }

  calcularMargenGanancia(precioProveedor: number, precioVenta: number): number {
    if (precioProveedor === 0) return 0;
    return ((precioVenta - precioProveedor) / precioProveedor) * 100;
  }

  calcularGananciaNeta(orden: OrdenDropshipping): number {
    return orden.total - orden.comision_proveedor - orden.costo_envio;
  }

  // Sincronización de productos
  sincronizarProductosProveedor(proveedorId: string): Observable<boolean> {
    // TODO: Implementar lógica de sincronización con API del proveedor
    return of(true);
  }

  marcarProductoComoSincronizado(productoId: string): Observable<void> {
    return this.updateDocument(this.COLLECTION_PRODUCTOS, productoId, {
      sincronizado: true,
      fecha_ultima_sincronizacion: new Date().toISOString()
    });
  }
}