import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

export type ModuloIA = 'clientes' | 'cartera' | 'pedidos' | 'satisfaccion';

/** IA de los módulos principales (D-405): calcular no gasta cupo; explicar consume un mensaje de chat. */
@Injectable({ providedIn: 'root' })
export class ModulosIaService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  obtener(modulo: ModuloIA): Observable<any> {
    return this.get<any>(`/v1/insights/${modulo}`);
  }

  explicar(modulo: ModuloIA): Observable<any> {
    return this.postSinLoader<any>(`/v1/insights/${modulo}/explicar`, {});
  }
}
