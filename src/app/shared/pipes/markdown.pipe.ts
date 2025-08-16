import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '' as any;
    // Escapar HTML para evitar inyección
    let text = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bloques de código ```
    text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
      return `<pre class="md-code"><code>${code}</code></pre>`;
    });

    // Código inline `code`
    text = text.replace(/`([^`]+)`/g, (_m, code) => `<code class="md-inline">${code}</code>`);

    // Negrita **bold** e itálica *italic*
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links [texto](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Listas simples
    text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\s*)+/g, (m) => `<ul>${m}</ul>`);

    // Saltos de línea → párrafos
    text = text
      .split(/\n{2,}/)
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}


