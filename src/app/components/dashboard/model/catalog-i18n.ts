import { TranslateService } from '@ngx-translate/core';

/**
 * Los textos del catálogo (fuentes, campos, medidas, reportes predefinidos) son
 * identificadores que el backend y las fórmulas [Etiqueta] comparan en español,
 * así que no se cambian en el dato: solo se traducen al mostrarlos.
 * Clave: dashboard.catalogo.<texto sin tildes, en minúsculas y con guiones bajos>.
 * Si no hay traducción (p. ej. el nombre de una medida calculada por la persona), se muestra el texto original.
 */
export function claveCatalogo(texto: string): string {
  const base = texto
    .replace(/%/g, 'pct ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return ['dashboard', 'catalogo', base].join('.');
}

export function traducirCatalogo(translate: TranslateService, texto: string | undefined | null): string {
  if (!texto) {
    return '';
  }
  const clave = claveCatalogo(texto);
  const traducido = translate.instant(clave);
  return traducido && traducido !== clave ? traducido : texto;
}
