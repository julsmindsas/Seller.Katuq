import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { Definiciones, MePlataforma } from '../plataforma.tipos';
import { PlataformaService } from './plataforma.service';

/**
 * D-700 13.4a — Lo que comparten la cabecera y las pestañas: la vista de pedidos («creación» oficial o «por
 * entrega», rotulada) y una señal para recargar tras «Actualizar». Vive solo mientras el módulo esté abierto.
 */
@Injectable()
export class PlataformaContextoService {
  readonly vista$ = new BehaviorSubject<'creacion' | 'entrega'>('creacion');
  readonly recarga$ = new BehaviorSubject<number>(0);

  private definicionesCache: Definiciones | null = null;
  private me$: Observable<MePlataforma | null> | null = null;

  constructor(private servicio: PlataformaService) {}

  /** `GET /definitions` una sola vez por apertura; si falla no se guarda y la próxima vuelve a intentar. */
  definiciones(): Observable<Definiciones> {
    if (this.definicionesCache) return of(this.definicionesCache);
    return this.servicio.definiciones().pipe(
      map((r) => r.datos),
      tap((d) => { this.definicionesCache = d; }),
    );
  }

  /** `GET /me` una sola vez por apertura. Sin respuesta es `null`: la autorización real es del servidor. */
  private yo(): Observable<MePlataforma | null> {
    if (!this.me$) {
      this.me$ = this.servicio.me().pipe(
        map((r) => (r && r.datos) || null),
        catchError(() => of(null)),
        shareReplay(1),
      );
    }
    return this.me$;
  }

  /** ¿Puede escribir? Sin respuesta cuenta como no. */
  esOperador(): Observable<boolean> {
    return this.yo().pipe(map((m) => !!(m && m.esOperador)));
  }

  /** ¿Puede ver la auditoría de pagos por persona? Sin respuesta cuenta como no (el servidor decide de todos modos). */
  esLectorAuditoria(): Observable<boolean> {
    return this.yo().pipe(map((m) => !!(m && m.esLectorAuditoria)));
  }

  /** ¿Está encendida la bandera de pagos manuales? (apagada, la ventana deja ver y anular, pero no registrar). */
  pagosManualesActivos(): Observable<boolean> {
    return this.yo().pipe(map((m) => !!(m && m.banderas && m.banderas['manualPaymentsEnabled'] === true)));
  }

  cambiarVista(v: 'creacion' | 'entrega'): void {
    if (this.vista$.value !== v) this.vista$.next(v);
  }

  recargar(): void {
    this.recarga$.next(this.recarga$.value + 1);
  }
}
