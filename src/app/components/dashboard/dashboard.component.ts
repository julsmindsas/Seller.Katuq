import { Component, OnInit,AfterViewInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { forkJoin } from 'rxjs';
import { VentasService } from '../../shared/services/ventas/ventas.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  
  topProductsMasVendidos: any;
  topProductosMenosVendidos: any;
  topVentasPorDia: any;

  fechaInicial: string;
  fechaFinal: string;
  chartVentasMes: any;

  constructor(private ventasService: VentasService) {
    const fechaHoy = new Date();
    this.fechaInicial = fechaHoy.toISOString().split('T')[0];
    this.fechaFinal = fechaHoy.toISOString().split('T')[0];
  }
  ngAfterViewInit(): void {
    this.renderAdditionalCharts();
  }

  ngOnInit(): void {
    const today = new Date();
    this.fechaInicial = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    this.fechaFinal = today.toISOString().split('T')[0];

    // Cargar datos con las fechas iniciales
    this.cargarDatos();
    
  }

  cargarDatos(): void {
    const topProductosMasVendidos$ = this.ventasService.getTop10ProductosMasVendidos();
    const topProductosMenosVendidos$ = this.ventasService.getTop10ProductosMenosVendidos();
    const topVentasDelMes$ = this.ventasService.getTopVentasPorDiaEntreFechas(
      this.fechaInicial,
      this.fechaFinal
    );

    forkJoin([topProductosMasVendidos$, topProductosMenosVendidos$, topVentasDelMes$])
      .subscribe(
        ([topProductsMasVendidos, topProductosMenosVendidos, topVentasPorDia]) => {
          this.topProductsMasVendidos = topProductsMasVendidos || [];
          this.topProductosMenosVendidos = topProductosMenosVendidos || [];
          this.topVentasPorDia = topVentasPorDia || {};

          this.renderCharts();
        },
        (error) => console.error('Error al cargar los datos:', error)
      );
  }

  onFechaChange(): void {
    this.cargarDatos(); // Actualiza los datos al cambiar las fechas
  }
  
  renderCharts() {
    // Validar datos antes de usarlos
    if (!this.topProductosMenosVendidos || !this.topProductsMasVendidos || !this.topVentasPorDia) {
      console.error('Datos faltantes:', {
        topProductosMenosVendidos: this.topProductosMenosVendidos,
        topProductsMasVendidos: this.topProductsMasVendidos,
        topVentasPorDia: this.topVentasPorDia,
      });
      return;
    }

    const gradientColors = [
      { from: '#6a11cb', to: '#2575fc' },
      { from: '#43cea2', to: '#185a9d' },
    ];

    // Gráfico de Top 10 Productos Menos Vendidos
    if (this.topProductosMenosVendidos.length > 0) {
      new ApexCharts(document.querySelector('#chart1'), {
        chart: { type: 'bar', height: 200, toolbar: { show: false } },
        colors: [gradientColors[0].to],
        series: [
          {
            name: 'Menos Vendidos',
            data: this.topProductosMenosVendidos.map((p) => p.cantidadVendida),
          },
        ],
        xaxis: {
          categories: this.topProductosMenosVendidos.map((p) => p.referencia),
          labels: {
            show: false, // Desactiva los labels debajo del gráfico
          }
        },
        plotOptions: { bar: { borderRadius: 4, distributed: true } },
        tooltip: { theme: 'dark' },
      }).render();
    } else {
      console.warn('No hay datos para "Top 10 Menos Vendidos"');
    }

    // Gráfico de Top 10 Productos Más Vendidos
    if (this.topProductsMasVendidos.length > 0) {
      new ApexCharts(document.querySelector('#chart2'), {
        chart: { type: 'bar', height: 200, toolbar: { show: false } },
        colors: [gradientColors[1].to],
        series: [
          {
            name: 'Más Vendidos',
            data: this.topProductsMasVendidos.map((p) => p.cantidadVendida),
          },
        ],
        xaxis: {
          categories: this.topProductsMasVendidos.map((p) => p.referencia),
          labels: {
            show: false, // Desactiva los labels debajo del gráfico
          }
        },
        plotOptions: { bar: { borderRadius: 4, distributed: true } },
        tooltip: { theme: 'dark' },
      }).render();
    } else {
      console.warn('No hay datos para "Top 10 Más Vendidos"');
    }

    // Gráfico de Ventas del Mes
    if (this.topVentasPorDia && Object.keys(this.topVentasPorDia).length > 0) {
      const categories = Object.keys(this.topVentasPorDia);
      const seriesData = categories.map((key) => this.topVentasPorDia[key]?.totalVentas || 0);

      // Destruir gráfico existente si ya está renderizado
      if (this.chartVentasMes) {
        this.chartVentasMes.destroy();
      }

      // Crear una nueva instancia del gráfico
      this.chartVentasMes = new ApexCharts(document.querySelector("#chart3"), {
        chart: { type: 'line', height: 200, toolbar: { show: false } },
        series: [
          {
            name: 'Total Ventas',
            data: seriesData,
          },
        ],
        xaxis: {
          categories, // Fechas
          reversed: true,
        },
        yaxis: {
          labels: {
            formatter: (value: number) => Math.floor(value), // Redondea hacia abajo y elimina los decimales
          }
        },
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 5 },
        colors: ['#43cea2'],
        tooltip: { theme: 'dark' },
      });

      // Renderizar el gráfico
      this.chartVentasMes.render();
    } else {
      console.warn('No hay datos para "Ventas del Mes"');
      // Destruir gráfico existente si no hay datos
      if (this.chartVentasMes) {
        this.chartVentasMes.destroy();
        this.chartVentasMes = null;
      }
    }
  }

  renderAdditionalCharts(): void {
    // Gráfico de Costos vs Ganancias
    const mockCostosGanancias = {
      costos: [1000, 2000, 1500, 3000, 2500],
      ganancias: [2000, 3000, 2500, 4000, 3500],
      meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo']
    };
  
    new ApexCharts(document.querySelector('#chart-costos-ganancias'), {
      chart: { type: 'bar', height: 200 },
      series: [
        { name: 'Costos', data: mockCostosGanancias.costos },
        { name: 'Ganancias', data: mockCostosGanancias.ganancias }
      ],
      xaxis: { categories: mockCostosGanancias.meses },
      colors: ['#ff4560', '#00e396']
    }).render();
  
    // Gráfico de Tasa de Conversión
    const mockConversion = {
      conversionRate: [10, 12, 15, 13, 14],
      meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo']
    };
  
    new ApexCharts(document.querySelector('#chart-conversion-clientes'), {
      chart: { type: 'line', height: 200 },
      series: [
        { name: 'Tasa de Conversión', data: mockConversion.conversionRate }
      ],
      xaxis: { categories: mockConversion.meses },
      colors: ['#775dd0']
    }).render();
  
    // Gráfico de Uso de Materiales
    const mockUsoMateriales = {
      materiales: ['Masapan', 'Azucar', 'Vino', 'Arequipe', 'Bicarbonato'],
      uso: [120, 80, 150, 100, 90]
    };
  
    new ApexCharts(document.querySelector('#chart-uso-materiales'), {
      chart: { type: 'pie', height: 200 },
      series: mockUsoMateriales.uso,
      labels: mockUsoMateriales.materiales
    }).render();
  
    // Gráfico de Eficiencia de Producción
    const mockEficienciaProduccion = {
      lineas: ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4'],
      eficiencia: [85, 90, 80, 95]
    };
  
    new ApexCharts(document.querySelector('#chart-eficiencia-produccion'), {
      chart: { type: 'radar', height: 200 },
      series: [
        { name: 'Eficiencia (%)', data: mockEficienciaProduccion.eficiencia }
      ],
      xaxis: { categories: mockEficienciaProduccion.lineas }
    }).render();
  
    // Gráfico de Tiempo Promedio de Despacho
    const mockTiempoDespacho = {
      semanas: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
      tiempoPromedio: [30, 25, 20, 35]
    };
  
    new ApexCharts(document.querySelector('#chart-tiempo-despacho'), {
      chart: { type: 'bar', height: 200 },
      series: [
        { name: 'Tiempo Promedio (min)', data: mockTiempoDespacho.tiempoPromedio }
      ],
      xaxis: { categories: mockTiempoDespacho.semanas },
      colors: ['#008ffb']
    }).render();
  
    // Gráfico de Entregas Fallidas
    const mockEntregasFallidas = {
      semanas: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
      entregasFallidas: [2, 5, 3, 4]
    };
  
    new ApexCharts(document.querySelector('#chart-entregas-fallidas'), {
      chart: { type: 'bar', height: 200 },
      series: [
        { name: 'Entregas Fallidas', data: mockEntregasFallidas.entregasFallidas }
      ],
      xaxis: { categories: mockEntregasFallidas.semanas },
      colors: ['#feb019']
    }).render();
  
    // Gráfico de Ranking de Mensajeros
    const mockRankingMensajeros = {
      mensajeros: ['Juan', 'María', 'Pedro', 'Ana'],
      entregas: [50, 45, 40, 60]
    };
  
    new ApexCharts(document.querySelector('#chart-ranking-mensajeros'), {
      chart: { type: 'bar', height: 200 },
      series: [
        { name: 'Entregas', data: mockRankingMensajeros.entregas }
      ],
      xaxis: { categories: mockRankingMensajeros.mensajeros },
      colors: ['#00e396']
    }).render();
  
    // Gráfico de Rutas Frecuentes
    const mockRutasFrecuentes = {
      rutas: ['Ruta 1', 'Ruta 2', 'Ruta 3', 'Ruta 4'],
      frecuencia: [20, 15, 25, 10]
    };
  
    new ApexCharts(document.querySelector('#chart-rutas-frecuentes'), {
      chart: { type: 'donut', height: 200 },
      series: mockRutasFrecuentes.frecuencia,
      labels: mockRutasFrecuentes.rutas
    }).render();
  }
  
}
