import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADER } from '../interceptor/loader.interceptor';

/**
 * Llamadas HTTP de los importadores (clientes / inventario / productos).
 *
 * Existe por una razón concreta: **un componente NO puede inyectar `HttpClient`
 * y esperar que la petición lleve `Authorization`.**
 *
 * `SharedModule` y varios módulos lazy (`VentasModule`, `ProduccionModule`,
 * `DespachosModule`…) importan `HttpClientModule`. Eso registra un
 * `HTTP_INTERCEPTORS` propio (el de XSRF) en el injector del módulo lazy, y en
 * Angular los multi-providers NO se fusionan con los del root: el arreglo del
 * hijo TAPA al del padre. Resultado: los componentes declarados bajo ese módulo
 * reciben un `HttpClient` que nunca pasa por `HttpInterceptor2`, así que sus
 * peticiones salen **sin `Authorization` ni `company`** y el backend responde
 * `401 {"message":"No tienes autorización"}`.
 *
 * Un servicio `providedIn: 'root'` se instancia en el injector raíz, recibe el
 * `HttpClient` del root y sí atraviesa el interceptor. Es el mismo remedio que
 * ya está documentado en `shared.module.ts` para `ImageProxyService`.
 *
 * Mientras esto siga así, cualquier endpoint nuevo del importador va acá, no en
 * el componente.
 */
@Injectable({
  providedIn: 'root'
})
export class ImportApiService {

  constructor(private http: HttpClient) { }

  /**
   * @param endpoint ruta relativa al backend, con `/` inicial. Ej: `/v1/onboarding/import-customers`
   * @param companyId empresa que el componente ya resolvió (`currentCompany.nomComercial`).
   *                  El interceptor lo pisa con el `company` del usuario logueado; se manda
   *                  igual para no depender de ese detalle.
   */
  post<T>(endpoint: string, payload: any, companyId: string): Promise<T | undefined> {
    return this.http.post<T>(
      `${environment.urlApi}${endpoint}`,
      payload,
      { headers: this.headers(companyId), context: this.sinLoaderGlobal() }
    ).toPromise();
  }

  delete<T>(endpoint: string, companyId: string): Promise<T | undefined> {
    return this.http.delete<T>(
      `${environment.urlApi}${endpoint}`,
      { headers: this.headers(companyId), context: this.sinLoaderGlobal() }
    ).toPromise();
  }

  /**
   * El importador NO usa el loader global.
   *
   * Un import largo se manda en lotes, y el overlay global tapaba la pantalla
   * entera durante media hora: el modal tiene su propia barra con el lote y el
   * conteo, pero quedaba debajo y el usuario no veía ningún avance — parecía
   * colgado. Con esto el overlay no aparece y se ve el progreso real.
   */
  private sinLoaderGlobal(): HttpContext {
    return new HttpContext().set(SKIP_LOADER, true);
  }

  private headers(companyId: string): HttpHeaders {
    return new HttpHeaders({ 'company': companyId });
  }
}
