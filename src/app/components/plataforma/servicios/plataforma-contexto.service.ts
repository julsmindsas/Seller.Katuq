import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Definiciones } from '../plataforma.tipos';
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

  constructor(private servicio: PlataformaService) {}

  /** `GET /definitions` una sola vez por apertura; si falla no se guarda y la próxima vuelve a intentar. */
  definiciones(): Observable<Definiciones> {
    if (this.definicionesCache) return of(this.definicionesCache);
    return this.servicio.definiciones().pipe(
      map((r) => r.datos),
      tap((d) => { this.definicionesCache = d; }),
    );
  }

  cambiarVista(v: 'creacion' | 'entrega'): void {
    if (this.vista$.value !== v) this.vista$.next(v);
  }

  recargar(): void {
    this.recarga$.next(this.recarga$.value + 1);
  }
}
