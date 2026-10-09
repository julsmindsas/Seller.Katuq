/**
 * Animación FLIP del tablero de pedidos: se mide dónde estaba cada tarjeta ANTES de repintar,
 * se repinta, y las que se movieron viajan desde su sitio anterior hasta el nuevo. Aquí solo vive
 * el PLAN (puro, sin DOM): qué tarjetas se mueven y cuánto. Quien pinta lo ejecuta.
 */

export interface PosicionTarjeta {
  x: number;
  y: number;
}

export interface MovimientoFlip {
  id: string;
  /** Desplazamiento inicial (px): de donde estaba a donde quedó. La tarjeta arranca ahí y vuelve a 0. */
  dx: number;
  dy: number;
}

export interface OpcionesFlip {
  /** La persona pidió menos movimiento (`prefers-reduced-motion`): no hay animación. */
  reducirMovimiento: boolean;
  /** Menos que esto (px, suma de ejes) no se anima. */
  minimo?: number;
  /** Si se mueven más tarjetas que esto (una reconexión con muchos cambios), no se anima ninguna. */
  maximo?: number;
}

export const FLIP_MINIMO_PX = 1;
export const FLIP_MAXIMO_TARJETAS = 60;
export const FLIP_DURACION_MS = 700;
export const FLIP_CURVA = 'cubic-bezier(0.2, 1, 0.3, 1)';

/**
 * Las tarjetas que ya estaban y cambiaron de lugar. Las nuevas (sin posición anterior) no se
 * animan aquí: entran con su propia entrada resaltada. Con `reducirMovimiento` no hay ninguna.
 */
export function planearFlip(
  antes: ReadonlyMap<string, PosicionTarjeta>,
  despues: ReadonlyMap<string, PosicionTarjeta>,
  opciones: OpcionesFlip
): MovimientoFlip[] {
  if (opciones.reducirMovimiento) return [];
  const minimo = opciones.minimo ?? FLIP_MINIMO_PX;
  const maximo = opciones.maximo ?? FLIP_MAXIMO_TARJETAS;

  const movimientos: MovimientoFlip[] = [];
  despues.forEach((fin, id) => {
    const inicio = antes.get(id);
    if (!inicio) return;
    const dx = inicio.x - fin.x;
    const dy = inicio.y - fin.y;
    if (Math.abs(dx) + Math.abs(dy) < minimo) return;
    movimientos.push({ id, dx, dy });
  });
  return movimientos.length > maximo ? [] : movimientos;
}
