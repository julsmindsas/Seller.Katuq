/**
 * Interfaces para la respuesta paginada del endpoint optimizado
 * @since 2025.09.05 - Implementación de paginación del lado del servidor
 */

export interface PaginationInfo {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedOrdersResponse {
  orders: any[]; // Using any[] to maintain compatibility with existing Pedido interface
  pagination: PaginationInfo;
  metrics?: {
    totalPedidos: number;
    enProduccion: number;
    empacados: number;
    enRuta: number;
    paraDespachar: number;
    entregados: number;
    porCobrar: number;
  };
}

/**
 * Parámetros para solicitud de órdenes paginadas
 */
export interface PaginatedOrdersRequest {
  filter: any; // Mantener compatibilidad con filtros existentes
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: number; // 1 for asc, -1 for desc
  globalFilter?: string;
}