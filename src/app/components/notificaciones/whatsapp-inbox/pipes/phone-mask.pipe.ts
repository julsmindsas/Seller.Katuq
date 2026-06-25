import { Pipe, PipeTransform } from "@angular/core";

/**
 * Pipe que enmascara un teléfono E.164 mostrando solo el prefijo país y los
 * últimos 4 dígitos. Los dígitos intermedios se reemplazan por asteriscos.
 *
 * Ejemplos:
 *   `+573001234567` → `+57***4567`
 *   `+1 555 123 4567` → `+1***4567`
 *   null/undefined/'' → `''`
 *
 * Nota: si el número tiene menos de 6 dígitos se devuelve enmascarado completo
 * salvo el prefijo país detectado (1-3 dígitos tras el `+`).
 */
@Pipe({ name: "phoneMask" })
export class PhoneMaskPipe implements PipeTransform {
  transform(phoneE164: string | null | undefined): string {
    if (!phoneE164) {
      return "";
    }

    const trimmed = String(phoneE164).trim();
    if (!trimmed) {
      return "";
    }

    // Detectar prefijo internacional `+XX` o `+X` o `+XXX`.
    const match = trimmed.match(/^\+(\d{1,3})/);
    const countryPrefix = match ? `+${match[1]}` : "";

    // Solo dígitos para extraer últimos 4.
    const digitsOnly = trimmed.replace(/\D/g, "");
    if (digitsOnly.length < 4) {
      return `${countryPrefix}***`;
    }

    const last4 = digitsOnly.slice(-4);
    return `${countryPrefix}***${last4}`;
  }
}
