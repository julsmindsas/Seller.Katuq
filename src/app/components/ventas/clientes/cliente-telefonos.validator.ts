import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

/**
 * Ticket 1050 (ALMACEN BOMBAS): muchos clientes empresa llegan con el RUT, que
 * trae teléfono fijo y casi nunca celular. Exigir un celular de 10 dígitos
 * obligaba a inventarlo. Basta con tener UNO de los dos.
 */
export const alMenosUnTelefono: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const celular = String(grupo.get("numero_celular_comprador")?.value ?? "").trim();
  const fijo = String(grupo.get("telefono_fijo")?.value ?? "").trim();
  return celular || fijo ? null : { sinTelefono: true };
};

/** Fijo colombiano: 7 dígitos locales o 10 con el indicativo de ciudad (601, 604...). */
export const PATRON_TELEFONO_FIJO = /^[0-9]{7,10}$/;
