import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoCarga, SobrePlataforma, Tendencias } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { TEXTOS } from '../../plataforma.textos';

/** D-700 13.5 — Contratado vs cobrado, altas y bajas, y GMV (en F1, mes en curso y anterior). */
@Component({
  selector: 'app-tendencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tendencias.component.html',
})
export class TendenciasComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly orden = ['contratado', 'cobrado', 'altas', 'bajas', 'gmv'];
  estado: EstadoCarga<SobrePlataforma<Tendencias | null>> = estadoInicial();
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.tendencias())),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  reintentar(): void {
    this.ctx.recargar();
  }
}
