import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Vista previa del correo de campaña (D-318), como se vería en un celular o
 * en un computador.
 *
 * El HTML lo arma el servidor (todo lo del comerciante va escapado) y se
 * pinta dentro de un iframe con `sandbox=""`: sin scripts, sin formularios y
 * sin acceso a esta página, aunque algo se colara.
 */
@Component({
  selector: 'app-vista-previa-correo',
  templateUrl: './vista-previa-correo.component.html',
  styleUrls: ['./vista-previa-correo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistaPreviaCorreoComponent implements OnChanges {
  @Input() html = '';
  @Input() asunto = '';
  @Input() remitente = '';

  modo: 'movil' | 'computador' = 'movil';
  documento: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    this.documento = this.sanitizer.bypassSecurityTrustHtml(this.html || '');
  }
}
