import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { textoONulo } from '../../logica/formato';

/** D-700 13.7c — Historial de cambios de estado de la empresa (motivos sin correos ni teléfonos). */
@Component({
  selector: 'app-ficha-historial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="historial" [titulo]="textos.ficha.secciones.historial">
      <ng-template let-d>
        <ul class="pl-lista" *ngIf="d.cambiosDeEstado?.length; else sinCambios">
          <li *ngFor="let c of d.cambiosDeEstado">
            <div>{{ c.fecha | fechaCo }} · {{ nulo(c.desde) }} → {{ nulo(c.hacia) }}</div>
            <div class="pl-muted">{{ c.motivo || '' }}</div>
          </li>
        </ul>
        <ng-template #sinCambios><p class="pl-muted">{{ textos.ficha.sinHistorial }}</p></ng-template>
        <p class="pl-muted" *ngIf="d.entradasSinFecha">{{ d.entradasSinFecha }} entradas sin fecha no se muestran.</p>
        <p class="pl-muted">Cambios de cuenta: {{ d.cambiosDeCuenta?.motivo || '—' }}</p>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaHistorialComponent {
  @Input() docId = '';
  readonly textos = TEXTOS;
  nulo = textoONulo;
}
