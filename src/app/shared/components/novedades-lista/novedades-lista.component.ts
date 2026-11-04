import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotaVersion } from '../../services/version-check.service';

/** D-581: lista de novedades de la pestaña «Novedades» de la campana. Solo pinta lo que recibe. */
@Component({
  selector: 'app-novedades-lista',
  templateUrl: './novedades-lista.component.html',
  styleUrls: ['./novedades-lista.component.scss'],
})
export class NovedadesListaComponent {
  @Input() notas: NotaVersion[] = [];

  private readonly LOCALES: Record<string, string> = { es: 'es-CO', en: 'en-US', pt: 'pt-BR', de: 'de-DE' };

  constructor(private translate: TranslateService) {}

  claseEtiqueta(tipo?: string): string {
    const t = (tipo || '').toUpperCase();
    if (t === 'MEJORA') return 'nov-tag nov-tag--mejora';
    if (t === 'CORRIGE') return 'nov-tag nov-tag--corrige';
    return 'nov-tag nov-tag--nuevo';
  }

  textoEtiqueta(tipo?: string): string {
    const t = (tipo || '').toUpperCase();
    return t === 'MEJORA' ? 'shell.update.tagImprovement' : t === 'CORRIGE' ? 'shell.update.tagFix' : 'shell.update.tagNew';
  }

  /** «3 de noviembre» en el idioma del usuario; vacío si la nota no trae fecha. */
  fecha(nota: NotaVersion): string {
    const d = new Date(nota.fecha || '');
    if (isNaN(d.getTime())) return '';
    const locale = this.LOCALES[this.translate.currentLang] || 'es-CO';
    try {
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  }

  porNota(index: number, nota: NotaVersion): string {
    return (nota.fecha || '') + nota.texto;
  }
}
