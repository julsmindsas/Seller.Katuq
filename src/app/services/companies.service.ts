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
  // Usar datos reales del backend
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
   * Filtra empresas por diferentes criterios
   * @param filters Criterios de filtrado (nombre, estado, etc.)
   */
  filterCompanies(filters: any = {}): Observable<any[]> {
    if (this.useMockData) {
      let filteredCompanies = [...companiesMock];
      
      if (filters.nombre) {
        filteredCompanies = filteredCompanies.filter(c => 
          c.nombre.toLowerCase().includes(filters.nombre.toLowerCase())
        );
      }
      
      if (filters.estado) {
        filteredCompanies = filteredCompanies.filter(c => c.estado === filters.estado);
      }
      
      return of(filteredCompanies);
    }
    
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/filter`, { params }).pipe(
      catchError(error => {
        console.error('Error al filtrar empresas:', error);
        return of([]);
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
   * Añade una nueva sede a una empresa
   * @param companyId ID de la empresa
   * @param sedeData Datos de la sede
   */
  addCompanyLocation(companyId: string, sedeData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/${companyId}/sedes`, sedeData).pipe(
      catchError(error => {
        console.error(`Error al añadir sede a empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al añadir sede. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Actualiza una sede existente
   * @param companyId ID de la empresa
   * @param sedeId ID de la sede
   * @param sedeData Datos actualizados de la sede
   */
  updateCompanyLocation(companyId: string, sedeId: string, sedeData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.put<any>(`${this.apiUrl}/v1/companies/${companyId}/sedes/${sedeId}`, sedeData).pipe(
      catchError(error => {
        console.error(`Error al actualizar sede ${sedeId} de empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al actualizar sede. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Elimina una sede
   * @param companyId ID de la empresa
   * @param sedeId ID de la sede a eliminar
   */
  deleteCompanyLocation(companyId: string, sedeId: string): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.delete<any>(`${this.apiUrl}/v1/companies/${companyId}/sedes/${sedeId}`).pipe(
      catchError(error => {
        console.error(`Error al eliminar sede ${sedeId} de empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al eliminar sede. Inténtalo de nuevo más tarde.'));
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
   * Añade un nuevo contacto a una empresa
   * @param companyId ID de la empresa
   * @param contactData Datos del contacto
   */
  addCompanyContact(companyId: string, contactData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/${companyId}/contactos`, contactData).pipe(
      catchError(error => {
        console.error(`Error al añadir contacto a empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al añadir contacto. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Actualiza un contacto existente
   * @param companyId ID de la empresa
   * @param contactId ID del contacto
   * @param contactData Datos actualizados del contacto
   */
  updateCompanyContact(companyId: string, contactId: string, contactData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.put<any>(`${this.apiUrl}/v1/companies/${companyId}/contactos/${contactId}`, contactData).pipe(
      catchError(error => {
        console.error(`Error al actualizar contacto ${contactId} de empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al actualizar contacto. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Elimina un contacto
   * @param companyId ID de la empresa
   * @param contactId ID del contacto a eliminar
   */
  deleteCompanyContact(companyId: string, contactId: string): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.delete<any>(`${this.apiUrl}/v1/companies/${companyId}/contactos/${contactId}`).pipe(
      catchError(error => {
        console.error(`Error al eliminar contacto ${contactId} de empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al eliminar contacto. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Obtiene los marketplaces de una empresa
   * @param companyId ID de la empresa
   */
  getCompanyMarketplaces(companyId: string): Observable<any[]> {
    if (this.useMockData) {
      const company = companyId === "2" ? companyDetailMock : companiesMock.find(c => c.id.toString() === companyId);
      return of(company?.marketPlace || []);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/${companyId}/marketplace`).pipe(
      catchError(error => {
        console.error(`Error al obtener marketplaces de empresa con ID ${companyId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Añade un nuevo marketplace a una empresa
   * @param companyId ID de la empresa
   * @param marketplaceData Datos del marketplace
   */
  addCompanyMarketplace(companyId: string, marketplaceData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.post<any>(`${this.apiUrl}/v1/companies/${companyId}/marketplace`, marketplaceData).pipe(
      catchError(error => {
        console.error(`Error al añadir marketplace a empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al añadir marketplace. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Actualiza un marketplace existente
   * @param companyId ID de la empresa
   * @param marketplaceId ID del marketplace
   * @param marketplaceData Datos actualizados del marketplace
   */
  updateCompanyMarketplace(companyId: string, marketplaceId: string, marketplaceData: any): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.put<any>(`${this.apiUrl}/v1/companies/${companyId}/marketplace/${marketplaceId}`, marketplaceData).pipe(
      catchError(error => {
        console.error(`Error al actualizar marketplace ${marketplaceId} de empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al actualizar marketplace. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Elimina un marketplace
   * @param companyId ID de la empresa
   * @param marketplaceId ID del marketplace a eliminar
   */
  deleteCompanyMarketplace(companyId: string, marketplaceId: string): Observable<any> {
    if (this.useMockData) {
      return of(successResponseMock);
    }
    
    return this.http.delete<any>(`${this.apiUrl}/v1/companies/${companyId}/marketplace/${marketplaceId}`).pipe(
      catchError(error => {
        console.error(`Error al eliminar marketplace ${marketplaceId} de empresa con ID ${companyId}:`, error);
        return throwError(() => new Error('Error al eliminar marketplace. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Obtiene los canales de comunicación de una empresa
   * @param companyId ID de la empresa
   */
  getCompanyChannels(companyId: string): Observable<any[]> {
    if (this.useMockData) {
      const company = companyId === "2" ? companyDetailMock : companiesMock.find(c => c.id.toString() === companyId);
      return of(company?.canalesComunicacion || []);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/${companyId}/canales`).pipe(
      catchError(error => {
        console.error(`Error al obtener canales de comunicación de empresa con ID ${companyId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene las redes sociales de una empresa
   * @param companyId ID de la empresa
   */
  getCompanySocialNetworks(companyId: string): Observable<any[]> {
    if (this.useMockData) {
      const company = companyId === "2" ? companyDetailMock : companiesMock.find(c => c.id.toString() === companyId);
      return of(company?.redesSociales || []);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/${companyId}/redes`).pipe(
      catchError(error => {
        console.error(`Error al obtener redes sociales de empresa con ID ${companyId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Filtra empresas por estado
   * @param estado Estado a filtrar ('Activo', 'Pendiente', 'Bloqueado')
   */
  getCompaniesByStatus(estado: string): Observable<any[]> {
    return this.filterCompanies({ estado });
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
    
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/orders`, { params }).pipe(
      catchError(error => {
        console.error(`Error al obtener pedidos de empresa con ID ${companyId}:`, error);
        return of({ items: [], total: 0 });
      })
    );
  }

  // Obtener estadísticas de pedidos por empresa
  getCompanyOrderStats(companyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/orders/stats`).pipe(
      catchError(error => {
        console.error(`Error al obtener estadísticas de pedidos de empresa con ID ${companyId}:`, error);
        return of({});
      })
    );
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
    
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/products`, { params }).pipe(
      catchError(error => {
        console.error(`Error al obtener productos de empresa con ID ${companyId}:`, error);
        return of({ items: [], total: 0 });
      })
    );
  }

  // Obtener estadísticas de productos por empresa
  getCompanyProductStats(companyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/companies/${companyId}/products/stats`).pipe(
      catchError(error => {
        console.error(`Error al obtener estadísticas de productos de empresa con ID ${companyId}:`, error);
        return of({});
      })
    );
  }
} 