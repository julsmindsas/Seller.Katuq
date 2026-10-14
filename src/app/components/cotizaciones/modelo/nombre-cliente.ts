/**
 * Nombre del cliente tal como se muestra en la lista, el editor y el PDF de cotizaciones.
 *
 * Ticket Z7cEC8NR:
 * - Empresas importadas con la razón social en nombres y apellidos salían
 *   "PPG INDUSTRIAS COLOMBIA LTDA PPG INDUSTRIAS COLOMBIA LTDA": si las dos
 *   partes son iguales se muestra una sola.
 * - Una importación guardó texto UTF-8 leído como Latin-1 ("Antioquã­a",
 *   "Muã±oz"). Se repara al mostrar; el dato guardado no se toca aquí.
 */

// Bytes 0x80-0x9F que Windows-1252 convierte en otros caracteres.
const CP1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

/** "Muã±oz" → "Muñoz", "Andrã©s" → "Andrés". Texto sano queda igual. */
export function repararTildes(texto: string): string {
  if (!texto || !/[ãÃ]/.test(texto)) return texto;
  return texto.replace(/[ãÃ]([\u0080-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ])/g, (_m, c: string) => {
    const byte = CP1252[c] ?? c.charCodeAt(0);
    return String.fromCharCode(0xc0 + (byte - 0x80));
  });
}

const normalizar = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();

/** Une nombres y apellidos sin repetir cuando las dos partes son iguales. */
function nombresYApellidos(nombres?: string, apellidos?: string): string {
  const n = (nombres || "").trim();
  const a = (apellidos || "").trim();
  if (n && a && normalizar(n) === normalizar(a)) return n;
  return [n, a].filter(Boolean).join(" ");
}

export function nombreClienteCotizacion(cli: any): string {
  if (!cli) return "";
  const nombre =
    cli.razonSocial ||
    cli.nombre ||
    nombresYApellidos(cli.nombres_completos, cli.apellidos_completos) ||
    cli.nombreComercial ||
    cli.documento ||
    "";
  return repararTildes(String(nombre));
}
