import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { companiesMock, companyDetailMock, successResponseMock } from './mock-data/companies-mock';

@Injectable({
  providedIn: 'root'
})
export class CompaniesService {
  private apiUrl = environment.urlApi;
  // Cambiar a false cuando los endpoints reales estén disponibles
  private useMockData = false;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista de todas las empresas
   */
  getAllCompanies(): Observable<any[]> {
    if (this.useMockData) {
      return of(companiesMock);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/all`).pipe(
      catchError(error => {
        console.error('Error al obtener empresas:', error);
        return of(companiesMock);
      })
    );
  }

  /**
   * Obtiene una empresa por su ID
   * @param id ID de la empresa
   */
  getCompanyById(id: string): Observable<any> {
    if (this.useMockData) {
      // Simular tiempo de respuesta del servidor
      return of(companyDetailMock).pipe(
        map(mock => {
          // Si estamos pidiendo una empresa específica, modificamos el mock
          if (id !== "2") {
            // Tomamos uno de los mocks de la lista y lo modificamos para que coincida el ID
            const company = {...companiesMock.find(c => c.id.toString() === id) || companiesMock[0]};
            company.id = parseInt(id);
            return company;
          }
          return mock;
        })
      );
    }
    
    return this.http.get<any>(`${this.apiUrl}/v1/companies/${id}`).pipe(
      catchError(error => {
        console.error(`Error al obtener empresa con ID ${id}:`, error);
        return of(companyDetailMock);
      })
    );
  }

  /**
   * Crea una nueva empresa
   * @param companyData Datos de la empresa a crear
   */
  createCompany(companyData: any): Observable<any> {
    if (this.useMockData) {
      return of({...successResponseMock, id: Math.floor(Math.random() * 1000) + 10});
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/create`, companyData).pipe(
      catchError(error => {
        console.error('Error al crear empresa:', error);
        return throwError(() => new Error('Error al crear empresa. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Actualiza una empresa existente
   * @param id ID de la empresa
   * @param companyData Datos actualizados de la empresa
   */
  updateCompany(id: string, companyData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/edit`, { id, ...companyData }).pipe(
      catchError(error => {
        console.error(`Error al actualizar empresa con ID ${id}:`, error);
        return throwError(() => new Error('Error al actualizar empresa. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Elimina una empresa por su ID
   * @param id ID de la empresa a eliminar
   */
  deleteCompany(id: string): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/delete`, { id }).pipe(
      catchError(error => {
        console.error(`Error al eliminar empresa con ID ${id}:`, error);
        return throwError(() => new Error('Error al eliminar empresa. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Actualiza el estado de una empresa
   * @param id ID de la empresa
   * @param estado Nuevo estado ('Activo', 'Pendiente', 'Bloqueado')
   */
  updateCompanyStatus(id: string, estado: string): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/changeStatus`, { id, status: estado }).pipe(
      catchError(error => {
        console.error(`Error al actualizar estado de empresa con ID ${id}:`, error);
        return throwError(() => new Error('Error al actualizar estado. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Obtiene las sedes de una empresa
   * @param companyId ID de la empresa
   */
  getCompanyLocations(companyId: string): Observable<any[]> {
    if (this.useMockData) {
      const company = companyId === "2" ? companyDetailMock : companiesMock.find(c => c.id.toString() === companyId);
      return of(company?.sedes || []);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/${companyId}/sedes`).pipe(
      catchError(error => {
        console.error(`Error al obtener sedes de empresa con ID ${companyId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene los contactos de una empresa
   * @param companyId ID de la empresa
   */
  getCompanyContacts(companyId: string): Observable<any[]> {
    if (this.useMockData) {
      const company = companyId === "2" ? companyDetailMock : companiesMock.find(c => c.id.toString() === companyId);
      return of(company?.contactos || []);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/${companyId}/contactos`).pipe(
      catchError(error => {
        console.error(`Error al obtener contactos de empresa con ID ${companyId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Filtra empresas por estado
   * @param estado Estado a filtrar ('Activo', 'Pendiente', 'Bloqueado')
   */
  getCompaniesByStatus(estado: string): Observable<any[]> {
    if (this.useMockData) {
      return of(companiesMock.filter(company => company.estado === estado));
    }
    
    return this.http.post<any[]>(`${this.apiUrl}/v1/companies/filter`, { estado }).pipe(
      catchError(error => {
        console.error(`Error al filtrar empresas por estado ${estado}:`, error);
        return of([]);
      })
    );
  }

  // Obtener pedidos de una empresa
  getCompanyOrders(companyId: string, filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.fechaInicio) params = params.set('fechaInicio', filters.fechaInicio);
      if (filters.fechaFin) params = params.set('fechaFin', filters.fechaFin);
      if (filters.page) params = params.set('page', filters.page);
      if (filters.limit) params = params.set('limit', filters.limit);
    }
    
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/orders`, { params });
  }

  // Obtener estadísticas de pedidos por empresa
  getCompanyOrderStats(companyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/orders/stats`);
  }

  // Obtener productos de una empresa
  getCompanyProducts(companyId: string, filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.categoria) params = params.set('categoria', filters.categoria);
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.page) params = params.set('page', filters.page);
      if (filters.limit) params = params.set('limit', filters.limit);
    }
    
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/products`, { params });
  }

  // Obtener estadísticas de productos por empresa
  getCompanyProductStats(companyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/products/stats`);
  }
} 