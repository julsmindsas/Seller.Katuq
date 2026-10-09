/**
 * Iconos de línea (24x24) del tablero "En vivo", como trazos `d` de SVG para
 * `<app-en-vivo-icono>`. Solo trazos (círculos y rectángulos incluidos), así la
 * plantilla los pinta con `[attr.d]` sin `innerHTML` ni sanitizador.
 */

/** Círculo como trazo: centro (cx, cy) y radio r. */
function circulo(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
}

/** Rectángulo con esquinas redondeadas como trazo. */
function rectangulo(x: number, y: number, ancho: number, alto: number, r: number): string {
  const w = ancho - 2 * r;
  const h = alto - 2 * r;
  return (
    `M${x + r} ${y}h${w}a${r} ${r} 0 0 1 ${r} ${r}v${h}a${r} ${r} 0 0 1 ${-r} ${r}` +
    `h${-w}a${r} ${r} 0 0 1 ${-r} ${-r}v${-h}a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
}

const OJO = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z';
const ALTAVOZ = 'M11 5 6 9H3v6h3l5 4V5z';

export const ICONOS = {
  bolsa: ['M6 7h12l-1 13H7L6 7z', 'M9 7a3 3 0 0 1 6 0'],
  flecha: ['M5 12h14M13 6l6 6-6 6'],
  tarjeta: [rectangulo(3, 6, 18, 12, 2), 'M3 10h18'],
  moto: [circulo(6, 17, 3), circulo(18, 17, 3), 'M6 17h5l3-6h3l1 6M14 11l-2-4H9'],
  camion: ['M3 7h11v9H3zM14 10h4l3 3v3h-7z', circulo(7, 17, 2), circulo(17, 17, 2)],
  check: [circulo(12, 12, 9), 'm8 12 3 3 5-6'],
  equis: [circulo(12, 12, 9), 'm9 9 6 6M15 9l-6 6'],
  tienda: ['M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6'],
  capas: ['m12 3 9 5-9 5-9-5z', 'm3 13 9 5 9-5'],
  caja: ['M21 8 12 3 3 8v8l9 5 9-5z', 'm3 8 9 5 9-5M12 13v8'],
  pin: ['M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z', circulo(12, 10, 2.5)],
  efectivo: [rectangulo(2, 6, 20, 12, 2), circulo(12, 12, 3)],
  pulso: ['M3 12h4l3-8 4 16 3-8h4'],
  ia: [
    'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z',
    'M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  ],
  reloj: [circulo(12, 12, 9), 'M12 7v5l3 2'],
  alerta: ['M12 3 2 20h20L12 3z', 'M12 10v4M12 17h.01'],
  fuego: ['M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z'],
  trofeo: ['M8 4h8v5a4 4 0 0 1-8 0V4z', 'M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8'],
  rayo: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  ojo: [OJO, circulo(12, 12, 3)],
  ojoTachado: [OJO, circulo(12, 12, 3), 'M4 4l16 16'],
  sonido: [ALTAVOZ, 'M16 9.5a4 4 0 0 1 0 5M19 7a8 8 0 0 1 0 10'],
  silencio: [ALTAVOZ, 'M16 9l5 6M21 9l-5 6'],
  pantalla: [rectangulo(3, 4, 18, 12, 2), 'M8 20h8M12 16v4'],
  repetir: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5', 'M12 8v4l3 2'],
} as const;

export type IconoId = keyof typeof ICONOS;

export function trazosDe(nombre: IconoId | null | undefined): ReadonlyArray<string> {
  return nombre ? ICONOS[nombre] ?? [] : [];
}
