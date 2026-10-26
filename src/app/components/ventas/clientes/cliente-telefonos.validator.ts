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

/**
 * Ticket 1359 (ALMARA): el celular de Colombia (+57) tiene 10 dígitos, pero los
 * de otros países no. Con otro indicativo se acepta de 6 a 14 dígitos (el
 * máximo internacional es 15 contando el indicativo). Vacío no es error: lo
 * cubre alMenosUnTelefono.
 */
export const LARGO_CELULAR_OTRO_PAIS = { min: 6, max: 14 };

export const celularSegunIndicativo: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const numero = String(control.value ?? "").trim();
  if (!numero) return null;
  const indicativo = String(control.parent?.get("indicativo_celular_comprador")?.value ?? "57").trim();
  if (!/^[0-9]+$/.test(numero)) return { celular: { colombia: indicativo === "57" } };
  if (indicativo === "57") return numero.length === 10 ? null : { celular: { colombia: true } };
  const { min, max } = LARGO_CELULAR_OTRO_PAIS;
  return numero.length >= min && numero.length <= max ? null : { celular: { colombia: false } };
};
