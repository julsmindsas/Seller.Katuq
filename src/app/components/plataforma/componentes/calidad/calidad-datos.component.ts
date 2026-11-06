import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { Calidad, EstadoCarga, ItemCalidad, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { TEXTOS } from '../../plataforma.textos';

/** D-700 14.6 — Calidad de datos: cuántas empresas y cuáles tienen cada aviso. Solo nombres comerciales e ids. */
@Component({
  selector: 'app-calidad-datos',
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
      <ng-container *ngIf="estado.datos as r">
        <div class="cfg-vacio" *ngIf="!r.datos">
          <h3 class="cfg-vacio__titulo">{{ textos.sinCalcular }}</h3>
        </div>
        <ng-container *ngIf="r.datos as c">
          <p class="pl-muted pl-num">{{ t.resumen(c.empresasConAvisos, c.empresasEvaluadas) }} · {{ textos.corte }}: {{ r.meta.corte | fechaCo }}</p>
          <div class="cfg-vacio" *ngIf="!c.items.length">
            <div class="cfg-vacio__icono"><i class="pi pi-check-circle" aria-hidden="true"></i></div>
            <h3 class="cfg-vacio__titulo">{{ t.vacioTitulo }}</h3>
            <p class="cfg-vacio__texto">{{ t.vacioTexto }}</p>
          </div>
          <ul class="pl-lista pl-calidad" *ngIf="c.items.length">
            <li *ngFor="let it of c.items; trackBy: trackItem" class="pl-calidad__item">
              <div class="pl-calidad__cabeza">
                <div>
                  <strong>{{ it.nombre }}</strong>
                  <small class="pl-muted"> · {{ grupo(it.grupo) }}</small>
                  <div><small class="pl-muted" *ngIf="it.aviso">{{ it.aviso }}</small></div>
                </div>
                <div class="pl-calidad__acciones">
                  <span class="cfg-pill cfg-pill--warn pl-num">{{ it.cantidad }}</span>
                  <button type="button" class="cfg-btn cfg-btn--sec" (click)="alternar(it.clave)" [attr.aria-expanded]="abierto === it.clave">
                    {{ abierto === it.clave ? t.ocultarEmpresas : t.verEmpresas }}
                  </button>
                </div>
              </div>
              <div class="pl-calidad__empresas" *ngIf="abierto === it.clave">
                <ul class="pl-lista">
                  <li *ngFor="let e of it.empresas; trackBy: trackEmpresa"><a class="pl-vinculo" [routerLink]="['/plataforma/comercios', e.docId]">{{ e.nomComercial || e.docId }}</a></li>
                </ul>
                <small class="pl-muted" *ngIf="it.truncada">{{ t.truncada }}</small>
              </div>
            </li>
          </ul>
        </ng-container>
      </ng-container>
    </section>
  `,
})
export class CalidadDatosComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.calidad;
  estado: EstadoCarga<SobrePlataforma<Calidad | null>> = estadoInicial();
  abierto: string | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.calidad())),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  grupo(g: string): string {
    return this.t.grupos[g] || g;
  }

  alternar(clave: string): void {
    this.abierto = this.abierto === clave ? null : clave;
  }

  trackItem(_: number, i: ItemCalidad): string {
    return i.clave;
  }

  trackEmpresa(_: number, e: { docId: string }): string {
    return e.docId;
  }
}
