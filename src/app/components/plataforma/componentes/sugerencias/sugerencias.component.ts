import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoCarga, SobrePlataforma, Sugerencias } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { formatearNumero, textoONulo } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

/** D-700 14.6 — Sugerencias: temas con la cantidad de comercios distintos que los piden. Nunca el texto completo. */
@Component({
  selector: 'app-sugerencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="pl-muted">{{ t.texto }}</p>
      <div class="pl-esqueleto" *ngIf="estado.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
      <div class="pl-error" *ngIf="!estado.cargando && estado.error">
        <p class="cfg-aviso cfg-aviso--error">{{ estado.error }}</p>
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="ctx.recargar()">{{ textos.reintentar }}</button>
      </div>
      <ng-container *ngIf="estado.datos?.datos as s">
        <p class="cfg-aviso" *ngIf="s.estado === 'parcial'" role="status">{{ textos.parcial }}</p>
        <div class="cfg-vacio" *ngIf="!s.temas.length">
          <div class="cfg-vacio__icono"><i class="pi pi-comments" aria-hidden="true"></i></div>
          <h3 class="cfg-vacio__titulo">{{ t.vacioTitulo }}</h3>
          <p class="cfg-vacio__texto">{{ t.vacioTexto }}</p>
        </div>
        <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="s.temas.length">
          <table class="pl-tabla">
            <thead><tr><th scope="col">{{ t.tema }}</th><th scope="col" class="pl-der">{{ t.comercios }}</th><th scope="col" class="pl-der">{{ t.pedidos }}</th><th scope="col" class="pl-der">{{ t.abiertos }}</th><th scope="col">{{ t.categoria }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let x of s.temas; trackBy: trackTema">
                <td>{{ x.tema }}</td>
                <td class="pl-der pl-num"><strong>{{ x.comercios }}</strong></td>
                <td class="pl-der pl-num">{{ x.pedidos }}</td>
                <td class="pl-der pl-num">{{ x.abiertos }}</td>
                <td>{{ nulo(x.categoria) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-container *ngIf="s.categorias.length">
          <h3 class="pl-subtitulo">{{ t.categorias }}</h3>
          <ul class="pl-lista">
            <li *ngFor="let c of s.categorias"><div>{{ c.etiqueta }}</div><div class="pl-num">{{ c.comercios }} comercios · {{ c.temas }} temas</div></li>
          </ul>
        </ng-container>
        <p class="pl-muted pl-num">{{ t.ideas }}: {{ numero(s.ideasEnSoporte.tickets) }} en {{ numero(s.ideasEnSoporte.comercios) }} comercios</p>
        <p class="pl-muted" *ngIf="s.pedidosSinComercio > 0">{{ t.sinPedidos(s.pedidosSinComercio) }}</p>
      </ng-container>
    </section>
  `,
})
export class SugerenciasComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.sugerencias;
  estado: EstadoCarga<SobrePlataforma<Sugerencias>> = estadoInicial();
  nulo = textoONulo;
  numero = formatearNumero;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.sugerencias())),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  trackTema(_: number, x: { tema: string }): string {
    return x.tema;
  }
}
