import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OpttiaSupportView } from '../../services/opttia-support.types';

@Component({
  selector: 'app-opttia-support-ticket', standalone: true, imports: [CommonModule, RouterModule],
  templateUrl: './opttia-support-ticket.component.html', styleUrls: ['./opttia-support-ticket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpttiaSupportTicketComponent {
  @Input() view!: OpttiaSupportView;
  @Input() blocked = false;
  @Output() confirmRequested = new EventEmitter<void>();
  @Output() cancelRequested = new EventEmitter<void>();
  @Output() replyRequested = new EventEmitter<void>();

  get showDetails(): boolean { return !['created', 'existing', 'cancelled'].includes(this.view.status); }

  get heading(): string {
    switch (this.view.status) {
      case 'draft': return 'Completemos tu reporte';
      case 'review': return 'Revisa antes de crear';
      case 'submitting': return 'Confirmando tu reporte';
      case 'created': return `Ticket #${this.view.ticket?.nroTicket} creado`;
      case 'existing': return `Ticket #${this.view.ticket?.nroTicket} existente`;
      case 'uncertain': return 'Falta comprobar el resultado';
      case 'expired': return 'La propuesta venció';
      case 'revoked': return 'Revisa tu acceso';
      default: return 'Propuesta descartada';
    }
  }
}
