import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { EventoHistorialProducto, PrecioHistorialProducto } from '../../../shared/models/historial-producto.model';
import { aspectoEvento, AspectoEvento, lineaPrecio, lineaQuien, resumenFoto, sentidoPrecio, textoValor } from './historial-producto.util';

/**
 * Un cambio del historial del producto (D-548, F1): ícono en azulejo, título, quién y cuándo, los
 * datos que cambiaron con su valor de antes y las pastillas de precio y costo.
 * Solo pinta: los textos de negocio ya vienen del servidor.
 */
@Component({
  selector: 'app-historial-producto-evento',
  templateUrl: './historial-producto-evento.component.html',
  styleUrls: ['./historial-producto-evento.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialProductoEventoComponent {
  @Input() evento!: EventoHistorialProducto;

  get aspecto(): AspectoEvento {
    return aspectoEvento(this.evento?.tipo);
  }

  get quien(): string {
    return lineaQuien(this.evento);
  }

  get resumenFoto(): string {
    return resumenFoto(this.evento?.foto);
  }

  /** «Precio Modelos» o el costo, uno por pastilla. */
  linea(p: PrecioHistorialProducto): string {
    return lineaPrecio(p);
  }

  sentido(p: PrecioHistorialProducto): string {
    return sentidoPrecio(p);
  }

  valor(v: any, clase?: string): string {
    return textoValor(v, clase);
  }

  trackIndice(i: number): number {
    return i;
  }
}
