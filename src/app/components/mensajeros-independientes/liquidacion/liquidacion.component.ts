import { Component, OnDestroy, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MensajerosIndependientesService } from '../mensajeros-independientes.service';
import {
  construirCsv,
  construirLiquidacion,
  formatearEntero,
  formatearPesos,
  formatearPorcentaje,
  interpretarError,
  LiquidacionVista,
  MensajeVacio,
  mensajeVacioLiquidacion,
  nombreArchivoCsv,
  RangoFechas,
  rangoDelMes,
  TEXTOS_ERROR_LIQUIDACION,
  textoRango,
  validarRango,
} from '../mensajeros-independientes.utils';

/**
 * Liquidación de mensajeros independientes: en un rango de fechas, cuántas entregas hicieron, cuánto
 * valieron los domicilios y qué comisión debe cobrar Katuq a cada comercio (el pago al mensajero lo hace
 * el comercio directo). Por defecto muestra el mes actual. Solo la ve el Super Administrador de la
 * operadora (guardia de la ruta); el backend rechaza con 403 a cualquier otro.
 */
@Component({
  selector: 'app-mensajeros-liquidacion',
  templateUrl: './liquidacion.component.html',
  styleUrls: ['./liquidacion.component.scss'],
})
export class LiquidacionComponent implements OnInit, OnDestroy {
  readonly pesos = formatearPesos;
  readonly cantidad = formatearEntero;
  readonly porcentaje = formatearPorcentaje;
  readonly textoRango = textoRango;
  readonly vacio: MensajeVacio = mensajeVacioLiquidacion();

  /** Lo que hay escrito en los campos de fecha (`YYYY-MM-DD`); puede ir por delante del resultado. */
  desde = '';
  hasta = '';
  errorRango: string | null = null;

  /** Lo último que respondió el servidor; sus fechas son las del rango realmente consultado. */
  resultado: LiquidacionVista | null = null;
  cargando = false;
  error: string | null = null;

  private readonly pedir$ = new Subject<RangoFechas>();
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly servicio: MensajerosIndependientesService) {}

  ngOnInit(): void {
    // switchMap: si se vuelve a consultar mientras carga, la respuesta vieja se descarta.
    this.pedir$
      .pipe(
        tap(() => {
          this.cargando = true;
          this.error = null;
        }),
        switchMap((rango) =>
          this.servicio.liquidacion(rango.desde, rango.hasta).pipe(
            catchError((err) => {
              this.error = interpretarError(err, TEXTOS_ERROR_LIQUIDACION).texto;
              this.resultado = null;
              this.cargando = false;
              return EMPTY;
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((respuesta) => {
        this.resultado = construirLiquidacion(respuesta);
        this.cargando = false;
      });

    this.usarMes(0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** `0` es el mes actual y `-1`, el anterior. */
  usarMes(desfaseMeses: number): void {
    const rango = rangoDelMes(new Date(), desfaseMeses);
    this.desde = rango.desde;
    this.hasta = rango.hasta;
    this.consultar();
  }

  consultar(): void {
    const revision = validarRango(this.desde, this.hasta);
    this.errorRango = revision.error;
    if (!revision.valido) {
      return;
    }
    this.pedir$.next({ desde: this.desde, hasta: this.hasta });
  }

  get hayEntregas(): boolean {
    return !!this.resultado && (this.resultado.entregas.length > 0 || this.resultado.totales.entregas > 0);
  }

  /** Arma el CSV en el navegador con el detalle que se ve en pantalla y lo descarga. */
  descargarCsv(): void {
    if (!this.resultado || !this.resultado.entregas.length) {
      return;
    }
    const csv = construirCsv(this.resultado.entregas);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivoCsv(this.resultado.desde, this.resultado.hasta);
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
