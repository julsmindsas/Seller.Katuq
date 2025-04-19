import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  kpiGeneralMock, 
  metricasGlobalesMock, 
  tiendasMock, 
  engagementDataMock, 
  ltvDataMock, 
  advancedMetricsMock 
} from './mock-data/analytics-mock';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = environment.urlApi;
  private useMockData = false; // Cambiar a false cuando los endpoints estén disponibles

  constructor(private http: HttpClient) { }

  // Obtener KPIs generales
  getKpiGeneral(): Observable<any> {
    if (this.useMockData) {
      return of(kpiGeneralMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/kpi/general`)
      .pipe(
        catchError(() => of(kpiGeneralMock))
      );
  }

  // Obtener análisis de usuarios
  getAnalysisUsers(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.userAnalysis);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/users`)
      .pipe(
        catchError(() => of(advancedMetricsMock.userAnalysis))
      );
  }

  // Obtener métricas globales
  getGlobalMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(metricasGlobalesMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/metrics/global`)
      .pipe(
        catchError(() => of(metricasGlobalesMock))
      );
  }

  // Obtener datos de tiendas
  getStoresData(): Observable<any> {
    if (this.useMockData) {
      return of(tiendasMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/stores`)
      .pipe(
        catchError(() => of(tiendasMock))
      );
  }

  // Obtener datos de engagement
  getEngagementData(): Observable<any> {
    if (this.useMockData) {
      return of(engagementDataMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/engagement`)
      .pipe(
        catchError(() => of(engagementDataMock))
      );
  }

  // Obtener datos de LTV
  getLTVData(): Observable<any> {
    if (this.useMockData) {
      return of(ltvDataMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/ltv`)
      .pipe(
        catchError(() => of(ltvDataMock))
      );
  }

  // Obtener métricas avanzadas (todas las métricas en una sola llamada)
  getAdvancedMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/advanced`)
      .pipe(
        catchError(() => of(advancedMetricsMock))
      );
  }

  // Obtener métricas de crecimiento
  getGrowthMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.growthMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/growth`)
      .pipe(
        catchError(() => of(advancedMetricsMock.growthMetrics))
      );
  }

  // Obtener métricas de conversión
  getConversionMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.conversionMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/conversion`)
      .pipe(
        catchError(() => of(advancedMetricsMock.conversionMetrics))
      );
  }

  // Obtener métricas de rendimiento
  getPerformanceMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.performanceMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/performance`)
      .pipe(
        catchError(() => of(advancedMetricsMock.performanceMetrics))
      );
  }

  // Obtener tendencias por categoría
  getCategoryTrends(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.categoryTrends);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/categories`)
      .pipe(
        catchError(() => of(advancedMetricsMock.categoryTrends))
      );
  }

  // Obtener métricas de marketing
  getMarketingMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.marketingMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/marketing`)
      .pipe(
        catchError(() => of(advancedMetricsMock.marketingMetrics))
      );
  }
} 