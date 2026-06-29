import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../shared/services/base.service';

/**
 * Servicio de Clientes Corporativos (spec 011).
 * Lista propia que alimenta el CRM. Endpoints en /v1/corporate-clients.
 * El interceptor HTTP agrega auth + company headers (NO usar HttpClient directo
 * en componentes — Art IX).
 */
@Injectable({ providedIn: 'root' })
export class CorporateClientsService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Lista todos los clientes corporativos del tenant. */
  obtenerCorporativos(): Observable<any> {
    return this.get<any>('/v1/corporate-clients/all');
  }

  /** Busca un corporativo por documento. Retorna el doc o [] si no existe. */
  getByDocument(documento: string): Observable<any> {
    return this.post<any>('/v1/corporate-clients/doc', { documento });
  }

  /** Crea un corporativo (idempotente por company+documento en el backend). */
  crear(data: any): Observable<any> {
    return this.post<any>('/v1/corporate-clients/create', data);
  }

  /** Edita un corporativo (por cd o por documento). */
  editar(data: any): Observable<any> {
    return this.post<any>('/v1/corporate-clients/edit', data);
  }

  /** Elimina un corporativo por su id de documento Firestore (cd). */
  eliminar(cd: string): Observable<any> {
    return this.post<any>('/v1/corporate-clients/delete', { cd });
  }
}
