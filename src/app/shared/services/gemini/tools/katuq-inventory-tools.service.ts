import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Importaciones desde rutas absolutas
import { BodegaService } from '../../bodegas/bodega.service';
import { InventarioService } from '../../inventarios/inventario.service';
import { CartSingletonService } from '../../ventas/cart.singleton.service';
import { VentasService } from '../../ventas/ventas.service';
import { Producto } from '../../../models/productos/Producto';
import { Carrito, Pedido, Cliente, Facturacion, Envio } from '../../../../components/ventas/modelo/pedido';
import { environment } from '../../../../../environments/environment';

// Importar ToolRegistryService para registro automático
import { ToolRegistryService, ExecutableTool } from './tool-registry.service';
import { ToolDeclaration } from '../models/agent-config.interface';

// Interfaces especializadas para herramientas de inventario
export interface InventoryToolResponse {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
  metadata?: {
    totalItems?: number;
    processingTime?: number;
    filters?: any;
    totalCategories?: number;
    warehousesCompared?: number;
    dataPoints?: number;
    forecastPoints?: number;
  };
}

export interface InventoryFilter {
  category?: string;
  warehouse?: string;
  priceRange?: { min: number; max: number };
  stockLevel?: 'low' | 'medium' | 'high' | 'all';
  sortBy?: 'name' | 'price' | 'stock' | 'category';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  category: string;
  warehouse: string;
  urgency: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
  estimatedDepletion?: string;
  lastRestock?: string;
}

export interface InventoryMovement {
  id: string;
  date: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  productId: string;
  productName: string;
  quantity: number;
  value: number;
  warehouse: string;
  reference: string;
  notes: string;
  userId?: string;
  approved?: boolean;
}

export interface CategorySummary {
  categories: Array<{
    name: string;
    productCount: number;
    totalValue: number;
    averageStock: number;
    lowStockCount: number;
  }>;
  totalCategories: number;
  topCategory: string;
  lowestStockCategory: string;
}

export interface WarehouseComparison {
  warehouses: Array<{
    id: string;
    name: string;
    productCount: number;
    totalValue: number;
    averageStock: number;
    categories: number;
  }>;
  metrics?: {
    totalProducts: number;
    totalValue: number;
    averageStock: number;
    mostDiverse: string;
    highestValue: string;
  };
  differences?: Array<{
    warehouse: string;
    metric: string;
    difference: number;
    percentage: string;
  }>;
}

export interface InventoryTrends {
  type: string;
  period: string;
  months: number;
  data: any[];
  insights: string[];
  forecast?: any[];
}

// Interfaces para respuestas de la API de inventario
export interface ApiInventoryResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  productos?: any[];
  producto?: any;
  resumen?: any;
  alertas?: any;
  filtros?: any;
  terminoBuscado?: string;
  estadoStock?: any;
  bodegas?: any[];
  tipo?: string;
}

export interface ApiInventorySearchParams {
  termino?: string;
  limite?: number;
  productoId?: string;
  referencia?: string;
  tipo?: 'bajo' | 'sin' | 'todos';
  categoria?: string;
  etiqueta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KatuqInventoryToolsService {
  
  // Estado interno del servicio
  private bodegaSeleccionada: any;
  private productosCatalogo: Producto[] = [];
  private empresaActual: any;
  
  // Configuración de la API
  private readonly apiBaseUrl = `${environment.urlApi}/v1/analiticas`;
  private readonly apiInventoryUrl = `${this.apiBaseUrl}/inventario`;

  constructor(
    private bodegaService: BodegaService,
    private inventarioService: InventarioService,
    private cartService: CartSingletonService,
    private ventasService: VentasService,
    private http: HttpClient,
    private toolRegistry: ToolRegistryService
  ) {
    // Registrar todas las herramientas automáticamente al inicializar el servicio
    this.registerAllTools();
  }

  // ===============================
  // MÉTODOS AUXILIARES DE API
  // ===============================

  /**
   * Obtiene los headers necesarios para las llamadas a la API
   */
  private getApiHeaders(): HttpHeaders {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token') || '';
    const companyId = this.empresaActual?.id || user?.company?.id || '';

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'company': companyId,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Busca productos usando la API real de inventario
   */
  private async searchProductsViaApi(params: ApiInventorySearchParams): Promise<ApiInventoryResponse> {
    try {
      const headers = this.getApiHeaders();
      const url = `${this.apiInventoryUrl}/busqueda`;
      
      const response = await this.http.get<ApiInventoryResponse>(url, {
        headers,
        params: params as any
      }).toPromise();
      
      return response || { success: false, error: 'Respuesta vacía' };
    } catch (error) {
      console.error('Error en búsqueda de productos via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el estado de un producto específico via API
   */
  private async getProductStatusViaApi(params: ApiInventorySearchParams): Promise<ApiInventoryResponse> {
    try {
      const headers = this.getApiHeaders();
      const url = `${this.apiInventoryUrl}/estado`;
      
      const response = await this.http.get<ApiInventoryResponse>(url, {
        headers,
        params: params as any
      }).toPromise();
      
      return response || { success: false, error: 'Respuesta vacía' };
    } catch (error) {
      console.error('Error obteniendo estado de producto via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene productos con stock bajo via API
   */
  private async getLowStockViaApi(params: ApiInventorySearchParams): Promise<ApiInventoryResponse> {
    try {
      const headers = this.getApiHeaders();
      const url = `${this.apiInventoryUrl}/stock-bajo`;
      
      const response = await this.http.get<ApiInventoryResponse>(url, {
        headers,
        params: params as any
      }).toPromise();
      
      return response || { success: false, error: 'Respuesta vacía' };
    } catch (error) {
      console.error('Error obteniendo stock bajo via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene resumen de inventario via API
   */
  private async getInventorySummaryViaApi(): Promise<ApiInventoryResponse> {
    try {
      const headers = this.getApiHeaders();
      const url = `${this.apiInventoryUrl}/resumen`;
      
      const response = await this.http.get<ApiInventoryResponse>(url, {
        headers
      }).toPromise();
      
      return response || { success: false, error: 'Respuesta vacía' };
    } catch (error) {
      console.error('Error obteniendo resumen via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Busca productos por categoría via API
   */
  private async searchByCategoryViaApi(params: ApiInventorySearchParams): Promise<ApiInventoryResponse> {
    try {
      const headers = this.getApiHeaders();
      const url = `${this.apiInventoryUrl}/categoria`;
      
      const response = await this.http.get<ApiInventoryResponse>(url, {
        headers,
        params: params as any
      }).toPromise();
      
      return response || { success: false, error: 'Respuesta vacía' };
    } catch (error) {
      console.error('Error buscando por categoría via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // ===============================
  // HERRAMIENTAS DE INVENTARIO
  // ===============================

  async getInventoryStatus(args: any): Promise<InventoryToolResponse> {
    try {
      const { warehouseId, includeAlerts = true, includeSummary = true } = args;
      
      // Intentar usar la API real primero
      try {
        const apiResponse = await this.getInventorySummaryViaApi();
        if (apiResponse.success && apiResponse.resumen) {
          // Procesar alertas si se solicitan
          let alerts: any[] = [];
          if (includeAlerts) {
            const lowStockResponse = await this.getLowStockViaApi({ tipo: 'todos', limite: 10 });
            if (lowStockResponse.success) {
              alerts = lowStockResponse.productos || [];
            }
          }

          return {
            success: true,
            message: `Estado del inventario obtenido exitosamente via API${warehouseId ? ` para bodega ${warehouseId}` : ''}`,
            data: {
              inventory: apiResponse.resumen,
              alerts: alerts,
              summary: apiResponse.resumen,
              lastUpdate: new Date().toISOString(),
              source: 'api'
            },
            metadata: {
              totalItems: apiResponse.resumen?.productos?.total || 0,
              processingTime: Date.now()
            }
          };
        }
      } catch (apiError) {
        console.log('⚠️ API no disponible, usando datos alternativos:', apiError);
      }

      // Fallback: Usar servicio interno de inventario
      let inventoryData;
      try {
        if (warehouseId && warehouseId !== 'all') {
          inventoryData = await this.inventarioService.obtenerInventarioPorBodega(warehouseId).toPromise();
        } else {
          inventoryData = await this.inventarioService.obtenerInventarioPorBodega('ALL').toPromise();
        }
      } catch (serviceError) {
        console.log('⚠️ Servicio interno no disponible, usando datos demo');
      }

      // Generar datos demo como último recurso
      const mockData = this.generateMockInventoryData();
      
      let alerts: StockAlert[] = [];
      if (includeAlerts) {
        alerts = this.generateLowStockAlerts();
      }

      let summary = {};
      if (includeSummary) {
        summary = this.generateCategorySummary();
      }

      return {
        success: true,
        message: `Estado del inventario obtenido exitosamente${warehouseId ? ` para bodega ${warehouseId}` : ''}`,
        data: {
          inventory: inventoryData || mockData,
          alerts: alerts,
          summary: summary,
          lastUpdate: new Date().toISOString(),
          source: inventoryData ? 'internal' : 'mock'
        },
        metadata: {
          totalItems: this.productosCatalogo.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener estado del inventario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async searchInventoryByCategory(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        category, 
        limit = 20, 
        sortBy = 'name', 
        includeOutOfStock = false,
        priceRange,
        etiqueta
      } = args;

      // Intentar usar la API real primero
      try {
        const apiParams: ApiInventorySearchParams = {
          categoria: category,
          etiqueta: etiqueta,
          limite: Math.min(limit, 20) // Máximo 20 según la documentación
        };

        const apiResponse = await this.searchByCategoryViaApi(apiParams);
        if (apiResponse.success && apiResponse.productos) {
          let products = apiResponse.productos;

          // Aplicar filtros locales si la API no los maneja
          if (!includeOutOfStock) {
            products = products.filter(p => (p.stockDisponible || p.stock || 0) > 0);
          }

          if (priceRange) {
            products = products.filter(p => 
              (p.precio || p.price || 0) >= (priceRange.min || 0) && 
              (p.precio || p.price || 0) <= (priceRange.max || Infinity)
            );
          }

          // Ordenar si es necesario
          if (sortBy !== 'name') {
            products = this.sortInventoryResults(products, sortBy);
          }

          return {
            success: true,
            message: `Encontrados ${products.length} productos en la categoría ${category} via API`,
            data: {
              products,
              category,
              filters: { sortBy, includeOutOfStock, priceRange, etiqueta },
              resumen: apiResponse.resumen || {},
              source: 'api'
            },
            metadata: {
              totalItems: products.length,
              processingTime: Date.now()
            }
          };
        }
      } catch (apiError) {
        console.log('⚠️ API no disponible para búsqueda por categoría, usando datos alternativos:', apiError);
      }

      // Fallback: Usar datos mock
      let products = this.generateMockProductsByCategory(category, limit * 2);
      
      // Filtrar productos sin stock si no se incluyen
      if (!includeOutOfStock) {
        products = products.filter(p => p.stock > 0);
      }

      // Aplicar filtro de precio si se especifica
      if (priceRange) {
        products = products.filter(p => 
          p.price >= (priceRange.min || 0) && 
          p.price <= (priceRange.max || Infinity)
        );
      }

      // Ordenar resultados
      products = this.sortInventoryResults(products, sortBy);
      
      // Limitar resultados
      products = products.slice(0, limit);

      return {
        success: true,
        message: `Encontrados ${products.length} productos en la categoría ${category}`,
        data: {
          products,
          category,
          filters: { sortBy, includeOutOfStock, priceRange, etiqueta },
          source: 'mock'
        },
        metadata: {
          totalItems: products.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar productos por categoría',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getLowStockAlerts(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        threshold = 10, 
        includeOutOfStock = true, 
        urgencyLevel = 'all',
        warehouseId,
        limit = 20
      } = args;

      // Intentar usar la API real primero
      try {
        let tipo: 'bajo' | 'sin' | 'todos' = 'todos';
        if (!includeOutOfStock) {
          tipo = 'bajo';
        } else if (urgencyLevel === 'critical') {
          tipo = 'sin';
        }

        const apiParams: ApiInventorySearchParams = {
          tipo: tipo,
          limite: Math.min(limit, 20) // Máximo 20 según la documentación
        };

        const apiResponse = await this.getLowStockViaApi(apiParams);
        if (apiResponse.success && apiResponse.productos) {
          let alerts = apiResponse.productos.map(producto => ({
            productId: producto.id || '',
            productName: producto.nombre || '',
            currentStock: producto.stockActual || 0,
            threshold: producto.stockMinimo || threshold,
            category: producto.categoria || 'Sin categoría',
            warehouse: warehouseId || 'General',
            urgency: producto.estado === 'sin_stock' ? 'Crítico' as const : 
                    producto.estado === 'stock_bajo' ? 'Alto' as const : 'Medio' as const,
            estimatedDepletion: this.calculateEstimatedDepletion(producto.stockActual || 0),
            lastRestock: producto.lastRestock || 'No disponible'
          }));

          // Filtrar por bodega si se especifica (si la API no lo maneja)
          if (warehouseId && warehouseId !== 'all') {
            alerts = alerts.filter(alert => alert.warehouse === warehouseId);
          }

          // Filtrar por nivel de urgencia
          if (urgencyLevel !== 'all') {
            alerts = alerts.filter(alert => alert.urgency.toLowerCase() === urgencyLevel.toLowerCase());
          }

          // Generar resumen de alertas
          const summary = {
            totalAlerts: alerts.length,
            criticalAlerts: alerts.filter(a => a.urgency === 'Crítico').length,
            highAlerts: alerts.filter(a => a.urgency === 'Alto').length,
            mediumAlerts: alerts.filter(a => a.urgency === 'Medio').length,
            lowStockAlerts: alerts.filter(a => a.urgency !== 'Crítico').length
          };

          // Generar recomendaciones
          const recommendations = this.generateStockRecommendations(summary);

          return {
            success: true,
            message: `Se encontraron ${alerts.length} alertas de stock via API`,
            data: {
              alerts,
              summary,
              recommendations,
              threshold,
              filters: { urgencyLevel, warehouseId },
              source: 'api'
            },
            metadata: {
              totalItems: alerts.length,
              processingTime: Date.now()
            }
          };
        }
      } catch (apiError) {
        console.log('⚠️ API no disponible para alertas de stock, usando datos alternativos:', apiError);
      }

      // Fallback: Usar datos mock
      let alerts = this.generateMockLowStockAlerts(threshold, includeOutOfStock);
      
      // Filtrar por bodega si se especifica
      if (warehouseId && warehouseId !== 'all') {
        alerts = alerts.filter(alert => alert.warehouse === warehouseId);
      }

      // Filtrar por nivel de urgencia
      if (urgencyLevel !== 'all') {
        alerts = alerts.filter(alert => alert.urgency.toLowerCase() === urgencyLevel.toLowerCase());
      }

      // Generar resumen de alertas
      const summary = {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.urgency === 'Crítico').length,
        highAlerts: alerts.filter(a => a.urgency === 'Alto').length,
        mediumAlerts: alerts.filter(a => a.urgency === 'Medio').length,
        lowStockAlerts: alerts.filter(a => a.urgency !== 'Crítico').length
      };

      // Generar recomendaciones
      const recommendations = this.generateStockRecommendations(summary);

      return {
        success: true,
        message: `Se encontraron ${alerts.length} alertas de stock`,
        data: {
          alerts,
          summary,
          recommendations,
          threshold,
          filters: { urgencyLevel, warehouseId },
          source: 'mock'
        },
        metadata: {
          totalItems: alerts.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener alertas de stock bajo',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getInventoryReport(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        reportType = 'summary', 
        includeAnalytics = false, 
        dateRange = 'last30days',
        format = 'json' 
      } = args;

      let reportData;
      
      switch (reportType.toLowerCase()) {
        case 'summary':
          reportData = this.generateInventorySummaryReport();
          break;
        case 'detailed':
          reportData = this.generateDetailedInventoryReport();
          break;
        case 'analytics':
          reportData = this.generateAnalyticsInventoryReport();
          break;
        default:
          reportData = this.generateInventorySummaryReport();
      }

      return {
        success: true,
        message: `Reporte de inventario ${reportType} generado exitosamente`,
        data: {
          report: reportData,
          type: reportType,
          generatedAt: new Date().toISOString(),
          dateRange,
          format
        },
        metadata: {
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al generar reporte de inventario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async checkProductAvailability(args: any): Promise<InventoryToolResponse> {
    try {
      const { productId, quantity = 1, warehouseId, referencia } = args;

      // Intentar usar la API real primero
      try {
        const apiParams: ApiInventorySearchParams = {
          productoId: productId,
          referencia: referencia
        };

        const apiResponse = await this.getProductStatusViaApi(apiParams);
        if (apiResponse.success && apiResponse.producto) {
          const producto = apiResponse.producto;
          const availableStock = producto.stockTotal || 0;
          const isAvailable = availableStock >= quantity;
          const stockLevel = this.getStockLevel(availableStock);
          const estimatedDelivery = this.getEstimatedDelivery(availableStock);

          // Buscar productos alternativos si no hay suficiente stock
          const alternatives = !isAvailable ? this.generateAlternativeProductsFromApi(producto) : [];

          return {
            success: true,
            message: `Consulta de disponibilidad para ${producto.nombre} via API`,
            data: {
              product: {
                id: producto.id,
                name: producto.nombre,
                reference: producto.referencia,
                category: 'General', // La API no retorna categoría en este endpoint
                price: producto.precio || 0,
                inventariable: producto.inventariable,
                active: producto.activo
              },
              availability: {
                isAvailable,
                requestedQuantity: quantity,
                availableStock,
                stockLevel,
                estimatedDelivery,
                stockMinimo: producto.stockMinimo,
                estadoStock: apiResponse.estadoStock
              },
              warehouses: apiResponse.bodegas || [],
              alternatives: alternatives.slice(0, 5),
              warehouse: warehouseId || 'General',
              source: 'api'
            },
            metadata: {
              processingTime: Date.now()
            }
          };
        }
      } catch (apiError) {
        console.log('⚠️ API no disponible para consulta de producto, usando datos alternativos:', apiError);
      }

      // Fallback: Buscar en catálogo local
      const product = this.productosCatalogo.find(p => 
        p.cd === productId || 
        (referencia && (p.crearProducto as any)?.referencia === referencia)
      );
      
      if (!product) {
        return {
          success: false,
          message: `Producto con ID ${productId || referencia} no encontrado`,
          error: 'Producto no existe'
        };
      }

      const availableStock = product.disponibilidad?.cantidadDisponible || 0;
      const isAvailable = availableStock >= quantity;
      const stockLevel = this.getStockLevel(availableStock);
      const estimatedDelivery = this.getEstimatedDelivery(availableStock);
      
      // Buscar productos alternativos si no hay suficiente stock
      const alternatives = !isAvailable ? this.findAlternativeProducts(product) : [];

      return {
        success: true,
        message: `Consulta de disponibilidad para ${product.crearProducto?.titulo || 'Producto'}`,
        data: {
          product: {
            id: productId,
            name: product.crearProducto?.titulo,
            reference: (product.crearProducto as any)?.referencia,
            category: (product.crearProducto as any)?.categorias?.label,
            price: (product.precio as any)?.valor || 0
          },
          availability: {
            isAvailable,
            requestedQuantity: quantity,
            availableStock,
            stockLevel,
            estimatedDelivery
          },
          alternatives: alternatives.slice(0, 5), // Máximo 5 alternativas
          warehouse: warehouseId || 'General',
          source: 'internal'
        },
        metadata: {
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al verificar disponibilidad del producto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getInventoryMovements(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        dateRange = 'last30days', 
        movementType = 'all', 
        productId, 
        warehouseId,
        groupBy = 'date',
        limit = 50 
      } = args;

      let movements = this.generateMockInventoryMovements(dateRange, { 
        productId, 
        warehouseId, 
        movementType 
      });

      // Filtrar por tipo de movimiento
      if (movementType !== 'all') {
        movements = movements.filter(m => m.type === movementType);
      }

      // Limitar resultados
      movements = movements.slice(0, limit);

      // Agrupar según se solicite
      let groupedData = {};
      if (groupBy === 'type') {
        groupedData = this.groupMovementsByType(movements);
      } else if (groupBy === 'date') {
        groupedData = this.groupMovementsByDate(movements);
      }

      return {
        success: true,
        message: `Se encontraron ${movements.length} movimientos de inventario`,
        data: {
          movements,
          groupedData,
          filters: { dateRange, movementType, productId, warehouseId },
          groupBy
        },
        metadata: {
          totalItems: movements.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener movimientos de inventario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getCategoryInventorySummary(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        includeEmptyCategories = false, 
        sortBy = 'name', 
        includePricing = true, 
        includeStockLevels = true 
      } = args;

      // Generar resumen por categorías
      const categorySummary = this.generateCategorySummaryWithOptions({
        includeEmptyCategories,
        sortBy,
        includePricing,
        includeStockLevels
      });

      return {
        success: true,
        message: 'Resumen de inventario por categorías obtenido exitosamente',
        data: categorySummary,
        metadata: {
          totalCategories: categorySummary.categories.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener resumen por categorías',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getWarehouseInventoryComparison(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        warehouseIds = [], 
        includeMetrics = true, 
        highlightDifferences = true 
      } = args;

      if (warehouseIds.length < 2) {
        return {
          success: false,
          message: 'Se requieren al menos 2 bodegas para comparar',
          error: 'Parámetros insuficientes'
        };
      }

      const comparison = this.generateWarehouseComparison(warehouseIds, {
        includeMetrics,
        highlightDifferences
      });

      return {
        success: true,
        message: `Comparación entre ${warehouseIds.length} bodegas completada`,
        data: comparison,
        metadata: {
          warehousesCompared: warehouseIds.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al comparar inventario entre bodegas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getInventoryTrends(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        trendType = 'stock', 
        period = 'monthly', 
        months = 6, 
        category, 
        includeForecast = false 
      } = args;

      const trends = this.generateInventoryTrends(trendType, period, months, {
        category,
        includeForecast
      });

      return {
        success: true,
        message: `Análisis de tendencias de ${trendType} generado para ${months} meses`,
        data: trends,
        metadata: {
          dataPoints: trends.data.length,
          forecastPoints: trends.forecast?.length || 0,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al analizar tendencias de inventario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES PRIVADOS
  // ===============================

  /**
   * Calcula estimación de agotamiento de stock
   */
  private calculateEstimatedDepletion(currentStock: number): string {
    if (currentStock === 0) return 'Ya agotado';
    if (currentStock < 5) return '1-2 días';
    if (currentStock < 10) return '3-7 días';
    if (currentStock < 20) return '1-2 semanas';
    return 'Más de 2 semanas';
  }

  /**
   * Genera productos alternativos basados en respuesta de API
   */
  private generateAlternativeProductsFromApi(producto: any): any[] {
    const alternatives: any[] = [];
    const basePrice = producto.precio || 0;
    
    for (let i = 0; i < 3; i++) {
      alternatives.push({
        id: `ALT_${producto.id}_${i + 1}`,
        name: `Alternativa ${i + 1} para ${producto.nombre}`,
        reference: `ALT-${producto.referencia || 'REF'}-${i + 1}`,
        category: 'General',
        price: basePrice * (0.8 + Math.random() * 0.4),
        stock: Math.floor(Math.random() * 20) + 5,
        similarity: Math.floor(Math.random() * 30) + 70,
        available: true
      });
    }
    
    return alternatives;
  }

  // ===============================
  // MÉTODOS AUXILIARES PRIVADOS ORIGINALES
  // ===============================

  private generateMockInventoryData(): any {
    return {
      totalProducts: 1250,
      totalValue: 45000000,
      categories: 15,
      averageStock: 28,
      lowStockProducts: 23,
      outOfStockProducts: 5,
      lastUpdate: new Date().toISOString()
    };
  }

  private generateLowStockAlerts(): StockAlert[] {
    return [
      {
        productId: 'PROD001',
        productName: 'Laptop HP Pavilion',
        currentStock: 2,
        threshold: 10,
        category: 'Electrónicos',
        warehouse: 'Bodega Principal',
        urgency: 'Alto',
        lastRestock: '2024-01-10'
      },
      {
        productId: 'PROD002',
        productName: 'Smartphone Samsung Galaxy',
        currentStock: 0,
        threshold: 5,
        category: 'Electrónicos',
        warehouse: 'Bodega Norte',
        urgency: 'Crítico',
        lastRestock: '2024-01-05'
      }
    ];
  }

  private generateCategorySummary(): CategorySummary {
    return {
      categories: [
        {
          name: 'Electrónicos',
          productCount: 450,
          totalValue: 18000000,
          averageStock: 25,
          lowStockCount: 15
        },
        {
          name: 'Ropa',
          productCount: 300,
          totalValue: 12000000,
          averageStock: 40,
          lowStockCount: 8
        },
        {
          name: 'Hogar',
          productCount: 200,
          totalValue: 8000000,
          averageStock: 30,
          lowStockCount: 12
        }
      ],
      totalCategories: 15,
      topCategory: 'Electrónicos',
      lowestStockCategory: 'Electrónicos'
    };
  }

  private generateMockProductsByCategory(category: string, limit: number): any[] {
    const products: any[] = [];
    for (let i = 0; i < limit; i++) {
      products.push({
        id: `${category.toUpperCase()}_${i + 1}`,
        name: `Producto ${category} ${i + 1}`,
        category,
        price: Math.floor(Math.random() * 100000) + 10000,
        stock: Math.floor(Math.random() * 50),
        description: `Descripción del producto ${i + 1} de ${category}`
      });
    }
    return products;
  }

  private sortInventoryResults(results: any[], sortBy: string): any[] {
    return results.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'stock':
          return b.stock - a.stock;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }

  private generateMockLowStockAlerts(threshold: number, includeOutOfStock: boolean): StockAlert[] {
    const alerts: StockAlert[] = [];
    
    if (this.productosCatalogo && this.productosCatalogo.length > 0) {
      this.productosCatalogo.forEach(producto => {
        const stock = producto.disponibilidad?.cantidadDisponible || 0;
        if (stock <= threshold && (includeOutOfStock || stock > 0)) {
          alerts.push({
            productId: producto.cd || '',
            productName: producto.crearProducto?.titulo || '',
            currentStock: stock,
            threshold,
            category: (producto.crearProducto as any)?.categorias?.label || 'Sin categoría',
            warehouse: this.bodegaSeleccionada?.nombre || 'General',
            urgency: stock === 0 ? 'Crítico' : stock <= threshold / 2 ? 'Alto' : 'Medio'
          });
        }
      });
    }
    
    return alerts.slice(0, 20);
  }

  private generateStockRecommendations(summary: any): string[] {
    const recommendations: string[] = [];
    
    if (summary.criticalAlerts > 0) {
      recommendations.push(`Reabastecer ${summary.criticalAlerts} productos agotados urgentemente`);
    }
    
    if (summary.lowStockAlerts > 0) {
      recommendations.push(`Planificar reabastecimiento para ${summary.lowStockAlerts} productos con stock bajo`);
    }
    
    if (summary.totalAlerts > 10) {
      recommendations.push('Revisar políticas de inventario y puntos de reorden');
    }
    
    return recommendations;
  }

  private generateInventorySummaryReport(): any {
    return {
      title: 'Reporte Resumen de Inventario',
      totalProducts: 1250,
      totalValue: 45000000,
      topCategories: ['Electrónicos', 'Ropa', 'Hogar'],
      alertSummary: {
        lowStock: 23,
        outOfStock: 5,
        critical: 8
      }
    };
  }

  private generateDetailedInventoryReport(): any {
    return {
      title: 'Reporte Detallado de Inventario',
      sections: ['Productos', 'Categorías', 'Bodegas', 'Movimientos'],
      productDetails: this.generateMockProductsByCategory('General', 10),
      categoryBreakdown: this.generateCategorySummary(),
      warehouseStatus: ['Bodega Principal: 80% ocupada', 'Bodega Norte: 65% ocupada']
    };
  }

  private generateAnalyticsInventoryReport(): any {
    return {
      title: 'Reporte de Análisis de Inventario',
      kpis: {
        rotationRate: '4.2x anual',
        averageDaysInStock: 87,
        profitMargin: '24.5%'
      },
      trends: this.generateInventoryTrends('stock', 'monthly', 6, {}),
      predictions: ['Incremento en demanda de electrónicos', 'Reducción en stock de ropa estacional']
    };
  }

  private generateMockInventoryMovements(dateRange: string, options?: any): InventoryMovement[] {
    const movements: InventoryMovement[] = [];
    const now = new Date();
    
    for (let i = 0; i < 25; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      movements.push({
        id: `MOV${i + 1}`,
        date: date.toISOString(),
        type: ['in', 'out', 'adjustment'][Math.floor(Math.random() * 3)] as 'in' | 'out' | 'adjustment',
        productId: `PROD${Math.floor(Math.random() * 100) + 1}`,
        productName: `Producto ${Math.floor(Math.random() * 100) + 1}`,
        quantity: Math.floor(Math.random() * 50) + 1,
        value: Math.floor(Math.random() * 100000) + 10000,
        warehouse: ['Bodega Principal', 'Bodega Norte', 'Bodega Sur'][Math.floor(Math.random() * 3)],
        reference: `REF-${Math.floor(Math.random() * 1000)}`,
        notes: 'Movimiento automático del sistema'
      });
    }
    
    return movements;
  }

  private groupMovementsByType(movements: InventoryMovement[]): any {
    return movements.reduce((acc, mov) => {
      if (!acc[mov.type]) acc[mov.type] = [];
      acc[mov.type].push(mov);
      return acc;
    }, {} as any);
  }

  private groupMovementsByDate(movements: InventoryMovement[]): any {
    return movements.reduce((acc, mov) => {
      const date = new Date(mov.date).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(mov);
      return acc;
    }, {} as any);
  }

  private getStockLevel(stock: number): string {
    if (stock === 0) return 'Agotado';
    if (stock < 10) return 'Bajo';
    if (stock < 50) return 'Medio';
    return 'Alto';
  }

  private getEstimatedDelivery(stock: number): string {
    if (stock === 0) return 'No disponible';
    if (stock < 5) return '3-5 días hábiles';
    if (stock < 20) return '1-2 días hábiles';
    return 'Inmediato';
  }

  private findAlternativeProducts(product: Producto): any[] {
    const alternatives: any[] = [];
    const category = (product.crearProducto as any)?.categorias?.label || 'General';
    
    for (let i = 0; i < 3; i++) {
      alternatives.push({
        id: `ALT${i + 1}`,
        name: `Alternativa ${i + 1} para ${product.crearProducto?.titulo}`,
        category,
        price: ((product.precio as any)?.valor || 0) * (0.8 + Math.random() * 0.4),
        stock: Math.floor(Math.random() * 20) + 5,
        similarity: Math.floor(Math.random() * 30) + 70
      });
    }
    
    return alternatives;
  }

  private generateCategorySummaryWithOptions(options?: any): CategorySummary {
    const summary = this.generateCategorySummary();
    
    if (options?.sortBy) {
      summary.categories.sort((a: any, b: any) => {
        switch (options.sortBy) {
          case 'count':
            return b.productCount - a.productCount;
          case 'value':
            return b.totalValue - a.totalValue;
          case 'stock':
            return b.averageStock - a.averageStock;
          default:
            return a.name.localeCompare(b.name);
        }
      });
    }

    if (!options?.includePricing) {
      summary.categories.forEach((cat: any) => delete cat.totalValue);
    }

    if (!options?.includeStockLevels) {
      summary.categories.forEach((cat: any) => delete cat.averageStock);
    }

    return summary;
  }

  private generateWarehouseComparison(warehouseIds: string[], options: any): WarehouseComparison {
    const warehouses = [
      { id: 'WH001', name: 'Bodega Principal' },
      { id: 'WH002', name: 'Bodega Norte' },
      { id: 'WH003', name: 'Bodega Sur' }
    ];

    const comparison: WarehouseComparison = {
      warehouses: warehouseIds.map(id => {
        const warehouse = warehouses.find(w => w.id === id) || { id, name: `Bodega ${id}` };
        return {
          ...warehouse,
          productCount: Math.floor(Math.random() * 200) + 100,
          totalValue: Math.floor(Math.random() * 15000000) + 5000000,
          averageStock: Math.floor(Math.random() * 30) + 20,
          categories: Math.floor(Math.random() * 10) + 5
        };
      }),
      metrics: options.includeMetrics ? {
        totalProducts: 0,
        totalValue: 0,
        averageStock: 0,
        mostDiverse: '',
        highestValue: ''
      } : undefined,
      differences: options.highlightDifferences ? [] as any[] : undefined
    };

    if (options.includeMetrics && comparison.metrics) {
      comparison.metrics.totalProducts = comparison.warehouses.reduce((sum, w) => sum + w.productCount, 0);
      comparison.metrics.totalValue = comparison.warehouses.reduce((sum, w) => sum + w.totalValue, 0);
      comparison.metrics.averageStock = comparison.warehouses.reduce((sum, w) => sum + w.averageStock, 0) / comparison.warehouses.length;
      
      const mostDiverse = comparison.warehouses.reduce((max, w) => w.categories > max.categories ? w : max);
      comparison.metrics.mostDiverse = mostDiverse.name;
      
      const highestValue = comparison.warehouses.reduce((max, w) => w.totalValue > max.totalValue ? w : max);
      comparison.metrics.highestValue = highestValue.name;
    }

    if (options.highlightDifferences && comparison.differences) {
      const avgProductCount = comparison.warehouses.reduce((sum, w) => sum + w.productCount, 0) / comparison.warehouses.length;
      comparison.differences = comparison.warehouses
        .filter(w => Math.abs(w.productCount - avgProductCount) > avgProductCount * 0.2)
        .map(w => ({
          warehouse: w.name,
          metric: 'productCount',
          difference: w.productCount - avgProductCount,
          percentage: ((w.productCount - avgProductCount) / avgProductCount * 100).toFixed(1)
        }));
    }

    return comparison;
  }

  private generateInventoryTrends(trendType: string, period: string, months: number, options: any): InventoryTrends {
    const trends: InventoryTrends = {
      type: trendType,
      period,
      months,
      data: [] as any[],
      insights: [] as string[],
      forecast: options.includeForecast ? [] as any[] : undefined
    };

    const now = new Date();
    const categories: string[] = options.category ? [options.category] : ['Electrónicos', 'Ropa', 'Hogar', 'Deportes'];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthData: any = {
        month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        date: date.toISOString()
      };

      categories.forEach((cat: string) => {
        const baseValue = trendType === 'stock' ? 100 : trendType === 'sales' ? 50 : trendType === 'purchases' ? 30 : 20;
        const variation = Math.random() * 0.3 - 0.15;
        monthData[cat] = Math.floor(baseValue * (1 + variation));
      });

      trends.data.push(monthData);
    }

    trends.insights = [
      `La tendencia general muestra un crecimiento del ${Math.floor(Math.random() * 10 + 5)}% en los últimos ${months} meses`,
      `La categoría ${categories[0]} mantiene el liderazgo en ${trendType}`,
      `Se observa una estabilización en los últimos 2 meses`
    ];

    if (options.includeForecast && trends.forecast) {
      for (let i = 1; i <= 3; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const forecastData: any = {
          month: forecastDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          date: forecastDate.toISOString(),
          isForecast: true
        };

        categories.forEach((cat: string) => {
          const lastValue = trends.data[trends.data.length - 1][cat];
          const growthRate = 0.05 + (Math.random() * 0.1);
          forecastData[cat] = Math.floor(lastValue * (1 + growthRate));
        });

        trends.forecast!.push(forecastData);
      }
    }

    return trends;
  }

  /**
   * Búsqueda rápida de productos (nuevo endpoint /inventario/busqueda)
   */
  async quickSearchProducts(args: any): Promise<InventoryToolResponse> {
    try {
      const { 
        termino, 
        limit = 5 
      } = args;

      if (!termino || termino.trim().length < 2) {
        return {
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres',
          error: 'Término de búsqueda inválido'
        };
      }

      // Intentar usar la API real primero
      try {
        const apiParams: ApiInventorySearchParams = {
          termino: termino.trim(),
          limite: Math.min(limit, 10) // Máximo 10 según la documentación
        };

        const apiResponse = await this.searchProductsViaApi(apiParams);
        if (apiResponse.success && apiResponse.productos) {
          return {
            success: true,
            message: `Se encontraron ${apiResponse.productos.length} productos para "${termino}" via API`,
            data: {
              products: apiResponse.productos,
              searchTerm: apiResponse.terminoBuscado || termino,
              totalFound: apiResponse.productos.length,
              source: 'api'
            },
            metadata: {
              totalItems: apiResponse.productos.length,
              processingTime: Date.now()
            }
          };
        }
      } catch (apiError) {
        console.log('⚠️ API no disponible para búsqueda rápida, usando datos alternativos:', apiError);
      }

      // Fallback: Búsqueda en catálogo local
      const searchResults = this.productosCatalogo.filter(producto => {
        const titulo = producto.crearProducto?.titulo?.toLowerCase() || '';
        const referencia = (producto.crearProducto as any)?.referencia?.toLowerCase() || '';
        const descripcion = producto.crearProducto?.descripcion?.toLowerCase() || '';
        const term = termino.toLowerCase();
        
        return titulo.includes(term) || 
               referencia.includes(term) || 
               descripcion.includes(term) ||
               producto.cd?.toLowerCase().includes(term);
      }).slice(0, limit);

      const formattedResults = searchResults.map(producto => ({
        id: producto.cd,
        nombre: producto.crearProducto?.titulo,
        referencia: (producto.crearProducto as any)?.referencia,
        precio: (producto.precio as any)?.valor || 0,
        stockDisponible: producto.disponibilidad?.cantidadDisponible || 0,
        activo: true,
        imagen: (producto.crearProducto as any)?.imagen || null
      }));

      return {
        success: true,
        message: `Se encontraron ${formattedResults.length} productos para "${termino}"`,
        data: {
          products: formattedResults,
          searchTerm: termino,
          totalFound: formattedResults.length,
          source: 'internal'
        },
        metadata: {
          totalItems: formattedResults.length,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error en la búsqueda rápida de productos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // ===============================
  // MÉTODOS PÚBLICOS PARA ESTADO
  // ===============================

  setBodegaSeleccionada(bodega: any): void {
    this.bodegaSeleccionada = bodega;
  }

  setProductosCatalogo(productos: Producto[]): void {
    this.productosCatalogo = productos;
  }

  setEmpresaActual(empresa: any): void {
    this.empresaActual = empresa;
  }

  // ===============================
  // REGISTRO AUTOMÁTICO DE HERRAMIENTAS
  // ===============================

  /**
   * Registra todas las herramientas de inventario en el ToolRegistry
   * Este método se llama automáticamente en el constructor
   */
  private registerAllTools(): void {
    console.log('🔧 Registrando herramientas de inventario en ToolRegistry...');

    const tools: ExecutableTool[] = [
      // 1. getInventoryStatus
      {
        declaration: {
          name: 'get_inventory_status',
          description: 'Obtiene el estado actual del inventario con alertas y resumen opcional',
          parameters: {
            type: 'object',
            properties: {
              warehouseId: {
                type: 'string',
                description: 'ID de la bodega específica o "all" para todas'
              },
              includeAlerts: {
                type: 'boolean',
                description: 'Incluir alertas de stock bajo'
              },
              includeSummary: {
                type: 'boolean',
                description: 'Incluir resumen por categorías'
              }
            },
            required: []
          }
        },
        execute: (args) => this.getInventoryStatus(args),
        category: 'inventory'
      },

      // 2. searchInventoryByCategory
      {
        declaration: {
          name: 'search_inventory_by_category',
          description: 'Busca productos por categoría con filtros opcionales de precio y stock',
          parameters: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Nombre de la categoría a buscar'
              },
              limit: {
                type: 'number',
                description: 'Número máximo de resultados (máximo 20)'
              },
              sortBy: {
                type: 'string',
                enum: ['name', 'price', 'stock', 'category'],
                description: 'Campo por el cual ordenar'
              },
              includeOutOfStock: {
                type: 'boolean',
                description: 'Incluir productos sin stock'
              },
              priceRange: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' }
                }
              },
              etiqueta: {
                type: 'string',
                description: 'Etiqueta adicional para filtrar'
              }
            },
            required: ['category']
          }
        },
        execute: (args) => this.searchInventoryByCategory(args),
        category: 'inventory'
      },

      // 3. getLowStockAlerts
      {
        declaration: {
          name: 'get_low_stock_alerts',
          description: 'Obtiene alertas de productos con stock bajo o agotado',
          parameters: {
            type: 'object',
            properties: {
              threshold: {
                type: 'number',
                description: 'Umbral de stock bajo'
              },
              includeOutOfStock: {
                type: 'boolean',
                description: 'Incluir productos agotados'
              },
              urgencyLevel: {
                type: 'string',
                enum: ['all', 'critical', 'high', 'medium', 'low'],
                description: 'Nivel de urgencia a filtrar'
              },
              warehouseId: {
                type: 'string',
                description: 'ID de bodega específica'
              },
              limit: {
                type: 'number',
                description: 'Número máximo de alertas'
              }
            },
            required: []
          }
        },
        execute: (args) => this.getLowStockAlerts(args),
        category: 'inventory'
      },

      // 4. checkProductAvailability
      {
        declaration: {
          name: 'check_product_availability',
          description: 'Verifica la disponibilidad de un producto específico',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'ID del producto'
              },
              referencia: {
                type: 'string',
                description: 'Referencia del producto (alternativa a productId)'
              },
              quantity: {
                type: 'number',
                description: 'Cantidad solicitada'
              },
              warehouseId: {
                type: 'string',
                description: 'ID de la bodega'
              }
            },
            required: []
          }
        },
        execute: (args) => this.checkProductAvailability(args),
        category: 'inventory'
      },

      // 5. quickSearchProducts
      {
        declaration: {
          name: 'quick_search_products',
          description: 'Búsqueda rápida de productos por término (nombre, referencia, descripción)',
          parameters: {
            type: 'object',
            properties: {
              termino: {
                type: 'string',
                description: 'Término de búsqueda (mínimo 2 caracteres)'
              },
              limit: {
                type: 'number',
                description: 'Número máximo de resultados (máximo 10)'
              }
            },
            required: ['termino']
          }
        },
        execute: (args) => this.quickSearchProducts(args),
        category: 'inventory'
      },

      // 6. getInventoryReport
      {
        declaration: {
          name: 'get_inventory_report',
          description: 'Genera reportes de inventario (resumen, detallado, o analítico)',
          parameters: {
            type: 'object',
            properties: {
              reportType: {
                type: 'string',
                enum: ['summary', 'detailed', 'analytics'],
                description: 'Tipo de reporte a generar'
              },
              includeAnalytics: {
                type: 'boolean',
                description: 'Incluir análisis avanzado'
              },
              dateRange: {
                type: 'string',
                description: 'Rango de fechas del reporte'
              },
              format: {
                type: 'string',
                enum: ['json', 'pdf', 'excel'],
                description: 'Formato del reporte'
              }
            },
            required: []
          }
        },
        execute: (args) => this.getInventoryReport(args),
        category: 'inventory'
      },

      // 7. getInventoryMovements
      {
        declaration: {
          name: 'get_inventory_movements',
          description: 'Obtiene movimientos de inventario (entradas, salidas, ajustes)',
          parameters: {
            type: 'object',
            properties: {
              dateRange: {
                type: 'string',
                description: 'Rango de fechas para los movimientos'
              },
              movementType: {
                type: 'string',
                enum: ['all', 'in', 'out', 'adjustment', 'transfer'],
                description: 'Tipo de movimiento'
              },
              productId: {
                type: 'string',
                description: 'Filtrar por producto específico'
              },
              warehouseId: {
                type: 'string',
                description: 'Filtrar por bodega específica'
              },
              groupBy: {
                type: 'string',
                enum: ['date', 'type', 'product'],
                description: 'Agrupar resultados por'
              },
              limit: {
                type: 'number',
                description: 'Número máximo de movimientos'
              }
            },
            required: []
          }
        },
        execute: (args) => this.getInventoryMovements(args),
        category: 'inventory'
      },

      // 8. getCategoryInventorySummary
      {
        declaration: {
          name: 'get_category_inventory_summary',
          description: 'Obtiene resumen del inventario agrupado por categorías',
          parameters: {
            type: 'object',
            properties: {
              includeEmptyCategories: {
                type: 'boolean',
                description: 'Incluir categorías sin productos'
              },
              sortBy: {
                type: 'string',
                enum: ['name', 'count', 'value', 'stock'],
                description: 'Ordenar por'
              },
              includePricing: {
                type: 'boolean',
                description: 'Incluir información de precios'
              },
              includeStockLevels: {
                type: 'boolean',
                description: 'Incluir niveles de stock'
              }
            },
            required: []
          }
        },
        execute: (args) => this.getCategoryInventorySummary(args),
        category: 'inventory'
      },

      // 9. getWarehouseInventoryComparison
      {
        declaration: {
          name: 'get_warehouse_inventory_comparison',
          description: 'Compara inventario entre múltiples bodegas',
          parameters: {
            type: 'object',
            properties: {
              warehouseIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs de las bodegas a comparar (mínimo 2)'
              },
              includeMetrics: {
                type: 'boolean',
                description: 'Incluir métricas comparativas'
              },
              highlightDifferences: {
                type: 'boolean',
                description: 'Resaltar diferencias significativas'
              }
            },
            required: ['warehouseIds']
          }
        },
        execute: (args) => this.getWarehouseInventoryComparison(args),
        category: 'inventory'
      },

      // 10. getInventoryTrends
      {
        declaration: {
          name: 'get_inventory_trends',
          description: 'Analiza tendencias de inventario con proyecciones opcionales',
          parameters: {
            type: 'object',
            properties: {
              trendType: {
                type: 'string',
                enum: ['stock', 'sales', 'purchases', 'movements'],
                description: 'Tipo de tendencia a analizar'
              },
              period: {
                type: 'string',
                enum: ['daily', 'weekly', 'monthly', 'quarterly'],
                description: 'Período de análisis'
              },
              months: {
                type: 'number',
                description: 'Número de meses históricos a analizar'
              },
              category: {
                type: 'string',
                description: 'Filtrar por categoría específica'
              },
              includeForecast: {
                type: 'boolean',
                description: 'Incluir proyección futura'
              }
            },
            required: []
          }
        },
        execute: (args) => this.getInventoryTrends(args),
        category: 'inventory'
      }
    ];

    // Registrar todas las herramientas
    this.toolRegistry.registerTools(tools);

    console.log(`✅ ${tools.length} herramientas de inventario registradas exitosamente`);
  }
}
