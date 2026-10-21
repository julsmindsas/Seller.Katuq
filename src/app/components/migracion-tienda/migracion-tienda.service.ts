import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../../shared/services/base.service';
import {
  CuerpoClientes,
  CuerpoFotos,
  CuerpoLoteProductos,
  CuerpoRedirecciones,
  CuerpoSimulacion,
  RespuestaClientes,
  RespuestaDeshacerClientes,
  RespuestaFotos,
  RespuestaFotosPendientes,
  RespuestaLoteProductos,
  RespuestaRedirecciones,
  RespuestaSimulacion,
} from './tipos';

const RUTA = '/v1/onboarding/import-store';

/**
 * Cliente de `/v1/onboarding/import-store/*` (importador de tiendas, F5-30). Todos los envíos van
 * sin la pantalla de carga global: la pantalla `migrar-tienda` muestra su propio avance por lote.
 * La empresa la pone el servidor desde el token; el cuerpo nunca la lleva. Los errores se
 * clasifican con `clasificarError` (logica/errores.ts).
 */
@Injectable({ providedIn: 'root' })
export class MigracionTiendaService extends BaseService {
  simular(cuerpo: CuerpoSimulacion): Observable<RespuestaSimulacion> {
    return this.postSinLoader<RespuestaSimulacion>(`${RUTA}/dry-run`, cuerpo);
  }

  importarProductos(cuerpo: CuerpoLoteProductos): Observable<RespuestaLoteProductos> {
    return this.postSinLoader<RespuestaLoteProductos>(`${RUTA}/products`, cuerpo);
  }

  crearRedirecciones(cuerpo: CuerpoRedirecciones): Observable<RespuestaRedirecciones> {
    return this.postSinLoader<RespuestaRedirecciones>(`${RUTA}/redirects`, cuerpo);
  }

  copiarFotos(cuerpo: CuerpoFotos): Observable<RespuestaFotos> {
    return this.postSinLoader<RespuestaFotos>(`${RUTA}/photos`, cuerpo);
  }

  /** Migraciones recientes con fotos por copiar, para retomarlas. Sin cuerpo ni consulta. */
  fotosPendientes(): Observable<RespuestaFotosPendientes> {
    return this.getSinLoader<RespuestaFotosPendientes>(`${RUTA}/photos/pending`);
  }

  importarClientes(cuerpo: CuerpoClientes): Observable<RespuestaClientes> {
    return this.postSinLoader<RespuestaClientes>(`${RUTA}/customers`, cuerpo);
  }

  /** Deshace un lote de clientes (`<migrationId>_c<lote>`). */
  deshacerClientes(batchId: string): Observable<RespuestaDeshacerClientes> {
    return this.delete<RespuestaDeshacerClientes>(`${RUTA}/customers/${encodeURIComponent(batchId)}`);
  }
}
