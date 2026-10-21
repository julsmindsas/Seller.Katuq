import { TranslateService } from '@ngx-translate/core';

/**
 * Listas de opciones (prioridades, tipos, fuentes…) cuyo valor se guarda o se compara en español
 * o en código, y cuya etiqueta se muestra. La lista guarda la clave en `label` y esta clase la
 * traduce al mostrarla; el `value` no cambia. Se rehace solo cuando cambia el idioma, para que el
 * arreglo sea el mismo entre un ciclo de detección y el siguiente (PrimeNG recalcula si no).
 */
export class OpcionesI18n<T extends { label: string }> {
  private idioma: string | undefined;
  private memo: T[] = [];

  constructor(private translate: TranslateService, private base: readonly T[]) {}

  get lista(): T[] {
    const idioma = this.translate.currentLang;
    if (idioma !== this.idioma || this.memo.length !== this.base.length) {
      this.idioma = idioma;
      this.memo = this.base.map(o => ({ ...o, label: this.translate.instant(o.label) }));
    }
    return this.memo;
  }
}

/** Parte final de la clave de un valor guardado: sin tildes, en minúsculas y con guiones bajos. */
export function normalizarValor(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Etiqueta de un valor guardado (estado, prioridad, fuente…). Si no hay traducción para ese valor
 * (por ejemplo, uno que escribió la persona), se muestra tal cual.
 */
export function etiquetaDeValor(translate: TranslateService, grupo: string, valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const clave = `${grupo}.${normalizarValor(valor)}`;
  const traducido = translate.instant(clave);
  return traducido && traducido !== clave ? traducido : valor;
}
