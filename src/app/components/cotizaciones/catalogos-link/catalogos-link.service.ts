import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../../shared/services/base.service";
import { CatalogoLink, DatosCatalogo, RespuestaCatalogos } from "./catalogo-link.modelos";

/** Endpoints del vendedor de `/v1/catalogos` (D-141). Los públicos los usa `catalogo-publico`. */
@Injectable({ providedIn: "root" })
export class CatalogosLinkService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  listar(): Observable<RespuestaCatalogos<CatalogoLink[]>> {
    return this.get<RespuestaCatalogos<CatalogoLink[]>>("/v1/catalogos/all");
  }

  obtener(id: string): Observable<RespuestaCatalogos<CatalogoLink>> {
    return this.get<RespuestaCatalogos<CatalogoLink>>(`/v1/catalogos/${encodeURIComponent(id)}`);
  }

  crear(datos: DatosCatalogo): Observable<RespuestaCatalogos<CatalogoLink>> {
    return this.post<RespuestaCatalogos<CatalogoLink>>("/v1/catalogos/create", datos);
  }

  editar(id: string, cambios: DatosCatalogo): Observable<RespuestaCatalogos<unknown>> {
    return this.put<RespuestaCatalogos<unknown>>("/v1/catalogos/edit", { id, ...cambios });
  }

  /** Idempotente: si el catálogo ya tiene link, el backend devuelve el mismo. */
  generarLink(id: string): Observable<RespuestaCatalogos<{ token: string }>> {
    return this.post<RespuestaCatalogos<{ token: string }>>(`/v1/catalogos/${encodeURIComponent(id)}/share-token`, {});
  }
}
