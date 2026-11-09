import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ReportResult } from '../../../dashboard/model/report-spec.interfaces';
import { PuntoTendencia } from '../../plataforma.tipos';
import { armarGrafico, GraficoArmado } from '../../logica/tendencia';
import { TEXTOS } from '../../plataforma.textos';

const ACENTO_POR_DEFECTO = '#5F3FE0';

/** Lee un token `--ds-*` del tema vigente; si no hay, devuelve el valor dado. */
function leerToken(nombre: string, respaldo: string): string {
  try {
    const v = getComputedStyle(document.body).getPropertyValue(nombre).trim();
    return v || respaldo;
  } catch {
    return respaldo;
  }
}

/**
 * D-700 13.5 — Un gráfico de tendencia sobre `VizChart`: mes reconstruido punteado con marcador hueco, `sin dato`
 * como hueco, «Ver como tabla», `aria-label` con el resumen y foco por teclado. Sin degradados.
 */
@Component({
  selector: 'app-grafico-tendencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-tendencia.component.html',
})
export class GraficoTendenciaComponent implements OnInit, OnChanges, OnDestroy {
  @Input() clave = '';
  @Input() unidad = 'n';
  @Input() puntos: PuntoTendencia[] = [];

  readonly textos = TEXTOS;
  nombre = '';
  grafico: GraficoArmado | null = null;
  resultado: ReportResult | null = null;
  ajustes: EChartsOption | null = null;
  colores: string[] = [ACENTO_POR_DEFECTO, ACENTO_POR_DEFECTO];
  verTabla = false;
  ultimoTexto = '';
  ultimoEtiqueta = '';
  hayReconstruido = false;
  private observador: MutationObserver | null = null;

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.leerColores(); this.ngOnChanges();
    try {
      // Cambio de tema (clase `dark-only` en el body): se vuelven a leer los tokens.
      this.observador = new MutationObserver(() => { this.leerColores(); this.ngOnChanges(); this.cd.markForCheck(); });
      this.observador.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch { /* sin observador el gráfico conserva los colores del momento */ }
  }

  ngOnChanges(): void {
    this.nombre = TEXTOS.tendencias.series[this.clave] || this.clave;
    this.grafico = armarGrafico(this.nombre, this.unidad, this.puntos, this.colores[0]);
    this.resultado = this.grafico.hayDatos ? this.grafico.resultado : null;
    this.ajustes = this.grafico.hayDatos ? this.grafico.ajustes : null;
    const conDato = this.grafico.filas.filter((f) => f.texto !== '—');
    const ultimo = conDato.length ? conDato[conDato.length - 1] : null;
    this.ultimoTexto = ultimo ? ultimo.texto : '';
    this.ultimoEtiqueta = ultimo ? ultimo.etiqueta : '';
    this.hayReconstruido = this.puntos.some((p) => p.estado === 'reconstruido');
  }

  ngOnDestroy(): void {
    if (this.observador) this.observador.disconnect();
  }

  private leerColores(): void {
    const acento = leerToken('--ds-accent-ink', ACENTO_POR_DEFECTO);
    this.colores = [acento, acento];
  }

  alternar(): void {
    this.verTabla = !this.verTabla;
  }
}
