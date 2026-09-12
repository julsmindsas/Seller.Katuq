import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { companiesMock, companyDetailMock, successResponseMock } from './mock-data/companies-mock';

/**
 * Métricas de una empresa. Los números pueden venir en `null` cuando el cálculo
 * falló: la pantalla los muestra como "—", nunca como 0 — un 0 falso parece una
 * respuesta y no lo es.
 */
export interface MetricasEmpresa {
  productos: number | null;
  clientes: number | null;
  usuarios: number | null;
  roles: number | null;
  pedidos: number | null;
  pedidos30d: number | null;
  pedidosAnulados30d: number | null;
  pedidosNetos30d: number | null;
  facturadoNeto30d: number | null;
  ticketPromedio30d: number | null;
  ultimoPedido: string | null;
  ultimoPedidoNro: string | null;
  ventanaDias: number;
  _cachedAt?: number;
}

export interface EmpresaPanorama {
  _docId: string;
  nit: string | null;
  digitoVerificacion: string | null;
  nombre: string | null;
  nomComercial: string | null;
  emailContactoGeneral: string | null;
  cel: string | number | null;
  fijo: string | number | null;
  ciudad: string | null;
  pais: string | null;
  activo: boolean;
  plan: string;
  subscriptionStartDate: any;
  nextBillingDate: any;
  /** Quién bloqueó la empresa y por qué. `null` si está operando normal. */
  bloqueo: { fecha: string; por: string; motivo: string } | null;
  metricas: MetricasEmpresa;
  /**
   * Fecha de alta. Sale de cuatro campos distintos según la época en que se dio
   * de alta la empresa (`date_add`, `date_added`, `created_at`,
   * `subscriptionStartDate`); el backend los unifica. `null` cuando no hay
   * ninguno — 3 empresas están así.
   */
  creadaEn: string | null;
  /** De cuál campo salió la fecha. Solo para diagnóstico. */
  creadaEnCampo?: string | null;
  /**
   * Último inicio de sesión de CUALQUIER usuario de la empresa. Se calcula
   * fresco (no entra al caché): con una hora de atraso no sirve para saber si
   * una cuenta está abandonada. `null` si nadie ha entrado nunca.
   */
  ultimoIngreso: string | null;
  /**
   * Cuándo renueva el plan que compró la empresa.
   *
   * `aplica: false` en freemium: no vence, y ponerle fecha sería inventarle un
   * cobro. `estimada: true` cuando la fecha NO viene del sistema de facturación
   * y se calculó desde el inicio de la suscripción — una estimación no puede
   * mostrarse como un cobro confirmado.
   */
  renovacion: {
    aplica: boolean;
    fecha: string | null;
    estimada: boolean;
    periodo: 'mensual' | 'anual' | null;
    diasRestantes: number | null;
    estado: 'noAplica' | 'sinFecha' | 'vencido' | 'porVencer' | 'vigente';
  };
  /**
   * Integraciones conectadas por esta empresa. Se calcula fresco (no entra al
   * caché): es una sola lectura de una colección de ~1 fila por
   * empresa+proveedor. `null` cuando el censo falló — distinto de `activas: 0`,
   * que sí afirma que no tiene ninguna.
   */
  integraciones: IntegracionesEmpresa | null;
  _cachedAt: number | null;
  _stale: boolean;
}

export interface TotalesPlataforma {
  empresas: number;
  activas: number;
  inactivas: number;
  premium: number;
  freemium: number;
  empresasSinMovimiento: number;
  planesVencidos: number;
  planesPorVencer: number;
  pedidos30d: number | null;
  pedidosNetos30d: number;
  facturado30d: number | null;
  ticketPromedio30d: number | null;
  usuarios: number | null;
  empresasConUsuarios: number;
  /**
   * Antigüedad media en DÍAS, solo sobre las empresas que tienen fecha de alta.
   * `null` si ninguna la tiene — un 0 se leería como "todas se crearon hoy".
   */
  antiguedadMediaDias: number | null;
  empresasConFechaAlta: number;
  /** Activas con último ingreso CONOCIDO de hace más de 30 días. */
  empresasSinEntrar30d: number;
  /** Activas donde nadie ha iniciado sesión nunca: sin dato, no abandonadas. */
  empresasSinIngresoConocido: number;
  /**
   * Integraciones CONECTADAS en toda la plataforma. `null` si el censo no se
   * pudo leer — un 0 se leería como "ninguna empresa tiene integraciones".
   */
  integracionesActivas: number | null;
  /** Empresas con al menos una integración conectada. `null` si no hay censo. */
  empresasConIntegracion: number | null;
  /** ACTIVAS con cero integraciones conectadas. */
  empresasSinIntegrar: number;
  /** ACTIVAS que ya toparon el máximo de su plan (freemium permite 1). */
  empresasEnLimiteIntegraciones: number;
}

/** Una integración conectada por una empresa. */
export interface IntegracionEmpresa {
  /** id del proveedor tal como lo guarda el backend (`shopify`, `siigo`…). */
  id: string;
  nombre: string;
  categoria: 'ecommerce' | 'pagos' | 'logistica' | 'contabilidad' | 'otras';
  /** El backend ya no reconoce este proveedor: se muestra con su id crudo. */
  desconocido: boolean;
  activa: boolean;
  estado: string | null;
  conectadaEn: string | null;
  /**
   * Última edición de la CONFIGURACIÓN. NO es la última vez que la integración
   * movió algo: no existe ese dato.
   */
  actualizadaEn: string | null;
  conectadaPor: string | null;
}

/**
 * Integraciones de una empresa. `null` en `EmpresaPanorama.integraciones`
 * significa "no se pudo leer el censo", que no es lo mismo que `activas: 0`.
 */
export interface IntegracionesEmpresa {
  activas: number;
  inactivas: number;
  proveedores: IntegracionEmpresa[];
}

/** Una integración mirada desde el lado del proveedor: cuántas empresas la usan. */
export interface FilaCatalogoIntegracion {
  id: string;
  nombre: string;
  categoria: string;
  desconocido: boolean;
  /** Empresas que la tienen configurada, conectada o no. */
  empresas: number;
  /** Empresas que la tienen conectada AHORA. */
  empresasActivas: number;
}

/**
 * Una empresa en la vista de cobros: cuándo se le vence, cuánto se le cobraría
 * y si ya se le facturó.
 */
export interface FilaCobro {
  _docId: string;
  nomComercial: string | null;
  nit: string | null;
  correo: string | null;
  telefono: string | number | null;
  activo: boolean;
  plan: string | null;
  /**
   * `automatico` = tiene tarjeta inscrita y el cron le cobra solo.
   * `manual` = no hay tarjeta guardada: el sistema le manda link de pago y el
   * cobro depende de que el cliente entre a pagarlo.
   * `cortesia` = premium de regalo, no se le cobra a propósito.
   */
  modoCobro: 'automatico' | 'manual' | 'cortesia';
  renovacion: {
    aplica: boolean;
    fecha: string | null;
    estimada: boolean;
    periodo: 'mensual' | 'anual' | null;
    diasRestantes: number | null;
    estado: 'noAplica' | 'sinFecha' | 'vencido' | 'porVencer' | 'vigente';
  };
  ventasMes: number | null;
  tier: string | null;
  tierNombre: string | null;
  periodo: string;
  montoMensualCOP: number | null;
  montoPeriodoCOP: number | null;
  trm: number | null;
  /**
   * El último COBRO de esta empresa (lo que Katuq le factura), no el documento
   * fiscal. Ese va aparte en `facturaDian`: son dos cosas distintas y
   * confundirlas fue justo lo que hizo ilegible esta columna.
   */
  ultimaFactura: {
    id: string | null;
    estado: string | null;
    fecha: string | null;
    monto: number | null;
    /** La factura electrónica DIAN emitida por ese cobro. `null` = todavía no. */
    facturaDian?: { numero: string | null; cufe: string | null; fecha: string | null } | null;
    /** Por qué falló el último intento de emitirla. `null` = no falló. */
    facturaDianProblema?: string | null;
  } | null;
  calculadoEn: number | null;
  /** El monto de esta empresa se está recalculando por detrás. */
  recalculando: boolean;
}

export interface CobrosOverview {
  generadoEn: number;
  empresas: FilaCobro[];
  totales: {
    totalEmpresas: number;
    sinPlanPago: number;
    dePago: number;
    aCobrar: number;
    cobroAutomatico: number;
    cobroManual: number;
    cortesia: number;
    vencidas: number;
    porVencer: number;
    montoTotalCOP: number;
    empresasConMonto: number;
    empresasSinMonto: number;
  };
  meta: {
    /** Si el cobro automático está corriendo. Apagado = no se cobra ni se manda link. */
    cobroAutomaticoEncendido: boolean;
    recalculando: boolean;
    empresasPorRecalcular: number;
    cacheTtlHoras: number;
    nota: string;
  };
}

export interface PlatformOverview {
  generadoEn: number;
  ventanaDias: number;
  totales: TotalesPlataforma;
  empresas: EmpresaPanorama[];
  /**
   * Lo integrado mirado por proveedor: cuántas empresas tiene cada uno y cuáles
   * no tiene nadie. Es la respuesta a "¿valió la pena lo que construimos?".
   */
  integraciones?: {
    disponible: boolean;
    configuraciones: number;
    catalogo: FilaCatalogoIntegracion[];
    sinNingunaEmpresa: Array<{ id: string; nombre: string; categoria: string }>;
    nota: string;
  };
  meta: {
    cacheTtlMinutos: number;
    forzado?: boolean;
    empresasRecalculadas: number;
    empresasPorRefrescar: number;
  };
}

export interface InventoryUnits {
  empresa: string;
  unidades: number;
  registros: number;
  documentos: number;
  duplicadosDescartados: number;
}

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
    
    // Un fallo se propaga: NUNCA se sustituye por datos de ejemplo. Antes este
    // catchError devolvía `companiesMock` ("Empresa X/Y/Z") y el operador no
    // tenía forma de distinguir un error de red de empresas reales.
    return this.http.get<any[]>(`${this.apiUrl}/v1/companies/all`);
  }

  /**
   * Panorama de la plataforma: todas las empresas con sus métricas ya
   * calculadas, más los totales de la franja superior. Una sola llamada.
   *
   * Solo responde para el tenant Julsmind; cualquier otro recibe 403.
   */
  getPlatformOverview(forzar = false): Observable<PlatformOverview> {
    // `forzar` ignora el caché del backend y recalcula todas las empresas antes
    // de responder: tarda más, pero es la única forma de ver un arreglo el mismo
    // día. Sin esto la pantalla servía datos de hasta una hora y el arreglo
    // parecía no haber servido.
    const params = forzar ? new HttpParams().set('recalcular', '1') : undefined;
    return this.http.get<PlatformOverview>(`${this.apiUrl}/v1/companies/overview`, { params });
  }

  /**
   * Cobros del mes: a quién hay que facturarle y por cuánto.
   *
   * Solo LEE. El cobro lo hace el cron de facturación, no esta pantalla.
   */
  getBillingOverview(): Observable<CobrosOverview> {
    return this.http.get<CobrosOverview>(`${this.apiUrl}/v1/companies/billing-overview`);
  }

  /**
   * Unidades en inventario de una empresa, deduplicadas.
   *
   * Va aparte del panorama porque exige leer y deduplicar los documentos espejo
   * de `inventory`: solo se paga al abrir la ficha de una empresa.
   */
  getCompanyInventoryUnits(companyDocId: string): Observable<InventoryUnits> {
    return this.http.get<InventoryUnits>(
      `${this.apiUrl}/v1/companies/${companyDocId}/inventory-units`
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
    
    // Igual que en getAllCompanies: un 404 o un 500 se propaga tal cual, no se
    // disfraza de `companyDetailMock`.
    return this.http.get<any>(`${this.apiUrl}/v1/companies/${id}`);
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
   * Actualiza una empresa POR SU docId. Es el que usa la ficha de empresa.
   *
   * Distinto de `updateCompany`, que pega contra `POST /companies/edit`: aquel
   * identifica la empresa por el NIT del cuerpo, así que un NIT vacío o
   * cambiado terminaba creando una empresa nueva en vez de editar la que estaba
   * en pantalla. Acá la identidad va en la URL.
   */
  updateCompanyById(id: string, companyData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/v1/companies/${id}`, companyData);
  }

  getBrandDocumentStatus(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/v1/opttia/brand/documents`, { params: { companyDocId: companyId } });
  }

  indexBrandDocument(companyId: string, documentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/v1/opttia/brand/documents/${encodeURIComponent(documentId)}/index`, {},
      { params: { companyDocId: companyId } });
  }

  /**
   * Elimina una empresa por su ID
   * @param id ID de la empresa a eliminar
   */
  /**
   * Elimina una empresa y TODOS sus datos relacionados. Irreversible.
   *
   * El backend identifica la empresa por `companyDocId` o por `nit` — nunca por
   * un campo `id`, que es lo que mandaba la versión anterior (y por eso siempre
   * respondía 400).
   */
  deleteCompany(payload: { companyDocId?: string; nit?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/v1/companies/delete`, payload).pipe(
      catchError(error => {
        console.error('Error al eliminar empresa:', error);
        return throwError(() => new Error('Error al eliminar empresa. Inténtalo de nuevo más tarde.'));
      })
    );
  }

  /**
   * Actualiza el estado de una empresa
   * @param id ID de la empresa
   * @param estado Nuevo estado ('Activo', 'Pendiente', 'Bloqueado')
   */
  /**
   * Activa o desactiva una empresa.
   *
   * `activo` es un BOOLEANO a propósito: es el estado canónico que consulta el
   * login para dejar entrar o negar el acceso. La versión anterior mandaba texto
   * (`status: "Activo"`) contra un backend que esperaba otro nombre de campo, así
   * que desactivar una empresa nunca la desactivaba de verdad.
   */
  updateCompanyStatus(companyId: string, activo: boolean, motivo?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/v1/companies/changeStatus`, { companyId, activo, motivo }).pipe(
      catchError(error => {
        console.error(`Error al actualizar estado de empresa ${companyId}:`, error);
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
