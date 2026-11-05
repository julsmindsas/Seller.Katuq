import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpContext, HttpResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADER } from '../../../shared/services/interceptor/loader.interceptor';
import { BaseService } from '../../../shared/services/base.service';
import {
  Calidad, Definiciones, Excluidas, FiltrosTabla, FormatoExportacion, ListaSegmento, Listado, MePlataforma, NombreSeccion, Overview,
  ResumenSegmento, SobrePlataforma, Sugerencias, Tendencias,
} from '../plataforma.tipos';
import { paramsDeFiltros, paramsExportacion, queryString } from '../logica/consulta';

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

  segmentos(): Observable<SobrePlataforma<{ segmentos: ResumenSegmento[] } | null>> {
    return this.getSinLoader('/v1/platform/segments');
  }

  segmento(clave: string): Observable<SobrePlataforma<ListaSegmento | null>> {
    return this.getSinLoader(`/v1/platform/segments/${encodeURIComponent(clave)}`);
  }

  calidad(): Observable<SobrePlataforma<Calidad | null>> {
    return this.getSinLoader('/v1/platform/data-quality');
  }

  sugerencias(): Observable<SobrePlataforma<Sugerencias>> {
    return this.getSinLoader('/v1/platform/suggestions');
  }

  /**
   * Exporta la lista de comercios (con los filtros actuales) en CSV o PDF. Va como `blob` por el mismo cliente HTTP de
   * `BaseService` (con la autorización del interceptor): sin enlaces con credenciales ni ventanas nuevas. El servidor deja
   * el registro de quién exportó y con qué filtros.
   */
  exportarComercios(f: FiltrosTabla, formato: FormatoExportacion): Observable<HttpResponse<Blob>> {
    return this.http.get(`${environment.urlApi}/v1/platform/exports/companies${queryString(paramsExportacion(f, formato))}`, {
      responseType: 'blob',
      observe: 'response',
      context: new HttpContext().set(SKIP_LOADER, true),
    });
  }

  /** Solo el operador: relanza el cálculo de la capa viva. El servidor responde 202. */
  recalcular(): Observable<SobrePlataforma<{ estado: string }>> {
    return this.postSinLoader('/v1/platform/recalculate', {});
  }
}
