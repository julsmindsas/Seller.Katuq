import { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { diaColombia, sumarDias } from '../../../components/ventas/list/acciones-pedido/acciones-pedido.dia';
import {
  AccionesUsuario, accionesPorOmision, normalizarAcciones,
} from '../../../components/ventas/list/acciones-pedido/acciones-pedido.me';
import { AccionPedidoId } from '../../../components/ventas/list/acciones-pedido/acciones-pedido.catalogo';
import { BaseService } from '../base.service';
import { SKIP_LOADER } from '../interceptor/loader.interceptor';

/**
 * D-547 (F2, D13 y D19): las acciones principales del pedido por rol y por usuario. Las cinco llamadas de
 * `/v1/order-actions`. Todo esto solo corre con la bandera `orderPinnedActions` encendida: quien lo usa decide
 * eso ANTES de llamar a `cargar()`; con la bandera apagada este servicio no hace ninguna petición.
 *
 * Estado de la SESIÓN, no una capa de caché sobre consultas (igual que los maestros de `PedidosUtilService`):
 * guarda la respuesta de `GET /me` con el token con que se pidió y la vuelve a pedir solo si el token cambia
 * (nuevo inicio de sesión). Abrir un pedido no consulta nada.
 *
 * El conteo de uso falla en silencio (respuesta 3 de las Open Questions) y no escribe nada en consola.
 * Fijar, soltar y restablecer devuelven el error a quien llama para que avise «No pudimos guardar tus acciones».
 */

export type { AccionesUsuario, RolAccionesServidor } from '../../../components/ventas/list/acciones-pedido/acciones-pedido.me';

@Injectable({ providedIn: 'root' })
export class OrderActionsService extends BaseService {
  private readonly base = '/v1/order-actions';

  private readonly estadoSubject = new BehaviorSubject<AccionesUsuario | null>(null);
  /** El estado cargado; `null` mientras no se haya cargado o si la carga falló (el bloque queda como en F1). */
  readonly estado$: Observable<AccionesUsuario | null> = this.estadoSubject.asObservable();

  /** Token con que ya se intentó `GET /me`: solo se vuelve a pedir si cambia. */
  private tokenIntentado: string | null = null;
  private enVuelo: Observable<AccionesUsuario | null> | null = null;
  /** Una vez por acción y por día en esta sesión (D16). */
  private usoDeHoy = new Map<string, string>();

  get estado(): AccionesUsuario | null {
    return this.estadoSubject.value;
  }

  /**
   * `GET /me`, una vez por sesión. Devuelve el estado cargado (o `null` si no se pudo); quien llama debe
   * suscribirse. Con 404 o 409 (el usuario no tiene documento único) queda el estado por omisión.
   */
  cargar(): Observable<AccionesUsuario | null> {
    const token = this.tokenActual();
    if (!token) return of(null);
    if (this.tokenIntentado === token) return this.enVuelo || of(this.estadoSubject.value);

    this.tokenIntentado = token;
    this.usoDeHoy.clear();
    this.estadoSubject.next(null); // un token nuevo es otra sesión: lo anterior no vale
    this.enVuelo = this.getSinLoader<unknown>(`${this.base}/me`).pipe(
      map(normalizarAcciones),
      tap(estado => this.estadoSubject.next(estado)),
      catchError(err => {
        const status = Number(err?.status);
        if (status === 404 || status === 409) {
          const porOmision = accionesPorOmision();
          this.estadoSubject.next(porOmision);
          return of(porOmision);
        }
        // Sin red o con un error del servidor se vuelve a intentar al próximo ingreso a Pedidos.
        if (status === 0 || status >= 500) this.tokenIntentado = null;
        return of(null);
      }),
      finalize(() => { this.enVuelo = null; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.enVuelo;
  }

  /** `PUT /me/pins`: reemplaza la lista de pines. El estado cambia solo cuando el servidor confirma. */
  guardarPines(pinned: AccionPedidoId[]): Observable<string[]> {
    return this.http.put<{ pinned: string[] }>(
      environment.urlApi + `${this.base}/me/pins`, { pinned }, { context: this.sinCarga() },
    ).pipe(
      map(r => (Array.isArray(r?.pinned) ? r.pinned : pinned) as string[]),
      tap(confirmados => {
        const actual = this.estadoSubject.value;
        if (actual) this.estadoSubject.next({ ...actual, pinned: confirmados });
      }),
    );
  }

  /**
   * `POST /me/usage`: suma el día de hoy a una acción, como máximo una vez por acción y por día en la sesión.
   * Guarda solo la acción (nada del pedido ni del cliente). Falla en silencio y no se reintenta.
   */
  registrarUso(id: AccionPedidoId): void {
    if (!this.estadoSubject.value) return; // bandera apagada o sin cargar: no se hace ninguna petición
    const hoy = diaColombia();
    if (this.usoDeHoy.get(id) === hoy) return;
    this.usoDeHoy.set(id, hoy);
    this.postSinLoader<unknown>(`${this.base}/me/usage`, { actionId: id }).subscribe({ error: () => { /* en silencio */ } });
  }

  /**
   * `POST /me/suggestion`: `shown` (se mostró) o `dismissed` («Ahora no»). Devuelve el resultado para que quien
   * llama avise si falla una preferencia; `shown` no necesita avisar.
   */
  registrarSugerencia(id: AccionPedidoId, decision: 'shown' | 'dismissed'): Observable<void> {
    return this.postSinLoader<unknown>(`${this.base}/me/suggestion`, { actionId: id, decision }).pipe(
      tap(() => {
        const actual = this.estadoSubject.value;
        if (!actual) return;
        const hoy = diaColombia();
        this.estadoSubject.next(decision === 'shown'
          ? { ...actual, lastSuggestionAt: hoy }
          : { ...actual, dismissed: { ...actual.dismissed, [id]: sumarDias(hoy, 30) } });
      }),
      map(() => undefined),
    );
  }

  /** `PUT /roles/:roleId`: las 4 acciones de un rol (solo un administrador). */
  guardarRol(roleId: string, profile: string, actions: AccionPedidoId[]): Observable<{ profile: string; actions: string[] }> {
    return this.put<{ profile: string; actions: string[] }>(
      `${this.base}/roles/${encodeURIComponent(roleId)}`, { profile, actions },
    );
  }

  private sinCarga(): HttpContext {
    return new HttpContext().set(SKIP_LOADER, true);
  }

  /** El token de la sesión (el mismo que adjunta el interceptor). Sin sesión, vacío. */
  private tokenActual(): string {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return typeof u?.token === 'string' ? u.token : '';
    } catch {
      return '';
    }
  }
}
