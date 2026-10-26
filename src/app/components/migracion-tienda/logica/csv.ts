/**
 * Lector de CSV para el navegador (RFC 4180): comillas dobles escapadas con «""», comas y
 * saltos de línea dentro de las celdas, CRLF o LF, BOM al inicio. Puro, sin Angular.
 * Nada se convierte en número: los códigos de barras conservan sus ceros.
 */

export interface FilaLeida {
  /** Número de registro en el archivo, como lo ve la persona en una hoja de cálculo (encabezado = 1). */
  _row: number;
  valores: { [encabezado: string]: string };
}

export interface ArchivoCsv {
  encabezados: string[];
  filas: FilaLeida[];
}

/** Separa el texto en registros de celdas. Una comilla sin cerrar al final no pierde el texto leído. */
export function parsearCsv(texto: string): string[][] {
  const registros: string[][] = [];
  let celda = '';
  let registro: string[] = [];
  let entreComillas = false;
  let hayContenido = false;
  const cerrarCelda = (): void => {
    registro.push(celda);
    celda = '';
  };
  const cerrarRegistro = (): void => {
    cerrarCelda();
    // Una línea completamente vacía no es un registro.
    if (registro.length > 1 || registro[0] !== '') registros.push(registro);
    registro = [];
    hayContenido = false;
  };

  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += c;
      }
      continue;
    }
    if (c === '"' && celda === '') {
      entreComillas = true;
      hayContenido = true;
    } else if (c === ',') {
      cerrarCelda();
      hayContenido = true;
    } else if (c === '\r') {
      if (t[i + 1] === '\n') i++;
      cerrarRegistro();
    } else if (c === '\n') {
      cerrarRegistro();
    } else {
      celda += c;
      hayContenido = true;
    }
  }
  if (hayContenido || celda !== '' || registro.length > 0) cerrarRegistro();
  return registros;
}

/** Lee un CSV con encabezado. Los encabezados repetidos conservan el primer valor no vacío. */
export function leerCsv(texto: string): ArchivoCsv {
  const registros = parsearCsv(texto);
  if (registros.length === 0) return { encabezados: [], filas: [] };
  const encabezados = registros[0].map((h) => h.trim());
  const filas: FilaLeida[] = [];
  for (let r = 1; r < registros.length; r++) {
    const valores: { [encabezado: string]: string } = {};
    encabezados.forEach((h, i) => {
      if (!h) return;
      const v = registros[r][i] === undefined ? '' : registros[r][i];
      if (valores[h] === undefined || (valores[h] === '' && v !== '')) valores[h] = v;
    });
    filas.push({ _row: r + 1, valores });
  }
  return { encabezados, filas };
}
