import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { armarTiempos, TramoTiempo, VistaTiempos } from '../utilidades/tiempos';

/**
 * "Del pedido a la puerta": los tiempos de hoy del comercio (ciclo completo con sus mensajeros y
 * sus tres tramos: preparación, espera para salir y entrega) y, si el servidor la manda, la
 * comparación con la mediana de los comercios de Katuq ("Vas 20 % más lento que el promedio de los
 * comercios de Katuq..."). La comparación llega solo con 5 comercios o más y nunca nombra a otro:
 * sin `radar.comparacion` no se muestra. Lee `radar.tiempos` y `radar.comparacion` del
 * `EnVivoEstadoService`; el servidor calcula, aquí solo se presenta. Sin montos ni clientes.
 */
@Component({
  selector: 'app-en-vivo-tiempos-comercio',
  templateUrl: './en-vivo-tiempos-comercio.component.html',
  styleUrls: ['./en-vivo-tiempos-comercio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoTiemposComercioComponent implements OnInit, OnDestroy {
  vista: VistaTiempos;

  private suscripcion: Subscription | null = null;

  private readonly t = (clave: string, params?: Record<string, unknown>): string => this.translate.instant(clave, params);

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly cambios: ChangeDetectorRef,
    private readonly translate: TranslateService
  ) {
    this.vista = armarTiempos(null, null, this.t);
  }

  ngOnInit(): void {
    this.suscripcion = combineLatest([
      this.estado.estado$.pipe(
        map((e) => ({ tiempos: e.radar?.tiempos ?? null, comparacion: e.radar?.comparacion ?? null })),
        distinctUntilChanged((a, b) => a.tiempos === b.tiempos && a.comparacion === b.comparacion)
      ),
      this.translate.onLangChange.pipe(startWith(null)),
    ]).subscribe(([e]) => {
      this.vista = armarTiempos(e.tiempos, e.comparacion, this.t);
      this.cambios.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
  }

  porTramo(_: number, tramo: TramoTiempo): string {
    return tramo.id;
  }
}
