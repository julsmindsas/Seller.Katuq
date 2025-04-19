import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  private useMockData = false; // Usar datos reales del backend

  constructor(private http: HttpClient) { }

  /**
   * Obtener KPIs generales de todas las tiendas/clientes
   */
  getKpiGeneral(): Observable<any> {
    if (this.useMockData) {
      return of(kpiGeneralMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/kpi/general`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener KPIs generales:', error);
          return of(kpiGeneralMock);
        })
      );
  }

  /**
   * Obtener análisis de usuarios
   */
  getAnalysisUsers(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.userAnalysis);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/users`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener análisis de usuarios:', error);
          return of(advancedMetricsMock.userAnalysis);
        })
      );
  }

  /**
   * Obtener métricas globales
   */
  getGlobalMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(metricasGlobalesMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/metrics/global`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener métricas globales:', error);
          return of(metricasGlobalesMock);
        })
      );
  }

  /**
   * Obtener datos de tiendas
   */
  getStoresData(): Observable<any> {
    if (this.useMockData) {
      return of(tiendasMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/stores`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener datos de tiendas:', error);
          return of(tiendasMock);
        })
      );
  }

  /**
   * Obtener datos de engagement
   */
  getEngagementData(): Observable<any> {
    if (this.useMockData) {
      return of(engagementDataMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/engagement`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener datos de engagement:', error);
          return of(engagementDataMock);
        })
      );
  }

  /**
   * Obtener datos de LTV
   */
  getLTVData(): Observable<any> {
    if (this.useMockData) {
      return of(ltvDataMock);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/ltv`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener datos de LTV:', error);
          return of(ltvDataMock);
        })
      );
  }

  /**
   * Obtener métricas de crecimiento
   */
  getGrowthMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.growthMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/growth`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener métricas de crecimiento:', error);
          return of(advancedMetricsMock.growthMetrics);
        })
      );
  }

  /**
   * Obtener métricas de conversión
   */
  getConversionMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.conversionMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/conversion`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener métricas de conversión:', error);
          return of(advancedMetricsMock.conversionMetrics);
        })
      );
  }

  /**
   * Obtener métricas de rendimiento
   */
  getPerformanceMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.performanceMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/performance`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener métricas de rendimiento:', error);
          return of(advancedMetricsMock.performanceMetrics);
        })
      );
  }

  /**
   * Obtener tendencias por categoría
   */
  getCategoryTrends(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.categoryTrends);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/categories`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener tendencias por categoría:', error);
          return of(advancedMetricsMock.categoryTrends);
        })
      );
  }

  /**
   * Obtener métricas de marketing
   */
  getMarketingMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock.marketingMetrics);
    }
    return this.http.get(`${this.apiUrl}/v1/analytics/marketing`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener métricas de marketing:', error);
          return of(advancedMetricsMock.marketingMetrics);
        })
      );
  }

  /**
   * Obtener métricas avanzadas (todas las métricas en una sola llamada)
   * Este método combina todas las métricas anteriores para reducir
   * el número de peticiones al servidor
   */
  getAdvancedMetrics(): Observable<any> {
    if (this.useMockData) {
      return of(advancedMetricsMock);
    }
    
    // Como no hay un endpoint específico para todas las métricas,
    // podríamos considerar implementarlo en el backend
    // Por ahora, usamos los endpoints individuales y los combinamos
    return this.http.get(`${this.apiUrl}/v1/analytics/kpi/general`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener métricas avanzadas:', error);
          return of(advancedMetricsMock);
        })
      );
  }
} 