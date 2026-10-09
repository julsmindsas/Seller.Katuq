import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../../servicios/en-vivo-estado.service';
import { emitirAccionDeAtencion } from '../comercio-acciones';
import { atencionCongelada$, VistaAtencion } from '../comercio-fuentes';
import { ItemAtencion, marcarNuevos, textoUrgentes } from '../utilidades/atencion';

/** Lo que pinta la tarjeta. */
interface VistaAtencionAhora {
  calculada: boolean;
  items: ItemAtencion[];
  titulo: string;
  /** "3 por atender" o "Todo al día". */
  chip: string;
  empresa: string | null;
}

/**
 * "Atención ahora": la lista completa de `radar.atencion` del `EnVivoEstadoService`, del más
 * urgente al menos urgente, cada punto con su tono, el texto, la sugerencia de Opttia y el botón
 * "Ver el pedido" o "Ver al mensajero". El servidor calcula todo y ya filtra por D-349; aquí solo
 * se presenta. Los puntos que aparecen después de abrir la pantalla entran resaltados. Mientras se
 * repite el día (`EnVivoInteraccionService.repeticion`) la lista queda congelada. Tocar el botón
 * avisa por `EnVivoInteraccionService` (`abrir-pedido`, `abrir-mensajero`). Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-atencion-ahora',
  templateUrl: './en-vivo-atencion-ahora.component.html',
  styleUrls: ['./en-vivo-atencion-ahora.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoAtencionAhoraComponent implements OnInit, OnDestroy {
  vista: VistaAtencionAhora | null = null;

  private suscripcion: Subscription | null = null;
  /** Claves del pintado anterior; null mientras no se ha pintado nada (lo que ya estaba no entra resaltado). */
  private previas: Set<string> | null = null;

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
      const items = marcarNuevos(atencion.items, atencion.calculada ? this.previas : null);
      this.previas = atencion.calculada ? new Set(items.map((i) => i.clave)) : null;
      this.vista = {
        calculada: atencion.calculada,
        items,
        titulo: this.tituloDe(atencion),
        chip: textoUrgentes(atencion.urgentes),
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

  private tituloDe(atencion: VistaAtencion): string {
    if (atencion.soloLectura) return `Lo que necesita ${atencion.empresa ?? 'el comercio'}`;
    return atencion.soloPropias ? 'Lo que necesitan mis pedidos' : 'Lo que necesita tu operación';
  }
}
