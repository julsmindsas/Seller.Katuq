import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { forkJoin, interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { KatuqintelligenceService } from '../../shared/services/katuqintelligence/katuqintelligence.service';
import { AnalyticsService } from '../../shared/services/dashboard/analytics.service';
import { 
  DashboardCoreResponse, 
  DashboardDetailsResponse,
  FlujoEstadosResponse,
  TiemposProcesamientoResponse,
  PerformanceEntregasResponse,
  AnalisisGeograficoResponse,
  EstadoCarga,
  COLORES_DEFAULT,
  COLORES_ESTADOS,
  getNombreEstadoAmigable,
  calcularPorcentajeProgreso
} from './model/dashboard-interfaces';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // === Estados de carga según nueva arquitectura ===
  estadoCarga: EstadoCarga = {
    core: true,
    details: true,
    pedidos: false,
    logistica: false,
    error: null
  };

  // === Configuración de módulos por rol ===
  modulosHabilitados = {
    ventas: true,
    logistica: true,
    produccion: true,
    financiero: true
  };

  // === Estado de expansión de módulos (acordeón) ===
  modulosExpandidos = {
    ventas: true,      // Módulo de ventas expandido por defecto
    logistica: false,  // Otros módulos contraídos por defecto
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

  // === Datos legacy (mantener compatibilidad) ===
  topProductsMasVendidos: any[] = [];
  topProductosMenosVendidos: any[] = [];
  topVentasPorDia: any = {};

  // === Configuración de fechas ===
  fechaInicial: string;
  fechaFinal: string;

  // === Charts ===
  chartVentasMes: ApexCharts | null = null;
  chartMasVendidos: ApexCharts | null = null;
  chartMenosVendidos: ApexCharts | null = null;
  chartCategorias: ApexCharts | null = null;
  chartMetodosPago: ApexCharts | null = null;

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

  get tasaConversion(): number {
    return this.coreData?.kpis?.tasaConversion || 0;
  }

  get pedidosAprobados(): number {
    return this.coreData?.kpis?.pedidosAprobados || 0;
  }

  constructor(
    private ventasService: VentasService,
    private katuqintelligenceService: KatuqintelligenceService,
    private analyticsService: AnalyticsService
  ) {
    this.initializeDates();
  }

  ngOnInit(): void {
    this.verificarConfiguracionEndpoints();
    this.configurarModulosPorRol();
    this.cargarPreferenciasAcordeon();
    this.cargarDatos();
    this.initializeRealTimeUpdates();
  }

  ngAfterViewInit(): void {
    // Los gráficos se renderizan cuando lleguen los datos
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
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

    const chartContainer = document.querySelector("#chart3");
    if (!chartContainer) {
      console.error('Contenedor #chart3 no encontrado para gráfico de ventas');
      // Reintentar en 500ms más
      setTimeout(() => this.renderVentasChart(), 500);
      return;
    }

    const categories = Object.keys(this.topVentasPorDia);
    const seriesData = categories.map(key => this.topVentasPorDia[key]?.totalVentas || 0);

    if (this.chartVentasMes) {
      this.chartVentasMes.destroy();
      this.chartVentasMes = null;
    }

    const options = {
      chart: {
        type: 'area',
        height: 350,
        toolbar: { 
          show: true,
          tools: {
            download: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        animations: { 
          enabled: true, 
          easing: 'easeinout', 
          speed: 1200,
          animateGradually: {
            enabled: true,
            delay: 150
          }
        },
        background: 'transparent'
      },
      series: [{
        name: 'Total Ventas',
        data: seriesData,
      }],
      xaxis: {
        categories,
        reversed: true,
        labels: { 
          style: { 
            colors: '#64748b',
            fontSize: '12px',
            fontWeight: 500
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => '$' + Math.floor(value / 1000) + 'K',
          style: { 
            colors: '#64748b',
            fontSize: '12px',
            fontWeight: 500
          }
        }
      },
      stroke: { 
        curve: 'smooth', 
        width: 4,
        lineCap: 'round'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.8,
          opacityTo: 0.1,
          stops: [0, 90, 100],
          colorStops: [
            {
              offset: 0,
              color: COLORES_DEFAULT.primary,
              opacity: 0.8
            },
            {
              offset: 100,
              color: COLORES_DEFAULT.secondary,
              opacity: 0.1
            }
          ]
        }
      },
      colors: [COLORES_DEFAULT.primary],
      tooltip: { 
        theme: 'light',
        style: {
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif'
        },
        y: { 
          formatter: (value: number) => '$' + value.toLocaleString('es-CO'),
          title: {
            formatter: () => 'Ventas: '
          }
        },
        marker: {
          show: true
        }
      },
      grid: { 
        borderColor: '#e2e8f0', 
        strokeDashArray: 3,
      xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      dataLabels: {
        enabled: false
      }
    };

    try {
      this.chartVentasMes = new ApexCharts(chartContainer, options);
      this.chartVentasMes.render();
      console.log('✅ Gráfico de ventas renderizado exitosamente');
    } catch (error) {
      console.error('❌ Error renderizando gráfico de ventas:', error);
    }
  }

  private renderDetailCharts(): void {
    this.renderTopProductsCharts();
    this.renderCategoriasChart();
    this.renderMetodosPagoChart();
  }

  private renderTopProductsCharts(): void {
    // Productos Más Vendidos
    if (this.topProductsMasVendidos.length > 0) {
      const chart2Container = document.querySelector('#chart2');
      if (!chart2Container) {
        console.error('Contenedor #chart2 no encontrado para gráfico de productos más vendidos');
        return;
      }

      if (this.chartMasVendidos) {
        this.chartMasVendidos.destroy();
        this.chartMasVendidos = null;
      }

      try {
        this.chartMasVendidos = new ApexCharts(chart2Container, {
          chart: { 
            type: 'bar', 
            height: 350, 
            toolbar: { 
              show: true,
              tools: {
                download: true,
                zoom: false,
                pan: false
              }
            },
            animations: {
              enabled: true,
              easing: 'easeinout',
              speed: 800,
              animateGradually: {
                enabled: true,
                delay: 150
              }
            }
          },
          colors: [COLORES_DEFAULT.tertiary, COLORES_DEFAULT.primary, COLORES_DEFAULT.secondary],
          series: [{
            name: 'Unidades Vendidas',
            data: this.topProductsMasVendidos.map(p => p.cantidadVendida || 0),
          }],
          xaxis: {
            categories: this.topProductsMasVendidos.map(p => p.nombre || p.referencia || 'Sin nombre'),
        labels: {
              show: true,
              rotate: -45,
              style: {
                colors: '#64748b',
                fontSize: '11px',
                fontWeight: 500
              },
              maxHeight: 60
            },
            axisBorder: {
              show: false
            },
            axisTicks: {
              show: false
        }
      },
      yaxis: {
        labels: {
              style: {
                colors: '#64748b',
                fontSize: '12px',
                fontWeight: 500
              }
            }
          },
          plotOptions: { 
            bar: { 
              borderRadius: 8, 
              distributed: true,
              horizontal: false,
              columnWidth: '75%',
              borderRadiusApplication: 'end'
        }
      },
      tooltip: {
            theme: 'light',
            style: {
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif'
            },
            y: {
              formatter: (value: number) => value + ' unidades',
              title: {
                formatter: () => 'Vendidas: '
              }
        }
      },
      grid: {
            borderColor: '#e2e8f0',
            strokeDashArray: 3,
            yaxis: {
              lines: {
                show: true
              }
            },
            xaxis: {
              lines: {
                show: false
              }
            }
          },
          dataLabels: {
            enabled: false
          }
        });
        this.chartMasVendidos.render();
        console.log('✅ Gráfico de productos más vendidos renderizado');
      } catch (error) {
        console.error('❌ Error renderizando gráfico de productos más vendidos:', error);
      }
    }

    // Productos Menos Vendidos
    if (this.topProductosMenosVendidos.length > 0) {
      const chart1Container = document.querySelector('#chart1');
      if (!chart1Container) {
        console.error('Contenedor #chart1 no encontrado para gráfico de productos menos vendidos');
        return;
      }

      if (this.chartMenosVendidos) {
        this.chartMenosVendidos.destroy();
        this.chartMenosVendidos = null;
      }

      try {
        this.chartMenosVendidos = new ApexCharts(chart1Container, {
          chart: { type: 'bar', height: 200, toolbar: { show: false } },
          colors: [COLORES_DEFAULT.quaternary],
          series: [{
            name: 'Menos Vendidos',
            data: this.topProductosMenosVendidos.map(p => p.cantidadVendida || 0),
          }],
          xaxis: {
            categories: this.topProductosMenosVendidos.map(p => p.nombre || p.referencia || 'Sin nombre'),
            labels: { show: false }
          },
          plotOptions: { bar: { borderRadius: 4, distributed: true } },
          tooltip: { theme: 'dark' },
        });
        this.chartMenosVendidos.render();
        console.log('✅ Gráfico de productos menos vendidos renderizado');
      } catch (error) {
        console.error('❌ Error renderizando gráfico de productos menos vendidos:', error);
      }
    }
  }

  private renderCategoriasChart(): void {
    if (!this.detailsData?.categorias || this.detailsData.categorias.length === 0) {
      console.log('No hay datos de categorías para renderizar');
      return;
    }

    const container = document.querySelector('#chart4');
    if (!container) {
      console.warn('Contenedor #chart4 no encontrado para gráfico de categorías');
      return;
    }

    if (this.chartCategorias) {
      this.chartCategorias.destroy();
      this.chartCategorias = null;
    }

    const options = {
      chart: {
        type: 'donut', 
        height: 350,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          }
        }
      },
      series: this.detailsData.categorias.map(c => c.porcentaje),
      labels: this.detailsData.categorias.map(c => c.categoria),
      colors: [
        COLORES_DEFAULT.primary,
        COLORES_DEFAULT.secondary,
        COLORES_DEFAULT.tertiary,
        COLORES_DEFAULT.quaternary,
        COLORES_DEFAULT.quinquenary
      ],
      legend: { 
        position: 'bottom',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        labels: {
          colors: '#64748b'
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
            name: {
                show: true,
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#1f2937',
                offsetY: -10
            },
            value: {
                show: true,
                fontSize: '24px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                color: '#1f2937',
                offsetY: 16,
                formatter: (val: string) => val + '%'
              },
              total: {
                show: true,
                showAlways: false,
                label: 'Total',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
                color: '#64748b',
                formatter: () => '100%'
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'light',
        style: {
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif'
        },
        y: {
          formatter: (value: number, { dataPointIndex }: any) => {
            const categoria = this.detailsData!.categorias[dataPointIndex];
            return `$${categoria.ventas.toLocaleString('es-CO')} (${categoria.cantidad} productos)`;
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          colors: ['#ffffff']
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 1,
          color: '#000',
          opacity: 0.45
        }
      }
    };

    try {
      this.chartCategorias = new ApexCharts(container, options);
      this.chartCategorias.render();
      console.log('✅ Gráfico de categorías renderizado exitosamente');
    } catch (error) {
      console.error('❌ Error renderizando gráfico de categorías:', error);
    }
  }

  private renderMetodosPagoChart(): void {
    if (!this.detailsData?.metodosPago || this.detailsData.metodosPago.length === 0) {
      console.log('No hay datos de métodos de pago para renderizar');
      return;
    }

    const container = document.querySelector('#chart5');
    if (!container) {
      console.warn('Contenedor #chart5 no encontrado para gráfico de métodos de pago');
      return;
    }

    if (this.chartMetodosPago) {
      this.chartMetodosPago.destroy();
      this.chartMetodosPago = null;
    }

    const options = {
      chart: { type: 'pie', height: 250 },
      series: this.detailsData.metodosPago.map(m => m.porcentaje),
      labels: this.detailsData.metodosPago.map(m => m.metodo),
      colors: Object.values(COLORES_DEFAULT),
      legend: { position: 'right' },
      tooltip: {
        y: {
          formatter: (value: number, { dataPointIndex }: any) => {
            const metodo = this.detailsData!.metodosPago[dataPointIndex];
            return `${metodo.cantidad} transacciones (${value.toFixed(1)}%)`;
          }
        }
      }
    };

    try {
      this.chartMetodosPago = new ApexCharts(container, options);
      this.chartMetodosPago.render();
      console.log('✅ Gráfico de métodos de pago renderizado exitosamente');
    } catch (error) {
      console.error('❌ Error renderizando gráfico de métodos de pago:', error);
    }
  }

  private renderAllChartsLegacy(): void {
    setTimeout(() => {
      this.renderVentasChart();
      this.renderTopProductsCharts();
    }, 300);
  }

  private destroyAllCharts(): void {
    [this.chartVentasMes, this.chartMasVendidos, this.chartMenosVendidos, 
     this.chartCategorias, this.chartMetodosPago].forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
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
  toggleModule(modulo: 'ventas' | 'logistica' | 'produccion' | 'financiero'): void {
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
        case 'produccion':
        case 'financiero':
          // Módulos futuros - placeholder
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

    console.log('🚚 Renderizando gráficos de logística...');
    
    // Aquí se implementarían los gráficos de logística
    // Por ahora solo loggeamos los datos para debug
    console.log('📈 Datos de performance de entregas disponibles:', this.logisticaData.performanceEntregas);
    
    // TODO: Implementar gráficos de:
    // - Performance de transportadores (bar chart)
    // - Zonas de entrega (pie chart)
    // - Horarios de entrega (line chart)
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
            this.modulosHabilitados = {
              ventas: true,
              logistica: false,
              produccion: false,
              financiero: false
            };
            console.log('📊 Módulos configurados para rol comercial');
            break;
            
          case 'logistica':
          case 'despachos':
            this.modulosHabilitados = {
              ventas: true,
              logistica: true,
              produccion: false,
              financiero: false
            };
            console.log('🚚 Módulos configurados para rol logística');
            break;
            
          case 'produccion':
          case 'inventario':
            this.modulosHabilitados = {
              ventas: false,
              logistica: true,
              produccion: true,
              financiero: false
            };
            console.log('🏭 Módulos configurados para rol producción');
            break;
            
          case 'admin':
          case 'administrador':
          case 'gerente':
          default:
            this.modulosHabilitados = {
              ventas: true,
              logistica: true,
              produccion: true,
              financiero: true
            };
            console.log('👨‍💼 Módulos configurados para rol administrativo');
            break;
        }
        
        console.log('✅ Módulos habilitados:', this.modulosHabilitados);
        
      } else {
        console.warn('⚠️ No se encontró usuario, usando configuración por defecto');
      }
    } catch (error) {
      console.error('❌ Error configurando módulos por rol:', error);
      // Fallback: habilitar todos los módulos
      this.modulosHabilitados = {
        ventas: true,
        logistica: true,
        produccion: true,
        financiero: true
      };
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
}
