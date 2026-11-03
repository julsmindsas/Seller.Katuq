import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** Una opción de la lista: con su texto ya escrito (`label`, ej. un nombre) o con una clave de traducción. */
export interface OpcionMulti {
  value: string;
  label?: string;
  labelKey?: string;
}

let siguienteId = 0;

/**
 * Ticket 1467: lista desplegable con casillas para elegir varias opciones (vendedores, antigüedad,
 * estados de pago). Sin nada elegido significa «todos». Se cierra con Escape, al hacer clic afuera y
 * al salir con el teclado; las casillas se leen con lector de pantalla.
 */
@Component({
  selector: 'app-cartera-multi',
  templateUrl: './cartera-multi.component.html',
  styleUrls: ['./cartera-multi.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraMultiComponent {
  @Input() etiqueta = '';
  @Input() opciones: OpcionMulti[] = [];
  /** Valores elegidos. */
  @Input() seleccion: string[] = [];
  /** Texto cuando no hay nada elegido (ej. «Todos»). */
  @Input() textoTodos = '';
  /** Texto del resumen con varias elegidas; lleva {{n}}. */
  @Input() textoVarias = '';
  /** Texto del botón «Quitar la selección». */
  @Input() textoLimpiar = '';
  @Output() seleccionChange = new EventEmitter<string[]>();

  abierto = false;
  readonly idBoton = 'cx-multi-' + ++siguienteId;
  readonly idLista = this.idBoton + '-lista';

  constructor(private host: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef, private translate: TranslateService) {}

  /** Lo que muestra el botón: «Todos», el nombre si hay una, o «N seleccionados». */
  get resumen(): string {
    if (this.seleccion.length === 0) return this.textoTodos;
    if (this.seleccion.length === 1) {
      const o = this.opciones.find((x) => x.value === this.seleccion[0]);
      return o ? this.textoDe(o) : this.seleccion[0];
    }
    return this.textoVarias.replace('{{n}}', String(this.seleccion.length));
  }

  private textoDe(o: OpcionMulti): string {
    return o.labelKey ? this.translate.instant(o.labelKey) : o.label || o.value;
  }

  estaElegida(valor: string): boolean {
    return this.seleccion.includes(valor);
  }

  alternarPanel(): void {
    this.abierto = !this.abierto;
  }

  alternarOpcion(valor: string): void {
    const nueva = this.estaElegida(valor) ? this.seleccion.filter((v) => v !== valor) : [...this.seleccion, valor];
    this.seleccionChange.emit(nueva);
  }

  limpiar(): void {
    this.seleccionChange.emit([]);
  }

  trackPorValor(_i: number, o: OpcionMulti): string {
    return o.value;
  }

  @HostListener('document:click', ['$event'])
  alHacerClicAfuera(evento: Event): void {
    if (this.abierto && !this.host.nativeElement.contains(evento.target as Node)) {
      this.abierto = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('keydown.escape')
  alEscape(): void {
    if (this.abierto) {
      this.abierto = false;
      const boton = this.host.nativeElement.querySelector('button');
      if (boton) (boton as HTMLElement).focus();
      this.cdr.markForCheck();
    }
  }

  @HostListener('focusout', ['$event'])
  alPerderFoco(evento: FocusEvent): void {
    const siguiente = evento.relatedTarget as Node | null;
    if (this.abierto && siguiente && !this.host.nativeElement.contains(siguiente)) {
      this.abierto = false;
      this.cdr.markForCheck();
    }
  }
}
