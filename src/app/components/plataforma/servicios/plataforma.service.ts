import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';
import {
  Definiciones, Excluidas, FiltrosTabla, Listado, MePlataforma, NombreSeccion, Overview, SobrePlataforma, Tendencias,
} from '../plataforma.tipos';
import { paramsDeFiltros, queryString } from '../logica/consulta';

/**
 * D-700 13.3 — Todas las llamadas a `/v1/platform`. Extiende `BaseService` (el interceptor pone la autorización);
 * las lecturas van sin la pantalla de carga global porque cada sección muestra su propio estado.
 */
@Injectable({ providedIn: 'root' })
export class PlataformaService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  me(): Observable<SobrePlataforma<MePlataforma>> {
    return this.getSinLoader('/v1/platform/me');
  }

  overview(vista: 'creacion' | 'entrega'): Observable<SobrePlataforma<Overview | null>> {
    return this.getSinLoader(`/v1/platform/overview${queryString({ vista })}`);
  }

  tendencias(metricas?: string[], meses?: number): Observable<SobrePlataforma<Tendencias | null>> {
    return this.getSinLoader(`/v1/platform/trends${queryString({ metricas: metricas ? metricas.join(',') : undefined, meses: meses ? String(meses) : undefined })}`);
  }

  comercios(f: FiltrosTabla): Observable<SobrePlataforma<Listado | null>> {
    return this.getSinLoader(`/v1/platform/companies${queryString(paramsDeFiltros(f))}`);
  }

  perfil(docId: string): Observable<SobrePlataforma<Record<string, any>>> {
    return this.getSinLoader(`/v1/platform/companies/${encodeURIComponent(docId)}`);
  }

  seccion(docId: string, nombre: NombreSeccion): Observable<SobrePlataforma<Record<string, any>>> {
    return this.getSinLoader(`/v1/platform/companies/${encodeURIComponent(docId)}/sections/${encodeURIComponent(nombre)}`);
  }

  excluidas(): Observable<SobrePlataforma<Excluidas>> {
    return this.getSinLoader('/v1/platform/excluded-accounts');
  }

  definiciones(): Observable<SobrePlataforma<Definiciones>> {
    return this.getSinLoader('/v1/platform/definitions');
  }

  /** Solo el operador: relanza el cálculo de la capa viva. El servidor responde 202. */
  recalcular(): Observable<SobrePlataforma<{ estado: string }>> {
    return this.postSinLoader('/v1/platform/recalculate', {});
  }
}
