import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Input, OnChanges, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { merge, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { EstadoCarga, NombreSeccion } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 13.7a — Una sección de la ficha con su propio `cargando`, `error` («Reintentar») y datos. Una sección que
 * falla no oculta las demás. El contenido lo pone cada ficha con un `<ng-template let-d>`.
 */
@Component({
  selector: 'app-ficha-seccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card" [attr.aria-label]="titulo" [attr.aria-busy]="estado.cargando">
      <h2 class="cfg-card__titulo">{{ titulo }}</h2>
      <div class="pl-esqueleto" *ngIf="estado.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
      <div class="pl-error" *ngIf="!estado.cargando && estado.error">
        <p class="cfg-aviso cfg-aviso--error">{{ estado.error }}</p>
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="reintentar()">{{ textos.reintentar }}</button>
      </div>
      <ng-container *ngIf="estado.datos as d">
        <p class="cfg-aviso" *ngIf="soloAviso(d); else conContenido" role="status">{{ d.motivo || textos.sinCalcular }}</p>
        <ng-template #conContenido>
          <p class="cfg-aviso" *ngIf="d.estado === 'parcial'" role="status">{{ textos.parcial }}</p>
          <ng-container *ngTemplateOutlet="contenido; context: { $implicit: d }"></ng-container>
        </ng-template>
      </ng-container>
    </section>
  `,
})
export class FichaSeccionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() docId = '';
  @Input() nombre: NombreSeccion = 'uso';
  @Input() titulo = '';
  @ContentChild(TemplateRef) contenido: TemplateRef<unknown> | null = null;

  readonly textos = TEXTOS;
  estado: EstadoCarga<Record<string, any>> = estadoInicial();
  private cargar$ = new Subject<void>();
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar$.pipe(
      switchMap(() => conEstado(this.servicio.seccion(this.docId, this.nombre))),
      takeUntil(this.fin$),
    ).subscribe((e) => {
      this.estado = e.datos ? { ...e, datos: ((e.datos as unknown as { datos: Record<string, any> }).datos) || {} } : e;
      this.cd.markForCheck();
    });
    this.cargar$.next();
  }

  ngOnChanges(c: { docId?: { firstChange: boolean } }): void {
    if (c.docId && !c.docId.firstChange) this.cargar$.next();
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  reintentar(): void {
    this.cargar$.next();
  }

  /** Sin datos que mostrar: la empresa se está calculando o la sección declara su motivo. */
  soloAviso(d: Record<string, any>): boolean {
    return d['estado'] === 'en_curso' || ((d['estado'] === 'sin_dato' || d['estado'] === 'no_disponible') && !!d['motivo']);
  }
}
