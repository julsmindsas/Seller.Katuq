import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { CuentaExcluida, EstadoCarga, Excluidas, SobrePlataforma } from '../../plataforma.tipos';
import { conEstado, estadoInicial } from '../../logica/carga';
import { textoONulo } from '../../logica/formato';
import { TEXTOS } from '../../plataforma.textos';

/** D-700 13.8 — Las cuentas que no suman en los totales, cada una con su tipo y su motivo. */
@Component({
  selector: 'app-cuentas-excluidas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="pl-muted">{{ t.texto }}</p>
      <p class="cfg-aviso cfg-aviso--ok" *ngIf="mensaje" role="status">{{ mensaje }}</p>
      <div class="pl-esqueleto" *ngIf="estado.cargando" role="status" [attr.aria-label]="textos.cargando"></div>
      <div class="pl-error" *ngIf="!estado.cargando && estado.error">
        <p class="cfg-aviso cfg-aviso--error">{{ estado.error }}</p>
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="ctx.recargar()">{{ textos.reintentar }}</button>
      </div>
      <ng-container *ngIf="estado.datos as r">
        <div class="cfg-vacio" *ngIf="!r.datos.lista.length">
          <div class="cfg-vacio__icono"><i class="pi pi-check-circle" aria-hidden="true"></i></div>
          <h3 class="cfg-vacio__titulo">{{ t.vacioTitulo }}</h3>
          <p class="cfg-vacio__texto">{{ t.vacioTexto }}</p>
        </div>
        <ng-container *ngIf="r.datos.lista.length">
          <p class="pl-muted pl-num">{{ r.datos.cantidad }} cuentas</p>
          <div class="pl-tabla-caja pl-tabla-siempre">
            <table class="pl-tabla">
              <thead><tr><th scope="col">Comercio</th><th scope="col">{{ t.tipo }}</th><th scope="col">{{ t.origen }}</th><th scope="col">{{ t.motivo }}</th><th scope="col" *ngIf="esOperador">{{ t.acciones }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let c of r.datos.lista; trackBy: trackCuenta">
                  <td>{{ c.nomComercial || c.docId }}</td><td>{{ nulo(c.tipo) }}</td><td>{{ nulo(c.origen) }}</td><td>{{ nulo(c.motivo) }}</td>
                  <td *ngIf="esOperador" class="pl-nowrap"><button type="button" class="cfg-btn cfg-btn--sec" (click)="abrir(c)">{{ t.corregir }}</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>
      </ng-container>
    </section>

    <app-tipo-cuenta-dialog *ngIf="editando as c" [docId]="c.docId" [nombre]="c.nomComercial || c.docId"
      [tipoActual]="c.tipo" [tipoDeducido]="null" [origenActual]="c.origen" (cerrado)="alCerrar($event)"></app-tipo-cuenta-dialog>
  `,
})
export class CuentasExcluidasComponent implements OnInit, OnDestroy {
  readonly textos = TEXTOS;
  readonly t = TEXTOS.excluidas;
  estado: EstadoCarga<SobrePlataforma<Excluidas>> = estadoInicial();
  nulo = textoONulo;
  esOperador = false;
  editando: CuentaExcluida | null = null;
  mensaje: string | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, public ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.esOperador().pipe(takeUntil(this.fin$)).subscribe((v) => { this.esOperador = v; this.cd.markForCheck(); });
    this.ctx.recarga$.pipe(
      switchMap(() => conEstado(this.servicio.excluidas())),
      takeUntil(this.fin$),
    ).subscribe((e) => { this.estado = e; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  abrir(c: CuentaExcluida): void {
    this.editando = c;
    this.cd.markForCheck();
  }

  /** Al guardar: la cuenta puede cambiar de universo, así que se vuelve a pedir la lista. */
  alCerrar(r: { cambio: boolean; mensaje: string | null }): void {
    this.editando = null;
    if (r && r.cambio && r.mensaje) { this.mensaje = r.mensaje; this.ctx.recargar(); }
    this.cd.markForCheck();
  }

  trackCuenta(_: number, c: { docId: string }): string {
    return c.docId;
  }
}
