import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { DuenoChat, MiembroEquipo } from '../../../../shared/services/messaging/messaging.models';

/**
 * Franja de "quién atiende" el chat (D-437). Solo presentación: emite Tomar,
 * Soltar y Pasar y el buzón del canal llama al servidor, que es quien decide.
 *
 * - Sin dueño: "Sin asignar" y Tomar.
 * - Dueño propio: Soltar.
 * - Familia Administrador: Pasar a otra persona y quitarle el dueño.
 * - Si el chat es de otra persona, dice por qué no se puede escribir.
 */
@Component({
  selector: 'app-chat-dueno',
  templateUrl: './chat-dueno.component.html',
  styleUrls: ['./chat-dueno.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatDuenoComponent implements OnChanges {
  @Input() dueno: DuenoChat | null = null;
  /** Email de la sesión. */
  @Input() miEmail = '';
  /** Familia Administrador: puede pasar el chat y quitarle el dueño. */
  @Input() esAdministrador = false;
  @Input() equipo: MiembroEquipo[] = [];
  @Input() ocupado = false;

  @Output() tomar = new EventEmitter<void>();
  @Output() soltar = new EventEmitter<void>();
  @Output() pasar = new EventEmitter<string>();

  modoPasar = false;
  destino: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dueno']) {
      this.modoPasar = false;
      this.destino = [];
    }
  }

  get esMio(): boolean {
    return !!this.dueno && !!this.miEmail &&
      this.dueno.email.toLowerCase() === this.miEmail.toLowerCase();
  }

  get titulo(): string {
    if (!this.dueno) return 'notificaciones.owner.unassigned';
    return this.esMio ? 'notificaciones.owner.mine' : 'notificaciones.owner.other';
  }

  /** Por qué no se puede escribir, o qué hacer para que nadie más responda. */
  get motivo(): string {
    if (!this.dueno) return 'notificaciones.owner.takeHint';
    if (this.esMio) return '';
    return this.esAdministrador
      ? 'notificaciones.owner.onlyOwnerAdmin'
      : 'notificaciones.owner.onlyOwner';
  }

  abrirPasar(): void {
    this.modoPasar = true;
    this.destino = [];
  }

  cancelarPasar(): void {
    this.modoPasar = false;
    this.destino = [];
  }

  confirmarPasar(): void {
    const email = this.destino[0];
    if (!email || this.ocupado) return;
    this.modoPasar = false;
    this.pasar.emit(email);
  }
}
