import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { textoONulo } from '../../logica/formato';

/** D-700 14.6 — Integraciones del comercio: las conectadas, rotuladas «configuradas» (el uso real llega en la fase 2). */
@Component({
  selector: 'app-ficha-integraciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="integraciones" [titulo]="t.titulo">
      <ng-template let-d>
        <p class="pl-muted">{{ t.tipo }}</p>
        <dl class="pl-datos">
          <div><dt>{{ t.activas }}</dt><dd class="pl-num">{{ nulo(d.activas) }}</dd></div>
          <div><dt>{{ t.inactivas }}</dt><dd class="pl-num">{{ nulo(d.inactivas) }}</dd></div>
        </dl>
        <ul class="pl-lista" *ngIf="d.proveedores?.length; else sinProveedores">
          <li *ngFor="let p of d.proveedores"><div>{{ p.id }}</div><div><span class="cfg-pill" [class.cfg-pill--ok]="p.activa" [class.cfg-pill--neutro]="!p.activa">{{ p.activa ? 'Conectada' : 'Sin conectar' }}</span></div></li>
        </ul>
        <ng-template #sinProveedores><p class="pl-muted">{{ t.sinProveedores }}</p></ng-template>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaIntegracionesComponent {
  @Input() docId = '';
  readonly t = TEXTOS.integracionesFicha;
  nulo = textoONulo;
}
