import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, of, BehaviorSubject } from "rxjs";
import { map, catchError, delay } from "rxjs/operators";
import { environment } from "../../../../environments/environment";
import {
  CrmLead,
  LeadFilters,
  LeadsApiResponse,
  LeadStats,
  LeadStatus,
} from "../interfaces/crm-lead.interface";

@Injectable({
  providedIn: "root",
})
export class KatuqFlowService {
  private readonly baseUrl = `${environment.urlApi}/v1/crm-movil`;

  // BehaviorSubject para estado reactivo
  private leadsSubject = new BehaviorSubject<CrmLead[]>([]);
  public leads$ = this.leadsSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log("🚀 Katuq Flow Service initialized with URL:", this.baseUrl);
    console.log("🔧 Environment production:", environment.production);
    console.log("🔧 Base URL API:", environment.urlApi);

    // Verificar datos de usuario
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log("👤 Usuario encontrado:", userData.email);
        console.log("🏢 Company:", userData.company);
        console.log("🔑 Token presente:", !!userData.token);
      } catch (error) {
        console.error("❌ Error al parsear datos de usuario:", error);
      }
    } else {
      console.warn("⚠️ No se encontraron datos de usuario en localStorage");
    }
  }

  /**
   * Obtiene leads con paginación real del servidor
   */
  getLeads(filters?: LeadFilters, page: number = 1, limit: number = 20): Observable<LeadsApiResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.company) {
        params = params.set("company", filters.company);
      }
      if (filters.status) {
        params = params.set("status", filters.status);
      }
      if (filters.source) {
        params = params.set("source", filters.source);
      }
      if (filters.searchTerm) {
        params = params.set("search", filters.searchTerm);
      }
      if (filters.dateFrom) {
        params = params.set("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.set("date_to", filters.dateTo);
      }
    }

    console.log("📡 Making API call to:", `${this.baseUrl}/leads/simple`);
    console.log("📋 Params:", params.toString());
    console.log("📋 Page:", page, "Limit:", limit);

    return this.http
      .get<LeadsApiResponse>(`${this.baseUrl}/leads/simple`, { params })
      .pipe(
        map((response) => {
          console.log("✅ API Response received:", response);
          
          // Validar estructura de respuesta
          if (!response || typeof response !== 'object') {
            throw new Error('Respuesta inválida de la API');
          }

          // Si la API devuelve un array directo, convertirlo al formato esperado
          if (Array.isArray(response)) {
            const dataArray = response as CrmLead[];
            this.leadsSubject.next(dataArray);
            return {
              success: true,
              data: dataArray,
              total: dataArray.length,
              page: page,
              limit: limit,
              message: `Se encontraron ${dataArray.length} leads`,
            };
          }

          // Si ya viene en formato correcto
          if (response.data && Array.isArray(response.data)) {
            this.leadsSubject.next(response.data);
            return response;
          }

          throw new Error('Formato de respuesta no válido');
        }),
        catchError((error) => {
          console.error("❌ Error en API call:", error);
          console.error("❌ Error status:", error?.status);
          console.error("❌ Error message:", error?.message);

          let errorMessage = "Error al obtener los leads";
          if (error?.status === 401) {
            errorMessage = "No autorizado - Verifique su sesión";
          } else if (error?.status === 403) {
            errorMessage = "Acceso denegado - Permisos insuficientes";
          } else if (error?.status === 404) {
            errorMessage = "Endpoint no encontrado - Verifique la configuración";
          } else if (error?.status === 0) {
            errorMessage = "Error de conexión - Verifique la URL de la API";
          }

          return this.handleError<LeadsApiResponse>("getLeads", {
            success: false,
            data: [],
            total: 0,
            page: page,
            limit: limit,
            message: errorMessage,
          })(error);
        }),
      );
  }

  /**
   * Obtiene un lead específico por ID
   */
  getLeadById(mobile_id: number): Observable<CrmLead | null> {
    return this.http
      .get<CrmLead>(`${this.baseUrl}/leads/${mobile_id}`)
      .pipe(catchError(this.handleError<CrmLead | null>("getLeadById", null)));
  }

  /**
   * Actualiza el estado de un lead
   */
  updateLeadStatus(mobile_id: number, status: LeadStatus): Observable<boolean> {
    return this.http
      .put<{
        success: boolean;
      }>(`${this.baseUrl}/leads/${mobile_id}/status`, { status })
      .pipe(
        map((response) => response.success),
        catchError(this.handleError<boolean>("updateLeadStatus", false)),
      );
  }

  /**
   * Agrega una nota o comentario a un lead
   */
  addLeadNote(mobile_id: number, note: string): Observable<boolean> {
    return this.http
      .post<{
        success: boolean;
      }>(`${this.baseUrl}/leads/${mobile_id}/notes`, { note })
      .pipe(
        map((response) => response.success),
        catchError(this.handleError<boolean>("addLeadNote", false)),
      );
  }

  /**
   * Obtiene estadísticas de los leads
   */
  getLeadStats(company?: string): Observable<LeadStats> {
    // Calcular estadísticas desde los leads actuales en memoria
    const currentLeads = this.leadsSubject.value;
    let leads = currentLeads;

    if (company) {
      leads = leads.filter((lead) => lead.company === company);
    }

    const byStatus: Record<LeadStatus, number> = {
      [LeadStatus.NUEVO]: 0,
      [LeadStatus.EN_PROCESO]: 0,
      [LeadStatus.CONTACTADO]: 0,
      [LeadStatus.CALIFICADO]: 0,
      [LeadStatus.PERDIDO]: 0,
      [LeadStatus.CONVERTIDO]: 0,
    };

    const bySource: Record<string, number> = {};

    leads.forEach((lead) => {
      byStatus[lead.status]++;
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    });

    // Actividad reciente (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = leads.filter(
      (lead) => new Date(lead.updated_at) >= sevenDaysAgo,
    ).length;

    const stats: LeadStats = {
      total: leads.length,
      byStatus,
      bySource,
      recentActivity,
    };

    return of(stats);
  }

  /**
   * Obtiene estadísticas de leads aplicando filtros (para sincronizar con la tabla)
   */
  getLeadStatsWithFilters(filters?: LeadFilters): Observable<LeadStats> {
    // Hacer una llamada al servidor para obtener estadísticas con filtros
    let params = new HttpParams();

    if (filters) {
      if (filters.company) {
        params = params.set("company", filters.company);
      }
      if (filters.status) {
        params = params.set("status", filters.status);
      }
      if (filters.source) {
        params = params.set("source", filters.source);
      }
      if (filters.searchTerm) {
        params = params.set("search", filters.searchTerm);
      }
      if (filters.dateFrom) {
        params = params.set("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.set("date_to", filters.dateTo);
      }
    }

    // Por ahora, simular con datos filtrados localmente
    // En el futuro, esto debería ser una llamada a /leads/stats
    return this.http.get<CrmLead[]>(`${this.baseUrl}/leads/simple`, { params }).pipe(
      map((leads) => {
        const byStatus: Record<LeadStatus, number> = {
          [LeadStatus.NUEVO]: 0,
          [LeadStatus.EN_PROCESO]: 0,
          [LeadStatus.CONTACTADO]: 0,
          [LeadStatus.CALIFICADO]: 0,
          [LeadStatus.PERDIDO]: 0,
          [LeadStatus.CONVERTIDO]: 0,
        };

        const bySource: Record<string, number> = {};

        leads.forEach((lead) => {
          byStatus[lead.status]++;
          bySource[lead.source] = (bySource[lead.source] || 0) + 1;
        });

        // Actividad reciente (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentActivity = leads.filter(
          (lead) => new Date(lead.updated_at) >= sevenDaysAgo,
        ).length;

        const stats: LeadStats = {
          total: leads.length,
          byStatus,
          bySource,
          recentActivity,
        };

        console.log("📊 Stats calculated with filters:", stats, filters);
        return stats;
      }),
      catchError((error) => {
        console.error("Error getting stats with filters:", error);
        // Fallback a estadísticas básicas
        return this.getLeadStats(filters?.company);
      })
    );
  }

  /**
   * Sincroniza los datos con el servidor
   */
  syncData(): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(`${this.baseUrl}/sync`, {})
      .pipe(
        map((response) => response.success),
        catchError(this.handleError<boolean>("syncData", false)),
      );
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
      console.error(`🔥 ${operation} failed:`, error);
      console.error(`🔥 Error details:`, {
        status: error?.status,
        statusText: error?.statusText,
        url: error?.url,
        message: error?.message,
        error: error?.error,
      });

      // Logging adicional para debug
      if (error?.status === 0) {
        console.error("🔥 CORS o conexión de red fallida");
      }

      if (error?.status >= 400 && error?.status < 500) {
        console.error("🔥 Error del cliente (4xx)");
      }

      if (error?.status >= 500) {
        console.error("🔥 Error del servidor (5xx)");
      }

      // Retorna un resultado seguro para que la aplicación siga funcionando
      return of(result as T);
    };
  }

  /**
   * Obtiene la lista de empresas disponibles
   */
  getCompanies(): Observable<string[]> {
    // Usar el endpoint simple para obtener todas las empresas
    return this.http.get<CrmLead[]>(`${this.baseUrl}/leads/simple`).pipe(
      map((leads) => {
        const companies = [...new Set(leads.map((lead) => lead.company))];
        console.log("📊 Companies loaded:", companies);
        return companies;
      }),
      catchError((error) => {
        console.error("❌ Error loading companies:", error);
        // Fallback: usar datos actuales en memoria
        const currentLeads = this.leadsSubject.value;
        const companies = [
          ...new Set(currentLeads.map((lead) => lead.company)),
        ];
        return of(companies);
      }),
    );
  }

  /**
   * Obtiene la lista de fuentes disponibles
   */
  getSources(): Observable<string[]> {
    // Usar el endpoint simple para obtener todas las fuentes
    return this.http.get<CrmLead[]>(`${this.baseUrl}/leads/simple`).pipe(
      map((leads) => {
        const sources = [...new Set(leads.map((lead) => lead.source))];
        console.log("📊 Sources loaded:", sources);
        return sources;
      }),
      catchError((error) => {
        console.error("❌ Error loading sources:", error);
        // Fallback: usar datos actuales en memoria
        const currentLeads = this.leadsSubject.value;
        const sources = [...new Set(currentLeads.map((lead) => lead.source))];
        return of(sources);
      }),
    );
  }

  /**
   * Método para testing: obtener la URL base actual
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Prueba de conectividad con la API
   */
  testConnection(): Observable<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    console.log("🧪 Testing API connection to:", this.baseUrl);

    // Intenta una llamada simple a la API con validación
    return this.http.get<any>(`${this.baseUrl}/leads/simple?limit=1`).pipe(
      map((response) => {
        console.log("✅ Connection test successful:", response);
        console.log("🔍 Response type:", typeof response);
        console.log("🔍 Is array:", Array.isArray(response));

        return {
          success: true,
          message: "Conexión exitosa con la API",
          details: {
            url: this.baseUrl,
            responseType: typeof response,
            isArray: Array.isArray(response),
            dataLength: Array.isArray(response)
              ? response.length
              : "Not an array",
          },
        };
      }),
      catchError((error) => {
        console.error("❌ Connection test failed:", error);
        let message = "Error de conexión";

        if (error?.status === 0) {
          message = "No se puede conectar a la API - Verifique CORS y URL";
        } else if (error?.status === 401) {
          message = "Error de autenticación - Token inválido";
        } else if (error?.status === 403) {
          message = "Acceso denegado - Permisos insuficientes";
        } else if (error?.status === 404) {
          message = "Endpoint no encontrado";
        } else if (error?.status >= 500) {
          message = "Error del servidor";
        }

        return of({
          success: false,
          message,
          details: {
            status: error?.status,
            statusText: error?.statusText,
            url: this.baseUrl,
            error: error?.error,
          },
        });
      }),
    );
  }
}
