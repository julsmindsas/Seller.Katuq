import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { copiarAlPortapapeles } from '../domicilios.navegador';

/**
 * Muestra un secreto completo UNA sola vez (una llave de API nueva o el secreto de firma de los avisos).
 * Quien lo usa lo crea con `*ngIf` y lo destruye al cerrar el cuadro: así el secreto sale de la pantalla y
 * de la memoria del componente. Aquí no se guarda en ningún almacenamiento ni se escribe en la consola.
 */
@Component({
  selector: 'app-domicilios-secreto-unico',
  templateUrl: './secreto-unico.component.html',
  styleUrls: ['./secreto-unico.component.scss']
})
export class SecretoUnicoComponent implements OnDestroy {
  @Input() secreto = '';
  @Input() titulo = '';
  @Input() descripcion = '';
  @Input() textoCerrar = 'Ya lo guardé';
  /** `id` único del campo, por si hay dos cuadros en la página. */
  @Input() idCampo = 'dom-secreto';
  @Output() cerrar = new EventEmitter<void>();

  copiado = false;
  noSePudoCopiar = false;

  ngOnDestroy(): void {
    this.secreto = '';
  }

  async copiar(): Promise<void> {
    const ok = await copiarAlPortapapeles(this.secreto);
    this.copiado = ok;
    this.noSePudoCopiar = !ok;
  }
}
