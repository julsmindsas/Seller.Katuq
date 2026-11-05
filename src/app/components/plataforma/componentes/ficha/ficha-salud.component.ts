import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { textoONulo } from '../../logica/formato';

/** D-700 13.7b — Salud: puntaje con sus componentes. Hasta que llegue (F1-9) el servidor lo declara «no disponible». */
@Component({
  selector: 'app-ficha-salud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="salud" [titulo]="textos.ficha.secciones.salud">
      <ng-template let-d>
        <dl class="pl-datos">
          <div><dt>{{ textos.cifras['puntaje'] }}</dt><dd>{{ nulo(d.puntaje) }}</dd></div>
          <div><dt>Nivel</dt><dd>{{ nulo(d.nivel) }}</dd></div>
        </dl>
        <ul class="pl-lista" *ngIf="d.componentes?.length">
          <li *ngFor="let c of d.componentes"><div>{{ nulo(c.nombre) }}</div><div class="pl-num">{{ nulo(c.puntos) }}</div></li>
        </ul>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaSaludComponent {
  @Input() docId = '';
  readonly textos = TEXTOS;
  nulo = textoONulo;
}
