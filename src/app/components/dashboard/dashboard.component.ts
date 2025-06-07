import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';
import { forkJoin } from 'rxjs';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { KatuqintelligenceService } from '../../shared/services/katuqintelligence/katuqintelligence.service';

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

  ventasMesCheck = false;
  ventasRes: string = '';
  isAnalyzing = false;

  constructor(
    private ventasService: VentasService,
    private katuqintelligenceService: KatuqintelligenceService) {

    // this.fechaInicial = fechaHoy.toISOString().split('T')[0];
    this.fechaInicial = new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-01').toISOString().split('T')[0];
    this.fechaFinal = new Date().toISOString().split('T')[0];
  }
  ngAfterViewInit(): void {
    // Ya no necesitamos renderAdditionalCharts
  }

  ngOnInit(): void {

    // Cargar datos con las fechas iniciales
    this.cargarDatos();

  }

  cargarDatosMesActual() {
    this.fechaInicial = new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-01').toISOString().split('T')[0];
    this.fechaFinal = new Date().toISOString().split('T')[0];
    this.cargarDatos();
  }

  cargarDatosMesAnterior() {

    const mesAnterior = new Date().getMonth();

    this.fechaInicial = new Date(new Date().getFullYear() + '-' + mesAnterior + '-01').toISOString().split('T')[0];
    this.fechaFinal = new Date(new Date().getFullYear() + '-' + mesAnterior + '-' + new Date().getDate()).toISOString().split('T')[0];
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


  firstEvent(ev: any): void {
    if (ev > this.fechaFinal) {
      this.fechaFinal = ev;
      this.clearFilter();
    }
  }

  secondEvent(ev: any): void {
    if (ev < this.fechaInicial) {
      this.fechaInicial = ev;
      this.clearFilter();
    }
  }

  clearFilter(): void {
    this.cargarDatos();
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

  // DMG
  analizar(tipo: string) {
    switch (tipo) {
      case 'VentasMes':
        console.log('Analizando ventas');
        
        // Resetear estado
        this.ventasMesCheck = false;
        this.ventasRes = '';
        this.isAnalyzing = true;

        const item = {
          "startDate": this.fechaInicial + 'T00:00:00.000Z',
          "endDate": this.fechaFinal + 'T23:59:59.000Z',
          "tipo": "ventas"
        }

        this.katuqintelligenceService.getAnalitycsGraphs(item).subscribe(
          (data: any) => {
            try {
              console.log('Respuesta del análisis:', data);
              
              let valor = data.result;
              
              // Limpiar la respuesta JSON
              if (valor.includes('```json')) {
                valor = valor.replace(/```json/g, '').replace(/```/g, '').trim();
              }
              
              // Parsear JSON si es necesario
              if (valor.startsWith('{') || valor.startsWith('[')) {
                const parsedData = JSON.parse(valor);
                valor = parsedData.respuesta || parsedData.resultado || valor;
              }
              
              // Mejorar el formato del HTML
              valor = this.formatAnalysisHTML(valor);
              
              this.ventasRes = valor;
              this.ventasMesCheck = true;
              
            } catch (error) {
              console.error('Error procesando respuesta:', error);
              this.ventasRes = '<p class="text-danger">Error al procesar el análisis. Por favor, intenta nuevamente.</p>';
              this.ventasMesCheck = true;
            } finally {
              this.isAnalyzing = false;
            }
          },
          (error) => {
            console.error('Error en la petición:', error);
            this.ventasRes = '<p class="text-danger">Error al obtener el análisis. Verifica tu conexión e intenta nuevamente.</p>';
            this.ventasMesCheck = true;
            this.isAnalyzing = false;
          }
        );

        break;
    }
  }

  private formatAnalysisHTML(content: string): string {
    if (!content) return '<p>No se pudo generar el análisis.</p>';
    
    // Si ya contiene HTML, solo hacer ajustes menores
    if (content.includes('<') && content.includes('>')) {
      return content
        .replace(/<h1>/g, '<h4>')
        .replace(/<\/h1>/g, '</h4>')
        .replace(/<h2>/g, '<h4>')
        .replace(/<\/h2>/g, '</h4>')
        .replace(/<h3>/g, '<h5>')
        .replace(/<\/h3>/g, '</h5>');
    }
    
    // Si es texto plano, convertir a HTML básico
    let formattedContent = content;
    
    // Convertir markdown-style headers
    formattedContent = formattedContent.replace(/^# (.*$)/gm, '<h4>$1</h4>');
    formattedContent = formattedContent.replace(/^## (.*$)/gm, '<h5>$1</h5>');
    formattedContent = formattedContent.replace(/^### (.*$)/gm, '<h6>$1</h6>');
    
    // Convertir texto en negrita
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convertir saltos de línea a párrafos
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
}
