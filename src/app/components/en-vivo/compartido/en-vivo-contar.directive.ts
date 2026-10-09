import { Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormatoCifra, formatearCifra } from '../utilidades/formato';
import { prefiereMenosMovimiento } from '../utilidades/movimiento';

const DURACION_MS = 850;

/**
 * Conteo animado: el texto del elemento sube (o baja) hasta el valor nuevo en unos 850 ms, con
 * salida suave. Escribe directo en el DOM fuera de la zona de Angular (un cuadro por vez), así
 * que el elemento debe ir VACÍO en la plantilla y marcado `aria-hidden`: el texto accesible va
 * aparte, con el valor final.
 *
 * - La primera vez no cuenta desde cero: pone el valor de una.
 * - Con "reducir movimiento", sin animación, o si cambia el formato, el valor se pone de una.
 */
@Directive({ selector: '[enVivoContar]' })
export class EnVivoContarDirective implements OnChanges, OnDestroy {
  @Input('enVivoContar') valor = 0;
  @Input() contarFormato: FormatoCifra = 'entero';
  @Input() contarAnimar = true;

  private mostrado: number | null = null;
  private cuadro = 0;

  constructor(private readonly elemento: ElementRef<HTMLElement>, private readonly zona: NgZone) {}

  ngOnChanges(cambios: SimpleChanges): void {
    const destino = Number.isFinite(this.valor) ? this.valor : 0;
    cancelAnimationFrame(this.cuadro);

    const sinAnimar =
      this.mostrado === null ||
      !this.contarAnimar ||
      !!cambios['contarFormato'] ||
      this.mostrado === destino ||
      prefiereMenosMovimiento();
    if (sinAnimar) {
      this.fijar(destino);
      return;
    }

    const desde = this.mostrado as number;
    const inicio = performance.now();
    this.zona.runOutsideAngular(() => {
      const paso = (ahora: number): void => {
        const k = Math.min(1, (ahora - inicio) / DURACION_MS);
        const suave = 1 - Math.pow(1 - k, 3);
        this.fijar(desde + (destino - desde) * suave);
        if (k < 1) this.cuadro = requestAnimationFrame(paso);
        else this.fijar(destino);
      };
      this.cuadro = requestAnimationFrame(paso);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.cuadro);
  }

  private fijar(valor: number): void {
    this.mostrado = valor;
    this.elemento.nativeElement.textContent = formatearCifra(valor, this.contarFormato);
  }
}
