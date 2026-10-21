export type AppLanguageCode = 'es' | 'en' | 'pt' | 'de';

export interface AppLanguage {
  language: string;
  code: AppLanguageCode;
  type: string;
  icon: string;
  /** Valor de `<html lang>` (lectores de pantalla y separación de sílabas). */
  htmlLang: string;
}

export const DEFAULT_APP_LANGUAGE: AppLanguage = Object.freeze({
  language: 'Español',
  code: 'es',
  type: 'CO',
  icon: 'co',
  htmlLang: 'es-CO'
});

/**
 * D-540: catálogo de idiomas del panel. Deutsch (CH) es alemán estándar de Suiza y nace
 * oculto: solo se ofrece cuando el login lo trae en `visibleLanguages`.
 */
export const APP_LANGUAGES: ReadonlyArray<AppLanguage> = Object.freeze([
  Object.freeze({ language: 'English', code: 'en', type: 'US', icon: 'us', htmlLang: 'en-US' }),
  DEFAULT_APP_LANGUAGE,
  Object.freeze({ language: 'Português', code: 'pt', type: 'BR', icon: 'br', htmlLang: 'pt-BR' }),
  Object.freeze({ language: 'Deutsch', code: 'de', type: 'CH', icon: 'ch', htmlLang: 'de-CH' })
] as AppLanguage[]);

/** Idiomas visibles cuando el login no trae `visibleLanguages` (sesiones abiertas antes de D-540). */
export const DEFAULT_VISIBLE_LANGUAGES: ReadonlyArray<AppLanguageCode> =
  Object.freeze(['es', 'en', 'pt'] as AppLanguageCode[]);

/**
 * Códigos visibles en el orden del catálogo y siempre con `es`. Los códigos que no están en el
 * catálogo se ignoran.
 */
function codigosVisibles(visibles: ReadonlyArray<unknown>): AppLanguageCode[] {
  const pedidos = visibles
    .filter((valor): valor is string => typeof valor === 'string')
    .map(valor => valor.trim().toLowerCase());
  return APP_LANGUAGES
    .map(language => language.code)
    .filter(code => code === DEFAULT_APP_LANGUAGE.code || pedidos.includes(code));
}

/**
 * Idiomas que el selector ofrece a este usuario: `visibleLanguages` de la respuesta del login.
 * Sin el campo, o si no es un arreglo, da es, en y pt.
 */
export function idiomasVisibles(user: unknown): AppLanguageCode[] {
  const visibles = user && typeof user === 'object' ? (user as any).visibleLanguages : undefined;
  return codigosVisibles(Array.isArray(visibles) ? visibles : DEFAULT_VISIBLE_LANGUAGES);
}

/**
 * El backend tiene usuarios legacy con `lang: "es"` y usuarios nuevos con el
 * objeto completo. Cualquier dato ausente, desconocido u oculto debe iniciar en español.
 * No cambia la preferencia guardada: si el idioma vuelve a ser visible, el usuario lo recupera.
 */
export function normalizeAppLanguage(
  value: unknown,
  visibles: ReadonlyArray<unknown> = DEFAULT_VISIBLE_LANGUAGES
): AppLanguage {
  const raw = typeof value === 'string' ? value : (value as any)?.code;
  const code = typeof raw === 'string' ? raw.toLowerCase() : '';
  const permitidos = codigosVisibles(Array.isArray(visibles) ? visibles : []);
  const supported = permitidos.includes(code as AppLanguageCode)
    ? APP_LANGUAGES.find(language => language.code === code)
    : undefined;
  return supported ? { ...supported } : { ...DEFAULT_APP_LANGUAGE };
}

/** Forma de `users.lang` (la de antes de D-540): `htmlLang` se deriva del code y no se guarda. */
export type StoredAppLanguage = Omit<AppLanguage, 'htmlLang'>;

export function idiomaParaGuardar(lang: AppLanguage): StoredAppLanguage {
  return { language: lang.language, code: lang.code, type: lang.type, icon: lang.icon };
}
