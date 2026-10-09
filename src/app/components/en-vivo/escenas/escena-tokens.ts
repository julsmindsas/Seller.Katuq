/**
 * Tokens de color de las escenas 3D de "En vivo". Las escenas no llevan colores en el código: los
 * leen de variables CSS (las `--scene-*` y `--box*` que define el componente de la escena, y los
 * semánticos `--ev-*` del tema de la pantalla), así que el modo pantalla (oscuro) y los temas
 * cambian la escena sin tocar el 3D.
 */

export type Tokens = Record<string, string>;

/** Nombres lógicos de los tokens que usa la escena de la operación. */
export const TOKENS_ESCENA: ReadonlyArray<string> = [
  'scene-bg', 'scene-plat', 'scene-plat-side', 'scene-yard', 'scene-road', 'scene-mark', 'scene-walk',
  'scene-belt', 'scene-belt-2', 'scene-wall', 'scene-trim', 'scene-tree', 'scene-trunk', 'scene-wheel',
  'scene-glass', 'box', 'box-tape',
  'accent', 'accent-2', 'accent-soft', 'ok', 'ok-soft', 'warn', 'warn-soft', 'bad', 'bad-soft',
  'info', 'info-soft', 'pack', 'pack-soft', 'slate', 'slate-soft', 'dark', 'ink',
  'map-land', 'map-side', 'map-line',
];

/** Valores de respaldo (tema claro): una variable que falte nunca pinta magenta ni rompe la escena. */
export const TOKENS_CLAROS: Readonly<Tokens> = {
  'scene-bg': '#E9E5F8', 'scene-plat': '#FBFAFF', 'scene-plat-side': '#D8D1F2', 'scene-yard': '#F1EEFB',
  'scene-road': '#55526F', 'scene-mark': '#FFFFFF', 'scene-walk': '#E4DFF6', 'scene-belt': '#3B3854',
  'scene-belt-2': '#4F4C6B', 'scene-wall': '#FFFFFF', 'scene-trim': '#ECE8FA', 'scene-tree': '#86CFA4',
  'scene-trunk': '#A3815F', 'scene-wheel': '#26233D', 'scene-glass': '#CFE3FF', box: '#D6A574', 'box-tape': '#5F3FE0',
  accent: '#5F3FE0', 'accent-2': '#7C5CFF', 'accent-soft': '#EFE9FF', ok: '#1E874B', 'ok-soft': '#E6F7EE',
  warn: '#D9820A', 'warn-soft': '#FFF1DF', bad: '#D64545', 'bad-soft': '#FDECEC', info: '#1E6FD9', 'info-soft': '#E7F1FF',
  pack: '#8E27B0', 'pack-soft': '#F3E9FB', slate: '#5A6B78', 'slate-soft': '#EEF0F3', dark: '0', ink: '#211F3A',
  'map-land': '#F4F1FD', 'map-side': '#CFC6F0', 'map-line': '#B9AEE8',
};

/** Nombre de la variable CSS de un token lógico: las de escena van tal cual, los semánticos son `--ev-*`. */
export function variableDeToken(token: string): string {
  return token.startsWith('scene-') || token.startsWith('map-') || token.startsWith('box') || token === 'dark' ? `--${token}` : `--ev-${token}`;
}

/** Lee los tokens del elemento (con lo que herede). Lo que falte cae en el respaldo claro. */
export function leerTokens(el: Element | null): Tokens {
  const out: Tokens = { ...TOKENS_CLAROS };
  if (!el || typeof getComputedStyle === 'undefined') return out;
  try {
    const cs = getComputedStyle(el);
    for (const t of TOKENS_ESCENA) {
      const v = cs.getPropertyValue(variableDeToken(t)).trim();
      if (v) out[t] = v;
    }
  } catch {
    // Sin estilos calculados: queda el tema claro de respaldo.
  }
  return out;
}

export const esOscuro = (tokens: Tokens): boolean => tokens['dark'] === '1';
