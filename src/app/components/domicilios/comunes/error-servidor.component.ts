import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ErrorDomicilios } from '../domicilios.errores';

/**
 * Lo que respondió el servidor cuando algo falló, en una frase, con el botón que corresponde:
 * sin mensajeros habilitados lleva a Envíos y entregas y con la API apagada lleva a Integración.
 */
@Component({
  selector: 'app-domicilios-error',
  templateUrl: './error-servidor.component.html',
  styleUrls: ['./error-servidor.component.scss']
})
export class ErrorServidorComponent {
  @Input() error: ErrorDomicilios | null = null;
  @Input() titulo = 'No pudimos completar la acción';
  /** Solo un administrador puede activar los domicilios en Integración. */
  @Input() esAdmin = false;
  @Output() irAIntegracion = new EventEmitter<void>();
}
