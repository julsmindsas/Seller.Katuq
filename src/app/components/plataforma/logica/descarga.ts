/**
 * D-700 14.6 — Guardar un archivo que entregó el servidor. La descarga va por una petición con la autorización del
 * usuario y el archivo se guarda en el navegador: nunca hay un enlace con credenciales ni una ventana nueva.
 */

/** Nombre sugerido en `Content-Disposition`; si falta o trae algo raro, el de respaldo. */
export function nombreDeCabecera(cabecera: string | null | undefined, respaldo: string): string {
  const m = /filename="?([^";\r\n]+)"?/.exec(cabecera || '');
  const nombre = m ? m[1].trim() : '';
  // Solo letras, números, guion, punto y guion bajo: nada de rutas.
  return /^[\w.-]{1,120}$/.test(nombre) ? nombre : respaldo;
}

/** Guarda el blob con ese nombre. */
export function guardarBlob(blob: Blob, nombre: string): void {
  const enlace = document.createElement('a');
  const url = URL.createObjectURL(blob);
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
