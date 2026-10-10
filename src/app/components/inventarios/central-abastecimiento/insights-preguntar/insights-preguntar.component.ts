import { Component } from '@angular/core';
import { OpttiaChatService } from '../../../../shared/services/opttia-chat.service';

/**
 * Preguntas sugeridas (D-401): abren el chat de Opttia con la pregunta escrita. La
 * persona la envía; así se respetan el consentimiento y el cupo del plan.
 */
@Component({
  selector: 'app-insights-preguntar',
  templateUrl: './insights-preguntar.component.html',
  styleUrls: ['../insights.shared.scss']
})
export class InsightsPreguntarComponent {
  readonly preguntas = [
    '¿Qué tengo que comprar esta semana y cuánto?',
    '¿Qué productos tengo quietos y qué hago con ellos?',
    '¿Puedo mover mercancía entre bodegas en vez de comprar?',
    '¿Qué se me va a agotar en los próximos 15 días?',
  ];

  constructor(private readonly opttia: OpttiaChatService) {}

  preguntar(pregunta: string): void {
    this.opttia.askFromScreen(pregunta);
  }
}
