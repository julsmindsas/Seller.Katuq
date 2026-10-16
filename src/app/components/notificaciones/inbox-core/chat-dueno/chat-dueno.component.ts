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
    if (!this.dueno) return 'Sin asignar';
    return this.esMio ? 'Atiende: tú' : `Atiende: ${this.dueno.nombre || this.dueno.email}`;
  }

  /** Por qué no se puede escribir, o qué hacer para que nadie más responda. */
  get motivo(): string {
    if (!this.dueno) return 'Tómalo para responder sin que otro vendedor le escriba al mismo cliente.';
    if (this.esMio) return '';
    const nombre = this.dueno.nombre || this.dueno.email;
    return this.esAdministrador
      ? `Solo ${nombre} puede escribir en este chat. Para responder tú, pásatelo.`
      : `Solo ${nombre} puede escribir en este chat. Si necesitas responder, pídele que lo suelte.`;
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
