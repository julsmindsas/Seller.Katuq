import { AbstractControl, ValidationErrors } from "@angular/forms";

/**
 * Ticket 1015 (ALMARA FELICIDAD) — un correo con tilde (`Andrés.giron2026@gmail.com`)
 * dejaba el formulario de cliente inválido y el botón apagado, sin mostrar nada.
 *
 * `Validators.email` de Angular rechaza cualquier carácter fuera de ASCII en la
 * parte local, así que una tilde o una ñ se ven idénticas a un correo mal escrito.
 * Acá se separan los dos casos para poder decirle al vendedor cuál es:
 *   - `correoConTildes` → tiene tildes/ñ y sin ellas sí sería válido (se ofrece corregir).
 *   - `correoInvalido`  → está mal escrito de verdad.
 *
 * Los dominios de correo reales (Gmail incluido) no entregan a direcciones con
 * tilde, de modo que en la práctica siempre es un error de digitación.
 */

/** Misma expresión que usa `Validators.email` de Angular (ASCII estricto). */
const CORREO_ASCII =
  /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

/**
 * Quita tildes y diéresis, convierte la ñ en n, pasa a minúscula y recorta.
 * `Andrés.Girón2026@Gmail.com` → `andres.giron2026@gmail.com`.
 */
export function normalizarCorreo(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** `true` si el correo solo falla por llevar tildes o ñ. */
export function correoSoloFallaPorTildes(valor: string | null | undefined): boolean {
  const original = (valor || "").trim();
  if (!original || CORREO_ASCII.test(original)) return false;
  return CORREO_ASCII.test(normalizarCorreo(original));
}

/**
 * Validador de correo que distingue "tiene tildes" de "está mal escrito".
 * Vacío no es error acá: eso lo reporta `Validators.required`.
 */
export function correoValidator(control: AbstractControl): ValidationErrors | null {
  const valor = (control.value || "").toString().trim();
  if (!valor) return null;
  if (CORREO_ASCII.test(valor)) return null;
  return correoSoloFallaPorTildes(valor)
    ? { correoConTildes: true }
    : { correoInvalido: true };
}
