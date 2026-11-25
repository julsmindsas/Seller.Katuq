import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CifraPorHora, ResumenDia } from '../servicios/en-vivo.modelos';
import { dinero, dineroCorto, entero, horaCorta, horaDeColombia, horaDeReloj, textoPct, variacionPct } from '../utilidades/formato';
import { escalaBonita, filaDeHora, ventanaHoras } from '../utilidades/horas';
import { Traductor } from '../utilidades/traductor';

/** Una barra de la gráfica: la hora de hoy y el punto de ayer. */
interface Barra {
  hora: number;
  etiqueta: string;
  alto: number;
  actual: boolean;
  futura: boolean;
  /** Para el eje X: solo se rotulan horas alternas. */
  rotulo: string;
  texto: string;
}

/**
 * Ventas por hora, hoy contra ayer. Las barras son lo de hoy; la línea punteada, lo de ayer a la
 * misma hora; la barra de la hora actual crece con cada pedido (transición de altura). Arriba, en
 * texto, cuánto se lleva hoy contra lo que se había vendido ayer a esta misma hora, en porcentaje.
 * Las cifras (por hora, hoy, ayer a esta hora) vienen del servidor; aquí solo se dibujan.
 * Con "ocultar", la gráfica cuenta pedidos y no muestra dinero.
 */
@Component({
  selector: 'app-en-vivo-ventas-hora',
  templateUrl: './en-vivo-ventas-hora.component.html',
  styleUrls: ['./en-vivo-ventas-hora.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoVentasHoraComponent implements OnChanges, OnDestroy {
  @Input() porHora: ReadonlyArray<CifraPorHora> = [];
  /** Total de hoy (ventas y pedidos), del servidor. */
  @Input() hoy: ResumenDia | null = null;
  /** Ayer hasta esta misma hora, del servidor. */
  @Input() ayerMismaHora: ResumenDia | null = null;
  /** Instante que marca "ahora" (ms). La hora actual sale de aquí. */
  @Input() ahoraMs = Date.now();
  @Input() ocultar = false;
  /** Título de la tarjeta; sin él, "Hoy contra ayer" en el idioma activo. */
  @Input() titulo = '';

  barras: Barra[] = [];
  /** Puntos de la línea de ayer, en un cuadro de 100 x 100. */
  linea = '';
  topeTexto = '';
  mitadTexto = '';
  etiquetaEje = '';
  /** Parte resaltada del resumen ("+12 %") y el resto de la frase. */
  resumenPctTexto = '';
  resumenResto = '';
  resumenPct: number | null = null;
  /** Lo que lee el puntero o el teclado al pasar por una barra. */
  lectura = '';
  private horaLeida: number | null = null;
  private readonly t: Traductor = (clave, params) => this.translate.instant(clave, params);
  private readonly suscripcionIdioma: Subscription;

  constructor(private readonly cambios: ChangeDetectorRef, private readonly translate: TranslateService) {
    // Con otro idioma las etiquetas y las lecturas se vuelven a escribir.
    this.suscripcionIdioma = translate.onLangChange.subscribe(() => {
      this.ngOnChanges();
      this.cambios.markForCheck();
    });
  }

  /** Título para mostrar: el que pasa quien lo usa o el de siempre en el idioma activo. */
  get tituloVisible(): string {
    return this.titulo || this.translate.instant('enVivo.ventasHora.hoyContraAyer');
  }

  ngOnDestroy(): void {
    this.suscripcionIdioma.unsubscribe();
  }

  ngOnChanges(): void {
    const clave = this.ocultar ? 'pedidos' : 'ventas';
    const claveAyer = this.ocultar ? 'pedidosAyer' : 'ventasAyer';
    const horaActual = horaDeColombia(this.ahoraMs);
    const horas = ventanaHoras(horaActual);

    let maximo = 0;
    for (const hora of horas) {
      const fila = filaDeHora(this.porHora, hora);
      maximo = Math.max(maximo, fila[clave], fila[claveAyer]);
    }
    const tope = escalaBonita(maximo * 1.08);
    this.topeTexto = this.ocultar ? entero(tope) : dineroCorto(tope, this.t);
    this.mitadTexto = this.ocultar ? entero(tope / 2) : dineroCorto(tope / 2, this.t);
    this.etiquetaEje = this.t(this.ocultar ? 'enVivo.ventasHora.pedidosPorHora' : 'enVivo.ventasHora.ventasPorHora');

    const puntos: string[] = [];
    this.barras = horas.map((hora, i) => {
      const fila = filaDeHora(this.porHora, hora);
      puntos.push(`${((i + 0.5) / horas.length) * 100},${100 - (fila[claveAyer] / tope) * 100}`);
      return {
        hora,
        etiqueta: horaCorta(hora, this.t),
        alto: (fila[clave] / tope) * 100,
        actual: hora === horaActual,
        futura: hora > horaActual,
        rotulo: i % 2 === 0 ? String(hora) : '',
        texto: this.textoDeHora(fila, hora > horaActual),
      };
    });
    this.linea = puntos.join(' ');

    this.armarResumen();
    this.leer(this.horaLeida ?? horaActual);
  }

  leer(hora: number | null): void {
    const horaActual = horaDeColombia(this.ahoraMs);
    const objetivo = hora ?? horaActual;
    this.horaLeida = hora;
    const barra = this.barras.find((b) => b.hora === objetivo);
    this.lectura = barra ? `${barra.etiqueta} · ${barra.texto}` : '';
  }

  porHoraDeBarra(_: number, barra: Barra): number {
    return barra.hora;
  }

  private textoDeHora(fila: CifraPorHora, futura: boolean): string {
    const hoy = this.ocultar ? this.pedidos(fila.pedidos) : `${dinero(fila.ventas)} · ${this.pedidos(fila.pedidos)}`;
    const ayer = this.ocultar
      ? this.pedidos(fila.pedidosAyer)
      : `${dinero(fila.ventasAyer)} · ${this.pedidos(fila.pedidosAyer)}`;
    return futura
      ? this.t('enVivo.ventasHora.lecturaFutura', { ayer })
      : this.t('enVivo.ventasHora.lectura', { hoy, ayer });
  }

  private pedidos(n: number): string {
    return this.t(n === 1 ? 'enVivo.formato.pedido' : 'enVivo.formato.pedidos', { n: entero(n) });
  }

  private armarResumen(): void {
    const hoy = this.hoy;
    const ayer = this.ayerMismaHora;
    if (!hoy || !ayer) {
      this.resumenPctTexto = '';
      this.resumenResto = '';
      this.resumenPct = null;
      return;
    }
    const actual = this.ocultar ? hoy.pedidos : hoy.ventas;
    const referencia = this.ocultar ? ayer.pedidos : ayer.ventas;
    const pct = variacionPct(actual, referencia);
    this.resumenPct = pct;
    const instante = horaDeReloj(this.ahoraMs, this.t);
    const cuanto = (n: number): string => (this.ocultar ? this.pedidos(n) : dinero(n));
    this.resumenPctTexto = pct === null ? '' : textoPct(pct);
    this.resumenResto =
      pct === null
        ? this.t(this.ocultar ? 'enVivo.ventasHora.sinComparacionPedidos' : 'enVivo.ventasHora.sinComparacionVentas', {
            hoy: cuanto(actual),
            hora: instante,
          })
        : this.t('enVivo.ventasHora.contraAyerA', { hora: instante, hoy: cuanto(actual), ayer: cuanto(referencia) });
  }
}
