import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { 
  DashboardCoreResponse, 
  DashboardDetailsResponse, 
  FiltrosDashboard 
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
} 