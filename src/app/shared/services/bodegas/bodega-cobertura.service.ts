import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Bodega, CiudadCobertura } from '../../models/inventarios/bodega.model';

/**
 * Interfaces para respuestas del servicio de cobertura
 */
export interface BodegaCoberturaResponse {
  id: string;
  idBodega: string;
  nombre: string;
  tipo: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  coberturaNacional: boolean;
  ciudadesCobertura: CiudadCobertura[];
  coordenadas?: string;
}

export interface CiudadesConCoberturaResponse {
  tieneCoberturaNacional: boolean;
  ciudadesEspecificas: CiudadConBodegas[];
  totalCiudades: number;
}

export interface CiudadConBodegas {
  codigo: string;
  nombre: string;
  departamento: string;
  bodegas: BodegaResumen[];
}

export interface BodegaResumen {
  id: string;
  nombre: string;
  idBodega: string;
}

export interface ResumenCobertura {
  id: string;
  idBodega: string;
  nombre: string;
  tipo: string;
  coberturaNacional: boolean;
  ciudadesCobertura: CiudadCobertura[];
  totalCiudades: number;
  tieneCobertura: boolean;
}

/**
 * BodegaCoberturaService
 *
 * Servicio para buscar bodegas por ciudad de cobertura.
 * Útil para asignar automáticamente una bodega a un pedido según la ciudad de entrega.
 */
@Injectable({
  providedIn: 'root'
})
export class BodegaCoberturaService {
  private apiUrl = environment.urlApi + '/v1/bodegas';

  constructor(private http: HttpClient) {}

  /**
   * Encuentra la bodega con cobertura para una ciudad
   * @param codigoDane Código DANE de la ciudad (5 dígitos)
   * @param canalId ID del canal de ventas (opcional)
   * @returns Bodega encontrada o null
   */
  findBodegaPorCiudad(codigoDane: string, canalId?: string): Observable<BodegaCoberturaResponse | null> {
    let params = new HttpParams();
    if (canalId) {
      params = params.set('canalId', canalId);
    }

    return this.http.get<any>(`${this.apiUrl}/cobertura/${codigoDane}`, { params })
      .pipe(
        map(res => res.data),
        catchError(error => {
          console.error('Error buscando bodega por cobertura:', error);
          return of(null);
        })
      );
  }

  /**
   * Obtiene todas las bodegas con cobertura para una ciudad
   * @param codigoDane Código DANE de la ciudad
   * @param canalId ID del canal (opcional)
   */
  findAllBodegasPorCiudad(codigoDane: string, canalId?: string): Observable<BodegaCoberturaResponse[]> {
    let params = new HttpParams();
    if (canalId) {
      params = params.set('canalId', canalId);
    }

    return this.http.get<any>(`${this.apiUrl}/cobertura/${codigoDane}/todas`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(error => {
          console.error('Error buscando bodegas por cobertura:', error);
          return of([]);
        })
      );
  }

  /**
   * Verifica si hay cobertura para una ciudad
   * @param codigoDane Código DANE de la ciudad
   * @param canalId ID del canal (opcional)
   */
  tieneCobertura(codigoDane: string, canalId?: string): Observable<boolean> {
    let params = new HttpParams();
    if (canalId) {
      params = params.set('canalId', canalId);
    }

    return this.http.get<any>(`${this.apiUrl}/cobertura/verificar/${codigoDane}`, { params })
      .pipe(
        map(res => res.data?.tieneCobertura || false),
        catchError(() => of(false))
      );
  }

  /**
   * Obtiene todas las ciudades con cobertura
   */
  getCiudadesConCobertura(): Observable<CiudadesConCoberturaResponse> {
    return this.http.get<any>(`${this.apiUrl}/ciudades-cobertura`)
      .pipe(
        map(res => res.data || {
          tieneCoberturaNacional: false,
          ciudadesEspecificas: [],
          totalCiudades: 0
        }),
        catchError(error => {
          console.error('Error obteniendo ciudades con cobertura:', error);
          return of({
            tieneCoberturaNacional: false,
            ciudadesEspecificas: [],
            totalCiudades: 0
          });
        })
      );
  }

  /**
   * Obtiene resumen de cobertura de todas las bodegas
   */
  getResumenCobertura(): Observable<ResumenCobertura[]> {
    return this.http.get<any>(`${this.apiUrl}/resumen-cobertura`)
      .pipe(
        map(res => res.data || []),
        catchError(error => {
          console.error('Error obteniendo resumen de cobertura:', error);
          return of([]);
        })
      );
  }

  /**
   * Obtiene la bodega óptima para un pedido
   * @param pedido Datos del pedido con información de envío
   */
  getBodegaParaPedido(pedido: any): Observable<BodegaCoberturaResponse | null> {
    return this.http.post<any>(`${this.apiUrl}/bodega-para-pedido`, { pedido })
      .pipe(
        map(res => res.data),
        catchError(error => {
          console.error('Error obteniendo bodega para pedido:', error);
          return of(null);
        })
      );
  }

  /**
   * Asigna automáticamente una bodega a un pedido basado en la ciudad de entrega
   * Útil para integrar en el flujo de ventas
   * @param pedido Pedido con datos de envío
   * @param canalId ID del canal de ventas (opcional)
   */
  async asignarBodegaAutomatica(pedido: any, canalId?: string): Promise<BodegaCoberturaResponse | null> {
    // Extraer código DANE de la ciudad de entrega
    const codigoDane = pedido.envio?.codigoCiudad ||
      pedido.envio?.ciudadCodigo ||
      pedido.cliente?.datosEntrega?.codigoCiudad;

    if (!codigoDane) {
      console.warn('Pedido sin código DANE de ciudad');
      return null;
    }

    return this.findBodegaPorCiudad(codigoDane, canalId).toPromise();
  }

  /**
   * Verifica si una bodega tiene cobertura para una ciudad específica
   * @param bodega Datos de la bodega
   * @param codigoDane Código DANE de la ciudad
   */
  bodegaTieneCobertura(bodega: Bodega | ResumenCobertura, codigoDane: string): boolean {
    // Si tiene cobertura nacional, cubre todas las ciudades
    if (bodega.coberturaNacional) {
      return true;
    }

    // Verificar si la ciudad está en la lista de cobertura
    if (bodega.ciudadesCobertura && Array.isArray(bodega.ciudadesCobertura)) {
      return bodega.ciudadesCobertura.some(c => c.codigo === codigoDane);
    }

    return false;
  }

  /**
   * Filtra una lista de bodegas por cobertura de ciudad
   * @param bodegas Lista de bodegas
   * @param codigoDane Código DANE de la ciudad
   */
  filtrarBodegasPorCobertura(bodegas: (Bodega | ResumenCobertura)[], codigoDane: string): (Bodega | ResumenCobertura)[] {
    return bodegas.filter(b => this.bodegaTieneCobertura(b, codigoDane));
  }

  /**
   * Ordena bodegas priorizando cobertura específica sobre nacional
   * @param bodegas Lista de bodegas
   * @param codigoDane Código DANE de la ciudad
   */
  ordenarBodegasPorCobertura(bodegas: (Bodega | ResumenCobertura)[], codigoDane: string): (Bodega | ResumenCobertura)[] {
    return [...bodegas].sort((a, b) => {
      const aEspecifica = a.ciudadesCobertura?.some(c => c.codigo === codigoDane) || false;
      const bEspecifica = b.ciudadesCobertura?.some(c => c.codigo === codigoDane) || false;

      if (aEspecifica && !bEspecifica) return -1;
      if (!aEspecifica && bEspecifica) return 1;
      return 0;
    });
  }
}
