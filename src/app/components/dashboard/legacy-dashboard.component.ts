import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin, interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { KatuqintelligenceService } from '../../shared/services/katuqintelligence/katuqintelligence.service';
import { AnalyticsService } from '../../shared/services/dashboard/analytics.service';
import { TourService } from '../../shared/services/tour.service';
import { EChartsOption } from 'echarts';
import {
  DashboardCoreResponse,
  DashboardDetailsResponse,
  FlujoEstadosResponse,
  TiemposProcesamientoResponse,
  PerformanceEntregasResponse,
  AnalisisGeograficoResponse,
  InventarioSnapshotResponse,
  InventarioMovimientosResponse,
  EstadoCarga,
  TicketPromedioCanal,
  TicketPromedioVendedor,
  COLORES_DEFAULT,
  COLORES_ESTADOS,
  getNombreEstadoAmigable,
  calcularPorcentajeProgreso
} from './model/dashboard-interfaces';

@Component({
  selector: 'app-legacy-dashboard',
  templateUrl: './legacy-dashboard.component.html',
  styleUrls: ['./legacy-dashboard.component.scss'],
})
export class LegacyDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // === Estados de carga según nueva arquitectura ===
  estadoCarga: EstadoCarga = {
    core: false,
    details: false,
    pedidos: false,
    logistica: false,
    inventario: false,
    error: null
  };

  // === Configuración de módulos por rol ===
  modulosHabilitados = {
    ventas: true,
    logistica: true,
    inventario: true,
    produccion: true,
    financiero: true
  };

  // === Estado de expansión de módulos (acordeón) ===
  modulosExpandidos = {
    ventas: true,
    logistica: false,
    inventario: false,
    produccion: false,
    financiero: false
  };

  rolUsuario: string = 'general'; // Por defecto todos los módulos

  // === Datos de la nueva arquitectura ===
  coreData: DashboardCoreResponse | null = null;
  detailsData: DashboardDetailsResponse | null = null;
  
  // === Nuevos datos de módulos específicos ===
  pedidosData: {
    flujoEstados: FlujoEstadosResponse | null;
    tiemposProcesamiento: TiemposProcesamientoResponse | null;
  } = {
    flujoEstados: null,
    tiemposProcesamiento: null
  };
  
  logisticaData: {
    performanceEntregas: PerformanceEntregasResponse | null;
    analisisGeografico: AnalisisGeograficoResponse | null;
  } = {
    performanceEntregas: null,
    analisisGeografico: null
  };

  inventarioData: {
    snapshot: InventarioSnapshotResponse | null;
    movimientos: InventarioMovimientosResponse | null;
  } = {
    snapshot: null,
    movimientos: null
  };

  inventarioBodegasChartOption: EChartsOption = {};
  inventarioMovimientosChartOption: EChartsOption = {};

  // === Datos legacy (mantener compatibilidad) ===
  topProductsMasVendidos: any[] = [];
  topProductosMenosVendidos: any[] = [];
  topVentasPorDia: any = {};

  // === Configuración de fechas ===
  fechaInicial: string;
  fechaFinal: string;

  // === ECharts Options ===
  ventasChartOption: EChartsOption = {};
  topProductosChartOption: EChartsOption = {};
  menosVendidosChartOption: EChartsOption = {};
  categoriasChartOption: EChartsOption = {};
  metodosPagoChartOption: EChartsOption = {};

  // === Drag & Drop Widget Management ===
  chartWidgets = [
    { id: 'ventas', title: 'Tendencia de Ventas', icon: 'chart-area', color: '#0078d4' },
    { id: 'topProductos', title: 'Top 10 Productos', icon: 'trophy-star', color: '#107c10' },
    { id: 'menosVendidos', title: 'Productos con Oportunidad', icon: 'exclamation-triangle', color: '#ffb900' },
    { id: 'categorias', title: 'Distribución por Categorías', icon: 'chart-pie', color: '#00b7c3' },
    { id: 'metodosPago', title: 'Métodos de Pago', icon: 'credit-card', color: '#8764b8' }
  ];

  // === K.A.I. Analysis (mantener funcionalidad existente) ===
  ventasMesCheck = false;
  ventasRes: string = '';
  isAnalyzing = false;

  // === KPIs calculados ===
  get totalVentas(): number {
    return this.coreData?.kpis?.ventasTotales || 0;
  }

  get crecimientoVentas(): number {
    return this.coreData?.kpis?.crecimientoVentas || 0;
  }

  get totalPedidos(): number {
    return this.coreData?.kpis?.totalPedidos || 0;
  }

  get promedioTicket(): number {
    return this.coreData?.kpis?.ticketPromedio || 0;
  }

  // 🆕 NUEVAS MÉTRICAS: Ticket Promedio por Canal y Vendedor
  get canalesData(): TicketPromedioCanal[] {
    return this.coreData?.ticketPromedioPorCanal || [];
  }
  
  get vendedoresData(): TicketPromedioVendedor[] {
    return this.coreData?.ticketPromedioPorVendedor || [];
  }
  
  // Análisis de canal más rentable
  get canalMasRentable(): TicketPromedioCanal | null {
    if (!this.canalesData.length) return null;
    return this.canalesData.reduce((max, canal) => 
      canal.ticketPromedio > max.ticketPromedio ? canal : max
    );
  }
  
  // Análisis de vendedor top
  get vendedorTop(): TicketPromedioVendedor | null {
    if (!this.vendedoresData.length) return null;
    return this.vendedoresData[0]; // Ya viene ordenado del backend
  }

  get tasaConversion(): number {
    return this.coreData?.kpis?.tasaConversion || 0;
  }

  get pedidosAprobados(): number {
    return this.coreData?.kpis?.pedidosAprobados || 0;
  }

  constructor(
    private ventasService: VentasService,
    private katuqintelligenceService: KatuqintelligenceService,
    private analyticsService: AnalyticsService,
    private tourService: TourService
  ) {
    this.initializeDates();
  }

  ngOnInit(): void {
    this.verificarConfiguracionEndpoints();
    this.configurarModulosPorRol();
    this.cargarPreferenciasAcordeon();
    this.loadWidgetOrder();
    // Cargar datos al inicializar el dashboard
    this.cargarDatos();
    this.initializeRealTimeUpdates();
  }

  ngAfterViewInit(): void {
    // Los gráficos se renderizan cuando lleguen los datos
    // Inicializar tour después de que la vista esté completamente cargada
    setTimeout(() => {
      this.initializeDashboardTour();
    }, 2000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === Drag & Drop Handler ===
  dropWidget(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.chartWidgets, event.previousIndex, event.currentIndex);
    // Save widget order to localStorage
    this.saveWidgetOrder();
  }

  private saveWidgetOrder(): void {
    try {
      const order = this.chartWidgets.map(w => w.id);
      localStorage.setItem('dashboard_widget_order', JSON.stringify(order));
    } catch (error) {
      console.warn('Could not save widget order:', error);
    }
  }

  private loadWidgetOrder(): void {
    try {
      const savedOrder = localStorage.getItem('dashboard_widget_order');
      if (savedOrder) {
        const order = JSON.parse(savedOrder);
        const reordered = order.map((id: string) =>
          this.chartWidgets.find(w => w.id === id)
        ).filter(Boolean);
        if (reordered.length === this.chartWidgets.length) {
          this.chartWidgets = reordered;
        }
      }
    } catch (error) {
      console.warn('Could not load widget order:', error);
    }
  }

  private initializeDates(): void {
    const now = new Date();
    this.fechaInicial = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    this.fechaFinal = now.toISOString().split('T')[0];
  }

  cargarDatosMesActual(): void {
    const now = new Date();
    this.fechaInicial = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    this.fechaFinal = now.toISOString().split('T')[0];
    this.cargarDatos();
  }

  cargarDatosMesAnterior(): void {
    const now = new Date();
    const mesAnterior = now.getMonth() - 1;
    const año = mesAnterior < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const mes = mesAnterior < 0 ? 11 : mesAnterior;
    
    this.fechaInicial = new Date(año, mes, 1).toISOString().split('T')[0];
    this.fechaFinal = new Date(año, mes + 1, 0).toISOString().split('T')[0];
    this.cargarDatos();
  }

  /**
   * NUEVA ARQUITECTURA: Carga progresiva con 2 endpoints
   * 1. Core: KPIs + Ventas por período (inmediato)
   * 2. Details: Productos, Categorías, Métodos pago, Ciudades (diferido)
   */
  cargarDatos(): void {
    this.estadoCarga.error = null;
    this.resetAnalysis();
    // Reset inventario para recargar con nuevas fechas
    this.inventarioData = { snapshot: null, movimientos: null };

    // 1. CARGA INMEDIATA - Datos críticos
    this.loadCoreData();

    // 2. CARGA DIFERIDA - Datos detallados
    this.loadDetailsData();

    // 3. CARGA DE MÓDULOS ESPECÍFICOS - Solo si están expandidos
    if (this.modulosExpandidos.ventas) {
      this.loadPedidosData();
    }
    if (this.modulosExpandidos.logistica) {
      this.loadLogisticaData();
    }
    if (this.modulosExpandidos.inventario) {
      this.loadInventarioData();
    }
  }

  // ✅ NUEVO: Método público para cargar datos a demanda
  cargarDatosManual(): void {
    console.log("📊 CARGANDO DATOS DEL DASHBOARD A DEMANDA");
    this.cargarDatos();
  }

  private loadCoreData(): void {
    this.estadoCarga.core = true;

    console.log(`🚀 Llamando endpoint: ${this.analyticsService.apiBaseUrl}/dashboard-core`);
    console.log(`📅 Parámetros: fechaInicio=${this.fechaInicial}, fechaFin=${this.fechaFinal}`);

    this.analyticsService
      .getDashboardCore(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.coreData = data;
          this.procesarDatosCore(data);
          this.estadoCarga.core = false;
          console.log('✅ Core data loaded:', data);
        },
        error: (error) => {
          console.error('❌ Error loading core data:', error);
          console.error('🔍 URL llamada:', `${this.analyticsService.apiBaseUrl}/dashboard-core`);
          
          // Manejo específico de errores de autenticación
          if (error.status === 401) {
            this.estadoCarga.error = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
            console.error('🔐 Error 401: Token de autenticación inválido o expirado');
            
            // Opcional: Redirigir al login automáticamente
            // this.router.navigate(['/login']);
          } else if (error.status === 403) {
            this.estadoCarga.error = 'No tienes permisos para acceder a esta información.';
          } else if (error.status === 0) {
            this.estadoCarga.error = 'No se puede conectar al servidor. Verificar conexión.';
          } else {
            this.estadoCarga.error = 'Error cargando datos principales. Usando datos de respaldo...';
          }
          
          this.estadoCarga.core = false;
          
          // Solo usar fallback si no es un error de autenticación
          if (error.status !== 401 && error.status !== 403) {
            this.loadFallbackData();
          }
        }
      });
  }

  private loadPedidosData(): void {
    this.estadoCarga.pedidos = true;

    console.log(`🚀 Cargando datos de pedidos...`);

    // Cargar flujo de estados
    this.analyticsService
      .getPedidosFlujoEstados(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedidosData.flujoEstados = data;
          console.log('✅ Datos de flujo de estados cargados:', data);
          this.renderPedidosCharts();
        },
        error: (error) => {
          console.error('❌ Error loading pedidos flujo estados:', error);
        }
      });

    // Cargar tiempos de procesamiento
    this.analyticsService
      .getPedidosTiemposProcesamiento(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedidosData.tiemposProcesamiento = data;
          console.log('✅ Datos de tiempos de procesamiento cargados:', data);
          this.estadoCarga.pedidos = false;
        },
        error: (error) => {
          console.error('❌ Error loading pedidos tiempos procesamiento:', error);
          this.estadoCarga.pedidos = false;
        }
      });
  }

  private loadLogisticaData(): void {
    this.estadoCarga.logistica = true;

    console.log(`🚀 Cargando datos de logística...`);

    // Cargar performance de entregas
    this.analyticsService
      .getLogisticaPerformanceEntregas(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.logisticaData.performanceEntregas = data;
          console.log('✅ Datos de performance de entregas cargados:', data);
          this.renderLogisticaCharts();
        },
        error: (error) => {
          console.error('❌ Error loading logistica performance entregas:', error);
        }
      });

    // Cargar análisis geográfico
    this.analyticsService
      .getLogisticaAnalisisGeografico(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.logisticaData.analisisGeografico = data;
          console.log('✅ Datos de análisis geográfico cargados:', data);
          this.estadoCarga.logistica = false;
        },
        error: (error) => {
          console.error('❌ Error loading logistica analisis geografico:', error);
          this.estadoCarga.logistica = false;
        }
      });
  }

  private loadDetailsData(): void {
    this.estadoCarga.details = true;

    console.log(`🚀 Llamando endpoint: ${this.analyticsService.apiBaseUrl}/dashboard-details`);
    console.log(`📅 Parámetros: fechaInicio=${this.fechaInicial}, fechaFin=${this.fechaFinal}`);

    this.analyticsService
      .getDashboardDetails(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.detailsData = data;
          this.procesarDatosDetails(data);
          this.estadoCarga.details = false;
          console.log('✅ Details data loaded:', data);
        },
        error: (error) => {
          console.error('❌ Error loading details data:', error);
          console.error('🔍 URL llamada:', `${this.analyticsService.apiBaseUrl}/dashboard-details`);
          
          // Manejo específico de errores de autenticación
          if (error.status === 401) {
            console.error('🔐 Error 401 en details: Token de autenticación inválido o expirado');
          } else if (error.status === 403) {
            console.error('🚫 Error 403 en details: Sin permisos para acceder a datos detallados');
          } else if (error.status === 0) {
            console.error('🌐 Error de conexión en details: No se puede conectar al servidor');
          }
          
          this.estadoCarga.details = false;
          // Los detalles no son críticos, continuar sin ellos
        }
      });
  }

  /**
   * Procesa los datos críticos y renderiza gráficos inmediatos
   */
  private procesarDatosCore(data: DashboardCoreResponse): void {
    // Convertir datos para compatibilidad con gráficos existentes
    this.topVentasPorDia = this.convertVentasPorDia(data.ventasPorPeriodo);
    
    // 🆕 Log de las nuevas métricas
    this.logNuevasMetricas();
    
    // Asegurar que el DOM esté listo antes de renderizar
    this.waitForDOMAndRender(() => this.renderVentasChart());
  }

  /**
   * Procesa los datos detallados y renderiza gráficos diferidos
   */
  private procesarDatosDetails(data: DashboardDetailsResponse): void {
    // Convertir datos para compatibilidad
    this.topProductsMasVendidos = data.productosTop || [];
    
    // Simular datos de menos vendidos (si no vienen en la nueva API)
    this.topProductosMenosVendidos = data.productosTop?.slice().reverse() || [];

    // Renderizar todos los gráficos detallados
    this.waitForDOMAndRender(() => this.renderDetailCharts());
  }

  /**
   * Convertir formato de ventas por período para compatibilidad
   */
  private convertVentasPorDia(ventasPorPeriodo: any[]): any {
    const converted: any = {};
    ventasPorPeriodo?.forEach(venta => {
      converted[venta.fecha] = {
        totalVentas: venta.ventas,
        pedidos: venta.pedidos
      };
    });
    return converted;
  }

  /**
   * FALLBACK: Usar servicios legacy si falla la nueva API
   */
  private loadFallbackData(): void {
    console.log('🔄 Loading fallback data from legacy services...');
    
    const requests = [
      this.ventasService.getTop10ProductosMasVendidos(),
      this.ventasService.getTop10ProductosMenosVendidos(),
      this.ventasService.getTopVentasPorDiaEntreFechas(this.fechaInicial, this.fechaFinal)
    ];

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([masVendidos, menosVendidos, ventasPorDia]) => {
        this.topProductsMasVendidos = masVendidos || [];
        this.topProductosMenosVendidos = menosVendidos || [];
        this.topVentasPorDia = ventasPorDia || {};
        
          this.renderAllChartsLegacy();
          console.log('✅ Fallback data loaded successfully');
        },
        error: (error) => {
          console.error('❌ Error loading fallback data:', error);
          this.estadoCarga.error = 'Error crítico cargando datos. Por favor, recarga la página.';
        }
      });
  }

  // === RENDERIZADO DE GRÁFICOS ===

  private renderVentasChart(): void {
    if (!this.topVentasPorDia || Object.keys(this.topVentasPorDia).length === 0) {
      console.warn('No hay datos para el gráfico de ventas');
      return;
    }

    const categories = Object.keys(this.topVentasPorDia);
    const seriesData = categories.map(key => this.topVentasPorDia[key]?.totalVentas || 0);

    this.ventasChartOption = {
      textStyle: {
        color: '#1f2937',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#1f2937',
          fontSize: 13
        },
        formatter: (params: any) => {
          const data = params[0];
          return `<strong>${data.name}</strong><br/>Ventas: $${data.value.toLocaleString('es-CO')}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories.reverse(),
        axisLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (value: number) => '$' + Math.floor(value / 1000) + 'K'
        }
      },
      series: [{
        name: 'Ventas',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#0078d4',
          width: 3
        },
        itemStyle: {
          color: '#0078d4'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 120, 212, 0.3)' },
              { offset: 1, color: 'rgba(0, 120, 212, 0.05)' }
            ]
          }
        },
        data: seriesData.reverse()
      }]
    };

    console.log('✅ Gráfico de ventas configurado con ECharts');
  }

  private renderDetailCharts(): void {
    this.renderTopProductsCharts();
    this.renderCategoriasChart();
    this.renderMetodosPagoChart();
  }

  private renderTopProductsCharts(): void {
    // Productos Más Vendidos
    if (this.topProductsMasVendidos.length > 0) {
      const productNames = this.topProductsMasVendidos.map(p => p.nombre || p.referencia || 'Sin nombre');
      const productData = this.topProductsMasVendidos.map(p => p.cantidadVendida || 0);

      this.topProductosChartOption = {
        textStyle: {
          color: '#1f2937',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          textStyle: {
            color: '#1f2937',
            fontSize: 13
          },
          formatter: (params: any) => {
            const data = params[0];
            return `<strong>${data.name}</strong><br/>Unidades: ${data.value}`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: productNames,
          axisLine: {
            lineStyle: {
              color: '#e2e8f0'
            }
          },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          axisLine: {
            show: false
          },
          splitLine: {
            lineStyle: {
              color: '#e2e8f0',
              type: 'dashed'
            }
          },
          axisLabel: {
            color: '#64748b',
            fontSize: 11
          }
        },
        series: [{
          name: 'Unidades Vendidas',
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            color: '#107c10',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#0b5c0c'
            }
          },
          data: productData
        }]
      };

      console.log('✅ Gráfico de productos más vendidos configurado');
    }

    // Productos Menos Vendidos
    if (this.topProductosMenosVendidos.length > 0) {
      const productNames = this.topProductosMenosVendidos.map(p => p.nombre || p.referencia || 'Sin nombre');
      const productData = this.topProductosMenosVendidos.map(p => p.cantidadVendida || 0);

      this.menosVendidosChartOption = {
        textStyle: {
          color: '#1f2937',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          textStyle: {
            color: '#1f2937',
            fontSize: 13
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: productNames,
          show: false
        },
        yAxis: {
          type: 'value',
          axisLine: {
            show: false
          },
          splitLine: {
            lineStyle: {
              color: '#e2e8f0',
              type: 'dashed'
            }
          },
          axisLabel: {
            color: '#64748b',
            fontSize: 11
          }
        },
        series: [{
          name: 'Unidades',
          type: 'bar',
          barWidth: '50%',
          itemStyle: {
            color: '#ffb900',
            borderRadius: [4, 4, 0, 0]
          },
          data: productData
        }]
      };

      console.log('✅ Gráfico de productos menos vendidos configurado');
    }
  }

  private renderCategoriasChart(): void {
    if (!this.detailsData?.categorias || this.detailsData.categorias.length === 0) {
      console.log('No hay datos de categorías para renderizar');
      return;
    }

    const chartData = this.detailsData.categorias.map(c => ({
      name: c.categoria,
      value: c.porcentaje
    }));

    this.categoriasChartOption = {
      textStyle: {
        color: '#1f2937',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#1f2937',
          fontSize: 13
        },
        formatter: (params: any) => {
          const categoria = this.detailsData!.categorias[params.dataIndex];
          return `<strong>${params.name}</strong><br/>` +
                 `Ventas: $${categoria.ventas.toLocaleString('es-CO')}<br/>` +
                 `Productos: ${categoria.cantidad}<br/>` +
                 `Porcentaje: ${params.percent.toFixed(1)}%`;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: '0%',
        textStyle: {
          color: '#1f2937',
          fontSize: 11
        }
      },
      series: [{
        name: 'Categorías',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData,
        color: ['#0078d4', '#107c10', '#ffb900', '#d13438', '#00b7c3', '#8764b8']
      }]
    };

    console.log('✅ Gráfico de categorías configurado');
  }

  private renderMetodosPagoChart(): void {
    if (!this.detailsData?.metodosPago || this.detailsData.metodosPago.length === 0) {
      console.log('No hay datos de métodos de pago para renderizar');
      return;
    }

    const chartData = this.detailsData.metodosPago.map(m => ({
      name: m.metodo,
      value: m.porcentaje
    }));

    this.metodosPagoChartOption = {
      textStyle: {
        color: '#1f2937',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#1f2937',
          fontSize: 13
        },
        formatter: (params: any) => {
          const metodo = this.detailsData!.metodosPago[params.dataIndex];
          return `<strong>${params.name}</strong><br/>` +
                 `Transacciones: ${metodo.cantidad}<br/>` +
                 `Porcentaje: ${params.percent.toFixed(1)}%`;
        }
      },
      legend: {
        orient: 'vertical',
        right: '10%',
        top: 'center',
        textStyle: {
          color: '#1f2937',
          fontSize: 11
        }
      },
      series: [{
        name: 'Métodos de Pago',
        type: 'pie',
        radius: '65%',
        center: ['40%', '50%'],
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        },
        data: chartData,
        color: ['#0078d4', '#107c10', '#ffb900', '#d13438', '#00b7c3', '#8764b8']
      }]
    };

    console.log('✅ Gráfico de métodos de pago configurado');
  }

  private renderAllChartsLegacy(): void {
    setTimeout(() => {
      this.renderVentasChart();
      this.renderTopProductsCharts();
    }, 300);
  }

  /**
   * Espera a que el DOM esté listo y ejecuta una función de renderizado
   */
  private waitForDOMAndRender(renderFunction: () => void): void {
    // Usar requestAnimationFrame para asegurar que el DOM esté completamente renderizado
    requestAnimationFrame(() => {
      setTimeout(() => {
        renderFunction();
      }, 100);
    });
  }

  // === GESTIÓN DE ACORDEÓN ===

  /**
   * Alterna el estado de expansión/contracción de un módulo
   */
  toggleModule(modulo: 'ventas' | 'logistica' | 'inventario' | 'produccion' | 'financiero'): void {
    console.log(`🎯 Toggling módulo: ${modulo}`);
    
    // Verificar si el módulo está habilitado
    if (!this.modulosHabilitados[modulo]) {
      console.warn(`⚠️ El módulo ${modulo} no está habilitado para este rol`);
      return;
    }

    // Alternar el estado
    this.modulosExpandidos[modulo] = !this.modulosExpandidos[modulo];
    
    console.log(`📊 Estado actual de módulos:`, this.modulosExpandidos);

    // Opcional: Guardar preferencias del usuario en localStorage
    this.guardarPreferenciasAcordeon();

    // Si se está expandiendo un módulo con gráficos, asegurar que se rendericen
    if (this.modulosExpandidos[modulo]) {
      this.rerenderChartsIfNeeded(modulo);
    }
  }

  /**
   * Colapsa todos los módulos excepto el especificado
   */
  collapseAllExcept(moduloActivo?: string): void {
    Object.keys(this.modulosExpandidos).forEach(modulo => {
      this.modulosExpandidos[modulo] = modulo === moduloActivo;
    });
    this.guardarPreferenciasAcordeon();
  }

  /**
   * Expande todos los módulos habilitados
   */
  expandAll(): void {
    Object.keys(this.modulosExpandidos).forEach(modulo => {
      if (this.modulosHabilitados[modulo]) {
        this.modulosExpandidos[modulo] = true;
      }
    });
    this.guardarPreferenciasAcordeon();
    
    // Re-renderizar todos los gráficos después de un breve delay
    setTimeout(() => {
      this.renderAllChartsLegacy();
    }, 300);
  }

  /**
   * Colapsa todos los módulos
   */
  collapseAll(): void {
    Object.keys(this.modulosExpandidos).forEach(modulo => {
      this.modulosExpandidos[modulo] = false;
    });
    this.guardarPreferenciasAcordeon();
  }

  /**
   * Guarda las preferencias del acordeón en localStorage
   */
  private guardarPreferenciasAcordeon(): void {
    try {
      const preferencias = {
        modulosExpandidos: this.modulosExpandidos,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('dashboard_accordion_preferences', JSON.stringify(preferencias));
      console.log('💾 Preferencias de acordeón guardadas:', preferencias);
    } catch (error) {
      console.warn('⚠️ No se pudieron guardar las preferencias del acordeón:', error);
    }
  }

  /**
   * Carga las preferencias del acordeón desde localStorage
   */
  private cargarPreferenciasAcordeon(): void {
    try {
      const preferenciasSaved = localStorage.getItem('dashboard_accordion_preferences');
      if (preferenciasSaved) {
        const preferencias = JSON.parse(preferenciasSaved);
        
        // Verificar que las preferencias no sean muy antiguas (más de 7 días)
        const timestamp = new Date(preferencias.timestamp);
        const ahora = new Date();
        const diasDiferencia = (ahora.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diasDiferencia <= 7) {
          this.modulosExpandidos = { ...this.modulosExpandidos, ...preferencias.modulosExpandidos };
          console.log('📂 Preferencias de acordeón cargadas:', this.modulosExpandidos);
    } else {
          console.log('🗑️ Preferencias de acordeón expiradas, usando valores por defecto');
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar las preferencias del acordeón:', error);
    }
  }

  /**
   * Re-renderiza gráficos si es necesario después de expandir un módulo
   */
  private rerenderChartsIfNeeded(modulo: string): void {
    setTimeout(() => {
      switch (modulo) {
        case 'ventas':
          this.renderVentasChart();
          this.renderTopProductsCharts();
          this.renderCategoriasChart();
          this.renderMetodosPagoChart();
          // Cargar datos de pedidos si no están cargados
          if (!this.pedidosData.flujoEstados && !this.estadoCarga.pedidos) {
            this.loadPedidosData();
          } else {
            this.renderPedidosCharts();
          }
          break;
        case 'logistica':
          // Cargar datos de logística si no están cargados
          if (!this.logisticaData.performanceEntregas && !this.estadoCarga.logistica) {
            this.loadLogisticaData();
          } else {
            this.renderLogisticaCharts();
          }
          break;
        case 'inventario':
          if (!this.inventarioData.snapshot && !this.estadoCarga.inventario) {
            this.loadInventarioData();
          } else {
            this.renderInventarioCharts();
          }
          break;
        case 'produccion':
        case 'financiero':
          break;
      }
    }, 300); // Dar tiempo para que la animación CSS termine
  }

  /**
   * Renderiza gráficos específicos del módulo de pedidos
   */
  private renderPedidosCharts(): void {
    if (!this.pedidosData.flujoEstados) return;

    console.log('📊 Renderizando gráficos de pedidos...');
    
    // Aquí se implementarían los gráficos de flujo de estados
    // Por ahora solo loggeamos los datos para debug
    console.log('📈 Datos de flujo de estados disponibles:', this.pedidosData.flujoEstados);
    
    // TODO: Implementar gráficos de:
    // - Distribución de estados (donut chart)
    // - Tiempos promedio por estado (bar chart)
    // - Cuellos de botella (funnel chart)
  }

  /**
   * Renderiza gráficos específicos del módulo de logística
   */
  private renderLogisticaCharts(): void {
    if (!this.logisticaData.performanceEntregas) return;
    console.log('📈 Datos logística disponibles:', this.logisticaData.performanceEntregas);
  }

  private loadInventarioData(): void {
    this.estadoCarga.inventario = true;

    this.analyticsService.getInventarioSnapshot()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.inventarioData.snapshot = data;
          this.renderInventarioCharts();
        },
        error: (e) => console.error('❌ Error cargando snapshot inventario:', e)
      });

    this.analyticsService.getInventarioMovimientos(this.fechaInicial, this.fechaFinal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.inventarioData.movimientos = data;
          this.estadoCarga.inventario = false;
          this.renderInventarioMovimientosChart();
        },
        error: (e) => {
          console.error('❌ Error cargando movimientos inventario:', e);
          this.estadoCarga.inventario = false;
        }
      });
  }

  private renderInventarioCharts(): void {
    const bodegas = this.inventarioData.snapshot?.distribucionBodegas;
    if (!bodegas?.length) return;

    this.inventarioBodegasChartOption = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} uds ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: bodegas.map(b => ({ name: b.nombre, value: b.unidades })),
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold' } }
      }]
    };
  }

  private renderInventarioMovimientosChart(): void {
    const tendencia = this.inventarioData.movimientos?.tendenciaDiaria;
    if (!tendencia?.length) return;

    this.inventarioMovimientosChartOption = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Ingresos', 'Salidas'] },
      xAxis: { type: 'category', data: tendencia.map(d => d.fecha), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value', name: 'Unidades' },
      series: [
        { name: 'Ingresos', type: 'bar', data: tendencia.map(d => d.ingresos), color: '#00E396', stack: 'total' },
        { name: 'Salidas', type: 'bar', data: tendencia.map(d => d.salidas), color: '#FF4560', stack: 'total' }
      ]
    };
  }

  // === EVENTOS DE UI ===

  firstEvent(ev: any): void {
    if (ev > this.fechaFinal) {
      this.fechaFinal = ev;
      this.cargarDatos();
    }
  }

  secondEvent(ev: any): void {
    if (ev < this.fechaInicial) {
      this.fechaInicial = ev;
      this.cargarDatos();
    }
  }

  // === K.A.I. ANALYSIS (mantener funcionalidad existente) ===

  analizar(tipo: string): void {
    switch (tipo) {
      case 'VentasMes':
        this.analizarVentasMes();
        break;
    }
  }

  private analizarVentasMes(): void {
    console.log('Analizando ventas con K.A.I.');
    
    this.resetAnalysis();
        this.isAnalyzing = true;

        const item = {
          "startDate": this.fechaInicial + 'T00:00:00.000Z',
          "endDate": this.fechaFinal + 'T23:59:59.000Z',
          "tipo": "ventas"
    };

    this.katuqintelligenceService.getAnalitycsGraphs(item)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          try {
            console.log('Respuesta K.A.I.:', data);
              
              let valor = data.result;
              
              if (valor.includes('```json')) {
                valor = valor.replace(/```json/g, '').replace(/```/g, '').trim();
              }
              
              if (valor.startsWith('{') || valor.startsWith('[')) {
                const parsedData = JSON.parse(valor);
                valor = parsedData.respuesta || parsedData.resultado || valor;
              }
              
            this.ventasRes = this.formatAnalysisHTML(valor);
              this.ventasMesCheck = true;
              
            } catch (error) {
            console.error('Error procesando respuesta K.A.I.:', error);
              this.ventasRes = '<p class="text-danger">Error al procesar el análisis. Por favor, intenta nuevamente.</p>';
              this.ventasMesCheck = true;
            } finally {
              this.isAnalyzing = false;
            }
          },
        error: (error) => {
          console.error('Error en petición K.A.I.:', error);
            this.ventasRes = '<p class="text-danger">Error al obtener el análisis. Verifica tu conexión e intenta nuevamente.</p>';
            this.ventasMesCheck = true;
            this.isAnalyzing = false;
          }
      });
  }

  private resetAnalysis(): void {
    this.ventasMesCheck = false;
    this.ventasRes = '';
    this.isAnalyzing = false;
  }

  private formatAnalysisHTML(content: string): string {
    if (!content) return '<p>No se pudo generar el análisis.</p>';
    
    if (content.includes('<') && content.includes('>')) {
      return content
        .replace(/<h1>/g, '<h4>')
        .replace(/<\/h1>/g, '</h4>')
        .replace(/<h2>/g, '<h4>')
        .replace(/<\/h2>/g, '</h4>')
        .replace(/<h3>/g, '<h5>')
        .replace(/<\/h3>/g, '</h5>');
    }
    
    let formattedContent = content;
    
    formattedContent = formattedContent.replace(/^# (.*$)/gm, '<h4>$1</h4>');
    formattedContent = formattedContent.replace(/^## (.*$)/gm, '<h5>$1</h5>');
    formattedContent = formattedContent.replace(/^### (.*$)/gm, '<h6>$1</h6>');
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    const paragraphs = formattedContent.split('\n\n');
    formattedContent = paragraphs
      .filter(p => p.trim().length > 0)
      .map(p => {
        p = p.trim();
        if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol')) {
          return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
    
    return formattedContent || '<p>Análisis completado sin contenido específico.</p>';
  }

  // === ACTUALIZACIONES EN TIEMPO REAL ===

  private initializeRealTimeUpdates(): void {
    // Actualizar datos cada 5 minutos
    interval(300000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Actualizando datos automáticamente...');
        this.cargarDatos();
      });
  }

  // === MÉTODOS HELPER PARA EL TEMPLATE ===

  /**
   * Obtiene el color asociado a un estado de proceso
   */
  getColorByEstado(estado: any): string {
    if (!estado || typeof estado !== 'string') return COLORES_DEFAULT.primary;
    return COLORES_ESTADOS[estado as keyof typeof COLORES_ESTADOS] || COLORES_DEFAULT.primary;
  }

  /**
   * Obtiene el nombre amigable de un estado
   */
  getNombreEstadoAmigable(estado: any): string {
    if (!estado || typeof estado !== 'string') return 'Desconocido';
    return getNombreEstadoAmigable(estado as any);
  }

  /**
   * Calcula el porcentaje de progreso para un estado
   */
  calcularPorcentajeProgreso(estado: any): number {
    if (!estado || typeof estado !== 'string') return 0;
    return calcularPorcentajeProgreso(estado as any);
  }

  // === MÉTODOS LEGACY (mantener compatibilidad) ===

  renderCharts(): void {
    console.log('⚠️ renderCharts() is deprecated. Use new architecture methods.');
    this.renderAllChartsLegacy();
  }

  // Métodos que ya no se usan pero se mantienen por compatibilidad
  renderAllCharts(): void { this.renderAllChartsLegacy(); }
  renderRevenueChart(): void { /* Ya no se usa */ }
  renderGaugeChart(): void { /* Ya no se usa */ }
  renderProductMatrixChart(): void { /* Ya no se usa */ }
  clearFilter(): void { this.cargarDatos(); }
  onFechaChange(): void { this.cargarDatos(); }
  cambiarVista(vista: string): void { /* Ya no se usa */ }
  
  // Propiedades legacy
  vistaActual: string = 'diario';
  totalProductos: number = 0;
  productosBajoStock: number = 0;
  clientesUnicos: number = 0;
  clientesNuevos: number = 0;
  satisfaccionCliente: number = 85;
  cumplimientoDespachos: number = 92;

  /**
   * Verifica y muestra la configuración de endpoints para debugging
   */
  private verificarConfiguracionEndpoints(): void {
    console.log('\n=== 🔧 CONFIGURACIÓN DE ENDPOINTS ===');
    console.log(`Base URL: ${this.analyticsService.apiBaseUrl}`);
    console.log(`Core endpoint: ${this.analyticsService.apiBaseUrl}/dashboard-core`);
    console.log(`Details endpoint: ${this.analyticsService.apiBaseUrl}/dashboard-details`);
    console.log(`Environment URL API: ${(window as any).environment?.urlApi || 'No disponible'}`);
    
    // Verificar estado de autenticación
    this.verificarAutenticacion();
    console.log('=====================================\n');
  }

  /**
   * Configura qué módulos mostrar según el rol del usuario
   * Esta funcionalidad está preparada para futuras implementaciones
   */
  private configurarModulosPorRol(): void {
    console.log('\n=== 🎭 CONFIGURACIÓN POR ROL ===');
    
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        this.rolUsuario = user.rol || 'general';
        
        console.log(`👤 Rol detectado: ${this.rolUsuario}`);
        
        // Configuración futura por roles específicos
        switch (this.rolUsuario.toLowerCase()) {
          case 'vendedor':
          case 'comercial':
            this.modulosHabilitados = { ventas: true, logistica: false, inventario: false, produccion: false, financiero: false };
            break;
          case 'logistica':
          case 'despachos':
            this.modulosHabilitados = { ventas: true, logistica: true, inventario: false, produccion: false, financiero: false };
            break;
          case 'produccion':
          case 'inventario':
            this.modulosHabilitados = { ventas: false, logistica: true, inventario: true, produccion: true, financiero: false };
            break;
          case 'admin':
          case 'administrador':
          case 'gerente':
          default:
            this.modulosHabilitados = { ventas: true, logistica: true, inventario: true, produccion: true, financiero: true };
            break;
        }
        
        console.log('✅ Módulos habilitados:', this.modulosHabilitados);
        
      } else {
        console.warn('⚠️ No se encontró usuario, usando configuración por defecto');
      }
    } catch (error) {
      console.error('❌ Error configurando módulos por rol:', error);
      // Fallback: habilitar todos los módulos
      this.modulosHabilitados = { ventas: true, logistica: true, inventario: true, produccion: true, financiero: true };
    }
    
    console.log('============================\n');
  }

  /**
   * Verifica el estado de autenticación actual
   */
  private verificarAutenticacion(): void {
    console.log('\n=== 👤 ESTADO DE AUTENTICACIÓN ===');
    
    const userString = localStorage.getItem('user');
    if (!userString) {
      console.error('❌ No hay usuario en localStorage');
      this.estadoCarga.error = 'No hay sesión activa. Por favor, inicia sesión.';
      return;
    }

    try {
      const user = JSON.parse(userString);
      console.log('✅ Usuario encontrado:', {
        email: user.email,
        company: user.company,
        rol: user.rol,
        hasToken: !!user.token,
        tokenLength: user.token ? user.token.length : 0,
        tokenPreview: user.token ? user.token.substring(0, 20) + '...' : 'N/A'
      });

      // Verificar si el token parece válido
      if (!user.token || user.token.length < 10) {
        console.error('❌ Token inválido o muy corto');
        this.estadoCarga.error = 'Token de autenticación inválido. Por favor, inicia sesión nuevamente.';
        return;
      }

      // Verificar tiempo de login
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime) {
        const loginDate = new Date(parseInt(loginTime));
        const now = new Date();
        const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
        console.log(`⏰ Horas desde el login: ${hoursSinceLogin.toFixed(2)}`);
        
        if (hoursSinceLogin > 24) {
          console.warn('⚠️ Sesión probablemente expirada (más de 24 horas)');
        }
      }

    } catch (error) {
      console.error('❌ Error al parsear usuario:', error);
      this.estadoCarga.error = 'Error en datos de sesión. Por favor, inicia sesión nuevamente.';
    }
    
    console.log('================================\n');
  }

  // ============================================================================
  // 🆕 MÉTODOS HELPER PARA NUEVAS MÉTRICAS
  // ============================================================================

  /**
   * Calcula el total de ventas de todos los canales
   */
  getTotalVentasCanales(): number {
    return this.canalesData.reduce((total, canal) => total + canal.ventas, 0);
  }

  /**
   * Obtiene el porcentaje de participación de un canal
   */
  getPorcentajeCanal(canal: TicketPromedioCanal): number {
    const total = this.getTotalVentasCanales();
    return total > 0 ? (canal.ventas / total) * 100 : 0;
  }

  /**
   * Formatea el nombre del vendedor para mostrar
   */
  formatVendedorName(email: string): string {
    return email.split('@')[0].replace('.', ' ').toUpperCase();
  }

  /**
   * Obtiene el color para cada canal (para gráficos)
   */
  getChannelColor(index: number): string {
    const colors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];
    return colors[index % colors.length];
  }

  /**
   * Verifica si un canal supera el ticket promedio general
   */
  isChannelAboveAverage(canal: TicketPromedioCanal): boolean {
    return canal.ticketPromedio > this.promedioTicket;
  }

  /**
   * Obtiene estadísticas adicionales de canales
   */
  getChannelStats() {
    const canales = this.canalesData;
    if (!canales.length) return null;

    return {
      totalCanales: canales.length,
      ticketMasAlto: Math.max(...canales.map(c => c.ticketPromedio)),
      ticketMasBajo: Math.min(...canales.map(c => c.ticketPromedio)),
      promedioVentasPorCanal: this.getTotalVentasCanales() / canales.length
    };
  }

  /**
   * Log de las nuevas métricas para debugging
   */
  private logNuevasMetricas(): void {
    if (this.coreData) {
      console.log('📊 === NUEVAS MÉTRICAS ===');
      console.log('🏪 Canales:', this.canalesData);
      console.log('👥 Vendedores:', this.vendedoresData);
      console.log('🏆 Canal más rentable:', this.canalMasRentable);
      console.log('⭐ Vendedor top:', this.vendedorTop);
      console.log('📈 Stats canales:', this.getChannelStats());
      console.log('========================');
    }
  }

  // === TOUR METHODS ===

  private initializeDashboardTour(): void {
    // Solo inicializar el tour si no se ha completado antes y hay datos cargados
    if (!this.estadoCarga.core && !this.estadoCarga.error) {
      // Hide the welcome banner if user has already seen the tour
      this.hideWelcomeBannerIfTourCompleted();
    }
  }

  startDashboardTour(): void {
    this.tourService.startTour('dashboard', this.tourService.getDashboardTour());
    // Hide banner after starting tour
    this.hideWelcomeBanner();
  }

  resetTours(): void {
    this.tourService.resetTours();
    // Show the welcome banner again
    this.showWelcomeBanner();
    console.log('Tours reiniciados. Recarga la página para ver los tours nuevamente.');
  }

  private hideWelcomeBannerIfTourCompleted(): void {
    const completedTours = JSON.parse(localStorage.getItem('katuq_completed_tours') || '[]');
    if (completedTours.includes('dashboard')) {
      this.hideWelcomeBanner();
    }
  }

  private hideWelcomeBanner(): void {
    setTimeout(() => {
      const banner = document.getElementById('tour-welcome-banner');
      if (banner) {
        banner.style.display = 'none';
      }
    }, 100);
  }

  private showWelcomeBanner(): void {
    setTimeout(() => {
      const banner = document.getElementById('tour-welcome-banner');
      if (banner) {
        banner.style.display = 'block';
      }
    }, 100);
  }
}
