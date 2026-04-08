import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MovimientoInventario, MovimientosResponse } from '../../../components/inventarios/model/movimientoinventario';
import { TipoMovimientoInventario } from '../../../components/inventarios/enums/tipos-movimiento.enum';
import { Bodega } from '../../models/inventarios/bodega.model';
import { Traslado } from '../../models/inventarios/traslado.model';

/**
 * Interfaz para producto en vista consolidada de inventario
 */
export interface ProductoConsolidado {
  id: string;
  referencia: string;
  nombre: string;
  imagen: string | null;
  precio: number;
  precioSinIva: number;
  inventariable: boolean;
  stockPorBodega: { [bodegaId: string]: number };
  stockTotal: number;
  fulfillmentId: string | null;
  fulfillmentProvider: string | null;
  // Campos para UI
  expanded?: boolean;
  fulfillmentLoading?: boolean;
  fulfillmentStock?: { [warehouseId: string]: number };
  fulfillmentWarehouses?: any[];
}

/**
 * Interfaz para métricas de IA por bodega (FUTURO)
 */
export interface MetricasIABodega {
  alertaReorden: string | null;        // "URGENTE" | "PRONTO" | null
  productosParaReorden: string[];      // IDs de productos
  tendencia: string | null;            // "SUBIENDO" | "BAJANDO" | "ESTABLE"
  prediccionAgotamiento: number | null; // Días estimados
  sugerencias: string[];
}

/**
 * Interfaz para métricas globales de una bodega
 */
export interface MetricasBodega {
  valorTotal: number;
  totalUnidades: number;
  totalProductos: number;
  productosSinStock: number;
  productosBajoStock: number;
  // Métricas adicionales
  coberturaCatalogo: number;      // % de SKUs con stock
  valorPromedioPorSKU: number;    // Valor promedio
  porcentajeInventario: number;   // % del total
  // IA (FUTURO)
  ia?: MetricasIABodega;
}

/**
 * Interfaz para bodega en vista consolidada
 */
export interface BodegaConsolidada {
  id: string;
  docId: string;
  nombre: string;
  tipo: string;
  fulfillmentId: string | null;
  fulfillmentProvider: string | null;
  metricas?: MetricasBodega;
}

/**
 * Interfaz para métricas de IA globales (FUTURO)
 */
export interface MetricasIAGlobal {
  saludInventario: string | null;   // "BUENA" | "REGULAR" | "CRITICA"
  bodegaCritica: string | null;     // ID de bodega
  resumenEjecutivo: string | null;  // Texto generado por IA
}

/**
 * Interfaz para totales globales del inventario
 */
export interface TotalesGlobales {
  valorTotal: number;
  totalUnidades: number;
  totalProductos: number;        // SKUs únicos con stock
  totalSKUsCatalogo: number;     // Total SKUs inventariables
  ia?: MetricasIAGlobal;
}

/**
 * Interfaz para respuesta del endpoint consolidado
 */
export interface InventarioConsolidadoResponse {
  success: boolean;
  productos: ProductoConsolidado[];
  bodegas: BodegaConsolidada[];
  totalProductos: number;
  estadisticas: {
    totalStock: number;
    productosSinStock: number;
    productosBajoStock: number;
  };
  totalesGlobales: TotalesGlobales;
  pagination: {
    limit: number;
    returned: number;
    hasMore: boolean;
    lastDoc: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private apiUrl = environment.urlApi + '/v1';
  private firebaseApiUrl = '';

  constructor(private http: HttpClient) { }

  /**
   * Registra un movimiento de inventario en el sistema
   * @param movimientos Lista de movimientos de inventario
   * @returns Observable con el resultado de la operación
   */
  registrarMovimientoInventario(movimientos: MovimientoInventario[]): Observable<any> {
    const url = `${this.apiUrl}/inventory/movimientos`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, { movimientos }, { headers });
  }

  /**
   * Ingresa productos al inventario
   * @param bodegaId ID de la bodega
   * @param productos Lista de productos a ingresar
   * @param tipoMovimiento Tipo de movimiento de inventario
   * @returns Observable con el resultado de la operación
   */
  getCentralAbastecimiento(dias: number = 30): Observable<any> {
    return this.http.get(`${this.apiUrl}/inventory/central-abastecimiento`, {
      params: { dias: dias.toString() }
    });
  }

  quitarProductoSinStock(productoId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/inventory/quitar-sin-stock/${productoId}`);
  }

  analizarAbastecimientoIA(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/katuqintelligence/kai/inventory-analysis`, datos);
  }

  ingresarProductos(bodegaId: string, productos: any[], tipoMovimiento: TipoMovimientoInventario, observaciones: string): Observable<any> {
    const url = `${this.apiUrl}/inventory/ingresar-multiples`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, {
      bodegaId,
      productos,
      tipoMovimiento,
      observaciones
    }, { headers });
  }

  /**
   * Obtiene el historial de movimientos de un producto
   * @param productId ID del producto
   * @returns Observable con el historial de movimientos
   */
  obtenerHistorialMovimientos(productId: string): Observable<MovimientoInventario[]> {
    const url = `${this.apiUrl}/inventory/movimientos/${productId}`;

    return this.http.get<MovimientoInventario[]>(url);
  }

  /**
   * Obtiene el historial de movimientos por bodega
   * @param bodegaId ID de la bodega
   * @returns Observable con el historial de movimientos
   */
  obtenerMovimientosPorBodega(bodegaId: string): Observable<MovimientoInventario[]> {
    const url = `${this.apiUrl}/inventory/movimientos/bodega/${bodegaId}`;

    return this.http.get<MovimientoInventario[]>(url);
  }

  /**
   * Obtener el inventario actual por bodega
   * @deprecated Usar obtenerInventarioConsolidado() para la nueva vista consolidada
   * @param bodegaId ID de la bodega
   * @returns Observable con el inventario actual
   */
  obtenerInventarioPorBodega(bodegaId: string): Observable<any> {
    const url = `${this.apiUrl}/inventory/bodega/${bodegaId}?loadAll=true`;

    return this.http.get<any>(url);
  }

  /**
   * Obtener inventario consolidado - todos los productos con stock por bodega
   * Diseñado para la vista consolidada de inventarios (sin selector de bodega)
   * 
   * @param options Opciones de paginación y filtro
   * @returns Observable con productos, bodegas y estadísticas
   */
  obtenerInventarioConsolidado(options: {
    limit?: number;
    page?: number;
    lastDoc?: string;
    soloInventariables?: boolean;
    includeMetrics?: boolean;
    stockFilter?: string;
    search?: string;
    bodega?: string;
    fulfillment?: string;
  } = {}): Observable<InventarioConsolidadoResponse> {
    let params = new HttpParams();

    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.page) params = params.set('page', options.page.toString());
    if (options.lastDoc) params = params.set('lastDoc', options.lastDoc);
    if (options.soloInventariables !== undefined) params = params.set('soloInventariables', options.soloInventariables.toString());
    if (options.includeMetrics !== undefined) params = params.set('includeMetrics', options.includeMetrics.toString());
    if (options.stockFilter) params = params.set('stockFilter', options.stockFilter);
    if (options.search) params = params.set('search', options.search);
    if (options.bodega) params = params.set('bodega', options.bodega);
    if (options.fulfillment) params = params.set('fulfillment', options.fulfillment);

    return this.http.get<InventarioConsolidadoResponse>(
      `${this.apiUrl}/inventory/consolidado`,
      { params }
    );
  }

  getBodegas(): Observable<Bodega[]> {
    return this.http.get<Bodega[]>(`${this.apiUrl}/bodegas/all`);
  }

  getProductosBodega(bodegaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bodegas/${bodegaId}/productos`);
  }

  realizarTraslado(traslado: Traslado): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventory/traslados`, traslado);
  }

  getHistorialMovimientos(filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    bodegaId?: string;
    productoId?: string;
    tipo?: string;
    search?: string;
    limit?: number;
    lastDoc?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Observable<MovimientosResponse> {
    let params = new HttpParams();

    if (filtros.fechaInicio) {
      params = params.set('fechaInicio', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      params = params.set('fechaFin', filtros.fechaFin);
    }
    if (filtros.bodegaId) {
      params = params.set('bodegaId', filtros.bodegaId);
    }
    if (filtros.productoId) {
      params = params.set('productoId', filtros.productoId);
    }
    if (filtros.limit) {
      params = params.set('limit', filtros.limit.toString());
    }
    if (filtros.lastDoc) {
      params = params.set('lastDoc', filtros.lastDoc);
    }
    if (filtros.orderBy) {
      params = params.set('orderBy', filtros.orderBy);
    }
    if (filtros.orderDirection) {
      params = params.set('orderDirection', filtros.orderDirection);
    }
    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros.search) {
      params = params.set('search', filtros.search);
    }

    return this.http.get<MovimientosResponse>(`${this.apiUrl}/inventory/historial`, { params });
  }

  exportarExcelHistorial(filtros: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/exportar-historial`, filtros, {
      responseType: 'blob'
    });
  }

  getProductos(pageSize: number = 100): Observable<any> {
    let params = new HttpParams();
    params = params.set('pageSize', pageSize.toString());
    return this.http.get(`${this.apiUrl}/productos/all`, { params });
  }

  getMovimientoDetalle(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/movimiento/${id}`);
  }

  /**
   * Obtiene el inventario de un producto en todas las bodegas
   * @param productoId ID del producto
   * @returns Observable con el inventario en todas las bodegas
   */
  obtenerInventarioProducto(productoId: string): Observable<any[]> {
    const url = `${this.apiUrl}/inventory/producto/${productoId}`;
    return this.http.get<any[]>(url);
  }

  /**
   * Elimina FÍSICAMENTE todo el inventario de un comercio
   * ⚠️ OPERACIÓN DESTRUCTIVA - USO ADMINISTRATIVO/DESARROLLO
   * @param confirmCompanyName Nombre del comercio para confirmar
   */
  deleteAllInventoryByCompany(confirmCompanyName: string): Observable<any> {
    const payload = {
      confirmCompanyName: confirmCompanyName,
      confirmDelete: 'ELIMINAR_TODO_EL_INVENTARIO'
    };
    return this.http.post(`${this.apiUrl}/inventory/delete-all-by-company`, payload);
  }

  /**
   * Analiza el inventario usando ADK Agent IA
   * Ejecuta análisis inteligente para detectar alertas de reorden, tendencias y predicciones
   * @param bodegas Array de bodegas a analizar
   * @returns Observable con métricas de IA por bodega y globales
   */
  analyzeInventoryWithIA(bodegas: BodegaConsolidada[]): Observable<{
    success: boolean;
    metricasPorBodega: { [bodegaId: string]: MetricasIABodega };
    metricasGlobales: MetricasIAGlobal;
    timestamp: string;
    error?: string;
  }> {
    const url = `${this.apiUrl}/inventory/analyze-ia`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(url, {
      bodegas: bodegas.map(b => ({
        id: b.id,
        nombre: b.nombre
      }))
    }, { headers });
  }

  /**
   * Obtiene el detalle de inventario de una bodega con paginación y búsqueda
   * @param options Opciones: bodegaId, search, page, limit
   * @returns Observable con productos, totales y paginación
   */
  getBodegaDetalle(options: {
    bodegaId: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    let params = new HttpParams();
    params = params.set('bodegaId', options.bodegaId);
    if (options.search) params = params.set('search', options.search);
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    return this.http.get<any>(`${this.apiUrl}/inventory/bodega-detalle`, { params });
  }
}