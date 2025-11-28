import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  FulfillmentStockResponse,
  BulkStockResponse,
  SyncInventoryResponse,
  SyncBodegaResponse,
  FulfillmentProvider,
  FulfillmentWarehouse,
  FulfillmentProduct,
  FulfillmentSyncOptions
} from '../../models/fulfillment/fulfillment.model';

/**
 * FulfillmentService
 *
 * Servicio para integración con proveedores de fulfillment (Aliado, etc.)
 * Permite consultar stock, sincronizar inventario y gestionar la integración.
 */
@Injectable({
  providedIn: 'root'
})
export class FulfillmentService {
  private apiUrl = environment.urlApi + '/v1/fulfillment-integrations';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el companyId del usuario actual desde localStorage
   */
  private getCompanyId(): string {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      return currentCompany.id || currentCompany._id || '';
    } catch {
      return '';
    }
  }

  // ============== STOCK ==============

  /**
   * Obtiene el stock de un producto en el fulfillment
   * @param provider Nombre del provider (ej: 'aliaddo')
   * @param productId ID del producto
   * @param warehouseId ID de la bodega del fulfillment (opcional)
   */
  getStock(provider: string, productId: string, warehouseId?: string): Observable<FulfillmentStockResponse> {
    let params = new HttpParams().set('companyId', this.getCompanyId());
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }

    return this.http.get<any>(`${this.apiUrl}/stock/${provider}/${productId}`, { params })
      .pipe(
        map(res => res.data || res),
        catchError(error => {
          console.error('Error obteniendo stock de fulfillment:', error);
          return of({
            success: false,
            provider,
            productId,
            totalStock: 0,
            warehouses: [],
            lastUpdated: null,
            error: error.error?.message || error.message
          } as any);
        })
      );
  }

  /**
   * Obtiene el stock de múltiples productos del fulfillment
   * @param provider Nombre del provider
   * @param productIds Array de IDs de productos
   */
  getBulkStock(provider: string, productIds: string[]): Observable<BulkStockResponse> {
    return this.http.post<any>(`${this.apiUrl}/stock/bulk`, {
      provider,
      productIds,
      companyId: this.getCompanyId()
    }).pipe(
      map(res => res.data || res),
      catchError(error => {
        console.error('Error obteniendo stock masivo:', error);
        return of({
          success: false,
          provider,
          stocks: {},
          totalRequested: productIds.length,
          totalSuccess: 0,
          totalErrors: productIds.length,
          error: error.error?.message || error.message
        } as any);
      })
    );
  }

  // ============== SINCRONIZACIÓN ==============

  /**
   * Sincroniza el inventario de un producto con el fulfillment
   * Compara stock y crea movimiento de ajuste si hay diferencia
   * @param productId ID del producto en Katuq
   * @param bodegaId ID de la bodega (código, ej: BOD-001)
   * @param provider Nombre del provider
   * @param options Opciones adicionales
   */
  syncProductInventory(
    productId: string,
    bodegaId: string,
    provider: string,
    options: Partial<FulfillmentSyncOptions> = {}
  ): Observable<SyncInventoryResponse> {
    return this.http.post<any>(`${this.apiUrl}/sync-inventory`, {
      provider,
      productId,
      bodegaId,
      companyId: this.getCompanyId(),
      options: {
        fulfillmentProductId: options.fulfillmentProductId,
        fulfillmentWarehouseId: options.fulfillmentWarehouseId
      }
    }).pipe(
      map(res => res.data || res),
      catchError(error => {
        console.error('Error sincronizando inventario:', error);
        return of({
          success: false,
          productId,
          bodegaId,
          provider,
          error: error.error?.message || error.message,
          errorType: 'SYNC_ERROR'
        } as any);
      })
    );
  }

  /**
   * Sincroniza todos los productos de una bodega con el fulfillment
   * @param bodegaId ID de la bodega
   * @param provider Nombre del provider
   * @param options Opciones adicionales (batchSize, etc.)
   */
  syncBodegaCompleta(
    bodegaId: string,
    provider: string,
    options: Partial<FulfillmentSyncOptions> = {}
  ): Observable<SyncBodegaResponse> {
    return this.http.post<any>(`${this.apiUrl}/sync-bodega`, {
      provider,
      bodegaId,
      companyId: this.getCompanyId(),
      options: {
        batchSize: options.batchSize || 10
      }
    }).pipe(
      map(res => res.data || res),
      catchError(error => {
        console.error('Error sincronizando bodega:', error);
        return of({
          success: false,
          bodegaId,
          provider,
          error: error.error?.message || error.message,
          errorType: 'SYNC_BODEGA_ERROR'
        } as any);
      })
    );
  }

  // ============== PROVIDERS ==============

  /**
   * Obtiene los providers de fulfillment configurados para la empresa actual
   */
  getConfiguredProviders(): Observable<FulfillmentProvider[]> {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('No se encontró companyId para obtener providers de fulfillment');
      return of([]);
    }

    const params = new HttpParams().set('companyId', companyId);
    return this.http.get<any>(`${this.apiUrl}/providers`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(error => {
          console.error('Error obteniendo providers:', error);
          return of([]);
        })
      );
  }

  /**
   * Verifica si hay al menos un provider de fulfillment configurado
   */
  hasFulfillmentConfigured(): Observable<boolean> {
    return this.getConfiguredProviders().pipe(
      map(providers => providers && providers.length > 0 && providers.some(p => p.configured))
    );
  }

  /**
   * Obtiene el estado de salud del sistema de fulfillment
   */
  healthCheck(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`)
      .pipe(
        map(res => res.data || res),
        catchError(error => {
          return of({ overall: 'error', error: error.message });
        })
      );
  }

  // ============== BODEGAS FULFILLMENT ==============

  /**
   * Obtiene las bodegas del provider de fulfillment
   * @param provider Nombre del provider
   */
  getWarehouses(provider: string): Observable<FulfillmentWarehouse[]> {
    const params = new HttpParams().set('companyId', this.getCompanyId());
    return this.http.get<any>(`${this.apiUrl}/warehouses/${provider}`, { params })
      .pipe(
        map(res => res.data?.warehouses || res.data || []),
        catchError(error => {
          console.error('Error obteniendo bodegas del fulfillment:', error);
          return of([]);
        })
      );
  }

  // ============== PRODUCTOS FULFILLMENT ==============

  /**
   * Obtiene los detalles de un producto en el fulfillment
   * @param provider Nombre del provider
   * @param productId ID del producto
   */
  getProduct(provider: string, productId: string): Observable<FulfillmentProduct | null> {
    const params = new HttpParams().set('companyId', this.getCompanyId());
    return this.http.get<any>(`${this.apiUrl}/product/${provider}/${productId}`, { params })
      .pipe(
        map(res => res.data || null),
        catchError(error => {
          console.error('Error obteniendo producto del fulfillment:', error);
          return of(null);
        })
      );
  }

  /**
   * Sincroniza el catálogo de productos con el fulfillment
   * @param provider Nombre del provider
   * @param options Opciones (limit, offset, etc.)
   */
  syncProducts(provider: string, options: any = {}): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/products/sync`, {
      provider,
      companyId: this.getCompanyId(),
      options
    }).pipe(
      map(res => res.data || res),
      catchError(error => {
        console.error('Error sincronizando productos:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // ============== UTILIDADES ==============

  /**
   * Actualiza el stock de un producto en el fulfillment
   * @param provider Nombre del provider
   * @param productId ID del producto
   * @param quantity Cantidad
   * @param operation Operación: 'set', 'increment', 'decrement'
   */
  updateStock(
    provider: string,
    productId: string,
    quantity: number,
    operation: 'set' | 'increment' | 'decrement'
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/stock/update`, {
      provider,
      productId,
      quantity,
      operation,
      companyId: this.getCompanyId()
    }).pipe(
      map(res => res.data || res),
      catchError(error => {
        console.error('Error actualizando stock:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Obtiene el nombre legible del provider
   */
  getProviderDisplayName(provider: string): string {
    const names: { [key: string]: string } = {
      'aliaddo': 'Aliado',
      'shopify': 'Shopify',
      'woocommerce': 'WooCommerce'
    };
    return names[provider?.toLowerCase()] || provider;
  }

  /**
   * Obtiene el icono del provider
   */
  getProviderIcon(provider: string): string {
    const icons: { [key: string]: string } = {
      'aliaddo': 'pi pi-box',
      'shopify': 'pi pi-shopping-cart',
      'woocommerce': 'pi pi-shopping-bag'
    };
    return icons[provider?.toLowerCase()] || 'pi pi-cloud';
  }
}
