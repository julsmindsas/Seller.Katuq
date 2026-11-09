import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { EstadoCarga } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 13.7a — Ficha 360 (ruta enlazable). Pide primero el perfil (el servidor deja el registro de apertura antes
 * de entregarlo); si no se entrega, no se piden las secciones. Cada sección carga y falla por separado.
 */
@Component({
  selector: 'app-comercio-ficha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="cfg-btn cfg-btn--sec pl-volver" routerLink="/plataforma/comercios">← {{ textos.ficha.volver }}</a>

    <div class="pl-esqueleto" *ngIf="estado.cargando" role="status" [attr.aria-label]="textos.ficha.cargandoPerfil"></div>

    <section class="cfg-card pl-error" *ngIf="!estado.cargando && estado.error">
      <p class="cfg-aviso cfg-aviso--error">{{ estado.error }}</p>
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="reintentar()">{{ textos.reintentar }}</button>
    </section>

    <ng-container *ngIf="estado.datos as p">
      <h2 class="pl-titulo-ficha">{{ p['nomComercial'] || p['nombre'] || docId }}</h2>
      <p class="cfg-aviso cfg-aviso--ok" *ngIf="mensaje" role="status">{{ mensaje }}</p>
      <div class="pl-ficha">
        <app-ficha-identidad class="pl-ficha__ancha" [docId]="docId" [perfil]="p" (actualizado)="alActualizar($event)"></app-ficha-identidad>
        <app-ficha-suscripcion-pagos class="pl-ficha__ancha" [docId]="docId"></app-ficha-suscripcion-pagos>
        <app-ficha-uso [docId]="docId"></app-ficha-uso>
        <app-ficha-salud [docId]="docId"></app-ficha-salud>
        <app-ficha-integraciones [docId]="docId"></app-ficha-integraciones>
        <app-ficha-soporte [docId]="docId"></app-ficha-soporte>
        <app-ficha-historial [docId]="docId"></app-ficha-historial>
        <app-ficha-informe class="pl-ficha__ancha" [docId]="docId"></app-ficha-informe>
      </div>
    </ng-container>
  `,
})
export class ComercioFichaComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  docId = '';
  estado: EstadoCarga<Record<string, any>> = estadoInicial();
  mensaje: string | null = null;
  private pendiente: string | null = null;
  private cargar$ = new Subject<void>();
  private fin$ = new Subject<void>();

  constructor(private ruta: ActivatedRoute, private servicio: PlataformaService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar$.pipe(
      switchMap(() => conEstado(this.servicio.perfil(this.docId))),
      takeUntil(this.fin$),
    ).subscribe((e) => {
      this.estado = e.datos ? { ...e, datos: ((e.datos as unknown as { datos: Record<string, any> }).datos) || {} } : e;
      if (e.datos && this.pendiente) { this.mensaje = this.pendiente; this.pendiente = null; }
      this.cd.markForCheck();
    });
    this.ruta.paramMap.pipe(takeUntil(this.fin$)).subscribe((m) => {
      this.docId = m.get('docId') || '';
      this.mensaje = null;
      this.pendiente = null;
      this.estado = estadoInicial();
      this.cargar$.next();
    });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  reintentar(): void {
    this.cargar$.next();
  }

  /** Cambió el tipo de cuenta o el motivo de baja: se vuelve a pedir el perfil y se avisa al terminar. */
  alActualizar(mensaje: string): void {
    this.mensaje = null;
    this.pendiente = mensaje;
    this.cargar$.next();
  }
}
