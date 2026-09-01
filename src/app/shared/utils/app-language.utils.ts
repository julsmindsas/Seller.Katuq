export interface AppLanguage {
  language: string;
  code: 'es' | 'en' | 'pt';
  type: string;
  icon: string;
}

export const DEFAULT_APP_LANGUAGE: AppLanguage = Object.freeze({
  language: 'Español',
  code: 'es',
  type: 'CO',
  icon: 'co'
});

export const APP_LANGUAGES: ReadonlyArray<AppLanguage> = Object.freeze([
  Object.freeze({ language: 'English', code: 'en', type: 'US', icon: 'us' }),
  DEFAULT_APP_LANGUAGE,
  Object.freeze({ language: 'Português', code: 'pt', type: 'BR', icon: 'br' })
]);

/**
 * El backend tiene usuarios legacy con `lang: "es"` y usuarios nuevos con el
 * objeto completo. Cualquier dato ausente o desconocido debe iniciar en español.
 */
export function normalizeAppLanguage(value: unknown): AppLanguage {
  const code = typeof value === 'string'
    ? value.toLowerCase()
    : String((value as any)?.code || '').toLowerCase();
  const supported = APP_LANGUAGES.find(language => language.code === code);
  return supported ? { ...supported } : { ...DEFAULT_APP_LANGUAGE };
}
