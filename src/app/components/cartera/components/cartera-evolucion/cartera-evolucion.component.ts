import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CarteraEvolucionPunto, CarteraEvolucionResponse } from '../../../../shared/services/cartera/cartera.models';

/** Una barra doble (total y vencida) de un mes, ya con su posición en el dibujo. */
interface MesDibujo {
  periodo: string;
  etiqueta: string;
  x: number;
  anchoBarra: number;
  total: { y: number; alto: number };
  vencida: { y: number; alto: number };
  punto: CarteraEvolucionPunto;
  titulo: string;
}

interface MarcaEje {
  y: number;
  texto: string;
}

/**
 * Ticket 1464 (punto 5): evolución de la cartera total y vencida de los últimos 12 meses, para ver
 * si el cobro mejora o empeora. Dibuja con SVG propio (sin librerías) a partir de las fotos
 * mensuales que guarda el servidor. Solo se muestra cuando hay datos.
 */
@Component({
  selector: 'app-cartera-evolucion',
  templateUrl: './cartera-evolucion.component.html',
  styleUrls: ['./cartera-evolucion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraEvolucionComponent implements OnChanges {
  @Input() evolucion: CarteraEvolucionResponse | null = null;

  // Medidas del dibujo (viewBox); el SVG se escala al ancho de la tarjeta.
  readonly ancho = 640;
  readonly alto = 250;
  readonly margen = { arriba: 12, derecha: 8, abajo: 28, izquierda: 52 };

  meses: MesDibujo[] = [];
  marcas: MarcaEje[] = [];
  puntos: CarteraEvolucionPunto[] = [];
  hayEstimados = false;
  /** Cambio del % vencido contra el mes anterior (negativo = mejoró). null si hay un solo mes. */
  cambioPct: number | null = null;
  ultimo: CarteraEvolucionPunto | null = null;
  ayudaAbierta = false;

  constructor(private translate: TranslateService) {}

  ngOnChanges(): void {
    this.puntos = (this.evolucion && this.evolucion.puntos) || [];
    this.ultimo = this.puntos.length ? this.puntos[this.puntos.length - 1] : null;
    this.hayEstimados = this.puntos.some((p) => p.aproximada);
    this.cambioPct = this.puntos.length > 1
      ? Math.round((this.puntos[this.puntos.length - 1].pctVencido - this.puntos[this.puntos.length - 2].pctVencido) * 10) / 10
      : null;
    this.dibujar();
  }

  alternarAyuda(): void {
    this.ayudaAbierta = !this.ayudaAbierta;
  }

  private get idioma(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  private compacto(n: number): string {
    try {
      return '$' + new Intl.NumberFormat(this.idioma, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    } catch {
      return '$' + Math.round(n);
    }
  }

  private dinero(n: number): string {
    try {
      return new Intl.NumberFormat(this.idioma, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    } catch {
      return '$' + Math.round(n);
    }
  }

  /** Techo «redondo» del eje: 1, 2, 2,5, 5 o 10 por una potencia de 10. */
  private techo(max: number): number {
    if (max <= 0) return 1;
    const potencia = Math.pow(10, Math.floor(Math.log10(max)));
    const f = max / potencia;
    const paso = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return paso * potencia;
  }

  private etiquetaMes(periodo: string): string {
    const [a, m] = periodo.split('-').map(Number);
    const fecha = new Date(a, m - 1, 1);
    const corto = fecha.toLocaleDateString(this.idioma, { month: 'short' }).replace('.', '');
    return m === 1 || this.puntos[0].periodo === periodo ? `${corto} ${String(a).slice(2)}` : corto;
  }

  private nombreMesLargo(periodo: string): string {
    const [a, m] = periodo.split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString(this.idioma, { month: 'long', year: 'numeric' });
  }

  nombreMes(periodo: string): string {
    return this.nombreMesLargo(periodo);
  }

  private dibujar(): void {
    this.meses = [];
    this.marcas = [];
    if (!this.puntos.length) return;
    const { arriba, derecha, abajo, izquierda } = this.margen;
    const areaAncho = this.ancho - izquierda - derecha;
    const areaAlto = this.alto - arriba - abajo;
    const max = this.techo(Math.max(...this.puntos.map((p) => Math.max(p.carteraTotal, p.carteraVencida))));
    const y = (valor: number) => arriba + areaAlto - (valor / max) * areaAlto;

    for (let i = 0; i <= 4; i++) {
      const valor = (max / 4) * i;
      this.marcas.push({ y: y(valor), texto: valor === 0 ? '$0' : this.compacto(valor) });
    }

    const columna = areaAncho / Math.max(this.puntos.length, 6); // con pocos meses las barras no se vuelven enormes
    const anchoBarra = Math.min(columna * 0.36, 22);
    this.meses = this.puntos.map((p, i) => {
      const centro = izquierda + columna * i + columna / 2;
      const yTotal = y(p.carteraTotal);
      const yVencida = y(p.carteraVencida);
      return {
        periodo: p.periodo,
        etiqueta: this.etiquetaMes(p.periodo),
        x: centro,
        anchoBarra,
        total: { y: yTotal, alto: arriba + areaAlto - yTotal },
        vencida: { y: yVencida, alto: arriba + areaAlto - yVencida },
        punto: p,
        titulo: `${this.nombreMesLargo(p.periodo)}: ${this.translate.instant('cartera.carteraEvolucion.total')} ${this.dinero(p.carteraTotal)}, ` +
          `${this.translate.instant('cartera.carteraEvolucion.vencida')} ${this.dinero(p.carteraVencida)} (${p.pctVencido}%)` +
          (p.aproximada ? ` · ${this.translate.instant('cartera.carteraEvolucion.estimado')}` : ''),
      };
    });
  }

  get baseY(): number {
    return this.alto - this.margen.abajo;
  }

  trackPorPeriodo(_i: number, m: MesDibujo): string {
    return m.periodo;
  }
}
