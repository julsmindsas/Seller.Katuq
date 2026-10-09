import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { calcularBarraProyeccion, BarraProyeccion } from '../utilidades/proyeccion';
import { dinero, dineroCorto, entero, horaDeColombia, textoPct, variacionPct } from '../utilidades/formato';
import { filaDeHora, HORAS_VISIBLES, ventanaHoras } from '../utilidades/horas';
import { DatosHeroe } from '../utilidades/tarjetas';

/** Una barra del mini gráfico por hora. */
interface BarraMini {
  hora: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  actual: boolean;
  futura: boolean;
}

const LIENZO_ANCHO = 300;
const LIENZO_ALTO = 70;

/**
 * Héroe del tablero: las ventas de hoy en un odómetro que rueda, la variación contra ayer a esta
 * hora, el ticket promedio, la proyección al cierre contra el récord (hoy / lo que falta según el
 * ritmo / récord) y un mini gráfico de ventas por hora, hoy contra ayer.
 *
 * Todas las cifras llegan del SERVIDOR en `datos`; aquí solo se escriben y se dibujan. Con
 * "ocultar", el odómetro cuenta pedidos y no hay dinero en ninguna parte.
 */
@Component({
  selector: 'app-en-vivo-heroe',
  templateUrl: './en-vivo-heroe.component.html',
  styleUrls: ['./en-vivo-heroe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoHeroeComponent implements OnChanges {
  @Input() datos: DatosHeroe | null = null;
  @Input() ocultar = false;
  /** Instante que marca "ahora" (ms); de ahí sale la hora actual del mini gráfico. */
  @Input() ahoraMs = Date.now();

  etiqueta = '';
  numero = '';
  leyenda = '';
  /** "+12 %" y "-5 %" con su dirección, y el resto de la frase. */
  variacionTexto = '';
  variacionSube = true;
  resto = '';
  proyeccion: BarraProyeccion | null = null;
  barras: BarraMini[] = [];
  linea = '';
  tituloMini = 'Ventas por hora · hoy contra ayer';
  estaHora = '';

  ngOnChanges(): void {
    const d = this.datos;
    if (!d) return;
    const ocultar = this.ocultar;

    this.etiqueta = ocultar ? 'Pedidos de hoy' : d.etiqueta;
    this.numero = ocultar ? entero(d.pedidos) : dinero(d.ventas);
    this.leyenda = ocultar ? `${entero(d.pedidos)} ${d.pedidos === 1 ? 'pedido' : 'pedidos'} hoy` : `${d.etiqueta}: ${this.numero}`;

    const referencia = ocultar ? d.ayerMismaHora?.pedidos : d.ayerMismaHora?.ventas;
    const pct = d.ayerMismaHora && referencia !== undefined ? variacionPct(ocultar ? d.pedidos : d.ventas, referencia) : null;
    this.variacionTexto = pct === null ? '' : textoPct(pct);
    this.variacionSube = pct === null || pct >= 0;
    const comparacion =
      pct !== null
        ? 'contra ayer a esta hora'
        : d.ayerMismaHora
        ? `Ayer a esta hora no hubo ${ocultar ? 'pedidos' : 'ventas'}`
        : '';
    const ticket = ocultar ? '' : `ticket promedio ${dinero(d.ticketPromedio)}`;
    this.resto = [comparacion, ticket].filter(Boolean).join(' · ');

    this.proyeccion = calcularBarraProyeccion(d.pedidos, d.proyeccion, d.record, ocultar);
    this.armarMini(d);
  }

  porHora(_: number, barra: BarraMini): number {
    return barra.hora;
  }

  private armarMini(d: DatosHeroe): void {
    const clave = this.ocultar ? 'pedidos' : 'ventas';
    const claveAyer = this.ocultar ? 'pedidosAyer' : 'ventasAyer';
    const horaActual = horaDeColombia(this.ahoraMs);
    const horas = ventanaHoras(horaActual, HORAS_VISIBLES);

    let maximo = 1;
    for (const hora of horas) {
      const fila = filaDeHora(d.porHora, hora);
      maximo = Math.max(maximo, fila[clave], fila[claveAyer]);
    }
    const w = LIENZO_ANCHO / horas.length;
    const puntos: string[] = [];
    this.barras = horas.map((hora, i) => {
      const fila = filaDeHora(d.porHora, hora);
      const alto = Math.max(1.5, (fila[clave] / maximo) * (LIENZO_ALTO - 4));
      puntos.push(`${(i * w + w / 2).toFixed(1)},${(LIENZO_ALTO - (fila[claveAyer] / maximo) * (LIENZO_ALTO - 4)).toFixed(1)}`);
      return {
        hora,
        x: i * w + 2,
        y: LIENZO_ALTO - alto,
        ancho: w - 4,
        alto,
        actual: hora === horaActual,
        futura: hora > horaActual,
      };
    });
    this.linea = puntos.join(' ');
    this.tituloMini = this.ocultar ? 'Pedidos por hora · hoy contra ayer' : 'Ventas por hora · hoy contra ayer';
    const ahora = filaDeHora(d.porHora, horaActual);
    this.estaHora = `Esta hora: ${this.ocultar ? `${entero(ahora.pedidos)} pedidos` : dineroCorto(ahora.ventas)}`;
  }
}
