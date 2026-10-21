import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import {
  FilaDomicilio, formatearPesos, LineaDato, lineaDeTiempo, lineasDePunto, PasoTiempo, textoEstadoPaso
} from '../domicilios.presentacion';

/**
 * Detalle de un domicilio en un panel: estado, línea de tiempo (creado, asignado, recogido, entregado o
 * cancelado) y los datos de recogida y entrega. Se crea al abrirlo y se destruye al cerrarlo.
 */
@Component({
  selector: 'app-domicilios-detalle',
  templateUrl: './detalle-domicilio.component.html',
  styleUrls: ['./detalle-domicilio.component.scss']
})
export class DetalleDomicilioComponent implements OnChanges {
  @Input() fila!: FilaDomicilio;
  @Output() cerrar = new EventEmitter<void>();
  /** Pide cancelar este domicilio; quien lo usa abre la confirmación. */
  @Output() cancelar = new EventEmitter<FilaDomicilio>();

  readonly pesos = formatearPesos;
  readonly textoPaso = textoEstadoPaso;

  pasos: PasoTiempo[] = [];
  recogida: LineaDato[] = [];
  entrega: LineaDato[] = [];

  ngOnChanges(): void {
    // Se recalcula cada vez que llega una versión nueva del domicilio (el refresco de la lista).
    const d = this.fila.domicilio;
    this.pasos = lineaDeTiempo(d);
    this.recogida = lineasDePunto(d.recogida);
    this.entrega = lineasDePunto(d.entrega);
  }

  alCambiarVisibilidad(visible: boolean): void {
    if (!visible) this.cerrar.emit();
  }

  /** Icono dentro del punto de la línea de tiempo; el estado también se dice con texto. */
  iconoPaso(paso: PasoTiempo): string {
    switch (paso.estado) {
      case 'hecho': return 'pi-check';
      case 'actual': return 'pi-ellipsis-h';
      case 'fallo': return 'pi-times';
      default: return '';
    }
  }

  trackPorClave(_i: number, p: PasoTiempo): string {
    return p.clave;
  }
}
