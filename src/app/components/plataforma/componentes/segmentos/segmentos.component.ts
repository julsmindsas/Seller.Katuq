import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Subject } from 'rxjs';
import { skip, switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { EstadoCarga, ListaSegmento, ResumenSegmento, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { detalleSegmento } from '../../logica/segmentos';
import { textoONulo } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

/** D-700 14.6 — Segmentos accionables: cada lista dice su criterio y sale de la capa viva (sin recalcular pedidos). */
@Component({
  selector: 'app-segmentos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="pl-muted">{{ t.texto }}</p>

      <div class="pl-esqueleto" *ngIf="catalogo.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
      <div class="pl-error" *ngIf="!catalogo.cargando && catalogo.error">
        <p class="cfg-aviso cfg-aviso--error">{{ catalogo.error }}</p>
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="ctx.recargar()">{{ textos.reintentar }}</button>
      </div>
      <div class="cfg-vacio" *ngIf="catalogo.datos && !catalogo.datos.datos">
        <h3 class="cfg-vacio__titulo">{{ textos.sinCalcular }}</h3>
      </div>

      <div class="pl-segmentos" role="group" [attr.aria-label]="t.titulo" *ngIf="catalogo.datos?.datos as c">
        <button type="button" class="cfg-btn cfg-btn--sec pl-segmento" *ngFor="let s of c.segmentos; trackBy: trackSegmento"
          [class.pl-activo]="seleccion === s.clave" [attr.aria-pressed]="seleccion === s.clave" (click)="elegir(s)">
          <span class="pl-segmento__nombre">{{ s.nombre }}</span>
          <span class="pl-segmento__cuenta">{{ t.cantidad(s.cantidad) }}</span>
        </button>
      </div>
    </section>

    <section class="cfg-card" *ngIf="seleccion" [attr.aria-busy]="lista.cargando">
      <div class="pl-esqueleto" *ngIf="lista.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
      <div class="pl-error" *ngIf="!lista.cargando && lista.error">
        <p class="cfg-aviso cfg-aviso--error">{{ lista.error }}</p>
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="cargarLista()">{{ textos.reintentar }}</button>
      </div>
      <ng-container *ngIf="lista.datos?.datos as l">
        <h2 class="cfg-card__titulo">{{ l.nombre }}</h2>
        <p class="cfg-aviso" role="note"><strong>{{ t.criterio }}:</strong> {{ l.criterio }}</p>
        <p class="cfg-aviso cfg-aviso--warn" *ngIf="!l.disponible" role="status">{{ l.motivo }}</p>
        <div class="pl-meta-lista" role="note" *ngIf="l.disponible">
          <small class="pl-muted">{{ textos.corte }}: {{ lista.datos?.meta?.corte | fechaCo }}</small>
          <small class="pl-muted" *ngIf="l.sinDato > 0">{{ t.sinDato(l.sinDato) }}</small>
          <span class="cfg-pill cfg-pill--warn" *ngIf="lista.datos?.meta?.parcial">{{ textos.comercios.parcial }}</span>
        </div>
        <div class="cfg-vacio" *ngIf="l.disponible && !l.filas.length">
          <div class="cfg-vacio__icono"><i class="pi pi-check-circle" aria-hidden="true"></i></div>
          <h3 class="cfg-vacio__titulo">{{ t.vacioTitulo }}</h3>
          <p class="cfg-vacio__texto">{{ t.vacioTexto }}</p>
        </div>
        <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="l.filas.length">
          <table class="pl-tabla">
            <thead><tr><th scope="col">{{ t.comercio }}</th><th scope="col">{{ t.ciclo }}</th><th scope="col">{{ t.plan }}</th><th scope="col">{{ t.detalle }}</th></tr></thead>
            <tbody>
              <tr *ngFor="let f of l.filas; trackBy: trackFila">
                <td><a class="pl-vinculo" [routerLink]="['/plataforma/comercios', f.docId]">{{ f.nomComercial || f.docId }}</a></td>
                <td>{{ nulo(f.ciclo) }}</td>
                <td>{{ nulo(f.clasePlan) }}</td>
                <td>{{ detalle(l.clave, f.datos) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </section>
  `,
})
export class SegmentosComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.segmentos;
  catalogo: EstadoCarga<SobrePlataforma<{ segmentos: ResumenSegmento[] } | null>> = estadoInicial();
  lista: EstadoCarga<SobrePlataforma<ListaSegmento | null>> = estadoInicial(false);
  seleccion: string | null = null;
  nulo = textoONulo;
  detalle = detalleSegmento;
  private cargarLista$ = new Subject<void>();
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.segmentos())),
      takeUntil(this.fin$),
    ).subscribe((e) => {
      this.catalogo = e;
      const segs = e.datos && e.datos.datos ? e.datos.datos.segmentos : [];
      if (segs.length && !this.seleccion) {
        const primero = segs.find((s) => s.disponible) || segs[0];
        this.seleccion = primero.clave;
        this.cargarLista$.next();
      }
      this.cd.markForCheck();
    });
    merge(this.cargarLista$, this.ctx.recarga$.pipe(skip(1))).pipe(
      switchMap(() => (this.seleccion ? conEstado(this.servicio.segmento(this.seleccion)) : [])),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.lista = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  elegir(s: ResumenSegmento): void {
    this.seleccion = s.clave;
    this.cargarLista();
  }

  cargarLista(): void {
    this.cargarLista$.next();
  }

  trackSegmento(_: number, s: ResumenSegmento): string {
    return s.clave;
  }

  trackFila(_: number, f: { docId: string }): string {
    return f.docId;
  }
}
