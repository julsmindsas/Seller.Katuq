/**
 * Lo poco que la pantalla necesita del navegador: descargar un texto como archivo, copiar al portapapeles y
 * leer un archivo elegido. Aislado aquí para que el resto de la lógica sea pura.
 */

/** Descarga `contenido` como un archivo. */
export function descargarTexto(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia un texto. Devuelve `false` si el navegador no lo permitió. Nunca escribe el texto en la consola. */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Sigue con el método de respaldo.
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Lee un archivo de texto. Excel en español guarda los CSV en Windows-1252 y no en UTF-8: si el archivo no
 * es UTF-8 válido se lee como Windows-1252, para que «Gómez» no salga como «G?mez».
 */
export async function leerArchivoComoTexto(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
