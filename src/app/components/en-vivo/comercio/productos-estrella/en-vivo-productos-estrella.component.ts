import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { ocultarDe$ } from '../comercio-fuentes';
import { FilaProducto, filasProductos } from '../utilidades/productos';

/**
 * "Lo que más se vende": los 6 productos más vendidos hoy por el comercio, con unidades, valor y
 * una barra con los colores del tema. El servidor suma las líneas del carrito de los pedidos de
 * hoy y resta los cancelados y rechazados (`radar.productosEstrella`, y la foto mientras llega el
 * primer radar); aquí solo se presentan. Con "ocultar clientes y montos" no sale el valor.
 */
@Component({
  selector: 'app-en-vivo-productos-estrella',
  templateUrl: './en-vivo-productos-estrella.component.html',
  styleUrls: ['./en-vivo-productos-estrella.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoProductosEstrellaComponent implements OnInit, OnDestroy {
  filas: FilaProducto[] = [];
  /** D-349: el vendedor ve solo los suyos y los rótulos dicen "Mis…". */
  soloPropias = false;

  private suscripcion: Subscription | null = null;

  constructor(private readonly estado: EnVivoEstadoService, private readonly cambios: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.suscripcion = combineLatest([
      this.estado.estado$.pipe(
        map((e) => ({
          delRadar: e.radar?.productosEstrella,
          deLaFoto: e.cifras?.productosEstrella,
          soloPropias: e.soloPropias,
        })),
        distinctUntilChanged(
          (a, b) => a.delRadar === b.delRadar && a.deLaFoto === b.deLaFoto && a.soloPropias === b.soloPropias
        )
      ),
      ocultarDe$(this.estado.preferencias$),
    ]).subscribe(([e, ocultar]) => {
      // Los del radar se renuevan cada 30 s; los de la foto sirven mientras llega el primero.
      this.filas = filasProductos(e.delRadar ?? e.deLaFoto ?? [], ocultar);
      this.soloPropias = e.soloPropias;
      this.cambios.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
  }

  porClave(_: number, fila: FilaProducto): string {
    return fila.clave;
  }
}
