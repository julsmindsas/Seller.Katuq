/**
 * Ticket 1461 (cartera interna): clave comparable de un documento. Es la misma regla del servidor
 * (`claveDocumento` de services/treasury/relacionInterna.js): ignora puntos, espacios, guiones y el
 * dígito de verificación de un NIT («901.072.822-4», «9010728224» y «901072822» son el mismo). Un texto
 * con letras o arroba (un correo, «SIN-DOCUMENTO») se compara tal cual, en minúsculas; una cédula de 10
 * dígitos que empieza en 1 no pierde su último dígito.
 */

/** Dígito de verificación del NIT (módulo 11 de la DIAN). */
function digitoNit(digitos: string): string {
  const pesos = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
  const base = digitos.padStart(pesos.length, '0').slice(-pesos.length);
  const suma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const resto = suma % 11;
  return String(resto <= 1 ? resto : 11 - resto);
}

export function claveDocumento(valor: unknown): string {
  const raw = valor == null ? '' : String(valor).trim();
  if (!raw) return '';
  if (/[a-z@]/i.test(raw)) return raw.toLowerCase();
  const digitos = raw.replace(/\D/g, '');
  if (!digitos) return '';
  const separado = raw.match(/^([\d.\s]+)-(\d)$/);
  if (separado) return separado[1].replace(/\D/g, '') || digitos;
  if (digitos.length === 10 && /^[89]/.test(digitos)) {
    const base = digitos.slice(0, -1);
    if (digitoNit(base) === digitos.slice(-1)) return base;
  }
  return digitos;
}
