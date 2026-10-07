/** Escapa un texto para meterlo en HTML armado a mano (Swal, documentos de impresión). */
export function escaparHtml(texto: any): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
