import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../shared/services/base.service';
import { SKIP_LOADER } from '../../../../shared/services/interceptor/loader.interceptor';
import { environment } from '../../../../../environments/environment';

/** Parámetros de la lista de clientes paginada por el servidor (GET /v1/clients/list). */
export interface ClientesPaginaParams {
  first: number;
  rows: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  cliente?: string;
  documento?: string;
  email?: string;
  estado?: string | null;
  tipoCliente?: string | null;
  etiquetas?: string[];
}

export interface ClientesPagina {
  data: any[];
  total: number;
  first: number;
  rows: number;
  /** El buscador tiene más coincidencias de las que devolvió: conviene afinar el texto. */
  parcial: boolean;
}

/** Una ficha dentro de un grupo de posibles duplicados (GET /v1/clients/duplicates, ticket 1462). */
export interface DuplicadoFicha {
  cd: string;
  documento: string;
  tipoDocumento: string;
  nombre: string;
  celular: string;
  pedidos: number;
  saldo: number;
  /** Otra ficha del grupo tiene exactamente el mismo documento: sus pedidos no se pueden separar por ficha. */
  documentoCompartido?: boolean;
}

export interface DuplicadoGrupo {
  clave: string;
  motivo: 'DOCUMENTO' | 'NOMBRE_Y_CONTACTO';
  fichas: DuplicadoFicha[];
  totalFichas: number;
  totalPedidos: number;
  totalSaldo: number;
  /** Los pedidos o las fichas del grupo pasaron el tope y los totales son parciales. */
  parcial?: boolean;
}

export interface DuplicadosPagina {
  criterio: 'documento' | 'nombre';
  grupos: DuplicadoGrupo[];
  /** Cursor para pedir la ventana que sigue; null si ya no hay más. */
  siguiente: string | null;
  escaneadas: number;
}

/**
 * Lista de clientes de la pantalla «Clientes»: el servidor pagina, ordena, filtra y cuenta.
 * La pantalla propia muestra su carga, así que no se enciende el loader global.
 */
@Injectable({ providedIn: 'root' })
export class ClientesListaService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  listarPagina(p: ClientesPaginaParams): Observable<ClientesPagina> {
    let params = new HttpParams().set('first', String(p.first)).set('rows', String(p.rows));
    const texto: Array<[string, string | null | undefined]> = [
      ['sortField', p.sortField], ['sortOrder', p.sortOrder], ['q', p.q], ['cliente', p.cliente],
      ['documento', p.documento], ['email', p.email], ['estado', p.estado], ['tipoCliente', p.tipoCliente],
    ];
    texto.forEach(([k, v]) => { if (v && String(v).trim()) { params = params.set(k, String(v).trim()); } });
    (p.etiquetas || []).forEach(t => { params = params.append('etiquetas', t); });
    return this.http.get<ClientesPagina>(`${environment.urlApi}/v1/clients/list`, {
      params,
      context: new HttpContext().set(SKIP_LOADER, true),
    });
  }

  /** Reporte «Posibles duplicados» (solo lectura; Administrador y Tesorería, con la bandera calidadDatosClientes). */
  listarDuplicados(criterio: 'documento' | 'nombre', desde?: string | null): Observable<DuplicadosPagina> {
    let params = new HttpParams().set('criterio', criterio);
    if (desde) { params = params.set('desde', desde); }
    return this.http.get<DuplicadosPagina>(`${environment.urlApi}/v1/clients/duplicates`, {
      params,
      context: new HttpContext().set(SKIP_LOADER, true),
    });
  }

  /** Ficha completa (la lista solo trae las columnas de la tabla). */
  obtenerFicha(cd: string): Observable<any> {
    return this.http.get<any>(`${environment.urlApi}/v1/clients/detail`, {
      params: new HttpParams().set('cd', cd),
      context: new HttpContext().set(SKIP_LOADER, true),
    });
  }
}
