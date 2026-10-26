import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { SKIP_LOADER } from '../interceptor/loader.interceptor';
import { environment } from '../../../../environments/environment';
import { PedidoPermiso, PermisoSubida, RespuestaSesionAdjuntos } from './adjuntos-publicos.models';

/**
 * Página pública de subida de archivos de un ticket abierto desde Claude (D-549, plan B). Sin sesión:
 * el enlace firmado de la ruta es la llave. Contrato en
 * openspec/changes/mcp-adjuntos-tickets/design.md (D7). Ninguna llamada muestra la pantalla de carga
 * global: la página enseña su propio avance.
 */
@Injectable({ providedIn: 'root' })
export class AdjuntosPublicosService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  private ruta(token: string, resto = ''): string {
    return `/v1/soporte/adjuntos/${encodeURIComponent(token)}${resto}`;
  }

  /** Para quién es el enlace, qué se permite y lo que ya se subió. */
  ver(token: string): Observable<RespuestaSesionAdjuntos> {
    return this.getSinLoader(this.ruta(token));
  }

  /** La URL firmada para subir UN archivo. Pedirla de a uno: el número de orden se asigna en el servidor. */
  permiso(token: string, pedido: PedidoPermiso): Observable<PermisoSubida> {
    return this.postSinLoader(this.ruta(token, '/permiso'), pedido);
  }

  /** Quita un archivo ya subido, por su número de orden. */
  quitar(token: string, n: number): Observable<{ success: boolean; borrados: number }> {
    return this.http.delete<{ success: boolean; borrados: number }>(
      `${environment.urlApi}${this.ruta(token, `/${encodeURIComponent(String(n))}`)}`,
      { context: new HttpContext().set(SKIP_LOADER, true) },
    );
  }

  /** «Listo»: el servidor revisa lo subido y cierra el enlace (un solo uso). */
  terminar(token: string): Observable<{ success: boolean; archivos: number }> {
    return this.postSinLoader(this.ruta(token, '/listo'), {});
  }

  /**
   * Sube el archivo directo al almacenamiento con la URL firmada. Emite el avance (0 a 100) y completa al
   * terminar; falla con `{ status }` (0 si no hubo respuesta: conexión o permisos del navegador).
   * Va por `XMLHttpRequest` a propósito y NO por `HttpClient`: el interceptor agregaría `Authorization` y
   * los encabezados de la empresa, que el almacenamiento rechaza (no están firmados). Darse de baja
   * cancela la subida.
   */
  subir(permiso: Pick<PermisoSubida, 'uploadUrl' | 'encabezados'>, archivo: Blob): Observable<number> {
    return new Observable<number>((observador) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', permiso.uploadUrl);
      Object.entries(permiso.encabezados || {}).forEach(([nombre, valor]) => xhr.setRequestHeader(nombre, valor));
      xhr.upload.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable && e.total > 0) observador.next(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          observador.next(100);
          observador.complete();
        } else {
          observador.error({ status: xhr.status });
        }
      };
      xhr.onerror = () => observador.error({ status: 0 });
      xhr.ontimeout = () => observador.error({ status: 0 });
      xhr.send(archivo);
      return () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) xhr.abort();
      };
    });
  }
}
