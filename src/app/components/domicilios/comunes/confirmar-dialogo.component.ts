import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Pregunta antes de una acción que no se puede deshacer (cancelar un domicilio, revocar una llave).
 * Con `motivoEtiqueta` pide además un motivo opcional. El diálogo se crea al abrirse y se destruye al
 * cerrarse (`*ngIf` en quien lo usa), así el motivo no queda guardado de una vez a otra.
 */
@Component({
  selector: 'app-domicilios-confirmar',
  templateUrl: './confirmar-dialogo.component.html',
  styleUrls: ['./confirmar-dialogo.component.scss']
})
export class ConfirmarDialogoComponent {
  @Input() titulo = '';
  @Input() mensaje = '';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoVolver = 'Volver';
  /** Pinta el botón de confirmar como acción destructiva. */
  @Input() peligro = false;
  /** Hay una petición en curso: nada se puede cerrar ni repetir. */
  @Input() ocupado = false;
  @Input() error: string | null = null;
  /** Si viene, se pide un motivo opcional con esta etiqueta. */
  @Input() motivoEtiqueta: string | null = null;
  @Input() motivoMax = 200;

  @Output() confirmar = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  motivo = '';

  alCambiarVisibilidad(visible: boolean): void {
    if (!visible && !this.ocupado) this.cerrar.emit();
  }
}
