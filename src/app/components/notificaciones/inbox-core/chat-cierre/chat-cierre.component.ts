import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

/**
 * Cerrar un chat con motivo y abrirlo de nuevo (D-728). Solo presenta y avisa lo que el usuario hace: quien lo
 * aloja llama al servidor, que decide los permisos. En el chat abierto muestra el botón «Cerrar chat» y, al
 * pulsarlo, un bloque en línea con el motivo (obligatorio); en uno cerrado, la franja con el motivo y
 * «Abrir de nuevo». El host es `display: contents`: sus piezas se acomodan en la barra del chat.
 */
@Component({
  selector: 'app-chat-cierre',
  templateUrl: './chat-cierre.component.html',
  styleUrls: ['./chat-cierre.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatCierreComponent implements OnChanges {
  @Input() cerrado = false;
  /** Motivo del cierre vigente (solo se ve con el chat cerrado). */
  @Input() motivoCierre = '';
  /** Motivos del catálogo: campo estable de quien aloja. */
  @Input() motivos: string[] = [];
  /**
   * Último motivo que usó esta persona (lo guarda quien aloja). Al abrir el bloque queda marcado si sigue en el
   * catálogo; igual hay que pulsar «Confirmar», así que nunca cierra solo.
   */
  @Input() motivoSugerido = '';
  /** Hay una petición en curso. */
  /** Chat al que pertenece el bloque: si cambia, se descarta el motivo a medias (D-728). */
  @Input() threadId: string | null = null;
  @Input() ocupado = false;
  /** Mensaje del servidor al fallar (403, 409, 422); vacío = ninguno. */
  @Input() error = '';

  @Output() cerrar = new EventEmitter<string>();
  @Output() reabrir = new EventEmitter<void>();

  abierto = false;
  motivo = '';
  /** Ya intentó confirmar sin motivo: desde entonces se muestra el aviso. */
  intentado = false;

  ngOnChanges(cambios: SimpleChanges): void {
    // Al cambiar el estado del chat (se cerró o se reabrió) el bloque en línea se cierra.
    if (cambios['cerrado'] || (cambios['threadId'] && !cambios['threadId'].firstChange)) this.reiniciar();
    // Si el motivo elegido ya no está en el catálogo, se suelta.
    if (cambios['motivos'] && this.motivo && !this.motivos.includes(this.motivo)) this.motivo = '';
  }

  alternar(): void {
    if (this.ocupado) return;
    this.abierto = !this.abierto;
    if (!this.abierto) {
      this.reiniciar();
      return;
    }
    if (!this.motivo && this.motivoSugerido && this.motivos.includes(this.motivoSugerido)) this.motivo = this.motivoSugerido;
  }

  elegir(valor: string): void {
    this.motivo = valor || '';
  }

  confirmar(): void {
    this.intentado = true;
    if (!this.motivo || this.ocupado) return;
    this.cerrar.emit(this.motivo);
  }

  private reiniciar(): void {
    this.abierto = false;
    this.motivo = '';
    this.intentado = false;
  }
}
