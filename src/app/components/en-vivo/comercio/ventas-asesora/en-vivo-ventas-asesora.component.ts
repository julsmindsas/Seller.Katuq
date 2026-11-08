import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { ocultarDe$ } from '../comercio-fuentes';
import { FilaAsesora, filasAsesoras } from '../utilidades/asesoras';

/**
 * "Ventas por asesora" (ticket 1580, D-703): cuánto lleva vendido hoy cada asesora, con pedidos,
 * valor y una barra. Solo para administradores de una empresa con la bandera `enVivoPorAsesor`: el
 * servidor manda `cifras.porAsesor` únicamente a ellos y la página monta esta tarjeta solo cuando
 * llega. Se renueva con cada mensaje de cifras. Con "ocultar clientes y montos" no sale el valor.
 */
@Component({
  selector: 'app-en-vivo-ventas-asesora',
  templateUrl: './en-vivo-ventas-asesora.component.html',
  styleUrls: ['./en-vivo-ventas-asesora.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoVentasAsesoraComponent implements OnInit, OnDestroy {
  filas: FilaAsesora[] = [];

  private suscripcion: Subscription | null = null;

  constructor(private readonly estado: EnVivoEstadoService, private readonly cambios: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.suscripcion = combineLatest([
      this.estado.estado$.pipe(
        map((e) => e.cifras?.porAsesor),
        distinctUntilChanged()
      ),
      ocultarDe$(this.estado.preferencias$),
    ]).subscribe(([porAsesor, ocultar]) => {
      this.filas = filasAsesoras(porAsesor, ocultar);
      this.cambios.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
  }

  porClave(_: number, fila: FilaAsesora): string {
    return fila.clave;
  }
}
