import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseService } from "../../../../../shared/services/base.service";

/** Una pieza como la ve la página publicada (`productoParaVitrina` del servidor). */
export interface PiezaDeVitrina {
  productoId: string;
  titulo: string;
  imagen: string;
  precioConIva: number;
  precioAntes: number;
  disponible: boolean;
  url: string;
}

/**
 * Lecturas del panel del plano (PLAN-V2 T13). Solo lee, y sin la pantalla de carga global: el panel las pide de fondo,
 * mientras el comercio edita, para decir en vivo si el kit se puede vender (con la pantalla de carga, cada cambio de pieza
 * o de combo tapaba el editor un instante).
 *
 * Por qué no basta `POST /v1/productos/by-ids` (el del selector): ese responde las existencias del inventario
 * (`enrichProductsWithStock`), y la página publicada decide «agotado» con la vista de vitrina del producto
 * (`productoParaVitrina`: `disponibilidad` del producto, precio de vitrina con su promoción). Si el panel usara las del
 * inventario, diría «Falta 1 pieza» de un kit que la página sí vende. Por eso el estado del kit sale de la MISMA
 * vista que usa la página: `GET /v1/sites/public/:slug/productos` (pública, de a 30, con las categorías ocultas de lo
 * publicado). Un sitio que nunca se publicó no la tiene: entonces el panel no afirma existencias.
 */
@Injectable({ providedIn: "root" })
export class PlanoKitService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Nombre, foto, precio de lista y si está activa (el mismo `POST /v1/productos/by-ids` del selector), sin la pantalla de
   * carga: el panel lo pide de fondo mientras el comercio edita.
   */
  productosPorIds(ids: string[]): Observable<{ success: boolean; products?: any[] }> {
    return this.postSinLoader("/v1/productos/by-ids", { ids });
  }

  /** Los combos de la empresa (el mismo `GET /v1/combos/all` de Maestros › Combos), sin la pantalla de carga. */
  combos(): Observable<any> {
    return this.getSinLoader("/v1/combos/all");
  }

  /** El slug del sitio y si ya tiene algo publicado (la vista de vitrina solo existe para un sitio publicado). */
  sitio(id: string): Observable<{ success: boolean; data?: { slug?: string; published?: unknown } }> {
    return this.getSinLoader(`/v1/sites/${encodeURIComponent(id)}`);
  }

  /** Las piezas como las ve la página (hasta 30 por pedido, el tope del servidor). */
  piezasDeLaPagina(slug: string, ids: string[]): Observable<{ success: boolean; data?: { productos?: PiezaDeVitrina[] } }> {
    const lista = ids.slice(0, 30).map((id) => encodeURIComponent(id)).join(",");
    return this.getSinLoader(`/v1/sites/public/${encodeURIComponent(slug)}/productos?ids=${lista}`);
  }
}
