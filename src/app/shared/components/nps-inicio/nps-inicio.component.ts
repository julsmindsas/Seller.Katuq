import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NpsPreguntaComponent } from '../nps-pregunta/nps-pregunta.component';
import { NpsPreguntaService } from '../../services/feedback/nps-pregunta.service';

/**
 * La pregunta NPS de Katuq en la página de Inicio (D-506): dentro de la página, sin flotar
 * ni tapar nada. Aparece mientras la pregunta esté pendiente y ya se haya mostrado la ventana
 * del ciclo. Quién pregunta y cuándo lo decide `app-nps-tarjeta`.
 */
@Component({
  selector: 'app-nps-inicio',
  standalone: true,
  imports: [CommonModule, NpsPreguntaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="pregunta.estado$ | async as e">
      <div *ngIf="e.presentacion === 'tarjeta'" class="container-fluid px-4 mb-3">
        <section class="ni-tarjeta" [attr.aria-labelledby]="e.paso === 'gracias' ? null : 'ni-pregunta'">
          <app-nps-pregunta idBase="ni"></app-nps-pregunta>
        </section>
      </div>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .ni-tarjeta {
      box-sizing: border-box;
      max-width: 640px;
      padding: 18px 20px 16px;
      background: #fff;
      border: 1px solid #ececf4;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(30, 20, 80, .04);
    }
    @media (max-width: 575.98px) { .ni-tarjeta { padding: 16px; } }
  `],
})
export class NpsInicioComponent {
  constructor(public pregunta: NpsPreguntaService) {}
}
