import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Proveedor, ProveedorSummary } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {

  private mockProveedores: Proveedor[] = [
    {
      id: '1',
      nombre: 'Proveedor Ejemplo',
      contacto: 'Juan Pérez',
      email: 'contacto@proveedor.com',
      telefono: '123456789',
      comision_porcentaje: 15,
      tiempo_procesamiento_dias: 3,
      activo: true,
      api_config: { tipo_integracion: 'manual' },
      fecha_creacion: new Date().toISOString()
    }
  ];

  constructor() {}

  // CRUD básico
  getProveedores(): Observable<Proveedor[]> {
    return of(this.mockProveedores);
  }

  getProveedor(id: string): Observable<Proveedor> {
    const proveedor = this.mockProveedores.find(p => p.id === id);
    return of(proveedor!);
  }

  createProveedor(proveedor: Proveedor): Observable<string> {
    const newId = (this.mockProveedores.length + 1).toString();
    proveedor.id = newId;
    proveedor.fecha_creacion = new Date().toISOString();
    proveedor.fecha_actualizacion = new Date().toISOString();
    this.mockProveedores.push(proveedor);
    return of(newId);
  }

  updateProveedor(id: string, proveedor: Partial<Proveedor>): Observable<void> {
    const index = this.mockProveedores.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockProveedores[index] = { 
        ...this.mockProveedores[index], 
        ...proveedor, 
        fecha_actualizacion: new Date().toISOString() 
      };
    }
    return of(void 0);
  }

  deleteProveedor(id: string): Observable<void> {
    const index = this.mockProveedores.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockProveedores.splice(index, 1);
    }
    return of(void 0);
  }

  // Métodos específicos
  getProveedoresActivos(): Observable<Proveedor[]> {
    return of(this.mockProveedores.filter(p => p.activo));
  }

  activarProveedor(id: string): Observable<void> {
    return this.updateProveedor(id, { activo: true });
  }

  desactivarProveedor(id: string): Observable<void> {
    return this.updateProveedor(id, { activo: false });
  }

  // Analytics
  getProveedorSummary(id: string): Observable<ProveedorSummary> {
    // TODO: Implementar lógica real con queries a productos y órdenes
    return of({
      id,
      nombre: '',
      productos_activos: 0,
      ordenes_pendientes: 0,
      total_ventas_mes: 0
    });
  }

  // Validaciones
  validateProveedorEmail(email: string, excludeId?: string): Observable<boolean> {
    // TODO: Implementar validación de email único
    return of(true);
  }

  // Configuración API
  testApiConnection(proveedor: Proveedor): Observable<boolean> {
    // TODO: Implementar test de conexión API
    return of(true);
  }

  updateApiConfig(id: string, apiConfig: any): Observable<void> {
    return this.updateProveedor(id, {
      api_config: apiConfig
    });
  }

  // Utilidades
  calcularComisionTotal(proveedorId: string, montoVenta: number): Observable<number> {
    return new Observable(observer => {
      this.getProveedor(proveedorId).subscribe(proveedor => {
        const comision = (montoVenta * proveedor.comision_porcentaje) / 100;
        observer.next(comision);
        observer.complete();
      });
    });
  }
}