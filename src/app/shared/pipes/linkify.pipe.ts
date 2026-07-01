import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Convierte las URLs planas dentro de un texto en enlaces <a> clickeables
 * (target="_blank", rel="noopener noreferrer"). Todo el resto del texto se
 * escapa para evitar inyección de HTML; solo se insertan anclas para URLs
 * `http(s)://` o `www.` — nunca esquemas peligrosos como `javascript:`.
 *
 * No agrega <br>: los saltos de línea se conservan tal cual y se muestran vía
 * `white-space: pre-line | pre-wrap` en el contenedor (ej. términos y
 * condiciones de la cotización en el landing público y en el PDF).
 */
@Pipe({ name: 'linkify' })
export class LinkifyPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '' as any;

    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    let html = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(value)) !== null) {
      // Texto previo a la URL (escapado).
      html += this.escape(value.slice(lastIndex, match.index));

      let url = match[0];
      // No arrastrar la puntuación final que casi nunca es parte del enlace
      // (ej. "visita https://katuq.com." → el punto queda fuera del <a>).
      let trailing = '';
      const punct = url.match(/[.,;:!?)\]]+$/);
      if (punct) {
        trailing = punct[0];
        url = url.slice(0, url.length - trailing.length);
      }

      const href = /^www\./i.test(url) ? 'https://' + url : url;
      html += `<a href="${this.escape(href)}" target="_blank" rel="noopener noreferrer">${this.escape(url)}</a>`;
      html += this.escape(trailing);

      lastIndex = match.index + match[0].length;
    }

    // Resto del texto (escapado).
    html += this.escape(value.slice(lastIndex));

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
