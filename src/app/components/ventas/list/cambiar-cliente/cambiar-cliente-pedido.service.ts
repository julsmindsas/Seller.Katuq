import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../shared/services/base.service';

/**
 * Cambiar el cliente de un pedido creado (ticket 1505, D-670, fase 1). Servicio sobre `BaseService`: el
 * interceptor agrega la sesión. La empresa la fija el servidor con el token; aquí no se manda.
 */

/** Un aviso o un bloqueo de la vista previa: el texto ya viene en español para el comercio. */
export interface MensajeCambioCliente {
  codigo: string;
  mensaje: string;
  /** `fuerte` pide leerlo con más cuidado. */
  severidad?: 'fuerte';
}

export interface ClienteResumen {
  cd: string | null;
  nombre: string;
  documento: string | null;
  categoria: string | null;
}

export interface VistaPreviaCambioCliente {
  orderId: string;
  nroPedido: string | null;
  sinCambios: boolean;
  puedeAplicar: boolean;
  bloqueos: MensajeCambioCliente[];
  avisos: MensajeCambioCliente[];
  /** Confirmaciones explícitas que el servidor va a exigir. */
  requiere: { despacho: boolean; enlacePago: boolean; recalculo: boolean };
  de: ClienteResumen;
  a: ClienteResumen;
  conserva: string[];
  cambia: string[];
  saldo: number | null;
  huella: string | null;
  baseVersion: string | null;
}

export interface ResultadoCambioCliente {
  sinCambios: boolean;
  orderId: string;
  nroPedido: string | null;
  date_upd: string | null;
  /** El `cliente` completo que quedó en el pedido (para refrescar la fila sin recargar la lista). */
  cliente?: any;
  /** La marca completa de cambios del pedido: la fila la necesita al día, o un guardado posterior pisaría la entrada nueva. */
  cambiosDeCliente?: any[];
  /** `undefined`: sin cambio; objeto: nueva facturación; `null`: se vació. */
  facturacion?: any;
}

export interface CuerpoCambioCliente {
  clientId: string;
  motivo: string;
  huella: string;
  _baseVersion?: string | null;
  confirmaciones?: { despacho?: boolean; enlacePago?: boolean; recalculo?: boolean };
}

@Injectable({ providedIn: 'root' })
export class CambiarClientePedidoService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * ¿El rol de la persona tiene la acción `cambiar_cliente`? Solo sirve para ofrecer el botón: el servidor la vuelve a exigir
   * en la vista previa y al confirmar. Con la bandera apagada la ruta responde 403 y el llamador lo toma como `false`.
   */
  acceso(): Observable<{ success: boolean; data: { puede: boolean } }> {
    return this.getSinLoader<{ success: boolean; data: { puede: boolean } }>('/v1/orders/customer-change/access');
  }

  /**
   * Solo lectura: de quién a quién, avisos, bloqueos y la huella que hay que devolver al confirmar.
   * `baseVersion` es la versión del pedido con la que la persona lo abrió: si otra persona lo editó desde entonces, 409.
   */
  vistaPrevia(orderId: string, clientId: string, baseVersion?: string | null): Observable<{ success: boolean; data: VistaPreviaCambioCliente }> {
    return this.post(`/v1/orders/${encodeURIComponent(orderId)}/customer/preview`, { clientId, _baseVersion: baseVersion || null });
  }

  /** Aplica el cambio. El servidor revalida todo y rechaza con 409 si algo cambió desde la vista previa. */
  cambiar(orderId: string, cuerpo: CuerpoCambioCliente): Observable<{ success: boolean; data: ResultadoCambioCliente }> {
    return this.post(`/v1/orders/${encodeURIComponent(orderId)}/customer`, cuerpo);
  }
}
