/**
 * Interfaces TypeScript para Dashboard Analytics - Katuq
 * 
 * Estas interfaces definen la estructura de datos que retornan
 * los endpoints del dashboard optimizado.
 * 
 * Endpoints:
 * - GET /v1/analytics/dashboard-core
 * - GET /v1/analytics/dashboard-details
 */

// ============================================================================
// RESPUESTA DEL ENDPOINT DASHBOARD-CORE
// ============================================================================

/**
 * Respuesta completa del endpoint /dashboard-core
 * Contiene KPIs críticos y datos de ventas por período
 */
export interface DashboardCoreResponse {
  periodo: PeriodoInfo;
  kpis: KPIsCriticos;
  ventasPorPeriodo: VentaDiaria[];
}

/**
 * Información del período consultado
 */
export interface PeriodoInfo {
  inicio: string;           // Fecha en formato YYYY-MM-DD
  fin: string;             // Fecha en formato YYYY-MM-DD
  dias: number;            // Número de días en el período
}

/**
 * KPIs críticos para mostrar inmediatamente
 */
export interface KPIsCriticos {
  ventasTotales: number;        // Ventas totales del período (solo pedidos aprobados)
  ventasBrutas: number;         // Ventas sin descuentos aplicados
  ticketPromedio: number;       // Valor promedio por pedido aprobado
  tasaConversion: number;       // Porcentaje de pedidos aprobados vs total
  totalPedidos: number;         // Total de pedidos en el período
  pedidosAprobados: number;     // Cantidad de pedidos aprobados
  crecimientoVentas: number;    // Porcentaje de crecimiento vs período anterior
}

/**
 * Datos de ventas agrupados por día
 * Para el gráfico line chart de ventas por período
 */
export interface VentaDiaria {
  fecha: string;           // Fecha en formato YYYY-MM-DD
  ventas: number;          // Ventas del día (solo pedidos aprobados)
  pedidos: number;         // Cantidad de pedidos del día
}

// ============================================================================
// RESPUESTA DEL ENDPOINT DASHBOARD-DETAILS
// ============================================================================

/**
 * Respuesta completa del endpoint /dashboard-details
 * Contiene análisis detallados para gráficos específicos
 */
export interface DashboardDetailsResponse {
  productosTop: ProductoTop[];
  categorias: CategoriaVentas[];
  metodosPago: MetodoPago[];
  ciudades: CiudadVentas[];
  metricas: MetricasAdicionales;
}

/**
 * Producto en el ranking de más vendidos
 * Para el gráfico horizontal bar chart
 */
export interface ProductoTop {
  id: string;                   // Referencia o ID único del producto
  nombre: string;               // Nombre/título del producto
  cantidadVendida: number;      // Unidades vendidas en el período
  ingresos: number;             // Ingresos generados por este producto
  categoria: string;            // Categoría del producto
}

/**
 * Análisis de ventas por categoría
 * Para el gráfico donut chart
 */
export interface CategoriaVentas {
  categoria: string;            // Nombre de la categoría
  ventas: number;               // Ingresos totales de la categoría
  cantidad: number;             // Cantidad de productos vendidos
  porcentaje: number;           // Porcentaje de participación en ventas totales
}

/**
 * Distribución de métodos de pago
 * Para el gráfico pie chart
 */
export interface MetodoPago {
  metodo: string;               // Nombre del método de pago
  cantidad: number;             // Número de transacciones con este método
  porcentaje: number;           // Porcentaje de uso vs total de transacciones
}

/**
 * Datos de ventas por ciudad
 * Para el mapa geográfico con Leaflet
 */
export interface CiudadVentas {
  ciudad: string;               // Nombre de la ciudad
  departamento: string;         // Departamento o estado
  ventas: number;               // Ventas totales en esta ciudad
  pedidos: number;              // Cantidad de pedidos en esta ciudad
  coordenadas: Coordenadas;     // Coordenadas geográficas para el mapa
}

/**
 * Coordenadas geográficas
 */
export interface Coordenadas {
  lat: number;                  // Latitud
  lng: number;                  // Longitud
}

/**
 * Métricas adicionales calculadas
 */
export interface MetricasAdicionales {
  tiempoPromedioEntrega: number;    // Promedio de días entre creación y entrega
  totalDescuentos: number;          // Suma total de descuentos aplicados
  pedidosEntregados: number;        // Cantidad de pedidos ya entregados
  ciudadesAtendidas: number;        // Número de ciudades únicas atendidas
}

// ============================================================================
// INTERFACES AUXILIARES PARA FRONTEND
// ============================================================================

/**
 * Configuración de filtros del dashboard
 */
export interface FiltrosDashboard {
  fechaInicio: string;          // Fecha inicial en formato YYYY-MM-DD
  fechaFin: string;             // Fecha final en formato YYYY-MM-DD
  company?: string;             // ID de empresa (opcional)
}

/**
 * Estado de carga del dashboard
 */
export interface EstadoCarga {
  core: boolean;                // Si están cargando los datos críticos
  details: boolean;             // Si están cargando los datos detallados
  error: string | null;         // Mensaje de error si ocurre alguno
}

/**
 * Configuración de colores para gráficos
 */
export interface ColoresGraficos {
  primary: string;              // Color primario (#008FFB)
  secondary: string;            // Color secundario (#00E396)
  tertiary: string;             // Color terciario (#FEB019)
  quaternary: string;           // Color cuaternario (#FF4560)
  quinquenary: string;          // Color quinquenario (#775DD0)
}

/**
 * Opciones de configuración para ApexCharts
 */
export interface ConfiguracionChart {
  responsive: boolean;          // Si el gráfico es responsive
  animations: boolean;          // Si tiene animaciones habilitadas
  toolbar: boolean;             // Si muestra la barra de herramientas
  legend: boolean;              // Si muestra la leyenda
  dataLabels: boolean;          // Si muestra etiquetas de datos
}

// ============================================================================
// INTERFACES PARA MANEJO DE ERRORES
// ============================================================================

/**
 * Estructura de errores de la API
 */
export interface ErrorAPI {
  error: string;                // Mensaje de error principal
  details?: string;             // Detalles adicionales del error
  code?: number;                // Código de error HTTP
}

/**
 * Respuesta estándar de error
 */
export interface RespuestaError {
  success: false;
  error: ErrorAPI;
  timestamp: string;
}

// ============================================================================
// TIPOS UNION PARA VALIDACIONES
// ============================================================================

/**
 * Tipos de gráficos disponibles
 */
export type TipoGrafico = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'map';

/**
 * Estados posibles de los pedidos
 */
export type EstadoPedido = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Cancelado';

/**
 * Métodos de pago disponibles
 */
export type MetodosPagoDisponibles = 
  | 'Tarjeta de Crédito' 
  | 'Tarjeta de Débito' 
  | 'PSE' 
  | 'Efectivo' 
  | 'Transferencia' 
  | 'Nequi' 
  | 'Daviplata' 
  | 'No especificado';

// ============================================================================
// CONSTANTES ÚTILES
// ============================================================================

/**
 * Colores por defecto para los gráficos
 */
export const COLORES_DEFAULT: ColoresGraficos = {
  primary: '#008FFB',
  secondary: '#00E396', 
  tertiary: '#FEB019',
  quaternary: '#FF4560',
  quinquenary: '#775DD0'
};

/**
 * Configuración por defecto para gráficos
 */
export const CONFIG_CHART_DEFAULT: ConfiguracionChart = {
  responsive: true,
  animations: true,
  toolbar: true,
  legend: true,
  dataLabels: true
};

/**
 * Formato de fechas para la API
 */
export const FORMATO_FECHA_API = 'YYYY-MM-DD';

/**
 * Límites de fechas permitidas
 */
export const LIMITES_FECHAS = {
  MIN_DIAS: 1,                  // Mínimo 1 día de diferencia
  MAX_DIAS: 365,                // Máximo 1 año de diferencia
  FECHA_MIN: '2020-01-01',      // Fecha mínima permitida
  FECHA_MAX: '2030-12-31'       // Fecha máxima permitida
};

// ============================================================================
// GUARDS Y VALIDATORS
// ============================================================================

/**
 * Valida si una fecha está en formato correcto
 */
export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !isNaN(Date.parse(fecha));
}

/**
 * Valida si un rango de fechas es válido
 */
export function esRangoFechasValido(inicio: string, fin: string): boolean {
  if (!esFechaValida(inicio) || !esFechaValida(fin)) {
    return false;
  }
  
  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);
  
  return fechaInicio <= fechaFin;
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function calcularDiferenciaDias(inicio: string, fin: string): number {
  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);
  
  return Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Type guard para verificar si una respuesta es de error
 */
export function esRespuestaError(respuesta: any): respuesta is RespuestaError {
  return respuesta && respuesta.success === false && respuesta.error;
}

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/**
 * Ejemplo de uso en un componente Angular
 * 
 * ```typescript
 * import { DashboardCoreResponse, FiltrosDashboard } from './dashboard-interfaces';
 * 
 * @Component({...})
 * export class DashboardComponent {
 *   datosCore: DashboardCoreResponse | null = null;
 *   filtros: FiltrosDashboard = {
 *     fechaInicio: '2024-01-01',
 *     fechaFin: '2024-12-31'
 *   };
 * 
 *   async cargarDatos() {
 *     if (!esRangoFechasValido(this.filtros.fechaInicio, this.filtros.fechaFin)) {
 *       console.error('Rango de fechas inválido');
 *       return;
 *     }
 *     
 *     this.datosCore = await this.analyticsService.getDashboardCore(this.filtros);
 *   }
 * }
 * ```
 */