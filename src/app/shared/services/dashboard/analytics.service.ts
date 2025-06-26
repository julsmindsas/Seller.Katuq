import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { 
  DashboardCoreResponse, 
  DashboardDetailsResponse, 
  FiltrosDashboard,
  FlujoEstadosResponse,
  TiemposProcesamientoResponse,
  PerformanceEntregasResponse,
  AnalisisGeograficoResponse
} from '../../../components/dashboard/model/dashboard-interfaces';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = `${environment.urlApi}/v1/analytics`;

  constructor(private http: HttpClient) {
    console.log(`🔗 Analytics Service inicializado con baseUrl: ${this.baseUrl}`);
    this.verificarEstadoAutenticacion();
  }

  /**
   * Verifica el estado de autenticación del usuario
   */
  private verificarEstadoAutenticacion(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        console.log('👤 Usuario en localStorage:', {
          email: user.email,
          company: user.company,
          hasToken: !!user.token,
          tokenLength: user.token ? user.token.length : 0,
          rol: user.rol
        });
      } catch (error) {
        console.error('❌ Error al parsear usuario:', error);
      }
    } else {
      console.warn('⚠️ No hay usuario en localStorage');
    }
  }

  /**
   * Maneja errores específicos de autenticación
   */
  private handleAuthError(error: any): Observable<never> {
    if (error.status === 401) {
      console.error('🔐 Error 401: No autorizado. Verificando token...');
      this.verificarEstadoAutenticacion();
      
      const errorMessage = error.error?.message || 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      return throwError({
        ...error,
        userMessage: errorMessage
      });
    }
    
    if (error.status === 403) {
      console.error('🚫 Error 403: Prohibido. Usuario sin permisos para este recurso.');
      return throwError({
        ...error,
        userMessage: 'No tienes permisos para acceder a esta información.'
      });
    }

    return throwError(error);
  }

  /**
   * Obtiene los datos críticos del dashboard (KPIs + Ventas por período)
   * Carga inmediata - debe responder en < 2 segundos
   */
  getDashboardCore(fechaInicio: string, fechaFin: string, company?: string): Observable<DashboardCoreResponse> {
    console.log(`🚀 Iniciando getDashboardCore...`);
    this.verificarEstadoAutenticacion();

    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    const url = `${this.baseUrl}/dashboard-core`;
    console.log(`📡 GET ${url}?${params.toString()}`);

    return this.http.get<DashboardCoreResponse>(url, { params }).pipe(
      tap(
        (response) => console.log(`✅ Core response:`, response),
        (error) => console.error(`❌ Core error:`, error)
      ),
      catchError(this.handleAuthError.bind(this))
    );
  }

  /**
   * Obtiene los datos detallados del dashboard (Productos, Categorías, Métodos pago, Ciudades)
   * Carga diferida - puede tardar hasta 5 segundos
   */
  getDashboardDetails(fechaInicio: string, fechaFin: string, company?: string): Observable<DashboardDetailsResponse> {
    console.log(`🚀 Iniciando getDashboardDetails...`);
    this.verificarEstadoAutenticacion();

    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    const url = `${this.baseUrl}/dashboard-details`;
    console.log(`📡 GET ${url}?${params.toString()}`);

    return this.http.get<DashboardDetailsResponse>(url, { params }).pipe(
      tap(
        (response) => console.log(`✅ Details response:`, response),
        (error) => console.error(`❌ Details error:`, error)
      ),
      catchError(this.handleAuthError.bind(this))
    );
  }

  /**
   * Método con objeto de filtros para compatibilidad futura
   */
  getDashboardCoreWithFilters(filtros: FiltrosDashboard): Observable<DashboardCoreResponse> {
    return this.getDashboardCore(filtros.fechaInicio, filtros.fechaFin, filtros.company);
  }

  getDashboardDetailsWithFilters(filtros: FiltrosDashboard): Observable<DashboardDetailsResponse> {
    return this.getDashboardDetails(filtros.fechaInicio, filtros.fechaFin, filtros.company);
  }

  /**
   * Getter para acceder a la baseUrl desde otros componentes (para debugging)
   */
  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  // ============================================================================
  // NUEVOS ENDPOINTS: ANÁLISIS DE PEDIDOS
  // ============================================================================

  /**
   * Obtiene el análisis de flujo de estados de pedidos
   * Incluye distribución por estados, transiciones, cuellos de botella
   */
  getPedidosFlujoEstados(fechaInicio: string, fechaFin: string, company?: string): Observable<FlujoEstadosResponse> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    return this.http.get<FlujoEstadosResponse>(`${this.baseUrl}/pedidos/flujo-estados`, { params });
  }

  /**
   * Obtiene el análisis de tiempos de procesamiento de pedidos
   * Incluye estadísticas de empacado, despacho y entrega
   */
  getPedidosTiemposProcesamiento(fechaInicio: string, fechaFin: string, company?: string): Observable<TiemposProcesamientoResponse> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    return this.http.get<TiemposProcesamientoResponse>(`${this.baseUrl}/pedidos/tiempos-procesamiento`, { params });
  }

  // ============================================================================
  // NUEVOS ENDPOINTS: ANÁLISIS DE LOGÍSTICA
  // ============================================================================

  /**
   * Obtiene el análisis de performance de entregas
   * Incluye transportadores, zonas, horarios y formas de entrega
   */
  getLogisticaPerformanceEntregas(fechaInicio: string, fechaFin: string, company?: string): Observable<PerformanceEntregasResponse> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    return this.http.get<PerformanceEntregasResponse>(`${this.baseUrl}/logistica/performance-entregas`, { params });
  }

  /**
   * Obtiene el análisis geográfico de cobertura
   * Incluye distribución por zonas, densidad por ciudades, cobertura por bodegas
   */
  getLogisticaAnalisisGeografico(fechaInicio: string, fechaFin: string, company?: string): Observable<AnalisisGeograficoResponse> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (company) {
      params = params.set('company', company);
    }

    return this.http.get<AnalisisGeograficoResponse>(`${this.baseUrl}/logistica/analisis-geografico`, { params });
  }

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA
  // ============================================================================

  /**
   * Construye parámetros HTTP desde el objeto de filtros
   */
  private buildParamsFromFilters(filtros: FiltrosDashboard): HttpParams {
    let params = new HttpParams()
      .set('fechaInicio', filtros.fechaInicio)
      .set('fechaFin', filtros.fechaFin);

    if (filtros.company) {
      params = params.set('company', filtros.company);
    }

    return params;
  }

  /**
   * Versión con objeto de filtros para flujo de estados
   */
  getPedidosFlujoEstadosWithFilters(filtros: FiltrosDashboard): Observable<FlujoEstadosResponse> {
    const params = this.buildParamsFromFilters(filtros);
    return this.http.get<FlujoEstadosResponse>(`${this.baseUrl}/pedidos/flujo-estados`, { params });
  }

  /**
   * Versión con objeto de filtros para tiempos de procesamiento
   */
  getPedidosTiemposProcesamientoWithFilters(filtros: FiltrosDashboard): Observable<TiemposProcesamientoResponse> {
    const params = this.buildParamsFromFilters(filtros);
    return this.http.get<TiemposProcesamientoResponse>(`${this.baseUrl}/pedidos/tiempos-procesamiento`, { params });
  }

  /**
   * Versión con objeto de filtros para performance de entregas
   */
  getLogisticaPerformanceEntregasWithFilters(filtros: FiltrosDashboard): Observable<PerformanceEntregasResponse> {
    const params = this.buildParamsFromFilters(filtros);
    return this.http.get<PerformanceEntregasResponse>(`${this.baseUrl}/logistica/performance-entregas`, { params });
  }

  /**
   * Versión con objeto de filtros para análisis geográfico
   */
  getLogisticaAnalisisGeograficoWithFilters(filtros: FiltrosDashboard): Observable<AnalisisGeograficoResponse> {
    const params = this.buildParamsFromFilters(filtros);
    return this.http.get<AnalisisGeograficoResponse>(`${this.baseUrl}/logistica/analisis-geografico`, { params });
  }

  // ============================================================================
  // MÉTODOS DE DEBUGGING Y UTILIDADES
  // ============================================================================

  /**
   * Obtiene información de la configuración actual del servicio
   */
  getConfigInfo(): any {
    return {
      apiBaseUrl: this.baseUrl,
      environmentUrl: environment.urlApi,
      endpoints: {
        dashboardCore: `${this.baseUrl}/dashboard-core`,
        dashboardDetails: `${this.baseUrl}/dashboard-details`,
        pedidosFlujoEstados: `${this.baseUrl}/pedidos/flujo-estados`,
        pedidosTiemposProcesamiento: `${this.baseUrl}/pedidos/tiempos-procesamiento`,
        logisticaPerformanceEntregas: `${this.baseUrl}/logistica/performance-entregas`,
        logisticaAnalisisGeografico: `${this.baseUrl}/logistica/analisis-geografico`
      }
    };
  }

  /**
   * Valida que los parámetros de fecha sean correctos
   */
  validarParametrosFecha(fechaInicio: string, fechaFin: string): { valido: boolean; error?: string } {
    if (!fechaInicio || !fechaFin) {
      return { valido: false, error: 'Las fechas de inicio y fin son requeridas' };
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return { valido: false, error: 'Las fechas no tienen un formato válido' };
    }

    if (inicio > fin) {
      return { valido: false, error: 'La fecha de inicio no puede ser mayor que la fecha de fin' };
    }

    const diasDiferencia = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
    if (diasDiferencia > 365) {
      return { valido: false, error: 'El rango de fechas no puede ser mayor a 365 días' };
    }

    return { valido: true };
  }
} 