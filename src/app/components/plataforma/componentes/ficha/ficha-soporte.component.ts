import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TEXTOS } from '../../plataforma.textos';
import { contadoresSoporte } from '../../logica/soporte';
import { textoONulo } from '../../logica/formato';

/** D-700 13.7c — Soporte: los archivados se muestran APARTE de los resueltos. Sin asuntos ni textos de tickets. */
@Component({
  selector: 'app-ficha-soporte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ficha-seccion [docId]="docId" nombre="soporte" [titulo]="textos.ficha.secciones.soporte">
      <ng-template let-d>
        <dl class="pl-datos">
          <div *ngFor="let c of contadores(d)">
            <dt>{{ c.clave === 'archivados' ? textos.ficha.ticketsArchivados : c.rotulo }}</dt>
            <dd class="pl-num">{{ c.texto }}</dd>
          </div>
          <div><dt>Sugerencias enviadas</dt><dd class="pl-num">{{ nulo(d.sugerencias?.enviadas) }}</dd></div>
          <div><dt>Último ticket</dt><dd>{{ d.ultimo | fechaCo:false }}</dd></div>
        </dl>
        <div class="pl-tabla-caja pl-tabla-siempre" *ngIf="d.tickets?.length; else sinTickets">
          <table class="pl-tabla">
            <thead><tr><th scope="col">Ticket</th><th scope="col">Tipo</th><th scope="col">Estado</th><th scope="col">Prioridad</th><th scope="col">Categoría</th><th scope="col">Fecha</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of d.tickets">
                <td>{{ nulo(t.nroTicket) }}</td><td>{{ nulo(t.tipo) }}</td><td>{{ nulo(t.estado) }}</td><td>{{ nulo(t.prioridad) }}</td><td>{{ nulo(t.categoria) }}</td><td>{{ t.fecha | fechaCo:false }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #sinTickets><p class="pl-muted">{{ textos.ficha.sinTickets }}</p></ng-template>
        <p class="pl-muted">Calificación: {{ d.calificacion?.motivo || '—' }}</p>
      </ng-template>
    </app-ficha-seccion>
  `,
})
export class FichaSoporteComponent {
  @Input() docId = '';
  readonly textos = TEXTOS;
  nulo = textoONulo;
  contadores = contadoresSoporte;
}
