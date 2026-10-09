import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { ocultarDe$ } from '../comercio-fuentes';
import { armarLogros, FilaLogro, VistaLogros } from '../utilidades/logros';

/**
 * "Para contar hoy": la proyección al cierre contra SU récord de los últimos 90 días, su mejor
 * hora de hoy, lo que Opttia le armó por WhatsApp y cuántos pedidos van entregados. La proyección
 * y el récord los calcula el servidor (`radar.proyeccion`, `radar.record`); aquí solo se presentan.
 * Con "ocultar clientes y montos" no sale ningún valor en dinero. Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-logros-comercio',
  templateUrl: './en-vivo-logros-comercio.component.html',
  styleUrls: ['./en-vivo-logros-comercio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoLogrosComercioComponent implements OnInit, OnDestroy {
  vista: VistaLogros | null = null;

  private suscripcion: Subscription | null = null;

  constructor(private readonly estado: EnVivoEstadoService, private readonly cambios: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.suscripcion = combineLatest([
      this.estado.estado$.pipe(
        map((e) => ({
          proyeccion: e.radar?.proyeccion ?? null,
          record: e.radar?.record ?? null,
          cifras: e.cifras,
          pedidos: e.pedidos,
          soloLectura: e.soloLectura,
          soloPropias: e.soloPropias,
        })),
        distinctUntilChanged(
          (a, b) =>
            a.proyeccion === b.proyeccion &&
            a.record === b.record &&
            a.cifras === b.cifras &&
            a.pedidos === b.pedidos &&
            a.soloLectura === b.soloLectura &&
            a.soloPropias === b.soloPropias
        )
      ),
      ocultarDe$(this.estado.preferencias$),
    ]).subscribe(([entrada, ocultar]) => {
      this.vista = armarLogros({ ...entrada, ocultar });
      this.cambios.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
  }

  porId(_: number, fila: FilaLogro): string {
    return fila.id;
  }
}
