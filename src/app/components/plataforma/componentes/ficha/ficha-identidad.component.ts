import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { TEXTOS } from '../../plataforma.textos';
import { fechaCo, textoONulo, textoSiNo } from '../../logica/formato';

/** D-700 13.7a — Identidad (del perfil ya cargado) y usuarios con contactos enmascarados. */
@Component({
  selector: 'app-ficha-identidad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.pl-acciones-ficha { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--ds-line-soft); }'],
  template: `
    <section class="cfg-card" aria-label="Identidad">
      <h2 class="cfg-card__titulo">{{ textos.ficha.secciones.identidad }}</h2>
      <dl class="pl-datos">
        <div><dt>Nombre comercial</dt><dd>{{ nulo(perfil['nomComercial']) }}</dd></div>
        <div><dt>Razón social</dt><dd>{{ nulo(perfil['nombre']) }}</dd></div>
        <div><dt>{{ textos.ficha.nit }}</dt><dd>{{ perfil['nit']?.motivo || '—' }}</dd></div>
        <div><dt>Tipo de cuenta</dt><dd>{{ nulo(perfil['tipoCuenta']?.tipo) }} <small class="pl-muted">({{ nulo(perfil['tipoCuenta']?.origen) }})</small></dd></div>
        <div *ngIf="perfil['tipoCuenta']?.motivo"><dt>Motivo del tipo</dt><dd>{{ perfil['tipoCuenta'].motivo }}</dd></div>
        <div *ngIf="perfil['bajaMotivo']"><dt>{{ textos.cuentas.bajaFila }}</dt><dd>{{ textos.cuentas.motivos[perfil['bajaMotivo']] || perfil['bajaMotivo'] }}</dd></div>
        <div><dt>Universo</dt><dd>{{ nulo(perfil['universo']) }}</dd></div>
        <div><dt>Ciclo</dt><dd>{{ nulo(perfil['ciclo']) }}</dd></div>
        <div><dt>Activa</dt><dd>{{ si(perfil['activa']) }}</dd></div>
        <div><dt>Plan</dt><dd>{{ nulo(perfil['clasePlan']) }}</dd></div>
        <div><dt>Alta</dt><dd>{{ perfil['alta']?.fecha | fechaCo:false }} <small class="pl-muted" *ngIf="perfil['alta']?.origen">({{ perfil['alta'].origen }})</small></dd></div>
        <div><dt>Antigüedad</dt><dd>{{ perfil['antiguedadDias'] === null || perfil['antiguedadDias'] === undefined ? '—' : perfil['antiguedadDias'] + ' días' }}</dd></div>
        <div><dt>Comercio nuevo</dt><dd>{{ si(perfil['nueva']) }}</dd></div>
        <div><dt>Primer pago</dt><dd>{{ conversion(perfil['conversionAPago']) }}</dd></div>
      </dl>
      <p class="cfg-aviso cfg-aviso--warn" *ngIf="perfil['calidad']?.length">Calidad de datos: {{ perfil['calidad'].join(', ') }}</p>
      <div class="pl-acciones-ficha" *ngIf="esOperador">
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="dialogoTipo = true">{{ textos.cuentas.tipoBoton }}</button>
        <button type="button" class="cfg-btn cfg-btn--sec" *ngIf="perfil['admiteMotivoBaja']" (click)="dialogoBaja = true">{{ perfil['bajaMotivo'] ? textos.cuentas.bajaCorregir : textos.cuentas.bajaBoton }}</button>
      </div>
    </section>

    <app-tipo-cuenta-dialog *ngIf="dialogoTipo" [docId]="docId" [nombre]="perfil['nomComercial'] || perfil['nombre'] || docId"
      [tipoActual]="perfil['tipoCuenta']?.tipo || ''" [tipoDeducido]="perfil['tipoCuenta']?.tipoDeducido || null" [origenActual]="perfil['tipoCuenta']?.origen || ''"
      (cerrado)="alCerrar($event, 'tipo')"></app-tipo-cuenta-dialog>
    <app-motivo-baja-dialog *ngIf="dialogoBaja" [docId]="docId" [nombre]="perfil['nomComercial'] || perfil['nombre'] || docId"
      [motivoActual]="perfil['bajaMotivo'] || null" (cerrado)="alCerrar($event, 'baja')"></app-motivo-baja-dialog>

    <app-ficha-seccion [docId]="docId" nombre="usuarios" [titulo]="textos.ficha.secciones.identidad + ': usuarios'">
      <ng-template let-d>
        <p class="cfg-aviso cfg-aviso--warn" *ngIf="d.estado === 'sin_dato'; else conUsuarios">{{ d.motivo || textos.ficha.usuariosSinDato }}</p>
        <ng-template #conUsuarios>
        <p class="pl-muted">{{ textos.ficha.enmascarado }} Con ingreso en 30 días: {{ nulo(d.conIngreso30d) }} de {{ nulo(d.total) }}.</p>
        <ul class="pl-lista" *ngIf="d.usuarios?.length; else sinUsuarios">
          <li *ngFor="let u of d.usuarios">
            <div>{{ nulo(u.nombre) }} <small class="pl-muted">{{ nulo(u.rol) }}</small></div>
            <div>{{ nulo(u.correo) }}</div>
            <div class="pl-muted">{{ u.ultimoIngreso | fechaCo }}</div>
          </li>
        </ul>
        <ng-template #sinUsuarios><p class="pl-muted">Sin usuarios en la lista.</p></ng-template>
        </ng-template>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaIdentidadComponent implements OnInit, OnDestroy {
  @Input() docId = '';
  @Input() perfil: Record<string, any> = {};
  /** Algo cambió (tipo de cuenta o motivo de baja): quien aloja la ficha la vuelve a cargar y muestra el mensaje. */
  @Output() actualizado = new EventEmitter<string>();
  readonly textos = TEXTOS;
  nulo = textoONulo;
  si = textoSiNo;
  esOperador = false;
  dialogoTipo = false;
  dialogoBaja = false;
  private fin$ = new Subject<void>();

  constructor(private ctx: PlataformaContextoService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ctx.esOperador().pipe(takeUntil(this.fin$)).subscribe((v) => { this.esOperador = v; this.cd.markForCheck(); });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }

  alCerrar(r: { cambio: boolean; mensaje: string | null }, cual: 'tipo' | 'baja'): void {
    if (cual === 'tipo') this.dialogoTipo = false; else this.dialogoBaja = false;
    this.cd.markForCheck();
    if (r && r.cambio && r.mensaje) this.actualizado.emit(r.mensaje);
  }

  conversion(c: { estado?: string; fecha?: string | null; diasDesdeAlta?: number | null } | null | undefined): string {
    if (!c || c.estado === 'sin_dato') return '—';
    if (c.estado === 'sin_pagos') return 'sin pagos';
    return `${c.fecha ? fechaCo(c.fecha, false) : '—'}${typeof c.diasDesdeAlta === 'number' ? ` (${c.diasDesdeAlta} días después del alta)` : ''}`;
  }
}
