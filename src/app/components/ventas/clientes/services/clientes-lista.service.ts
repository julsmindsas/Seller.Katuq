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

  /** Ficha completa (la lista solo trae las columnas de la tabla). */
  obtenerFicha(cd: string): Observable<any> {
    return this.http.get<any>(`${environment.urlApi}/v1/clients/detail`, {
      params: new HttpParams().set('cd', cd),
      context: new HttpContext().set(SKIP_LOADER, true),
    });
  }
}
