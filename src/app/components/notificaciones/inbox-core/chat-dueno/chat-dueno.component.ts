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
 * - Quien coordina (administrador o supervisor): Pasar a otra persona y quitarle el dueño.
 * - Con `puedePasar`, el dueño también pasa su chat; con `conNota`, con una nota opcional.
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
  /** Familia Administrador (se conserva para el buzón de WhatsApp actual). */
  @Input() esAdministrador = false;
  /** Quien coordina (administrador o supervisor, D-725): pasa el chat y quita el dueño. */
  @Input() coordina = false;
  /** El dueño o quien coordina puede pasar el chat. Sin él, solo pasa quien coordina. */
  @Input() puedePasar = false;
  /** Pide una nota opcional al pasar y emite `{ email, nota }` en vez del correo. */
  @Input() conNota = false;
  @Input() equipo: MiembroEquipo[] = [];
  @Input() ocupado = false;

  @Output() tomar = new EventEmitter<void>();
  @Output() soltar = new EventEmitter<void>();
  /** `Transferencia` ({ email, nota }) con `conNota`; el correo solo (string) si no, como hoy. */
  @Output() pasar = new EventEmitter<any>();

  modoPasar = false;
  destino: string[] = [];
  nota = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dueno']) {
      this.modoPasar = false;
      this.destino = [];
      this.nota = '';
    }
  }

  /** Quien coordina: la entrada nueva o el alias de administrador. */
  get coordinador(): boolean {
    return this.coordina || this.esAdministrador;
  }

  get mostrarPasar(): boolean {
    return this.coordinador || this.puedePasar;
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
    return this.coordinador
      ? 'notificaciones.owner.onlyOwnerAdmin'
      : 'notificaciones.owner.onlyOwner';
  }

  abrirPasar(): void {
    this.modoPasar = true;
    this.destino = [];
    this.nota = '';
  }

  cancelarPasar(): void {
    this.modoPasar = false;
    this.destino = [];
    this.nota = '';
  }

  confirmarPasar(): void {
    const email = this.destino[0];
    if (!email || this.ocupado) return;
    this.modoPasar = false;
    if (this.conNota) {
      this.pasar.emit({ email, nota: (this.nota || '').trim().slice(0, 300) });
    } else {
      this.pasar.emit(email);
    }
    this.nota = '';
  }
}
