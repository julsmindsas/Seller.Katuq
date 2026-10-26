import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EscalaNpsComponent } from '../escala-nps/escala-nps.component';
import { NpsPreguntaService } from '../../services/feedback/nps-pregunta.service';
import { rutaSinQuery } from '../../data/rutas-publicas';

import { TranslateModule } from '@ngx-translate/core';
/**
 * El contenido de la pregunta NPS de Katuq (D-483, D-506): la escala, el segundo paso según
 * la nota y el agradecimiento. Lo usan la ventana, el botón flotante y la tarjeta de Inicio;
 * el estado y las llamadas son de `NpsPreguntaService`.
 */
@Component({
  selector: 'app-nps-pregunta',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule, EscalaNpsComponent],
  templateUrl: './nps-pregunta.component.html',
  styleUrls: ['./nps-pregunta.component.scss'],
})
export class NpsPreguntaComponent {
  /** Prefijo de los ids (la pregunta y el comentario), único por presentación. */
  @Input() idBase = 'nps';

  readonly MAX_COMENTARIO = 1000;
  comentario = '';

  constructor(public pregunta: NpsPreguntaService, private router: Router) {}

  escoger(n: number): void {
    this.pregunta.escogerNota(n, rutaSinQuery(this.router.url));
  }

  enviar(): void {
    this.pregunta.enviar(this.comentario);
    this.comentario = '';
  }
}
