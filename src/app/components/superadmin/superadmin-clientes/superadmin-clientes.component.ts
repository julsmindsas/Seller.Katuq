import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { UserService } from '../../../../services/user.service';
import { AnalyticsService } from '../../../../services/analytics.service';

// Interfaz para definir la estructura del cliente (opcional pero recomendado)
interface Cliente {
  id: number;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  estado: 'Activo' | 'Bloqueado' | 'Pendiente';
  fechaRegistro: Date;
  ultimoAcceso: Date | null;
}

// Agregar nuevas interfaces para análisis avanzado
interface AnalisisUsuario {
  id: number;
  nombre: string;
  actividad: {
    sesiones: number;
    tiempoPromedio: number;
    ultimaActividad: Date;
  };
  conversion: {
    tasa: number;
    valorLTV: number;
  };
  engagement: {
    score: number;
    tendencia: number;
  };
}

interface MetricasGlobales {
  usuariosActivos: number;
  tasaRetencion: number;
  valorLTVPromedio: number;
  tiempoSesionPromedio: number;
}

@Component({
  selector: 'app-superadmin-clientes',
  templateUrl: './superadmin-clientes.component.html',
  styleUrls: ['./superadmin-clientes.component.scss']
})
export class SuperadminClientesComponent implements OnInit, AfterViewInit {

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  filtroNombre: string = '';
  filtroEstado: string = '';

  // Datos mock
  private mockClientes: Cliente[] = [
    { id: 1, nombre: 'Cliente Alfa', empresa: 'Empresa X', email: 'alfa@ejemplo.com', telefono: '123456789', estado: 'Activo', fechaRegistro: new Date(2024, 10, 15), ultimoAcceso: new Date(2025, 3, 17) },
    { id: 2, nombre: 'Cliente Beta', empresa: 'Empresa Y', email: 'beta@ejemplo.com', telefono: '987654321', estado: 'Bloqueado', fechaRegistro: new Date(2024, 5, 20), ultimoAcceso: new Date(2025, 1, 5) },
    { id: 3, nombre: 'Cliente Gamma', empresa: 'Empresa Z', email: 'gamma@ejemplo.com', telefono: '555555555', estado: 'Pendiente', fechaRegistro: new Date(2025, 0, 10), ultimoAcceso: null },
    { id: 4, nombre: 'Cliente Delta', empresa: 'Empresa X', email: 'delta@ejemplo.com', telefono: '111222333', estado: 'Activo', fechaRegistro: new Date(2023, 8, 1), ultimoAcceso: new Date(2025, 3, 18) },
  ];

  // Datos para KPIs
  kpiData = {
    ventasTotales: 120000000,
    pedidosPromedio: 320,
    tiempoEntregaPromedio: 28,
    satisfaccionGlobal: 4.6,
    tiendasActivas: 4,
    zonasCobertura: 3,
    conversionPedidos: 0.75,
    ticketPromedio: 35000,
    retencionClientes: 0.85,
    eficienciaEntrega: 0.92
  };

  // Datos para gráficos de KPIs
  private tiendas = [
    { nombre: 'Tienda A', ingresos: 40000000, pedidos: 120, crecimiento: 15 },
    { nombre: 'Tienda B', ingresos: 30000000, pedidos: 80, crecimiento: 5 },
    { nombre: 'Tienda C', ingresos: 25000000, pedidos: 70, crecimiento: -2 },
    { nombre: 'Tienda D', ingresos: 25000000, pedidos: 50, crecimiento: 8 }
  ];

  // Nuevas propiedades para análisis avanzado
  analisisUsuarios: AnalisisUsuario[] = [];
  metricasGlobales: MetricasGlobales = {
    usuariosActivos: 0,
    tasaRetencion: 0,
    valorLTVPromedio: 0,
    tiempoSesionPromedio: 0
  };

  // Nuevas métricas
  activeUsers: number = 0;
  retentionRate: number = 0;
  averageLTV: number = 0;
  averageSessionTime: number = 0;

  // Datos para gráficos
  engagementData: any = {
    series: [{
      name: 'Engagement',
      data: []
    }],
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#4CAF50'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: []
    }
  };

  ltvData: any = {
    series: [{
      name: 'LTV',
      data: []
    }],
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#2196F3'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: []
    }
  };

  // Datos para la tabla de análisis
  userAnalysis: any[] = [];

  // Nuevas propiedades para métricas mejoradas
  growthMetrics: any = {};
  conversionMetrics: any = {};
  performanceMetrics: any = {};
  categoryTrends: any[] = [];
  marketingMetrics: any = {};

  // Configuración mejorada para gráficos
  revenueChart: any = {
    series: [{
      name: 'Ingresos',
      data: []
    }],
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#4CAF50'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: []
    },
    yaxis: {
      labels: {
        formatter: function(val: number) {
          return '$' + (val / 1000000).toFixed(1) + 'M';
        }
      }
    }
  };

  categoryChart: any = {
    series: [{
      name: 'Crecimiento',
      data: []
    }],
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    colors: ['#2196F3'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        dataLabels: {
          position: 'bottom'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val + '%';
      }
    },
    xaxis: {
      categories: []
    }
  };

  performanceChart: any = {
    series: [{
      name: 'Rendimiento',
      data: []
    }],
    chart: {
      type: 'radialBar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: {
            fontSize: '13px',
            color: '#333',
            offsetY: 80
          },
          value: {
            offsetY: 40,
            fontSize: '16px',
            color: '#333',
            formatter: function(val: number) {
              return val + '%';
            }
          }
        }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        shadeIntensity: 0.15,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 50, 65, 91]
      }
    },
    stroke: {
      dashArray: 4
    },
    labels: ['Uptime', 'Satisfacción', 'Tiempo Respuesta']
  };

  // --- Inicio: Añadir Getters ---
  get totalClientes(): number {
    return this.clientes.length;
  }

  get clientesActivosCount(): number {
    return this.clientes.filter(c => c.estado === 'Activo').length;
  }

  get clientesBloqueadosCount(): number {
    return this.clientes.filter(c => c.estado === 'Bloqueado').length;
  }

  get clientesPendientesCount(): number {
    return this.clientes.filter(c => c.estado === 'Pendiente').length;
  }
  // --- Fin: Añadir Getters ---

  private renderRevenueChartInstance: any;
  private renderCategoryChartInstance: any;
  private renderPerformanceChartInstance: any;

  constructor(
    private userService: UserService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.clientes = this.mockClientes;
    this.filtrarClientes(); // Inicializar la lista filtrada
    this.loadAdvancedMetrics();
  }

  ngAfterViewInit(): void {
    this.renderStoreCharts();
    this.renderKPICharts();
    this.renderEngagementChart();
    this.renderLTVChart();
  }

  filtrarClientes(): void {
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const coincideNombre = cliente.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                             cliente.empresa.toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                             cliente.email.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const coincideEstado = this.filtroEstado === '' || cliente.estado === this.filtroEstado;
      return coincideNombre && coincideEstado;
    });
  }

  // Métodos para acciones (editar, cambiar estado, etc.) - se implementarán después
  editarCliente(cliente: Cliente): void {
    console.log('Editar cliente:', cliente);
    // Lógica para editar
  }

  cambiarEstado(cliente: Cliente, nuevoEstado: 'Activo' | 'Bloqueado'): void {
    console.log('Cambiar estado cliente:', cliente, 'a', nuevoEstado);
    const index = this.clientes.findIndex(c => c.id === cliente.id);
    if (index !== -1) {
      this.clientes[index].estado = nuevoEstado;
      this.filtrarClientes(); // Actualizar vista
    }
  }

   verDetalles(cliente: Cliente): void {
    console.log('Ver detalles cliente:', cliente);
    // Lógica para mostrar detalles (puede ser un modal o navegar a otra vista)
  }

   eliminarCliente(cliente: Cliente): void {
     if (confirm(`¿Está seguro de que desea eliminar al cliente ${cliente.nombre}?`)) {
        console.log('Eliminar cliente:', cliente);
        this.clientes = this.clientes.filter(c => c.id !== cliente.id);
        this.filtrarClientes(); // Actualizar vista
     }
   }

  // Método para inicializar los gráficos de tiendas
  private renderStoreCharts(): void {
    this.renderVentasPorTiendaChart();
    this.renderPedidosPorTiendaChart();
    this.renderCrecimientoTiendasChart();
  }

  // Gráfico de barras para ventas por tienda
  private renderVentasPorTiendaChart(): void {
    const options = {
      chart: { 
        type: 'bar',
        height: 250,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          distributed: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#008ffb', '#00e396', '#feb019', '#ff4560'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return '$' + (val / 1000000).toFixed(1) + 'M';
        },
        offsetY: -20,
        style: {
          fontSize: '12px',
          colors: ["#304758"]
        }
      },
      series: [{
        name: 'Ingresos',
        data: this.tiendas.map(t => t.ingresos)
      }],
      xaxis: {
        categories: this.tiendas.map(t => t.nombre),
        position: 'bottom'
      },
      yaxis: {
        axisBorder: { show: false },
        labels: {
          formatter: function (val: number) {
            return '$' + (val / 1000000).toFixed(1) + 'M';
          }
        }
      },
      title: {
        text: 'Ventas por Tienda (Mes Actual)',
        floating: false,
        align: 'center',
        style: {
          fontWeight: 600
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ventas-tiendas'), options);
    chart.render();
  }

  // Gráfico de donut para distribución de pedidos
  private renderPedidosPorTiendaChart(): void {
    const options = {
      chart: {
        type: 'donut',
        height: 250
      },
      series: this.tiendas.map(t => t.pedidos),
      labels: this.tiendas.map(t => t.nombre),
      colors: ['#008ffb', '#00e396', '#feb019', '#ff4560'],
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Pedidos',
                formatter: function (w: any) {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                }
              }
            }
          }
        }
      },
      title: {
        text: 'Distribución de Pedidos',
        align: 'center',
        style: {
          fontWeight: 600
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-pedidos-tiendas'), options);
    chart.render();
  }

  // Gráfico de líneas para crecimiento de tiendas
  private renderCrecimientoTiendasChart(): void {
    const options = {
      chart: {
        type: 'line',
        height: 250,
        toolbar: { show: false }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      series: [{
        name: 'Crecimiento %',
        data: this.tiendas.map(t => t.crecimiento)
      }],
      colors: ['#43cea2'],
      xaxis: {
        categories: this.tiendas.map(t => t.nombre)
      },
      yaxis: {
        labels: {
          formatter: function (val: number) {
            return val.toFixed(1) + '%';
          }
        }
      },
      markers: {
        size: 6,
        strokeWidth: 0,
        hover: {
          size: 8
        }
      },
      title: {
        text: 'Crecimiento Mensual por Tienda',
        align: 'center',
        style: {
          fontWeight: 600
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-crecimiento-tiendas'), options);
    chart.render();
  }

  private renderKPICharts(): void {
    this.renderVentasMensualesChart();
    this.renderMetricasRendimientoChart();
    this.renderSatisfaccionChart();
  }

  private renderVentasMensualesChart(): void {
    const options = {
      chart: {
        type: 'area',
        height: 200,
        sparkline: {
          enabled: true
        },
        toolbar: { show: false }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100]
        }
      },
      series: [{
        name: 'Ventas',
        data: [30, 40, 35, 50, 49, 60, 70, 91, 125, 100, 120, 150]
      }],
      colors: ['#008ffb'],
      xaxis: {
        categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      },
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        y: {
          title: {
            formatter: function (seriesName: string) {
              return '';
            }
          }
        },
        marker: {
          show: false
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ventas-mensuales'), options);
    chart.render();
  }

  private renderMetricasRendimientoChart(): void {
    const options = {
      chart: {
        type: 'radialBar',
        height: 200,
        toolbar: { show: false }
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          dataLabels: {
            name: {
              fontSize: '13px',
              color: '#333',
              offsetY: 80
            },
            value: {
              offsetY: 40,
              fontSize: '16px',
              color: '#333',
              formatter: function (val: number) {
                return val + '%';
              }
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          shadeIntensity: 0.15,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 50, 65, 91]
        },
      },
      stroke: {
        dashArray: 4
      },
      series: [this.kpiData.conversionPedidos * 100],
      labels: ['Tasa de Conversión'],
      colors: ['#00e396']
    };

    const chart = new ApexCharts(document.querySelector('#chart-metricas-rendimiento'), options);
    chart.render();
  }

  private renderSatisfaccionChart(): void {
    const options = {
      chart: {
        type: 'radar',
        height: 200,
        toolbar: { show: false }
      },
      series: [{
        name: 'Satisfacción',
        data: [4.8, 4.5, 4.2, 4.6, 4.9]
      }],
      labels: ['Atención', 'Entrega', 'Producto', 'Precio', 'Soporte'],
      colors: ['#ff4560'],
      plotOptions: {
        radar: {
          size: 140,
          polygons: {
            strokeColors: '#e9e9e9',
            fill: {
              colors: ['#f8f8f8', '#fff']
            }
          }
        }
      },
      markers: {
        size: 4,
        colors: ['#fff'],
        strokeColor: '#ff4560',
        strokeWidth: 2,
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return val + '/5.0';
          }
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-satisfaccion'), options);
    chart.render();
  }

  // Método para cargar datos de análisis
  private cargarAnalisisUsuarios(): void {
    // Datos mock para ejemplo
    this.analisisUsuarios = [
      {
        id: 1,
        nombre: 'Cliente Alfa',
        actividad: {
          sesiones: 45,
          tiempoPromedio: 25,
          ultimaActividad: new Date(2024, 3, 18)
        },
        conversion: {
          tasa: 0.75,
          valorLTV: 1200000
        },
        engagement: {
          score: 85,
          tendencia: 12
        }
      },
      // ... más datos mock
    ];

    this.calcularMetricasGlobales();
  }

  private calcularMetricasGlobales(): void {
    this.metricasGlobales = {
      usuariosActivos: this.analisisUsuarios.length,
      tasaRetencion: 0.85,
      valorLTVPromedio: 950000,
      tiempoSesionPromedio: 22
    };
  }

  // Nuevo método para gráfico de engagement
  private renderEngagementChart(): void {
    const options = {
      chart: {
        type: 'heatmap',
        height: 300,
        toolbar: { show: false }
      },
      dataLabels: {
        enabled: false
      },
      colors: ['#008ffb'],
      series: [{
        name: 'Engagement',
        data: this.analisisUsuarios.map(usuario => ({
          x: usuario.nombre,
          y: usuario.engagement.score
        }))
      }],
      xaxis: {
        type: 'category',
        categories: this.analisisUsuarios.map(u => u.nombre)
      },
      title: {
        text: 'Score de Engagement por Usuario',
        align: 'center'
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-engagement'), options);
    chart.render();
  }

  // Nuevo método para gráfico de LTV
  private renderLTVChart(): void {
    const options = {
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          dataLabels: {
            position: 'bottom'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number) {
          return '$' + (val / 1000) + 'K';
        }
      },
      series: [{
        name: 'LTV',
        data: this.analisisUsuarios.map(usuario => usuario.conversion.valorLTV)
      }],
      xaxis: {
        categories: this.analisisUsuarios.map(u => u.nombre)
      },
      title: {
        text: 'Valor de Vida del Cliente (LTV)',
        align: 'center'
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ltv'), options);
    chart.render();
  }

  private loadAdvancedMetrics(): void {
    this.analyticsService.getAdvancedMetrics().subscribe({
      next: (data) => {
        // KPIs Principales
        this.activeUsers = data.activeUsers;
        this.retentionRate = data.retentionRate;
        this.averageLTV = data.averageLTV;
        this.averageSessionTime = data.averageSessionTime;
        
        // Métricas de Crecimiento
        this.growthMetrics = data.growthMetrics;
        
        // Métricas de Conversión
        this.conversionMetrics = data.conversionMetrics;
        
        // Métricas de Rendimiento
        this.performanceMetrics = data.performanceMetrics;
        
        // Tendencias de Categorías
        this.categoryTrends = data.categoryTrends;
        
        // Métricas de Marketing
        this.marketingMetrics = data.marketingMetrics;
        
        // Actualizar datos de gráficos
        this.revenueChart.series[0].data = data.ltvTrend;
        this.revenueChart.xaxis.categories = data.ltvDates;
        
        this.categoryChart.series[0].data = data.categoryTrends.map((cat: any) => cat.growth);
        this.categoryChart.xaxis.categories = data.categoryTrends.map((cat: any) => cat.name);
        
        this.performanceChart.series[0].data = [
          data.performanceMetrics.systemUptime,
          data.performanceMetrics.customerSatisfaction * 20,
          (100 - data.performanceMetrics.supportResponseTime)
        ];
        
        this.userAnalysis = data.userAnalysis;

        // Renderizar / actualizar los gráficos
        this.renderRevenueChart();
        this.renderCategoryChart();
        this.renderPerformanceChart();
      },
      error: (error) => {
        console.error('Error al cargar métricas avanzadas:', error);
      }
    });
  }

  private renderRevenueChart(): void {
    if (this.renderRevenueChartInstance) {
      this.renderRevenueChartInstance.updateOptions(this.revenueChart);
    } else {
      this.renderRevenueChartInstance = new ApexCharts(document.querySelector('#chart-revenue'), this.revenueChart);
      this.renderRevenueChartInstance.render();
    }
  }

  private renderCategoryChart(): void {
    if (this.renderCategoryChartInstance) {
      this.renderCategoryChartInstance.updateOptions(this.categoryChart);
    } else {
      this.renderCategoryChartInstance = new ApexCharts(document.querySelector('#chart-categories'), this.categoryChart);
      this.renderCategoryChartInstance.render();
    }
  }

  private renderPerformanceChart(): void {
    if (this.renderPerformanceChartInstance) {
      this.renderPerformanceChartInstance.updateOptions(this.performanceChart);
    } else {
      this.renderPerformanceChartInstance = new ApexCharts(document.querySelector('#chart-performance'), this.performanceChart);
      this.renderPerformanceChartInstance.render();
    }
  }
}
