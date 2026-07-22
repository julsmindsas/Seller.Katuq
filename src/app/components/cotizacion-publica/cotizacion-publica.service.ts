import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../shared/services/base.service";

/** Vista pública (segura) de una cotización para la landing de aprobación (spec 008.3). */
export interface CotizacionPublicaItem {
  titulo: string;
  cantidad: number;
  /** Desglose numérico por unidad (ClickUp wdu9v75qpz) — todos netos del descuento de línea salvo valorBruto. */
  valorBruto: number;
  descuentoPct: number;
  descuentoUnitario: number;
  precioUnitarioSinIva: number;
  porcentajeIva: number;
  valorIva: number;
  precioUnitarioConIva: number;
  subtotal: number;
}

export interface CotizacionPublicaView {
  nroCotizacion: string;
  estado: string;
  vencida: boolean;
  empresaNombre: string;
  clienteNombre: string;
  items: CotizacionPublicaItem[];
  subtotal: number;
  totalDescuento: number;
  baseGravable: number;
  totalImpuesto: number;
  total: number;
  terminos: string;
  fechaEmision: string;
  fechaVencimiento: string;
  validezDias: number | null;
  /** Banners del documento: encabezado/pie de la empresa + publicidad Katuq. */
  branding?: {
    encabezado: string;
    piepagina: string;
    publicidad: string;
  };
}

@Injectable({ providedIn: "root" })
export class CotizacionPublicaService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Trae la cotización por su token público (sin login). */
  getPublica(token: string): Observable<{ success: boolean; data: CotizacionPublicaView }> {
    return this.get<{ success: boolean; data: CotizacionPublicaView }>(
      `/v1/cotizaciones/public/${encodeURIComponent(token)}`
    );
  }

  /** Aceptar o rechazar la cotización confirmando el documento del cliente. */
  responder(
    token: string,
    body: { accion: "aceptar" | "rechazar"; documento: string; motivo?: string }
  ): Observable<{ success: boolean; message?: string; data?: { estado: string } }> {
    return this.post<{ success: boolean; message?: string; data?: { estado: string } }>(
      `/v1/cotizaciones/public/${encodeURIComponent(token)}/responder`,
      body
    );
  }
}
