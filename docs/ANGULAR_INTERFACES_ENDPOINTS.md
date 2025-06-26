# Interfaces Angular y Endpoints - Katuq Analytics

## 📋 **Índice**
1. [Endpoints Disponibles](#endpoints)
2. [Interfaces TypeScript para Angular](#interfaces)
3. [Servicios Angular](#servicios)
4. [Ejemplos de Uso](#ejemplos)
5. [Configuración de Interceptors](#interceptors)

---

## <a name="endpoints"></a>🌐 **Endpoints Disponibles**

### **Base URL**
```typescript
const BASE_URL = 'https://your-domain.com/v1/analytics';
// O para desarrollo local:
const BASE_URL = 'http://localhost:5001/julsmind-katuq/us-central1/app/v1/analytics';
```

### **Dashboard Principal**
```typescript
// Datos críticos (carga rápida)
GET ${BASE_URL}/dashboard-core?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&company=optional

// Datos detallados (análisis profundo)
GET ${BASE_URL}/dashboard-details?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&company=optional
```

### **Módulo Pedidos**
```typescript
// Análisis de flujo de estados
GET ${BASE_URL}/pedidos/flujo-estados?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&company=optional

// Análisis de tiempos de procesamiento
GET ${BASE_URL}/pedidos/tiempos-procesamiento?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&company=optional

// Análisis de clientes
GET ${BASE_URL}/pedidos/analisis-clientes?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&company=optional
```

---

## <a name="interfaces"></a>📝 **Interfaces TypeScript para Angular**

### **Interfaces Base**
```typescript
// shared/interfaces/analytics-base.interface.ts
export interface PeriodoInfo {
  inicio: string;           // YYYY-MM-DD
  fin: string;             // YYYY-MM-DD
  dias?: number;           // Días en el período
}

export interface FiltrosAnalytics {
  fechaInicio: string;     // YYYY-MM-DD (requerido)
  fechaFin: string;        // YYYY-MM-DD (requerido)
  company?: string;        // Opcional
}

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: number;
}
```

### **Dashboard Principal**
```typescript
// shared/interfaces/dashboard.interface.ts
export interface DashboardCoreResponse {
  periodo: PeriodoInfo;
  kpis: KPIsCriticos;
  ventasPorPeriodo: VentaDiaria[];
}

export interface KPIsCriticos {
  ventasTotales: number;
  ventasBrutas: number;
  ticketPromedio: number;
  tasaConversion: number;
  totalPedidos: number;
  pedidosAprobados: number;
  crecimientoVentas: number;
}

export interface VentaDiaria {
  fecha: string;           // YYYY-MM-DD
  ventas: number;
  pedidos: number;
}

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

### **Módulo Pedidos**
```typescript
// shared/interfaces/pedidos-analytics.interface.ts
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

export interface AnalisisClientesResponse {
  periodo: PeriodoInfo;
  resumen: ResumenClientes;
  topClientes: TopCliente[];
  distribucionFrecuencia: DistribucionFrecuencia[];
  insights: InsightsClientes;
}

export interface ResumenClientes {
  totalClientes: number;
  clientesNuevos: number;
  clientesRecurrentes: number;
  porcentajeNuevos: number;
  porcentajeRecurrentes: number;
}

export interface TopCliente {
  id: string;
  nombre: string;
  email: string;
  totalPedidos: number;
  totalVentas: number;
  ventaPromedio: number;
  tasaConversion: number;
}

export interface DistribucionFrecuencia {
  rango: string;
  cantidad: number;
  porcentaje: number;
  ventas: number;
  ventaPromedio: number;
}

export interface InsightsClientes {
  clienteMasValioso: TopCliente | null;
  frecuenciaMasComun: string | null;
  tasaRetencion: number;
  ventaPromedioClienteNuevo: number;
}
```

---

## <a name="servicios"></a>🔧 **Servicios Angular**

### **Servicio Base de Analytics**
```typescript
// services/analytics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  DashboardCoreResponse, 
  DashboardDetailsResponse, 
  FiltrosAnalytics 
} from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = `${environment.apiUrl}/v1/analytics`;

  constructor(private http: HttpClient) {}

  // Dashboard Principal
  getDashboardCore(filtros: FiltrosAnalytics): Observable<DashboardCoreResponse> {
    const params = this.buildParams(filtros);
    return this.http.get<DashboardCoreResponse>(`${this.baseUrl}/dashboard-core`, { params });
  }

  getDashboardDetails(filtros: FiltrosAnalytics): Observable<DashboardDetailsResponse> {
    const params = this.buildParams(filtros);
    return this.http.get<DashboardDetailsResponse>(`${this.baseUrl}/dashboard-details`, { params });
  }

  private buildParams(filtros: FiltrosAnalytics): HttpParams {
    let params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin', filtros.fechaFin);

    if (filtros.company) {
      params = params.set('company', filtros.company);
    }

    return params;
  }
}
```

### **Servicio de Analytics de Pedidos**
```typescript
// services/pedidos-analytics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  FlujoEstadosResponse,
  TiemposProcesamientoResponse,
  AnalisisClientesResponse,
  FiltrosAnalytics 
} from '../interfaces/pedidos-analytics.interface';

@Injectable({
  providedIn: 'root'
})
export class PedidosAnalyticsService {
  private readonly baseUrl = `${environment.apiUrl}/v1/analytics/pedidos`;

  constructor(private http: HttpClient) {}

  getFlujoEstados(filtros: FiltrosAnalytics): Observable<FlujoEstadosResponse> {
    const params = this.buildParams(filtros);
    return this.http.get<FlujoEstadosResponse>(`${this.baseUrl}/flujo-estados`, { params });
  }

  getTiemposProcesamiento(filtros: FiltrosAnalytics): Observable<TiemposProcesamientoResponse> {
    const params = this.buildParams(filtros);
    return this.http.get<TiemposProcesamientoResponse>(`${this.baseUrl}/tiempos-procesamiento`, { params });
  }

  getAnalisisClientes(filtros: FiltrosAnalytics): Observable<AnalisisClientesResponse> {
    const params = this.buildParams(filtros);
    return this.http.get<AnalisisClientesResponse>(`${this.baseUrl}/analisis-clientes`, { params });
  }

  private buildParams(filtros: FiltrosAnalytics): HttpParams {
    let params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin', filtros.fechaFin);

    if (filtros.company) {
      params = params.set('company', filtros.company);
    }

    return params;
  }
}
```

---

## <a name="ejemplos"></a>💻 **Ejemplos de Uso en Componentes**

### **Componente Dashboard Principal**
```typescript
// components/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AnalyticsService } from '../../services/analytics.service';
import { 
  DashboardCoreResponse, 
  DashboardDetailsResponse, 
  FiltrosAnalytics 
} from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estados de carga
  coreLoading = true;
  detailsLoading = true;
  
  // Datos
  coreData: DashboardCoreResponse | null = null;
  detailsData: DashboardDetailsResponse | null = null;
  
  // Filtros
  filtros: FiltrosAnalytics = {
    fechaInicio: '2024-01-01',
    fechaFin: '2024-12-31'
  };

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    // Carga progresiva
    this.loadCoreData();
    this.loadDetailsData();
  }

  private loadCoreData(): void {
    this.coreLoading = true;
    
    this.analyticsService.getDashboardCore(this.filtros)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.coreLoading = false)
      )
      .subscribe({
        next: (data) => this.coreData = data,
        error: (error) => console.error('Error cargando datos críticos:', error)
      });
  }

  private loadDetailsData(): void {
    this.detailsLoading = true;
    
    this.analyticsService.getDashboardDetails(this.filtros)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.detailsLoading = false)
      )
      .subscribe({
        next: (data) => this.detailsData = data,
        error: (error) => console.error('Error cargando datos detallados:', error)
      });
  }

  onFiltersChange(newFiltros: FiltrosAnalytics): void {
    this.filtros = newFiltros;
    this.loadDashboard();
  }
}
```

### **Componente Análisis de Pedidos**
```typescript
// components/pedidos-analytics/pedidos-analytics.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PedidosAnalyticsService } from '../../services/pedidos-analytics.service';
import { 
  FlujoEstadosResponse,
  TiemposProcesamientoResponse,
  AnalisisClientesResponse,
  FiltrosAnalytics 
} from '../../interfaces/pedidos-analytics.interface';

@Component({
  selector: 'app-pedidos-analytics',
  templateUrl: './pedidos-analytics.component.html',
  styleUrls: ['./pedidos-analytics.component.scss']
})
export class PedidosAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estados de carga
  flujoLoading = false;
  tiemposLoading = false;
  clientesLoading = false;
  
  // Datos
  flujoData: FlujoEstadosResponse | null = null;
  tiemposData: TiemposProcesamientoResponse | null = null;
  clientesData: AnalisisClientesResponse | null = null;
  
  // Filtros
  filtros: FiltrosAnalytics = {
    fechaInicio: '2024-01-01',
    fechaFin: '2024-12-31'
  };

  constructor(private pedidosService: PedidosAnalyticsService) {}

  ngOnInit(): void {
    this.loadAllAnalytics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllAnalytics(): void {
    this.loadFlujoEstados();
    this.loadTiemposProcesamiento();
    this.loadAnalisisClientes();
  }

  loadFlujoEstados(): void {
    this.flujoLoading = true;
    
    this.pedidosService.getFlujoEstados(this.filtros)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.flujoLoading = false)
      )
      .subscribe({
        next: (data) => this.flujoData = data,
        error: (error) => console.error('Error cargando flujo de estados:', error)
      });
  }

  loadTiemposProcesamiento(): void {
    this.tiemposLoading = true;
    
    this.pedidosService.getTiemposProcesamiento(this.filtros)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.tiemposLoading = false)
      )
      .subscribe({
        next: (data) => this.tiemposData = data,
        error: (error) => console.error('Error cargando tiempos:', error)
      });
  }

  loadAnalisisClientes(): void {
    this.clientesLoading = true;
    
    this.pedidosService.getAnalisisClientes(this.filtros)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.clientesLoading = false)
      )
      .subscribe({
        next: (data) => this.clientesData = data,
        error: (error) => console.error('Error cargando análisis de clientes:', error)
      });
  }

  onFiltersChange(newFiltros: FiltrosAnalytics): void {
    this.filtros = newFiltros;
    this.loadAllAnalytics();
  }
}
```

---

## <a name="interceptors"></a>🔒 **Configuración de Interceptors**

### **Auth Interceptor**
```typescript
// interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const authToken = this.authService.getToken();
    
    if (authToken) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return next.handle(authReq);
    }
    
    return next.handle(req);
  }
}
```

### **Error Interceptor**
```typescript
// interceptors/error.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toastr: ToastrService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Error inesperado';
        
        if (error.status === 0) {
          errorMessage = 'Sin conexión a internet';
        } else if (error.status === 401) {
          errorMessage = 'Sesión expirada';
        } else if (error.status >= 500) {
          errorMessage = 'Error del servidor';
        } else if (error.error?.error) {
          errorMessage = error.error.error;
        }
        
        this.toastr.error(errorMessage, 'Error');
        return throwError(() => error);
      })
    );
  }
}
```

### **Configuración en app.module.ts**
```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';

@NgModule({
  // ...
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

---

## 🌟 **Environment Configuration**

### **environment.ts**
```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5001/julsmind-katuq/us-central1/app',
  // O para desarrollo con emulador
  // apiUrl: 'http://localhost:5001/demo-project/us-central1/app'
};
```

### **environment.prod.ts**
```typescript
// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-production-domain.com'
};
```

---

## ⚡ **Ejemplo de Uso Completo**

### **Template HTML**
```html
<!-- dashboard.component.html -->
<div class="dashboard-container">
  <!-- Filtros -->
  <app-filtros-dashboard 
    [filtros]="filtros"
    (filtersChange)="onFiltersChange($event)">
  </app-filtros-dashboard>

  <!-- KPIs -->
  <div class="kpis-section" *ngIf="!coreLoading && coreData">
    <app-kpi-card 
      label="Ventas Totales"
      [value]="coreData.kpis.ventasTotales"
      format="currency"
      [trend]="coreData.kpis.crecimientoVentas">
    </app-kpi-card>
    
    <app-kpi-card 
      label="Ticket Promedio"
      [value]="coreData.kpis.ticketPromedio"
      format="currency">
    </app-kpi-card>
    
    <app-kpi-card 
      label="Tasa Conversión"
      [value]="coreData.kpis.tasaConversion"
      format="percentage">
    </app-kpi-card>
  </div>

  <!-- Skeleton mientras carga -->
  <div class="skeleton-kpis" *ngIf="coreLoading">
    <div class="skeleton-card" *ngFor="let i of [1,2,3,4]"></div>
  </div>

  <!-- Gráficos -->
  <div class="charts-grid">
    <app-ventas-chart 
      *ngIf="!coreLoading && coreData"
      [data]="coreData.ventasPorPeriodo">
    </app-ventas-chart>
    
    <app-productos-chart 
      *ngIf="!detailsLoading && detailsData"
      [data]="detailsData.productosTop">
    </app-productos-chart>
  </div>
</div>
```

Este archivo proporciona todo lo necesario para implementar los dashboards analytics en Angular con tipado completo y manejo de errores robusto.