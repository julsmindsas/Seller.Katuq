import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MovimientoInventario, MovimientosResponse } from '../../../components/inventarios/model/movimientoinventario';
import { TipoMovimientoInventario } from '../../../components/inventarios/enums/tipos-movimiento.enum';
import { Bodega } from '../../models/inventarios/bodega.model';
import { Traslado } from '../../models/inventarios/traslado.model';

export interface Proveedor {
  id: string;
  nombre: string;
  nit: string | null;
  digitoVerificacion?: string | null;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion?: string | null;
  ciudad: string | null;
  /** Plazo acordado. 0 = de contado. */
  diasCredito: number;
  observaciones?: string | null;
  estado: 'activo' | 'inactivo';
}

export interface SaldoProveedor {
  proveedorId: string | null;
  nombre: string;
  ordenes: number;
  pedido: number;
  recibido: number;
  facturado: number;
  /** Lo recibido que aún no llega facturado. Negativo = nos facturaron de más. */
  porFacturar: number;
  conExceso: number;
}

export interface FacturaOrden {
  numero: string;
  valor: number;
  fecha: string | null;
  registradaPor?: string;
}

export interface CuentaOrden {
  pedido: number;
  recibido: number;
  facturado: number;
  porFacturar: number;
  facturadoDeMas: boolean;
  facturas: number;
}

export type EstadoOrdenCompra = 'abierta' | 'parcial' | 'recibida' | 'anulada';

export interface LineaOrdenCompra {
  productoId: string;
  referencia: string | null;
  descripcion: string | null;
  cantidad: number;
  recibido: number;
  costoUnitario: number;
}

export interface PendienteOrdenCompra {
  productoId: string;
  referencia: string | null;
  pedido: number;
  recibido: number;
  pendiente: number;
  /** Lo que el proveedor mandó de más. */
  excedente: number;
}

export interface OrdenCompra {
  id: string;
  idBodega: string;
  proveedor: { nombre: string; nit: string | null };
  /** Presente cuando la orden se creó eligiendo del maestro. */
  proveedorId?: string | null;
  facturas?: FacturaOrden[];
  cuenta?: CuentaOrden;
  lineas: LineaOrdenCompra[];
  pendientes?: PendienteOrdenCompra[];
  estado: EstadoOrdenCompra;
  total: number;
  observaciones: string | null;
  creadoPor?: string;
  createdAt?: any;
}

export type CriterioConteo = 'valor' | 'movimiento' | 'sin_contar' | 'ubicacion';
export type EstadoConteo = 'abierta' | 'contada' | 'aplicada' | 'cancelada';

export interface LineaConteo {
  productoId: string;
  referencia: string | null;
  ubicacion: string | null;
  /** Lo que el sistema dice que debería haber. */
  esperado: number;
  /** Lo que el operario contó. null = todavía no lo ha contado. */
  contado: number | null;
  diferencia?: number | null;
  estado?: 'exacta' | 'sobra' | 'falta' | 'sin_contar';
}

export interface ResumenConteo {
  lineas: number;
  contadas: number;
  sinContar: number;
  exactas: number;
  conDiferencia: number;
  /** Exactitud por líneas que coinciden (IRA). null si no se ha contado nada. */
  exactitud: number | null;
  unidadesSobran: number;
  unidadesFaltan: number;
}

export interface AjustePropuesto {
  productoId: string;
  referencia: string | null;
  ubicacion: string | null;
  cantidadAnterior: number;
  cantidadNueva: number;
  diferencia: number;
}

export interface SesionConteo {
  id: string;
  idBodega: string;
  criterio: CriterioConteo;
  estado: EstadoConteo;
  lineas?: LineaConteo[];
  resumen: ResumenConteo;
  ajustesPropuestos?: AjustePropuesto[];
  creadoPor?: string;
  createdAt?: any;
}

/** Una ubicación del catálogo de la bodega. */
export interface UbicacionCatalogo {
  codigo: string;
  zona: string;
  estante: string | null;
  posicion: string | null;
  nivel: string | null;
  descripcion: string | null;
  activa: boolean;
}

export interface ProductoEnUbicacion {
  productoId: string;
  referencia: string | null;
  cantidad: number;
  ubicacion: string | null;
}

export interface UbicacionConProductos extends UbicacionCatalogo {
  productos: ProductoEnUbicacion[];
}

export interface UbicacionesBodegaResponse {
  idBodega: string;
  nombre: string;
  ubicaciones: UbicacionConProductos[];
  /** Usadas por el inventario pero no dadas de alta en el catálogo. */
  fueraDeCatalogo: { codigo: string; productos: ProductoEnUbicacion[] }[];
  sinUbicar: ProductoEnUbicacion[];
  resumen: {
    ubicacionesDefinidas: number;
    ubicacionesOcupadas: number;
    productosUbicados: number;
    productosSinUbicar: number;
  };
}

/** Una fila de disponibilidad: el mismo producto visto de tres maneras. */
export interface FilaDisponibilidad {
  productoId: string;
  referencia: string | null;
  idBodega: string;
  /** Lo que se puede vender (el saldo, nunca negativo). */
  disponible: number;
  /** Vendido que sigue en el estante porque el pedido no ha salido. */
  comprometido: number;
  /** Lo que un operario contaría hoy: disponible + comprometido. */
  fisicoEsperado: number;
  /** Unidades vendidas sin respaldo (saldo negativo). */
  deudaDeRegistro: number;
  sobrecomprometido: boolean;
  /** Hay compromiso pero ni siquiera existe fila de inventario. */
  sinFilaDeInventario?: boolean;
}

export interface ResumenDisponibilidadBodega {
  skus: number;
  disponible: number;
  comprometido: number;
  fisicoEsperado: number;
  sobrecomprometidos: number;
  skusConCompromiso: number;
}

export interface DisponibilidadBodega {
  idBodega: string;
  resumen: ResumenDisponibilidadBodega;
  filas: FilaDisponibilidad[];
}

export interface DisponibilidadResponse {
  company: string;
  pedidosAbiertos: number;
  advertencias: string[];
  bodegas: DisponibilidadBodega[];
}

/** Fila de indicadores: un producto en una bodega. */
export interface IndicadorProducto {
  productoId: string;
  referencia: string | null;
  nombre: string | null;
  idBodega: string;
  /** Saldo contable para efectos del informe (los negativos cuentan como 0). */
  saldo: number;
  /** Saldo tal como está guardado, incluido el negativo. */
  saldoReal: number;
  saldoNegativo: boolean;
  demandaNeta: number;
  consumoDiario: number;
  /** null = sin demanda en la ventana; no es cero. */
  coberturaDias: number | null;
  coberturaTopeada: boolean;
  rotacionAnual: number | null;
  inmovilizado: boolean;
  costoUnitario: number;
  sinCosto: boolean;
  valorCosto: number;
}

export interface ResumenIndicadoresBodega {
  skus: number;
  unidades: number;
  valorCosto: number;
  sinExistencias: number;
  coberturaBaja: number;
  inmovilizados: number;
  valorInmovilizado: number;
  demandaNeta: number;
  coberturaDiasBodega: number | null;
  coberturaTopeada: boolean;
  rotacionAnualBodega: number | null;
  skusSinCosto: number;
  unidadesSinCosto: number;
  skusEnNegativo: number;
}

export interface IndicadoresBodega {
  idBodega: string;
  resumen: ResumenIndicadoresBodega;
  filas: IndicadorProducto[];
}

export interface IndicadoresInventarioResponse {
  company: string;
  ventana: { dias: number; desde: string; hasta: string };
  /** 'exacta' solo si todo tiene costo y toda salida tiene motivo. */
  confianza: 'exacta' | 'parcial';
  advertencias: string[];
  coberturaBajaDias: number;
  bodegas: IndicadoresBodega[];
}

/**
 * Interfaz para producto en vista consolidada de inventario
 */
export interface PrecioPorTipoClienteResp {
  tipoClienteId: string;
  tipoClienteNombre: string;
  precioConIva: number;
}

export interface ProductoConsolidado {
  id: string;
  referencia: string;
  nombre: string;
  imagen: string | null;
  precio: number;
  precioSinIva: number;
  /** Costo unitario de compra (importado desde fulfillment / Aliaddo) */
  costoUnitario?: number;
  /** Costo alternativo si backend decide exponer objeto histórico/último costo. */
  costo?: {
    costoUnitario?: number;
    valor?: number;
    fechaVigencia?: string;
    fuente?: string;
  };
  /** Precios por tipo de cliente (lista de precios activa). */
  preciosPorTipoCliente?: PrecioPorTipoClienteResp[];
  inventariable: boolean;
  stockPorBodega: { [bodegaId: string]: number };
  stockTotal: number;
  /** Valor total a costo del producto (costoUnitario * stockTotal) */
  valorCostoTotal?: number;
  fulfillmentId: string | null;
  fulfillmentProvider: string | null;
  /** Fuente del costo: aliaddo-api | prindel-excel | manual | null. */
  costoFuente?: string | null;
  // Campos para UI
  expanded?: boolean;
  fulfillmentLoading?: boolean;
  fulfillmentStock?: { [warehouseId: string]: number };
  fulfillmentWarehouses?: any[];
}

/** Tipo de cliente (lista de precios) activo del comercio. */
export interface TipoClienteResp {
  id: string;
  nombre: string;
  [key: string]: any;
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
  /** Valor a costo del inventario (suma de costoUnitario * stock) */
  valorCostoTotal?: number;
  /** Valor venta por cada tipo de cliente { tipoClienteId → total }. */
  valorPorTipoCliente?: { [tipoClienteId: string]: number };
  /** Margen estimado en pesos: valorTotal - valorCostoTotal */
  margenEstimado?: number;
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
  /** Valor a costo total del inventario */
  valorCostoTotal?: number;
  /** Valor venta global por cada tipo de cliente. */
  valorPorTipoCliente?: { [tipoClienteId: string]: number };
  /** Margen estimado global: valorTotal - valorCostoTotal */
  margenEstimado?: number;
  totalUnidades: number;
  totalProductos: number;        // SKUs únicos con stock
  totalSKUsCatalogo: number;     // Total SKUs inventariables
  ia?: MetricasIAGlobal;
}

/**
 * Totales calculados sobre el subconjunto filtrado (cuando hay filtros activos).
 * `porBodega` mapea idBodega → unidades en esa bodega para los productos filtrados.
 */
export interface TotalesFiltrados {
  totalUnidades: number;
  totalProductos: number;
  productosSinStock: number;
  productosBajoStock: number;
  porBodega: { [bodegaId: string]: number };
  valorTotal?: number;
  valorCostoTotal?: number;
  valorPorTipoCliente?: { [tipoClienteId: string]: number };
}

/**
 * Interfaz para respuesta del endpoint consolidado
 */
export interface InventarioConsolidadoResponse {
  success: boolean;
  productos: ProductoConsolidado[];
  bodegas: BodegaConsolidada[];
  /** Tipos de cliente activos del comercio (lista de precios). */
  tiposCliente: TipoClienteResp[];
  totalProductos: number;
  estadisticas: {
    totalStock: number;
    productosSinStock: number;
    productosBajoStock: number;
  };
  totalesGlobales: TotalesGlobales;
  totalesFiltrados?: TotalesFiltrados | null;
  pagination: {
    limit: number;
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
    returned: number;
    hasMore: boolean;
    lastDoc: string | null;
  };
}

export type InventarioCorteEstado = 'certified' | 'ambiguous' | 'incomplete';

export interface InventarioCorteFila {
  key: string;
  productId: string | null;
  referencia: string;
  nombre: string;
  idBodega: string | null;
  bodegaNombre: string;
  anchorQuantity: number | null;
  quantityAtCutoff: number | null;
  quantityMode: 'chained' | 'estimate';
  status: InventarioCorteEstado;
  causes: string[];
  warnings: string[];
  movementCount: number;
}

export interface InventarioCorteResponse {
  success: boolean;
  company: string;
  timezone: 'America/Bogota';
  mode: string;
  snapshotConsistency: 'ATOMIC_VERIFIED' | 'SEQUENTIAL_LIVE_READ';
  cutoffAt: string;
  anchorAt: string;
  anchorVerified: boolean;
  certifiedFrom: string | null;
  minimumCertifiableAt: string | null;
  certified: boolean;
  statusCounts: Record<InventarioCorteEstado, number>;
  causeCounts: { [cause: string]: number };
  coverage: {
    rows: number;
    filteredRows: number;
    movementsAfterCutoff: number;
    movementsWithBeforeAfter: number;
    movementsWithoutDate: number;
    sourceReads: {
      inventory: number;
      inventoryMovement: number;
      products: number;
      warehouses: number;
    };
  };
  rows: InventarioCorteFila[];
  pagination: {
    limit: number;
    returned: number;
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private apiUrl = environment.urlApi + '/v1';
  private firebaseApiUrl = '';

  constructor(private http: HttpClient) { }

  private createOperationKey(scope: string): string {
    return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

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

  ingresarProductos(
    bodegaId: string,
    productos: any[],
    tipoMovimiento: TipoMovimientoInventario,
    observaciones: string,
    operationKey: string = this.createOperationKey('manual-inventory')
  ): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-idempotency-key': operationKey
    });

    // Un producto usa la ruta individual; varios conservan la ruta de lote.
    // El backend decide por empresa si corre legacy, sombra o transaccional.
    if (productos.length === 1) {
      const producto = productos[0];
      return this.http.post(`${this.apiUrl}/inventory/ingresar`, {
        bodegaId,
        productoId: producto.productoId,
        cantidad: producto.cantidad,
        tipoMovimiento,
        observaciones,
        ordenCompraId: producto.ordenCompraId || null,
        operationKey
      }, { headers });
    }

    const url = `${this.apiUrl}/inventory/ingresar-multiples`;
    return this.http.post(url, {
      bodegaId,
      productos,
      tipoMovimiento,
      observaciones,
      operationKey
    }, { headers });
  }

  /**
   * Obtiene el historial de movimientos de un producto
   * @param productId ID del producto
   * @returns Observable con el historial de movimientos
   */
  obtenerHistorialMovimientos(productId: string): Observable<{
    movimientos: MovimientoInventario[];
    lastDoc: string | null;
    hasMore: boolean;
  }> {
    const url = `${this.apiUrl}/inventory/historial/producto/${encodeURIComponent(productId)}`;

    return this.http.get<{
      movimientos: MovimientoInventario[];
      lastDoc: string | null;
      hasMore: boolean;
    }>(url);
  }

  /**
   * Obtiene el historial de movimientos por bodega
   * @param bodegaId ID de la bodega
   * @returns Observable con el historial de movimientos
   */
  obtenerMovimientosPorBodega(bodegaId: string): Observable<{
    movimientos: MovimientoInventario[];
    lastDoc: string | null;
    hasMore: boolean;
  }> {
    const url = `${this.apiUrl}/inventory/historial/bodega/${encodeURIComponent(bodegaId)}`;

    return this.http.get<{
      movimientos: MovimientoInventario[];
      lastDoc: string | null;
      hasMore: boolean;
    }>(url);
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
  /**
   * Exporta el inventario consolidado a Excel (.xlsx) respetando los filtros activos.
   * Devuelve un Blob para descarga directa desde el browser.
   */
  exportarInventarioExcel(options: {
    bodega?: string;
    linkedToFulfillment?: string;
    search?: string;
    stockFilter?: string;
    onlyWithStock?: boolean;
    soloInventariables?: boolean;
    fechaCorte?: string;
    status?: InventarioCorteEstado;
  } = {}): Observable<Blob> {
    let params = new HttpParams();
    if (options.bodega) params = params.set('bodega', options.bodega);
    if (options.linkedToFulfillment) params = params.set('linkedToFulfillment', options.linkedToFulfillment);
    if (options.search) params = params.set('search', options.search);
    if (options.stockFilter) params = params.set('stockFilter', options.stockFilter);
    if (options.onlyWithStock !== undefined) params = params.set('onlyWithStock', String(options.onlyWithStock));
    if (options.soloInventariables !== undefined) params = params.set('soloInventariables', String(options.soloInventariables));
    if (options.fechaCorte) params = params.set('fechaCorte', options.fechaCorte);
    if (options.status) params = params.set('status', options.status);

    return this.http.get(`${this.apiUrl}/inventory/export-excel`, {
      params,
      responseType: 'blob',
    });
  }

  consultarInventarioCorte(options: {
    fechaCorte: string;
    bodega?: string;
    search?: string;
    status?: InventarioCorteEstado;
    limit?: number;
    cursor?: string;
    paginate?: boolean;
  }): Observable<InventarioCorteResponse> {
    let params = new HttpParams().set('fechaCorte', options.fechaCorte);
    if (options.bodega) params = params.set('bodega', options.bodega);
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    if (options.limit) params = params.set('limit', String(options.limit));
    if (options.cursor) params = params.set('cursor', options.cursor);
    if (options.paginate !== undefined) params = params.set('paginate', String(options.paginate));

    return this.http.get<InventarioCorteResponse>(
      `${this.apiUrl}/inventory/cutoff-report`,
      { params },
    );
  }

  /**
   * Indicadores de bodega: cobertura en días, rotación, inmovilizados y
   * valorizado a costo. Read-only, derivado del libro de movimientos.
   */
  consultarIndicadoresInventario(options: {
    bodega?: string;
    dias?: number;
  } = {}): Observable<IndicadoresInventarioResponse> {
    let params = new HttpParams();
    if (options.bodega) params = params.set('bodega', options.bodega);
    if (options.dias) params = params.set('dias', String(options.dias));

    return this.http.get<IndicadoresInventarioResponse>(
      `${this.apiUrl}/inventory/kpi`,
      { params },
    );
  }

  /**
   * Disponible vs comprometido vs físico en estante. Read-only.
   */
  consultarDisponibilidad(options: { bodega?: string } = {}): Observable<DisponibilidadResponse> {
    let params = new HttpParams();
    if (options.bodega) params = params.set('bodega', options.bodega);

    return this.http.get<DisponibilidadResponse>(
      `${this.apiUrl}/inventory/disponibilidad`,
      { params },
    );
  }

  /** Mapa de ubicaciones de una bodega: catálogo, qué hay en cada una y qué falta ubicar. */
  consultarUbicaciones(bodega: string): Observable<UbicacionesBodegaResponse> {
    const params = new HttpParams().set('bodega', bodega);
    return this.http.get<UbicacionesBodegaResponse>(`${this.apiUrl}/inventory/ubicaciones`, { params });
  }

  /** Guarda el catálogo completo de ubicaciones de una bodega. */
  guardarUbicaciones(bodega: string, ubicaciones: UbicacionCatalogo[], forzar = false): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/ubicaciones`, { bodega, ubicaciones, forzar });
  }

  /** Asigna (o quita, con null) el lugar donde vive un producto en una bodega. */
  asignarUbicacionProducto(bodega: string, productoId: string, ubicacion: string | null): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/producto-ubicacion`, { bodega, productoId, ubicacion });
  }

  // --- Proveedores (dominio de compras) ---

  listarProveedores(options: { incluirInactivos?: boolean; busqueda?: string } = {}): Observable<{ proveedores: Proveedor[] }> {
    let params = new HttpParams();
    if (options.incluirInactivos) params = params.set('incluirInactivos', 'true');
    if (options.busqueda) params = params.set('busqueda', options.busqueda);
    return this.http.get<{ proveedores: Proveedor[] }>(`${this.apiUrl}/proveedores`, { params });
  }

  crearProveedor(datos: Partial<Proveedor> & { forzar?: boolean }): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.apiUrl}/proveedores`, datos);
  }

  actualizarProveedor(id: string, datos: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.apiUrl}/proveedores/${id}`, datos);
  }

  desactivarProveedor(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/proveedores/${id}`);
  }

  /** Cuánto se le debe a cada proveedor: pedido, recibido y facturado. */
  consultarSaldoProveedores(): Observable<{ proveedores: SaldoProveedor[]; total: number }> {
    return this.http.get<{ proveedores: SaldoProveedor[]; total: number }>(
      `${this.apiUrl}/ordenes-compra/saldo-proveedores`,
    );
  }

  /** Anota la factura del proveedor sobre una orden. No mueve inventario. */
  registrarFacturaOrden(id: string, factura: { numero: string; valor: number; fecha?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/ordenes-compra/${id}/factura`, factura);
  }

  // --- Órdenes de compra ---

  crearOrdenCompra(orden: {
    proveedor: { nombre: string; nit?: string };
    bodega: string;
    lineas: { productoId: string; referencia?: string; descripcion?: string; cantidad: number; costoUnitario?: number }[];
    observaciones?: string;
  }): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${this.apiUrl}/inventory/ordenes-compra`, orden);
  }

  listarOrdenesCompra(options: { bodega?: string; pendientes?: boolean } = {}): Observable<{ ordenes: OrdenCompra[] }> {
    let params = new HttpParams();
    if (options.bodega) params = params.set('bodega', options.bodega);
    if (options.pendientes !== undefined) params = params.set('pendientes', String(options.pendientes));
    return this.http.get<{ ordenes: OrdenCompra[] }>(`${this.apiUrl}/inventory/ordenes-compra`, { params });
  }

  obtenerOrdenCompra(id: string): Observable<OrdenCompra> {
    return this.http.get<OrdenCompra>(`${this.apiUrl}/inventory/ordenes-compra/${id}`);
  }

  /** Anota lo que llegó contra la orden. La entrada de stock va por su camino. */
  registrarRecepcionOrden(id: string, recibidas: { productoId: string; cantidad: number }[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/ordenes-compra/${id}/recepcion`, { recibidas });
  }

  anularOrdenCompra(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/inventory/ordenes-compra/${id}`);
  }

  // --- Conteos cíclicos ---

  /** Arma el conteo del día para una bodega según el criterio elegido. */
  crearConteo(bodega: string, criterio: CriterioConteo, tamano: number): Observable<SesionConteo> {
    return this.http.post<SesionConteo>(`${this.apiUrl}/inventory/conteos`, { bodega, criterio, tamano });
  }

  listarConteos(bodega?: string): Observable<{ sesiones: SesionConteo[] }> {
    let params = new HttpParams();
    if (bodega) params = params.set('bodega', bodega);
    return this.http.get<{ sesiones: SesionConteo[] }>(`${this.apiUrl}/inventory/conteos`, { params });
  }

  obtenerConteo(id: string): Observable<SesionConteo> {
    return this.http.get<SesionConteo>(`${this.apiUrl}/inventory/conteos/${id}`);
  }

  /** Guarda lo contado. No ajusta inventario. */
  registrarConteo(id: string, lineas: { productoId: string; contado: number | null }[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/conteos/${id}`, { lineas });
  }

  cerrarConteo(id: string, aplicado: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventory/conteos/${id}/cerrar`, { aplicado });
  }

  obtenerInventarioConsolidado(options: {
    limit?: number;
    page?: number;
    lastDoc?: string;
    soloInventariables?: boolean;
    includeMetrics?: boolean;
    stockFilter?: string;
    search?: string;
    bodega?: string;
    /** @deprecated Filtro legacy sobre bodegas warehouses.fulfillmentId. Usar linkedToFulfillment. */
    fulfillment?: string;
    /** 'con' = producto con costoFuente=aliaddo-api o integrations.fulfillment.id; 'sin' = ninguno. */
    linkedToFulfillment?: string;
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
    if (options.linkedToFulfillment) params = params.set('linkedToFulfillment', options.linkedToFulfillment);

    return this.http.get<InventarioConsolidadoResponse>(
      `${this.apiUrl}/inventory/consolidado`,
      { params }
    );
  }

  getBodegas(): Observable<Bodega[]> {
    return this.http.get<Bodega[]>(`${this.apiUrl}/bodegas/all`);
  }

  /** Stock de un producto en TODAS las bodegas del comercio (popover de venta asistida). */
  getStockProductoEnBodegas(productoId: string): Observable<{
    productoId: string;
    stockTotal: number;
    bodegas: { idBodega: string; nombre: string; cantidad: number }[];
  }> {
    return this.http.get<{
      productoId: string;
      stockTotal: number;
      bodegas: { idBodega: string; nombre: string; cantidad: number }[];
    }>(`${this.apiUrl}/inventory/producto-bodegas/${encodeURIComponent(productoId)}`);
  }

  getProductosBodega(bodegaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bodegas/${bodegaId}/productos`);
  }

  realizarTraslado(traslado: Traslado): Observable<any> {
    const operationKey =
      (traslado as any).operationKey || this.createOperationKey('inventory-transfer');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-idempotency-key': operationKey
    });
    return this.http.post(`${this.apiUrl}/inventory/traslados`, {
      ...traslado,
      operationKey
    }, { headers });
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

  getProductos(pageSize: number = 100): Observable<any> {
    let params = new HttpParams();
    params = params.set('pageSize', pageSize.toString());
    return this.http.get(`${this.apiUrl}/productos/all`, { params });
  }

  /**
   * Búsqueda de productos sobre el catálogo completo (índice ligero en backend).
   * Busca por referencia o título, incluyendo productos inactivos
   * (un movimiento histórico puede ser de un producto descontinuado).
   */
  buscarProductosQuick(termino: string, limit: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('q', termino)
      .set('searchBy', 'general')
      .set('incluirInactivos', 'true')
      .set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/productos/search/quick`, { params });
  }

  /**
   * Respaldo del escáner del POS.
   *
   * `/inventory/bodega/{id}?loadAll=true` trae como máximo 500 productos, así
   * que un código válido puede no estar entre los precargados. Este método
   * pregunta por ese código al catálogo completo. La respuesta viene enriquecida
   * con `stockPorBodega`, que es lo que debe usarse en el POS: `cantidadDisponible`
   * llega como stock TOTAL de todas las bodegas y vender contra ese número
   * permitiría despachar existencias de otra bodega.
   *
   * Solo productos activos (no se pasa incluirInactivos).
   */
  buscarCodigoParaPOS(
    codigo: string,
    searchBy: 'codigoBarras' | 'general' = 'codigoBarras',
    limit: number = 5
  ): Observable<any> {
    const params = new HttpParams()
      .set('q', codigo)
      .set('searchBy', searchBy)
      .set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/productos/search/quick`, { params });
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
   * Diagnóstico del inventario: detecta inconsistencias sin modificar nada.
   * - Registros con idBodega usando Firestore docId en vez de business code.
   * - Bodegas huérfanas (idBodega que ya no existe).
   * - Productos fantasma (productoId sin documento).
   */
  diagnosticarInventario(): Observable<any> {
    return this.http.get(`${this.apiUrl}/inventory/diagnostico`);
  }

  /**
   * Simula la reparación del inventario sin escribir datos (Gate 0 D-134).
   * La aplicación real permanece bloqueada hasta verificar backup y restore.
   */
  repararInventario(options: {
    corregirBodegas?: boolean;
    eliminarBodegasHuerfanas?: boolean;
    eliminarProductosFantasma?: boolean;
  } = {}): Observable<any> {
    const params: any = {
      corregirBodegas: String(options.corregirBodegas ?? true),
      eliminarBodegasHuerfanas: String(options.eliminarBodegasHuerfanas ?? true),
      eliminarProductosFantasma: String(options.eliminarProductosFantasma ?? true),
      apply: 'false',
    };
    return this.http.post(`${this.apiUrl}/inventory/reparar`, {}, { params });
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
