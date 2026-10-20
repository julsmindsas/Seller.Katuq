import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from '../base.service';
import { AttributeSchemas, IndiceDeRutas, ValorAtributo } from './atributos-categoria';

export interface EsquemasRespuesta {
  version: number;
  schemas: AttributeSchemas;
  /** Solo en el GET: índice de rutas del mismo documento, para resolver la categoría del producto como el servidor. */
  indice?: IndiceDeRutas;
}

export interface GuardadoEsquemas extends EsquemasRespuesta {
  success: boolean;
}

export interface GuardadoAtributosProducto {
  success: boolean;
  written: string[];
  removed: string[];
  /** Obligatorios que siguen sin valor: se avisa, no bloquea. */
  missing: string[];
}

/** Detalle por campo de un 400 (esquemas o valores). */
export interface ErrorDeCampo {
  motivo: string;
  mensaje: string;
  key?: string;
  ruta?: string;
  opciones?: string[];
}

/**
 * Atributos por categoría (D-495, ticket 1234): llamadas a los endpoints nuevos.
 * Solo se usan con la bandera `categoryAttributes` (al abrir el modal de Maestros o la
 * pestaña «Especificaciones»). El interceptor agrega la sesión; la empresa sale del
 * token. Quien manda es el servidor (bandera, versión y validación).
 */
@Injectable({ providedIn: 'root' })
export class CatalogAttributesService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getSchemas(): Observable<EsquemasRespuesta> {
    return this.getSinLoader<EsquemasRespuesta>('/v1/categorias/attribute-schemas');
  }

  /** 409 si alguien guardó antes sobre la misma versión: hay que recargar. */
  saveSchemas(version: number, schemas: AttributeSchemas): Observable<GuardadoEsquemas> {
    return this.put<GuardadoEsquemas>('/v1/categorias/attribute-schemas', { version, schemas });
  }

  /** Escribe solo las claves enviadas; `null` borra. No reenvía el producto a las tiendas conectadas. */
  saveProductAttributes(cd: string, attributes: Record<string, ValorAtributo>): Observable<GuardadoAtributosProducto> {
    return this.postSinLoader<GuardadoAtributosProducto>('/v1/productos/attributes', { cd, attributes });
  }
}
