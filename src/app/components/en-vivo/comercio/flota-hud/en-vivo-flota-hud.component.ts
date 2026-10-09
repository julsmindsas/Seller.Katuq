import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { armarFlota, EntradaFlota } from '../../utilidades/flota';
import { cadaFueraDeZona } from '../../utilidades/movimiento';
import { FilaFlotaHud, filasFlotaHud } from '../utilidades/flota-hud';

const ACTUALIZAR_MS = 30000;

/**
 * "Tu flota": cada mensajero propio (moto) con su estado, "En bodega" o "En ruta · 2 · 25 min" (el
 * tiempo sube mientras siga en la calle), y las transportadoras que llevan pedidos. Lee la flota y
 * los pedidos en camino del `EnVivoEstadoService`; tocar una fila avisa por
 * `EnVivoInteraccionService` (`abrir-mensajero`). Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-flota-hud',
  templateUrl: './en-vivo-flota-hud.component.html',
  styleUrls: ['./en-vivo-flota-hud.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFlotaHudComponent implements OnInit, OnDestroy {
  filas: FilaFlotaHud[] = [];

  private entradas: EntradaFlota[] = [];
  private ahoraMs = Date.now();
  private suscripcion: Subscription | null = null;
  private pararReloj: (() => void) | null = null;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.suscripcion = this.estado.estado$
      .pipe(
        map((e) => ({ flota: e.flota, pedidos: e.pedidos, actualizadoEn: e.actualizadoEn })),
        distinctUntilChanged(
          (a, b) => a.flota === b.flota && a.pedidos === b.pedidos && a.actualizadoEn === b.actualizadoEn
        )
      )
      .subscribe((e) => {
        this.entradas = armarFlota(e.flota, e.pedidos, e.actualizadoEn);
        this.ahoraMs = Date.now();
        this.armarFilas();
        this.cambios.markForCheck();
      });

    // El tiempo de quien sigue en la calle sube solo, sin esperar un evento.
    this.pararReloj = cadaFueraDeZona(this.zona, ACTUALIZAR_MS, () => {
      this.ahoraMs = Date.now();
      this.armarFilas();
      this.cambios.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.pararReloj?.();
    this.pararReloj = null;
  }

  abrir(fila: FilaFlotaHud): void {
    this.interaccion.emitir({ tipo: 'abrir-mensajero', nombre: fila.nombre, pedidoIds: fila.pedidoIds.slice() });
  }

  porClave(_: number, fila: FilaFlotaHud): string {
    return fila.clave;
  }

  private armarFilas(): void {
    this.filas = filasFlotaHud(this.entradas, this.ahoraMs);
  }
}
