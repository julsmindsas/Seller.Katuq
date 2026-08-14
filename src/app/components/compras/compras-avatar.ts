/**
 * Avatares de las listas de compras.
 *
 * Misma paleta y misma regla que "Todos los pedidos" (`list.component.ts`): el
 * color sale de la inicial, así que un proveedor se ve siempre del mismo color
 * y la lista se reconoce de un vistazo. Vive aquí, y no copiado en cada
 * componente, para que las tres pantallas no se desalineen con el tiempo.
 */

const PALETA = [
  '#7C5CFF', '#2196F3', '#1E874B', '#E8820C',
  '#9C27B0', '#0EA5A0', '#D64545', '#5A6B78',
];

export function inicialDe(nombre: string | null | undefined): string {
  const texto = String(nombre || '').trim();
  return texto ? texto.charAt(0).toUpperCase() : '?';
}

export function colorDeAvatar(nombre: string | null | undefined): string {
  const texto = String(nombre || '?').trim() || '?';
  return PALETA[texto.charCodeAt(0) % PALETA.length];
}
