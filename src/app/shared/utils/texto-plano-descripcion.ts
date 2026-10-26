/**
 * Ticket 1410 (ALMARA): convierte texto plano pegado en la descripción del
 * producto a HTML con estructura. Las líneas que empiezan con «- », «• » o «* »
 * son viñetas; con «1. » o «1) », lista numerada; las demás, párrafos. La lista
 * termina en la primera línea que no es de lista. Las líneas vacías no generan
 * párrafos vacíos.
 */
const VINETA = /^\s*[-•*]\s+(.*)$/;
const NUMERO = /^\s*\d+[.)]\s+(.*)$/;

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function textoPlanoADescripcionHtml(texto: string): string {
  const partes: string[] = [];
  let lista: 'ul' | 'ol' | null = null;
  const cerrarLista = () => {
    if (lista) partes.push(`</${lista}>`);
    lista = null;
  };
  for (const linea of String(texto || '').split(/\r?\n/)) {
    const vineta = linea.match(VINETA);
    const numero = vineta ? null : linea.match(NUMERO);
    if (vineta || numero) {
      const tipo = vineta ? 'ul' : 'ol';
      if (lista !== tipo) {
        cerrarLista();
        partes.push(`<${tipo}>`);
        lista = tipo;
      }
      partes.push(`<li>${escapar((vineta || numero)![1].trim())}</li>`);
      continue;
    }
    cerrarLista();
    if (linea.trim()) partes.push(`<p>${escapar(linea.trim())}</p>`);
  }
  cerrarLista();
  return partes.join('');
}
