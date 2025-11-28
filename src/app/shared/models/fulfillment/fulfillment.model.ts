/**
 * Modelos para integración con proveedores de Fulfillment
 */

// ============== STOCK ==============

export interface FulfillmentStockResponse {
  success: boolean;
  provider: string;
  productId: string;
  totalStock: number;
  warehouses: FulfillmentWarehouseStock[];
  lastUpdated: string;
}

export interface FulfillmentWarehouseStock {
  id: string;
  name: string;
  quantity: number;
  available: number;
  reserved: number;
}

export interface BulkStockResponse {
  success: boolean;
  provider: string;
  stocks: { [productId: string]: ProductStockInfo };
  totalRequested: number;
  totalSuccess: number;
  totalErrors: number;
  errors?: BulkStockError[];
}

export interface ProductStockInfo {
  stock: number | null;
  warehouses?: FulfillmentWarehouseStock[];
  lastUpdated?: string;
  error?: string;
}

export interface BulkStockError {
  productId: string;
  error: string;
}

// ============== SINCRONIZACIÓN ==============

export interface SyncInventoryResponse {
  success: boolean;
  productId: string;
  bodegaId: string;
  provider: string;
  stockKatuq: number;
  stockFulfillment: number;
  diferencia: number;
  movimiento?: SyncMovimiento;
  syncedAt: string;
  error?: string;
  errorType?: string;
}

export interface SyncMovimiento {
  id: string;
  tipo: string;
  cantidad: number;
}

export interface SyncBodegaResponse {
  success: boolean;
  bodegaId: string;
  provider: string;
  totalProductos: number;
  sincronizados: number;
  conDiferencias: number;
  errores: number;
  detallesDiferencias?: SyncDiferenciaDetalle[];
  detallesErrores?: SyncErrorDetalle[];
  duracionMs: number;
  logId?: string;
  syncedAt: string;
  error?: string;
  errorType?: string;
}

export interface SyncDiferenciaDetalle {
  productId: string;
  stockKatuq: number;
  stockFulfillment: number;
  diferencia: number;
}

export interface SyncErrorDetalle {
  productId: string;
  error: string;
}

// ============== PROVIDERS ==============

export interface FulfillmentProvider {
  provider: string;
  status: 'active' | 'inactive' | 'error';
  configured: boolean;
  lastSync?: string;
}

export interface FulfillmentProviderConfig {
  provider: string;
  apiUrl?: string;
  environment?: 'production' | 'test';
  enabled: boolean;
}

// ============== PRODUCTOS ==============

export interface FulfillmentProduct {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  stock: number;
  active: boolean;
  barcode?: string;
  category?: string;
  tags?: string[];
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ============== BODEGAS FULFILLMENT ==============

export interface FulfillmentWarehouse {
  id: string;
  name: string;
  code?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  active: boolean;
  capacity?: number;
  type?: string;
}

// ============== ÓRDENES FULFILLMENT ==============

export interface FulfillmentOrder {
  id: string;
  externalOrderId: string;
  status: FulfillmentOrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export type FulfillmentOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'error';

// ============== UI HELPERS ==============

export interface InventarioConFulfillment {
  productoId: string;
  productoNombre: string;
  productoSku?: string;
  stockKatuq: number;
  stockFulfillment: number | null;
  diferencia: number | null;
  fulfillmentLoading: boolean;
  fulfillmentError?: string;
  lastSync?: string;
}

export interface FulfillmentSyncOptions {
  provider: string;
  bodegaId: string;
  fulfillmentProductId?: string;
  fulfillmentWarehouseId?: string;
  batchSize?: number;
}
