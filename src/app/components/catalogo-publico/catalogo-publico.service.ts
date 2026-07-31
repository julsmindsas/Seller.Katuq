import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../shared/services/base.service";

/** Producto tal como lo ve el comprador: sin stock, sin costo, sin datos internos. */
export interface CatalogoPublicoProducto {
  productoId: string;
  titulo: string;
  descripcion: string;
  referencia: string;
  imagen: string | null;
  precioConIva: number;
  disponible: boolean;
}

export interface CatalogoPublicoView {
  nombre: string;
  descripcion: string;
  productos: CatalogoPublicoProducto[];
}

export interface SolicitudCatalogo {
  nombre: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
  items: { productoId: string; cantidad: number }[];
}

@Injectable({ providedIn: "root" })
export class CatalogoPublicoService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Vitrina por token público (sin login). */
  getPublico(token: string): Observable<{ success: boolean; data: CatalogoPublicoView }> {
    return this.get<{ success: boolean; data: CatalogoPublicoView }>(
      `/v1/catalogos/public/${encodeURIComponent(token)}`
    );
  }

  /**
   * Envía el carrito del comprador. Solo viajan producto y cantidad: el precio
   * lo resuelve el servidor, así que aquí no se manda ninguna cifra.
   */
  enviarSolicitud(
    token: string,
    body: SolicitudCatalogo
  ): Observable<{ success: boolean; message?: string; data?: { referencia: string } }> {
    return this.post<{ success: boolean; message?: string; data?: { referencia: string } }>(
      `/v1/catalogos/public/${encodeURIComponent(token)}/solicitud`,
      body
    );
  }
}
