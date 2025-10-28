# Guía de Implementación Frontend - Dashboard Analytics Katuq

**Versión:** 1.0  
**Fecha:** 2024-12-26  
**Target:** Desarrolladores Frontend con ApexCharts.js + Leaflet.js  

---

## 📋 **Índice**

1. [Arquitectura del Dashboard](#arquitectura)
2. [API Endpoints](#endpoints)
3. [Interfaces TypeScript](#interfaces)
4. [Implementación de Gráficos ApexCharts](#apexcharts)
5. [Implementación de Mapas Leaflet](#mapas)
6. [Componentes Sugeridos](#componentes)
7. [Estrategia de Carga Progresiva](#carga)
8. [Ejemplos de Código Completos](#ejemplos)
9. [Best Practices](#best-practices)

---

## <a name="arquitectura"></a>🏗️ **Arquitectura del Dashboard**

### **Estrategia de Carga Híbrida**

El dashboard utiliza **2 llamadas API** para optimizar la experiencia del usuario:

1. **Carga Inmediata** (`/dashboard-core`) - KPIs + Gráfico de ventas (< 2 segundos)
2. **Carga Diferida** (`/dashboard-details`) - Análisis detallados (< 5 segundos)

### **Layout del Dashboard**

```
┌─────────────────────────────────────────────────┐
│                  KPI CARDS                      │
│  [Ventas] [Ticket] [Conversión] [Crecimiento]  │ ← INMEDIATO
├─────────────────────┬───────────────────────────┤
│                     │                           │
│   Ventas x Período  │      Mapa Ciudades       │ ← Line: INMEDIATO
│    (Line Chart)     │       (Leaflet)          │   Mapa: DIFERIDO
│                     │                           │
├─────────────────────┼───────────────────────────┤
│   Productos Top     │     Categorías           │
│   (Horizontal Bar)  │    (Donut Chart)         │ ← DIFERIDO
├─────────────────────┼───────────────────────────┤
│   Métodos de Pago   │     [Futuro]             │
│    (Pie Chart)      │                          │ ← DIFERIDO
└─────────────────────┴───────────────────────────┘
```

---

## <a name="endpoints"></a>🌐 **API Endpoints**

### **1. Dashboard Core (Datos Críticos)**

```
GET /v1/analytics/dashboard-core
```

**Parámetros:**
- `fechaInicio` (requerido): YYYY-MM-DD
- `fechaFin` (requerido): YYYY-MM-DD  
- `company` (opcional): ID de la empresa

**Ejemplo:**
```
/v1/analytics/dashboard-core?fechaInicio=2024-01-01&fechaFin=2024-12-31&company=katuq
```

**Respuesta:**
```json
{
  "periodo": {
    "inicio": "2024-01-01",
    "fin": "2024-12-31",
    "dias": 365
  },
  "kpis": {
    "ventasTotales": 15750000,
    "ventasBrutas": 17200000,
    "ticketPromedio": 98500,
    "tasaConversion": 87.3,
    "totalPedidos": 456,
    "pedidosAprobados": 398,
    "crecimientoVentas": 12.5
  },
  "ventasPorPeriodo": [
    {
      "fecha": "2024-01-01",
      "ventas": 1350000,
      "pedidos": 45
    }
    // ... más datos diarios
  ]
}
```

### **2. Dashboard Details (Análisis Detallado)**

```
GET /v1/analytics/dashboard-details
```

**Parámetros:** Mismos que dashboard-core

**Respuesta:**
```json
{
  "productosTop": [
    {
      "id": "PROD001",
      "nombre": "Producto Premium A",
      "cantidadVendida": 150,
      "ingresos": 750000,
      "categoria": "Electrónicos"
    }
    // ... 9 productos más
  ],
  "categorias": [
    {
      "categoria": "Electrónicos",
      "ventas": 2500000,
      "cantidad": 156,
      "porcentaje": 35.5
    }
    // ... más categorías
  ],
  "metodosPago": [
    {
      "metodo": "Tarjeta de Crédito",
      "cantidad": 156,
      "porcentaje": 65.2
    }
    // ... más métodos
  ],
  "ciudades": [
    {
      "ciudad": "Bogotá",
      "departamento": "Cundinamarca", 
      "ventas": 4500000,
      "pedidos": 156,
      "coordenadas": {
        "lat": 4.7110,
        "lng": -74.0721
      }
    }
    // ... 9 ciudades más
  ],
  "metricas": {
    "tiempoPromedioEntrega": 3.2,
    "totalDescuentos": 450000,
    "pedidosEntregados": 234,
    "ciudadesAtendidas": 25
  }
}
```

---

## <a name="interfaces"></a>📝 **Interfaces TypeScript**

```typescript
// Respuesta del endpoint dashboard-core
export interface DashboardCoreResponse {
  periodo: {
    inicio: string;
    fin: string;
    dias: number;
  };
  kpis: {
    ventasTotales: number;
    ventasBrutas: number;
    ticketPromedio: number;
    tasaConversion: number;
    totalPedidos: number;
    pedidosAprobados: number;
    crecimientoVentas: number;
  };
  ventasPorPeriodo: VentaDiaria[];
}

export interface VentaDiaria {
  fecha: string;
  ventas: number;
  pedidos: number;
}

// Respuesta del endpoint dashboard-details
export interface DashboardDetailsResponse {
  productosTop: ProductoTop[];
  categorias: CategoriaVentas[];
  metodosPago: MetodoPago[];
  ciudades: CiudadVentas[];
  metricas: MetricasAdicionales;
}

export interface ProductoTop {
  id: string;
  nombre: string;
  cantidadVendida: number;
  ingresos: number;
  categoria: string;
}

export interface CategoriaVentas {
  categoria: string;
  ventas: number;
  cantidad: number;
  porcentaje: number;
}

export interface MetodoPago {
  metodo: string;
  cantidad: number;
  porcentaje: number;
}

export interface CiudadVentas {
  ciudad: string;
  departamento: string;
  ventas: number;
  pedidos: number;
  coordenadas: {
    lat: number;
    lng: number;
  };
}

export interface MetricasAdicionales {
  tiempoPromedioEntrega: number;
  totalDescuentos: number;
  pedidosEntregados: number;
  ciudadesAtendidas: number;
}
```

---

## <a name="apexcharts"></a>📊 **Implementación ApexCharts**

### **1. KPI Cards (HTML + CSS)**

```html
<div class="kpi-grid">
  <div class="kpi-card primary">
    <div class="kpi-header">
      <h3>Ventas Totales</h3>
      <span class="kpi-icon">💰</span>
    </div>
    <div class="kpi-content">
      <span class="kpi-value">{{kpis.ventasTotales | currency:'COP':'symbol':'1.0-0'}}</span>
      <span class="kpi-trend" [ngClass]="{'up': kpis.crecimientoVentas > 0, 'down': kpis.crecimientoVentas < 0}">
        <i class="arrow" [ngClass]="{'up': kpis.crecimientoVentas > 0, 'down': kpis.crecimientoVentas < 0}"></i>
        {{kpis.crecimientoVentas}}% vs período anterior
      </span>
    </div>
  </div>
  
  <div class="kpi-card secondary">
    <div class="kpi-header">
      <h3>Ticket Promedio</h3>
      <span class="kpi-icon">🎫</span>
    </div>
    <div class="kpi-content">
      <span class="kpi-value">{{kpis.ticketPromedio | currency:'COP':'symbol':'1.0-0'}}</span>
      <span class="kpi-subtitle">Por pedido aprobado</span>
    </div>
  </div>
  
  <div class="kpi-card tertiary">
    <div class="kpi-header">
      <h3>Tasa Conversión</h3>
      <span class="kpi-icon">📈</span>
    </div>
    <div class="kpi-content">
      <span class="kpi-value">{{kpis.tasaConversion}}%</span>
      <span class="kpi-subtitle">Pedidos aprobados</span>
    </div>
  </div>
  
  <div class="kpi-card quaternary">
    <div class="kpi-header">
      <h3>Total Pedidos</h3>
      <span class="kpi-icon">📦</span>
    </div>
    <div class="kpi-content">
      <span class="kpi-value">{{kpis.totalPedidos}}</span>
      <span class="kpi-subtitle">{{kpis.pedidosAprobados}} aprobados</span>
    </div>
  </div>
</div>
```

### **2. Gráfico de Ventas por Período**

```typescript
// ventas-chart.component.ts
import { ApexOptions } from 'ng-apexcharts';

export class VentasChartComponent {
  public chartOptions: ApexOptions;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: 'area',
        height: 350,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        },
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
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      colors: ['#008FFB', '#00E396'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        type: 'datetime',
        labels: {
          format: 'dd/MM'
        }
      },
      yaxis: [
        {
          title: {
            text: 'Ventas (COP)'
          },
          labels: {
            formatter: (value) => {
              return '$' + (value / 1000000).toFixed(1) + 'M';
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'Pedidos'
          }
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (value, { seriesIndex }) => {
            if (seriesIndex === 0) {
              return '$' + value.toLocaleString('es-CO');
            }
            return value + ' pedidos';
          }
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left'
      }
    };
  }

  updateData(ventasPorPeriodo: VentaDiaria[]) {
    const ventasData = ventasPorPeriodo.map(item => ({
      x: new Date(item.fecha).getTime(),
      y: item.ventas
    }));

    const pedidosData = ventasPorPeriodo.map(item => ({
      x: new Date(item.fecha).getTime(),
      y: item.pedidos
    }));

    this.chartOptions.series = [
      {
        name: 'Ventas Diarias',
        data: ventasData,
        type: 'area'
      },
      {
        name: 'Pedidos',
        data: pedidosData,
        type: 'line'
      }
    ];
  }
}
```

### **3. Productos Top (Horizontal Bar)**

```typescript
// productos-chart.component.ts
export class ProductosChartComponent {
  public chartOptions: ApexOptions;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 400
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          distributed: true
        }
      },
      colors: ['#FF4560', '#008FFB', '#00E396', '#775DD0', '#FEB019'],
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: {
          colors: ['#fff']
        },
        formatter: (val, opt) => {
          return opt.w.globals.labels[opt.dataPointIndex] + ': ' + val;
        },
        offsetX: 0
      },
      xaxis: {
        categories: [],
        labels: {
          formatter: (value) => {
            return value + ' unidades';
          }
        }
      },
      yaxis: {
        labels: {
          show: false
        }
      },
      tooltip: {
        y: {
          formatter: (value, { dataPointIndex, w }) => {
            const producto = this.productosData[dataPointIndex];
            return `
              <div>
                <strong>Vendidos:</strong> ${value} unidades<br>
                <strong>Ingresos:</strong> $${producto.ingresos.toLocaleString('es-CO')}<br>
                <strong>Categoría:</strong> ${producto.categoria}
              </div>
            `;
          }
        }
      }
    };
  }

  updateData(productos: ProductoTop[]) {
    this.productosData = productos;
    
    this.chartOptions.series = [{
      data: productos.map(p => p.cantidadVendida)
    }];

    this.chartOptions.xaxis = {
      ...this.chartOptions.xaxis,
      categories: productos.map(p => p.nombre)
    };
  }
}
```

### **4. Categorías (Donut Chart)**

```typescript
// categorias-chart.component.ts
export class CategoriasChartComponent {
  public chartOptions: ApexOptions;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 300
      },
      labels: [],
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Ventas',
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                  return '$' + (total / 1000000).toFixed(1) + 'M';
                }
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val, opt) => {
          return val.toFixed(1) + '%';
        }
      },
      tooltip: {
        y: {
          formatter: (value, { dataPointIndex }) => {
            const categoria = this.categoriasData[dataPointIndex];
            return `$${categoria.ventas.toLocaleString('es-CO')} (${categoria.cantidad} productos)`;
          }
        }
      }
    };
  }

  updateData(categorias: CategoriaVentas[]) {
    this.categoriasData = categorias;
    
    this.chartOptions.series = categorias.map(c => c.porcentaje);
    this.chartOptions.labels = categorias.map(c => c.categoria);
  }
}
```

### **5. Métodos de Pago (Pie Chart)**

```typescript
// pagos-chart.component.ts
export class PagosChartComponent {
  public chartOptions: ApexOptions;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: 'pie',
        height: 300
      },
      labels: [],
      colors: ['#775DD0', '#FEB019', '#FF4560', '#00E396', '#008FFB'],
      legend: {
        position: 'right',
        offsetY: 0,
        height: 230
      },
      dataLabels: {
        enabled: true,
        formatter: (val, opt) => {
          return val.toFixed(1) + '%';
        }
      },
      tooltip: {
        y: {
          formatter: (value, { dataPointIndex }) => {
            const metodo = this.metodosData[dataPointIndex];
            return `${metodo.cantidad} transacciones (${value.toFixed(1)}%)`;
          }
        }
      }
    };
  }

  updateData(metodos: MetodoPago[]) {
    this.metodosData = metodos;
    
    this.chartOptions.series = metodos.map(m => m.porcentaje);
    this.chartOptions.labels = metodos.map(m => m.metodo);
  }
}
```

---

## <a name="mapas"></a>🗺️ **Implementación de Mapas con Leaflet**

### **Instalación**

```bash
npm install leaflet
npm install @types/leaflet
```

### **Componente de Mapa**

```typescript
// mapa-ciudades.component.ts
import * as L from 'leaflet';

export class MapaCiudadesComponent implements OnInit, OnDestroy {
  private map: L.Map;
  private markersLayer: L.LayerGroup;

  ngOnInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    // Inicializar mapa centrado en Colombia
    this.map = L.map('mapContainer', {
      center: [4.5709, -74.2973], // Colombia
      zoom: 6
    });

    // Agregar capa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Inicializar capa de marcadores
    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  updateData(ciudades: CiudadVentas[]) {
    // Limpiar marcadores existentes
    this.markersLayer.clearLayers();

    // Calcular valores para normalización
    const maxVentas = Math.max(...ciudades.map(c => c.ventas));
    const minVentas = Math.min(...ciudades.map(c => c.ventas));

    ciudades.forEach(ciudad => {
      if (ciudad.coordenadas.lat !== 0 && ciudad.coordenadas.lng !== 0) {
        // Calcular tamaño del marcador basado en ventas
        const normalized = (ciudad.ventas - minVentas) / (maxVentas - minVentas);
        const radius = 8 + (normalized * 20); // Entre 8 y 28 px

        // Determinar color basado en volumen de ventas
        let color = '#008FFB'; // Azul por defecto
        if (normalized > 0.7) color = '#00E396'; // Verde para altas ventas
        else if (normalized < 0.3) color = '#FF4560'; // Rojo para bajas ventas

        // Crear marcador circular
        const marker = L.circleMarker([ciudad.coordenadas.lat, ciudad.coordenadas.lng], {
          radius: radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        // Popup con información detallada
        const popupContent = `
          <div class="ciudad-popup">
            <h4>${ciudad.ciudad}</h4>
            <p><strong>Departamento:</strong> ${ciudad.departamento}</p>
            <p><strong>Ventas:</strong> $${ciudad.ventas.toLocaleString('es-CO')}</p>
            <p><strong>Pedidos:</strong> ${ciudad.pedidos}</p>
            <p><strong>Promedio por pedido:</strong> $${Math.round(ciudad.ventas / ciudad.pedidos).toLocaleString('es-CO')}</p>
          </div>
        `;

        marker.bindPopup(popupContent);
        
        // Agregar a la capa
        this.markersLayer.addLayer(marker);
      }
    });

    // Ajustar vista para mostrar todos los marcadores
    if (ciudades.length > 0) {
      const group = new L.featureGroup(this.markersLayer.getLayers());
      this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  }
}
```

### **Template del Mapa**

```html
<!-- mapa-ciudades.component.html -->
<div class="map-container">
  <div class="map-header">
    <h3>Ventas por Ciudad</h3>
    <div class="map-legend">
      <div class="legend-item">
        <span class="legend-color high"></span>
        <span>Altas ventas</span>
      </div>
      <div class="legend-item">
        <span class="legend-color medium"></span>
        <span>Ventas medias</span>
      </div>
      <div class="legend-item">
        <span class="legend-color low"></span>
        <span>Bajas ventas</span>
      </div>
    </div>
  </div>
  <div id="mapContainer" class="map-element"></div>
</div>
```

### **Estilos del Mapa**

```scss
// mapa-ciudades.component.scss
.map-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-header {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    color: #333;
  }
}

.map-legend {
  display: flex;
  gap: 1rem;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid #fff;

    &.high { background-color: #00E396; }
    &.medium { background-color: #008FFB; }
    &.low { background-color: #FF4560; }
  }
}

.map-element {
  flex: 1;
  min-height: 400px;
}

// Estilos para popups
::ng-deep .ciudad-popup {
  h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    
    strong {
      color: #555;
    }
  }
}
```

---

## <a name="componentes"></a>🧩 **Componentes Sugeridos**

### **Servicio de Analytics**

```typescript
// analytics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = 'https://your-api.com/v1/analytics';

  constructor(private http: HttpClient) {}

  getDashboardCore(fechaInicio: string, fechaFin: string, company?: string): Observable<DashboardCoreResponse> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    return this.http.get<DashboardCoreResponse>(`${this.baseUrl}/dashboard-core`, { params });
  }

  getDashboardDetails(fechaInicio: string, fechaFin: string, company?: string): Observable<DashboardDetailsResponse> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    return this.http.get<DashboardDetailsResponse>(`${this.baseUrl}/dashboard-details`, { params });
  }
}
```

### **Componente Principal del Dashboard**

```typescript
// dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Estados de carga
  coreLoading = true;
  detailsLoading = true;
  
  // Datos
  coreData: DashboardCoreResponse;
  detailsData: DashboardDetailsResponse;
  
  // Filtros
  fechaInicio = '2024-01-01';
  fechaFin = '2024-12-31';
  company: string;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  async loadDashboard() {
    // 1. Cargar datos críticos primero
    this.loadCoreData();
    
    // 2. Cargar detalles en paralelo
    this.loadDetailsData();
  }

  private async loadCoreData() {
    try {
      this.coreLoading = true;
      this.coreData = await this.analyticsService
        .getDashboardCore(this.fechaInicio, this.fechaFin, this.company)
        .toPromise();
      this.coreLoading = false;
    } catch (error) {
      console.error('Error cargando datos críticos:', error);
      this.coreLoading = false;
    }
  }

  private async loadDetailsData() {
    try {
      this.detailsLoading = true;
      this.detailsData = await this.analyticsService
        .getDashboardDetails(this.fechaInicio, this.fechaFin, this.company)
        .toPromise();
      this.detailsLoading = false;
    } catch (error) {
      console.error('Error cargando datos detallados:', error);
      this.detailsLoading = false;
    }
  }

  onFiltersChange(filtros: any) {
    this.fechaInicio = filtros.fechaInicio;
    this.fechaFin = filtros.fechaFin;
    this.company = filtros.company;
    this.loadDashboard();
  }
}
```

---

## <a name="carga"></a>⚡ **Estrategia de Carga Progresiva**

### **Template Principal**

```html
<!-- dashboard.component.html -->
<div class="dashboard-container">
  <!-- Filtros -->
  <div class="dashboard-filters">
    <app-filtros-dashboard 
      (filtersChange)="onFiltersChange($event)"
      [loading]="coreLoading">
    </app-filtros-dashboard>
  </div>

  <!-- KPIs - Carga inmediata -->
  <div class="kpi-section">
    <div *ngIf="coreLoading" class="skeleton-kpis">
      <div class="skeleton-card" *ngFor="let i of [1,2,3,4]"></div>
    </div>
    <app-kpi-cards 
      *ngIf="!coreLoading && coreData" 
      [kpis]="coreData.kpis">
    </app-kpi-cards>
  </div>

  <!-- Gráficos principales -->
  <div class="charts-grid">
    <!-- Ventas por período - Inmediato -->
    <div class="chart-item large">
      <div *ngIf="coreLoading" class="skeleton-chart large"></div>
      <app-ventas-chart 
        *ngIf="!coreLoading && coreData"
        [ventasPorPeriodo]="coreData.ventasPorPeriodo">
      </app-ventas-chart>
    </div>

    <!-- Mapa - Diferido -->
    <div class="chart-item medium">
      <div *ngIf="detailsLoading" class="skeleton-chart medium">
        <div class="skeleton-text">Cargando mapa...</div>
      </div>
      <app-mapa-ciudades 
        *ngIf="!detailsLoading && detailsData"
        [ciudades]="detailsData.ciudades">
      </app-mapa-ciudades>
    </div>

    <!-- Productos top - Diferido -->
    <div class="chart-item medium">
      <div *ngIf="detailsLoading" class="skeleton-chart medium">
        <div class="skeleton-text">Cargando productos...</div>
      </div>
      <app-productos-chart 
        *ngIf="!detailsLoading && detailsData"
        [productos]="detailsData.productosTop">
      </app-productos-chart>
    </div>

    <!-- Categorías - Diferido -->
    <div class="chart-item small">
      <div *ngIf="detailsLoading" class="skeleton-chart small">
        <div class="skeleton-text">Cargando categorías...</div>
      </div>
      <app-categorias-chart 
        *ngIf="!detailsLoading && detailsData"
        [categorias]="detailsData.categorias">
      </app-categorias-chart>
    </div>

    <!-- Métodos de pago - Diferido -->
    <div class="chart-item small">
      <div *ngIf="detailsLoading" class="skeleton-chart small">
        <div class="skeleton-text">Cargando métodos...</div>
      </div>
      <app-pagos-chart 
        *ngIf="!detailsLoading && detailsData"
        [metodos]="detailsData.metodosPago">
      </app-pagos-chart>
    </div>
  </div>
</div>
```

### **Skeleton Screens CSS**

```scss
// skeletons.scss
.skeleton-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.skeleton-card {
  height: 120px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

.skeleton-chart {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.large { height: 350px; }
  &.medium { height: 300px; }
  &.small { height: 250px; }
}

.skeleton-text {
  color: #999;
  font-size: 0.875rem;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## <a name="ejemplos"></a>💻 **Ejemplos de Código Completos**

### **Ejemplo 1: Componente Dashboard Completo**

```typescript
// dashboard-analytics.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-analytics',
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estados
  coreLoading = true;
  detailsLoading = true;
  error: string | null = null;
  
  // Datos
  coreData: DashboardCoreResponse | null = null;
  detailsData: DashboardDetailsResponse | null = null;
  
  // Configuración de filtros
  filtrosConfig = {
    fechaInicio: '2024-01-01',
    fechaFin: '2024-12-31',
    company: null
  };

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadDashboard() {
    this.error = null;
    
    // Carga progresiva
    Promise.all([
      this.loadCoreData(),
      this.loadDetailsData()
    ]).catch(error => {
      this.error = 'Error cargando el dashboard. Por favor, intenta nuevamente.';
      console.error('Dashboard loading error:', error);
    });
  }

  private loadCoreData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.coreLoading = true;
      
      this.analyticsService
        .getDashboardCore(
          this.filtrosConfig.fechaInicio, 
          this.filtrosConfig.fechaFin, 
          this.filtrosConfig.company
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.coreData = data;
            this.coreLoading = false;
            resolve();
          },
          error: (error) => {
            this.coreLoading = false;
            reject(error);
          }
        });
    });
  }

  private loadDetailsData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.detailsLoading = true;
      
      this.analyticsService
        .getDashboardDetails(
          this.filtrosConfig.fechaInicio, 
          this.filtrosConfig.fechaFin, 
          this.filtrosConfig.company
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.detailsData = data;
            this.detailsLoading = false;
            resolve();
          },
          error: (error) => {
            this.detailsLoading = false;
            reject(error);
          }
        });
    });
  }

  onFiltersChange(newFilters: any) {
    this.filtrosConfig = { ...this.filtrosConfig, ...newFilters };
    this.loadDashboard();
  }

  onRefresh() {
    this.loadDashboard();
  }

  onExportData() {
    // Implementar exportación de datos
    console.log('Exportando datos...', {
      core: this.coreData,
      details: this.detailsData
    });
  }
}
```

---

## <a name="best-practices"></a>🏆 **Best Practices**

### **Performance**

1. **Lazy Loading de Componentes**
```typescript
// dashboard-routing.module.ts
const routes: Routes = [
  {
    path: 'analytics',
    loadChildren: () => import('./analytics/analytics.module').then(m => m.AnalyticsModule)
  }
];
```

2. **OnPush Change Detection**
```typescript
@Component({
  selector: 'app-ventas-chart',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VentasChartComponent {
  // Optimizado para performance
}
```

3. **Memoización de Cálculos**
```typescript
@Component({
  template: `
    <div>{{expensiveCalculation(data) | async}}</div>
  `
})
export class ChartComponent {
  private calculationCache = new Map();
  
  expensiveCalculation(data: any): Observable<any> {
    const key = JSON.stringify(data);
    if (this.calculationCache.has(key)) {
      return of(this.calculationCache.get(key));
    }
    
    return this.performCalculation(data).pipe(
      tap(result => this.calculationCache.set(key, result))
    );
  }
}
```

### **Error Handling**

```typescript
// error-handling.service.ts
@Injectable()
export class ErrorHandlingService {
  handleDashboardError(error: any): string {
    if (error.status === 0) {
      return 'Sin conexión a internet. Verifica tu conectividad.';
    }
    
    if (error.status >= 500) {
      return 'Error del servidor. Intenta nuevamente en unos minutos.';
    }
    
    if (error.status === 401) {
      return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
    }
    
    return error.error?.message || 'Error inesperado. Contacta al soporte.';
  }
}
```

### **Responsive Design**

```scss
// dashboard-responsive.scss
.charts-grid {
  display: grid;
  gap: 1.5rem;
  
  // Desktop
  @media (min-width: 1200px) {
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto auto;
    
    .chart-item.large {
      grid-column: 1;
      grid-row: 1 / 3;
    }
  }
  
  // Tablet
  @media (min-width: 768px) and (max-width: 1199px) {
    grid-template-columns: 1fr 1fr;
    
    .chart-item.large {
      grid-column: 1 / 3;
    }
  }
  
  // Mobile
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    
    .chart-item {
      min-height: 250px;
    }
  }
}
```

### **Testing**

```typescript
// dashboard.component.spec.ts
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AnalyticsService', ['getDashboardCore', 'getDashboardDetails']);
    
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: spy }
      ]
    });
    
    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
  });

  it('should load core data on init', async () => {
    const mockData: DashboardCoreResponse = {
      // mock data
    };
    
    analyticsService.getDashboardCore.and.returnValue(of(mockData));
    
    component.ngOnInit();
    
    expect(analyticsService.getDashboardCore).toHaveBeenCalled();
    expect(component.coreData).toEqual(mockData);
  });
});
```

---

## 📞 **Soporte y Contacto**

Para dudas sobre la implementación:

- **Backend API:** Equipo Backend Katuq
- **Documentación:** [Confluence/Wiki del proyecto]
- **Issues:** [Sistema de tickets interno]

---

**Última actualización:** 26 de Diciembre, 2024  
**Versión:** 1.0.0  
**Próxima revisión:** Enero 2025