import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../shared/services/base.service";

/** Producto ya resuelto por el servidor: sin stock, sin costo, sin datos internos. */
export interface SitioProducto {
  productoId: string;
  titulo: string;
  descripcion: string;
  referencia: string;
  imagen: string | null;
  precioConIva: number;
  disponible: boolean;
}

/**
 * Un bloque es tipo + datos. El backend valida los tipos contra una lista
 * blanca, así que aquí solo hay que saber dibujarlos.
 */
export interface SitioBloque {
  id: string;
  tipo: "hero" | "texto" | "galeria" | "productos" | "whatsapp" | "formulario" | "faq" | "footer";
  visible: boolean;
  datos: any;
}

export interface SitioTema {
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  tipografia: "sistema" | "serif" | "sans" | "mono";
}

export interface SitioSeo {
  titulo: string;
  descripcion: string;
  imagen: string;
}

export interface SitioPublicoView {
  nombre: string;
  tipo: string;
  slug: string;
  tema: SitioTema;
  seo: SitioSeo;
  bloques: SitioBloque[];
}

export interface LeadSitio {
  nombre: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
}

@Injectable({ providedIn: "root" })
export class SitioPublicoService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Página publicada, por su dirección. Sin login. */
  getPublico(slug: string): Observable<{ success: boolean; data: SitioPublicoView }> {
    return this.get<{ success: boolean; data: SitioPublicoView }>(
      `/v1/sites/public/${encodeURIComponent(slug)}`
    );
  }

  /** Formulario de contacto: el lead entra al CRM del comercio. */
  enviarLead(slug: string, body: LeadSitio): Observable<{ success: boolean; message?: string }> {
    return this.post<{ success: boolean; message?: string }>(
      `/v1/sites/public/${encodeURIComponent(slug)}/lead`,
      body
    );
  }

  /** Telemetría de clics. Si falla no pasa nada: el visitante no debe enterarse. */
  registrarClic(slug: string, destino: string, bloqueId?: string): void {
    this.post(`/v1/sites/public/${encodeURIComponent(slug)}/clic`, { destino, bloqueId })
      .subscribe({ error: () => undefined });
  }
}
