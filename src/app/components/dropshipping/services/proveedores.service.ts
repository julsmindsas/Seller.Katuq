import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';
import { Proveedor, ProveedorSummary } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService extends BaseService {

  constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  // CRUD básico
  getProveedores(): Observable<Proveedor[]> {
    return this.get<Proveedor[]>('/v1/dropshipping/proveedores');
  }

  getProveedor(id: string): Observable<Proveedor> {
    return this.get<Proveedor>(`/v1/dropshipping/proveedores/${id}`);
  }

  createProveedor(proveedor: Proveedor): Observable<any> {
    return this.post<any>('/v1/dropshipping/proveedores', proveedor);
  }

  updateProveedor(id: string, proveedor: Partial<Proveedor>): Observable<any> {
    return this.put<any>(`/v1/dropshipping/proveedores/${id}`, proveedor);
  }

  deleteProveedor(id: string): Observable<any> {
    return this.delete<any>(`/v1/dropshipping/proveedores/${id}`);
  }

  // Métodos específicos
  getProveedoresActivos(): Observable<Proveedor[]> {
    return this.get<Proveedor[]>('/v1/dropshipping/proveedores/activos');
  }

  activarProveedor(id: string): Observable<any> {
    return this.put<any>(`/v1/dropshipping/proveedores/${id}/activar`, {});
  }

  desactivarProveedor(id: string): Observable<any> {
    return this.put<any>(`/v1/dropshipping/proveedores/${id}/desactivar`, {});
  }

  // Analytics
  getProveedorSummary(id: string): Observable<ProveedorSummary> {
    return this.get<ProveedorSummary>(`/v1/dropshipping/proveedores/${id}/summary`);
  }

  // Validaciones
  validateProveedorEmail(email: string, excludeId?: string): Observable<any> {
    const params = excludeId ? `?exclude=${excludeId}` : '';
    return this.post<any>(`/v1/dropshipping/proveedores/validate-email${params}`, { email });
  }

  // Configuración API
  testApiConnection(proveedor: Proveedor): Observable<any> {
    return this.post<any>('/v1/dropshipping/proveedores/test-api-connection', proveedor);
  }

  updateApiConfig(id: string, apiConfig: any): Observable<any> {
    return this.put<any>(`/v1/dropshipping/proveedores/${id}/api-config`, apiConfig);
  }

  // Búsqueda
  searchProveedores(searchTerm: string): Observable<Proveedor[]> {
    return this.get<Proveedor[]>(`/v1/dropshipping/proveedores/search?q=${encodeURIComponent(searchTerm)}`);
  }

  // Utilidades
  calcularComisionTotal(proveedorId: string, montoVenta: number): Observable<any> {
    return this.post<any>('/v1/dropshipping/proveedores/calcular-comision', {
      proveedorId,
      montoVenta
    });
  }
}