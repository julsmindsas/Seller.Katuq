import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { Definicion, EstadoCarga, Overview, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { textoAntiguedad } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

/** D-700 13.4b — Las seis secciones de cifras clave, con una sola lectura de `GET /overview` (capa viva). */
@Component({
  selector: 'app-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resumen.component.html',
})
export class ResumenComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly secciones = ['ingresos', 'base', 'actividad', 'adopcion', 'salud', 'soporte'];
  estado: EstadoCarga<SobrePlataforma<Overview | null>> = estadoInicial();
  definiciones: Definicion[] | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    combineLatest([this.ctx.vista$, this.ctx.recarga$]).pipe(
      switchMap(([vista]) => conEstado(this.servicio.overview(vista))),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
    this.ctx.definiciones().pipe(takeUntil(this.fin$)).subscribe({
      next: (d) => { this.definiciones = d.metricas; this.cd.markForCheck(); },
      error: () => { /* el (i) dice que no hay definición publicada */ },
    });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  reintentar(): void {
    this.ctx.recargar();
  }

  antiguedad(horas: number | null | undefined): string {
    return textoAntiguedad(horas);
  }
}
