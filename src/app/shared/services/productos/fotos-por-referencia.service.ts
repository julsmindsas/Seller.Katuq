import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Ticket 1425: llamadas de «Importar fotos de productos». Va en un servicio raíz a propósito:
 * el `HttpClient` del módulo de productos no pasa por el interceptor que pone la sesión, y el
 * backend respondía 401.
 */
@Injectable({ providedIn: 'root' })
export class FotosPorReferenciaService {
  private readonly url = `${environment.urlApi}/v1/productos/fotos-por-referencia`;

  constructor(private http: HttpClient) {}

  previsualizar(archivos: string[]): Promise<any> {
    return firstValueFrom(this.http.post(`${this.url}/previsualizar`, { archivos }));
  }

  aplicar(cuerpo: { modo: 'agregar' | 'reemplazar'; archivo: string; productos: any[] }): Promise<any> {
    return firstValueFrom(this.http.post(`${this.url}/aplicar`, cuerpo));
  }

  referencias(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.url}/referencias`));
  }
}
