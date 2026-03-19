/**
 * Interfaces TypeScript para Dashboard Analytics - Katuq
 * 
 * Estas interfaces definen la estructura de datos que retornan
 * los endpoints del dashboard optimizado.
 * 
 * Endpoints:
 * - GET /v1/analytics/dashboard-core
 * - GET /v1/analytics/dashboard-details
 * - GET /v1/analytics/pedidos/flujo-estados
 * - GET /v1/analytics/pedidos/tiempos-procesamiento
 * - GET /v1/analytics/logistica/performance-entregas
 * - GET /v1/analytics/logistica/analisis-geografico
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
  // 🆕 NUEVAS MÉTRICAS - Ticket Promedio por Canal y Vendedor
  ticketPromedioPorCanal: TicketPromedioCanal[];
  ticketPromedioPorVendedor: TicketPromedioVendedor[];
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

/**
 * Ticket promedio por canal de venta
 * Para análisis de performance por canal
 */
export interface TicketPromedioCanal {
  canal: string;            // Nombre del canal (POS, Web, Rappi, MercadoLibre, etc.)
  ticketPromedio: number;   // Valor promedio por pedido
  ventas: number;           // Total de ventas del canal
  pedidos: number;          // Cantidad total de pedidos
}

/**
 * Ticket promedio por vendedor
 * Para análisis de performance por vendedor (Top 10)
 */
export interface TicketPromedioVendedor {
  vendedor: string;         // Email o identificador del vendedor
  ticketPromedio: number;   // Valor promedio por pedido
  ventas: number;           // Total de ventas del vendedor
  pedidos: number;          // Cantidad total de pedidos
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
// NUEVOS MÓDULOS: ANÁLISIS DE PEDIDOS
// ============================================================================

export type EstadoProceso = 
  | 'SinProducir'
  | 'Producido'
  | 'ProducidoParcialmente' 
  | 'ProducidoTotalmente'
  | 'Empacado'
  | 'Despachado'
  | 'ParaDespachar'
  | 'Entregado'
  | 'Rechazado'
  | 'Cerrado';

/**
 * Análisis de flujo de estados de pedidos
 */
export interface FlujoEstadosResponse {
  periodo: PeriodoInfo;
  resumen: ResumenFlujoEstados;
  distribucionEstados: DistribucionEstado[];
  transicionesEstados: TransicionEstado[];
  tiemposPromedio: TiempoPromedioEstado[];
  cuellosBottle: CuelloBottle[];
  insights: InsightsFlujoEstados;
}

export interface ResumenFlujoEstados {
  totalPedidos: number;
  totalVentas: number;
  ventaPromedioPorPedido: number;
}

export interface DistribucionEstado {
  estado: EstadoProceso;
  cantidad: number;
  porcentaje: number;
  ventas: number;
  ventasPromedio: number;
}

export interface TransicionEstado {
  transicion: string;
  cantidad: number;
  porcentaje: number;
}

export interface TiempoPromedioEstado {
  estado: EstadoProceso;
  tiempoPromedioDias: number;
  cantidadMuestras: number;
}

export interface CuelloBottle {
  estado: EstadoProceso;
  cantidad: number;
  porcentaje: number;
  ventas: number;
}

export interface InsightsFlujoEstados {
  estadoMasFrecuente: EstadoProceso | null;
  porcentajeCompletados: number;
  tiempoPromedioCompleto: number;
}

/**
 * Análisis de tiempos de procesamiento
 */
export interface TiemposProcesamientoResponse {
  periodo: PeriodoInfo;
  estadisticas: EstadisticasTiempos;
  distribucionTiempos: DistribucionTiempo[];
  muestras: MuestrasTiempos;
  insights: InsightsTiempos;
}

export interface EstadisticasTiempos {
  empacado: EstadisticasTiempo;
  despacho: EstadisticasTiempo;
  entrega: EstadisticasTiempo;
}

export interface EstadisticasTiempo {
  promedio: number;
  mediana: number;
  min: number;
  max: number;
}

export interface DistribucionTiempo {
  rango: string;
  cantidad: number;
  porcentaje: number;
  ventas: number;
  ventaPromedio: number;
}

export interface MuestrasTiempos {
  empacado: number;
  despacho: number;
  entrega: number;
}

export interface InsightsTiempos {
  tiempoPromedioTotal: number;
  rangoMasFrecuente: string | null;
  porcentajeEntregasRapidas: number;
}

// ============================================================================
// NUEVOS MÓDULOS: ANÁLISIS DE LOGÍSTICA
// ============================================================================

/**
 * Performance de entregas y transportadores
 */
export interface PerformanceEntregasResponse {
  periodo: PeriodoInfo;
  resumen: ResumenPerformanceEntregas;
  estadisticasTiempos: EstadisticasTiemposEntrega;
  performanceTransportadores: PerformanceTransportador[];
  performanceZonas: PerformanceZona[];
  performanceHorarios: PerformanceHorario[];
  performanceFormasEntrega: PerformanceFormaEntrega[];
  insights: InsightsPerformanceEntregas;
}

export interface ResumenPerformanceEntregas {
  totalOrdenes: number;
  ordenesEntregadas: number;
  ordenesEnProceso: number;
  tasaEntrega: number;
  totalVentas: number;
  ventasEntregadas: number;
  ventaPromedioPorEntrega: number;
}

export interface EstadisticasTiemposEntrega {
  general: EstadisticasTiempo;
  entregasATiempo: AnalisisTiempo;
  entregasTardias: AnalisisTiempo;
}

export interface AnalisisTiempo {
  cantidad: number;
  porcentaje: number;
  estadisticas: EstadisticasTiempo;
}

export interface PerformanceTransportador {
  id: string;
  nombre: string;
  placa: string;
  totalEntregas: number;
  ventasEntregadas: number;
  ventaPromedio: number;
  tiempoPromedio: number;
  tasaExito: number;
  entregasATiempo: number;
  entregasTardias: number;
}

export interface PerformanceZona {
  id: string;
  nombre: string;
  costoBase: number;
  totalEntregas: number;
  ventasEntregadas: number;
  ventaPromedio: number;
  tiempoPromedio: number;
  eficiencia: number;
  porcentaje: number;
}

export interface PerformanceHorario {
  horario: string;
  totalOrdenes: number;
  entregadas: number;
  tasaEntrega: number;
  tiempoPromedio: number;
  ventas: number;
  ventaPromedio: number;
}

export interface PerformanceFormaEntrega {
  forma: string;
  totalOrdenes: number;
  entregadas: number;
  tasaEntrega: number;
  ventas: number;
  ventaPromedio: number;
}

export interface InsightsPerformanceEntregas {
  mejorTransportador: PerformanceTransportador | null;
  mejorZona: PerformanceZona | null;
  horarioMasEficiente: PerformanceHorario | null;
  tiempoPromedioGeneral: number;
  porcentajeEntregasATiempo: number;
}

/**
 * Análisis geográfico de cobertura
 */
export interface AnalisisGeograficoResponse {
  periodo: PeriodoInfo;
  resumen: ResumenGeografico;
  distribucionPorZona: DistribucionZona[];
  densidadPorCiudad: DensidadCiudad[];
  coberturaPorBodega: CoberturaBodega[];
  insights: InsightsGeograficos;
}

export interface ResumenGeografico {
  totalEntregasAnalizadas: number;
  ordenesConUbicacion: number;
  porcentajeConUbicacion: number;
  zonasActivas: number;
  ciudadesAtendidas: number;
  bodegasActivas: number;
}

export interface DistribucionZona {
  zonaId: string;
  nombreZona: string;
  costoBase: number;
  totalEntregas: number;
  totalVentas: number;
  ventaPromedio: number;
  densidad: number;
  eficiencia: number;
  porcentaje: number;
}

export interface DensidadCiudad {
  ciudad: string;
  totalEntregas: number;
  totalVentas: number;
  ventaPromedio: number;
  direccionesUnicas: number;
  densidad: number;
  porcentaje: number;
}

export interface CoberturaBodega {
  bodegaId: string;
  totalEntregas: number;
  totalVentas: number;
  zonasAtendidas: number;
  cobertura: number;
  ventaPromedio: number;
}

export interface InsightsGeograficos {
  zonaMasActiva: DistribucionZona | null;
  ciudadMasDensa: DensidadCiudad | null;
  bodegaMasEficiente: CoberturaBodega | null;
  recomendaciones: string[];
}

// ============================================================================
// MÓDULO INVENTARIO BI
// ============================================================================

export interface InventarioBodega {
  idBodega: string;
  nombre: string;
  unidades: number;
  productos: number;
  porcentaje: number;
}

export interface AlertaProducto {
  productoId: string;
  nombre: string;
  referencia: string;
  stockActual: number;
  valorEstimado: number;
}

export interface InventarioSnapshotResponse {
  resumen: {
    totalProductosUnicos: number;
    conStock: number;
    enRuptura: number;
    stockBajo: number;
    productosDormidos: number;
    totalUnidades: number;
    totalBodegas: number;
    diasDormidoUmbral: number;
  };
  distribucionBodegas: InventarioBodega[];
  alertas: {
    sinStock: AlertaProducto[];
    stockBajo: AlertaProducto[];
    dormidos: AlertaProducto[];
  };
}

export interface MovimientoPeriodoProducto {
  productoId: string;
  nombre: string;
  referencia: string;
  unidadesEntradas: number;
  unidadesSalidas: number;
}

export interface InventarioMovimientosResponse {
  periodo: PeriodoInfo;
  resumen: {
    totalMovimientos: number;
    totalIngresosUnidades: number;
    totalSalidasUnidades: number;
    balanceNeto: number;
    productosMovidos: number;
  };
  porTipoMovimiento: { tipo: string; movimientos: number; unidades: number; categoria: string }[];
  tendenciaDiaria: { fecha: string; ingresos: number; salidas: number; movimientos: number }[];
  topProductosMovidos: MovimientoPeriodoProducto[];
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
 * Estado de carga del dashboard ampliado para nuevos módulos
 */
export interface EstadoCarga {
  core: boolean;
  details: boolean;
  pedidos: boolean;
  logistica: boolean;
  inventario: boolean;
  error: string | null;
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
export type TipoGrafico = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'map' | 'funnel' | 'heatmap';

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

/**
 * Formas de entrega disponibles
 */
export type FormaEntrega = 
  | 'Domicilio'
  | 'Recogida'
  | 'Contraentrega'
  | 'Express'
  | 'Estandar';

/**
 * Rangos horarios para entregas
 */
export type RangoHorario = 
  | '8:00 AM - 12:00 PM'
  | '12:00 PM - 5:00 PM'
  | '5:00 PM - 8:00 PM'
  | 'Todo el día'
  | 'Mañana'
  | 'Tarde';

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
// UTILIDADES PARA ESTADOS DE PEDIDOS
// ============================================================================

/**
 * Mapeo de colores para estados de pedidos
 */
export const COLORES_ESTADOS: Record<EstadoProceso, string> = {
  'SinProducir': '#FF4560',      // Rojo - Sin iniciar
  'Producido': '#008FFB',        // Azul - En proceso
  'ProducidoParcialmente': '#FEB019', // Amarillo - Parcial
  'ProducidoTotalmente': '#00E396',   // Verde - Completo
  'Empacado': '#775DD0',         // Púrpura - Listo para envío
  'Despachado': '#20E647',       // Verde brillante - En tránsito
  'ParaDespachar': '#F77B00',    // Naranja - Pendiente despacho
  'Entregado': '#0CC27E',        // Verde oscuro - Completado
  'Rechazado': '#E74C3C',        // Rojo oscuro - Rechazado
  'Cerrado': '#6C757D'           // Gris - Cerrado
};

/**
 * Obtiene el nombre amigable de un estado de proceso
 */
export function getNombreEstadoAmigable(estado: EstadoProceso): string {
  const nombres: Record<EstadoProceso, string> = {
    'SinProducir': 'Sin Producir',
    'Producido': 'Producido',
    'ProducidoParcialmente': 'Producido Parcialmente',
    'ProducidoTotalmente': 'Producido Totalmente',
    'Empacado': 'Empacado',
    'Despachado': 'Despachado',
    'ParaDespachar': 'Para Despachar',
    'Entregado': 'Entregado',
    'Rechazado': 'Rechazado',
    'Cerrado': 'Cerrado'
  };
  
  return nombres[estado] || estado;
}

/**
 * Determina si un estado es final (no puede cambiar)
 */
export function esEstadoFinal(estado: EstadoProceso): boolean {
  return ['Entregado', 'Rechazado', 'Cerrado'].includes(estado);
}

/**
 * Calcula el porcentaje de progreso de un estado
 */
export function calcularPorcentajeProgreso(estado: EstadoProceso): number {
  const progreso: Record<EstadoProceso, number> = {
    'SinProducir': 0,
    'Producido': 20,
    'ProducidoParcialmente': 40,
    'ProducidoTotalmente': 60,
    'Empacado': 80,
    'ParaDespachar': 85,
    'Despachado': 90,
    'Entregado': 100,
    'Rechazado': 0,
    'Cerrado': 100
  };
  
  return progreso[estado] || 0;
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