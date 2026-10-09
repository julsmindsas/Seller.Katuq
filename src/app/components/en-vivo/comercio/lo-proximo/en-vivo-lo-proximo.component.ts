import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { atencionCongelada$ } from '../comercio-fuentes';
import { emitirAccionDeAtencion } from '../comercio-acciones';
import { ItemAtencion, masUrgentes } from '../utilidades/atencion';

/** Lo que pinta el panel. */
interface VistaLoProximo {
  calculada: boolean;
  /** Las tres cosas más urgentes que llevan a algún lado. */
  proximos: ItemAtencion[];
  /** Cuántas piden atención (grave o por revisar). */
  urgentes: number;
  titulo: string;
  empresa: string | null;
}

/**
 * "Lo próximo": el panel con las tres cosas más urgentes que tienen acción, cada una con la
 * sugerencia de Opttia, o "Todo al día" si no hay nada. Lee `radar.atencion` del
 * `EnVivoEstadoService` (el servidor ya lo calcula y lo filtra por D-349); tocar un punto abre la
 * ficha del pedido o del mensajero por `EnVivoInteraccionService` (`abrir-pedido`,
 * `abrir-mensajero`). Se congela mientras se repite el día. Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-lo-proximo',
  templateUrl: './en-vivo-lo-proximo.component.html',
  styleUrls: ['./en-vivo-lo-proximo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoLoProximoComponent implements OnInit, OnDestroy {
  vista: VistaLoProximo | null = null;

  private suscripcion: Subscription | null = null;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly cambios: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.suscripcion = atencionCongelada$(
      this.estado.estado$,
      this.interaccion.repeticion$.pipe(map((r) => r.activa))
    ).subscribe((atencion) => {
      this.vista = {
        calculada: atencion.calculada,
        proximos: masUrgentes(atencion.items),
        urgentes: atencion.urgentes,
        titulo: atencion.soloPropias ? 'Lo que conviene hacer con mis pedidos' : 'Lo que conviene hacer ya',
        empresa: atencion.empresa,
      };
      this.cambios.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
  }

  abrir(item: ItemAtencion): void {
    emitirAccionDeAtencion(this.interaccion, item.accion, this.vista?.empresa ?? null);
  }

  porClave(_: number, item: ItemAtencion): string {
    return item.clave;
  }
}
