import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { MiembroEquipo, NotaChat } from '../../../../shared/services/messaging/messaging.models';

/**
 * Notas internas de un chat (D-725). Solo presentación: lista las notas con autor
 * y fecha, y emite `agregar` con el texto y las menciones; el contenedor llama al
 * servidor. Las notas nunca van al cliente.
 */
@Component({
  selector: 'app-chat-notas',
  templateUrl: './chat-notas.component.html',
  styleUrls: ['./chat-notas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatNotasComponent {
  @Input() notas: NotaChat[] = [];
  @Input() equipo: MiembroEquipo[] = [];
  /** Correo de la sesión: sus notas se marcan como propias y no se ofrece mencionarse. */
  @Input() set miEmail(v: string) {
    this._miEmail = v || '';
    // Arreglo estable: uno nuevo en cada revisión hace que el selector se recalcule sin parar.
    this.excluidos = this._miEmail ? [this._miEmail] : [];
  }
  get miEmail(): string {
    return this._miEmail;
  }
  private _miEmail = '';
  excluidos: string[] = [];
  /** Mientras el contenedor guarda la nota. */
  @Input() ocupado = false;

  @Output() agregar = new EventEmitter<{ texto: string; menciones: string[] }>();

  constructor(private cdr: ChangeDetectorRef) {}

  readonly maximo = 1000;
  texto = '';
  menciones: string[] = [];

  get puedeEnviar(): boolean {
    return !this.ocupado && this.texto.trim().length > 0;
  }

  esMia(nota: NotaChat): boolean {
    return !!this.miEmail && (nota.por || '').toLowerCase() === this.miEmail.toLowerCase();
  }

  nombreDe(email: string): string {
    const m = (this.equipo || []).find((x) => (x.email || '').toLowerCase() === (email || '').toLowerCase());
    return m?.nombre || email;
  }

  /** Más recientes abajo, como un chat. */
  trackNota(_i: number, n: NotaChat): string {
    return n.id;
  }

  enviar(): void {
    if (!this.puedeEnviar) return;
    // El texto se conserva hasta que el contenedor confirme el guardado (limpiar()).
    this.agregar.emit({ texto: this.texto.trim().slice(0, this.maximo), menciones: [...this.menciones] });
  }

  /** El contenedor lo llama cuando la nota ya se guardó. */
  limpiar(): void {
    this.texto = '';
    this.menciones = [];
    this.cdr.markForCheck();
  }
}
