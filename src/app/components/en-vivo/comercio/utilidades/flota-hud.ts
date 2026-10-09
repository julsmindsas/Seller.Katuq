import { EntradaFlota } from '../../utilidades/flota';
import { duracion, iniciales } from '../../utilidades/formato';

/** Una fila de "Tu flota": el mensajero (moto) o la transportadora (camión) con su estado. */
export interface FilaFlotaHud {
  clave: string;
  nombre: string;
  iniciales: string;
  subtitulo: string;
  /** "En bodega" · "En ruta · 2 · 25 min" · "Disponible" (la transportadora sin pedidos). */
  estado: string;
  /** Tono de la pastilla: azul "en ruta", pizarra "en bodega". */
  claseEstado: string;
  claseAvatar: string;
  enRuta: boolean;
  /** Para lectores de pantalla. */
  aria: string;
  pedidoIds: string[];
}

const COLORES_AVATAR: ReadonlyArray<string> = ['t-accent', 't-info', 't-pack', 't-ok', 't-warn'];

/**
 * Las filas de la flota a partir de `armarFlota`. El tiempo de quien va en ruta ("25 min") sube
 * con `ahoraMs`; sin hora de salida no se escribe. Puro.
 */
export function filasFlotaHud(entradas: ReadonlyArray<EntradaFlota>, ahoraMs: number): FilaFlotaHud[] {
  return entradas.map((entrada, i) => {
    const moto = entrada.tipo === 'mensajero';
    const minutos = entrada.enRuta && entrada.salioEn !== null ? duracion(Math.max(0, ahoraMs - entrada.salioEn)) : '';
    const estado = entrada.enRuta
      ? `En ruta · ${entrada.pedidos}${minutos ? ` · ${minutos}` : ''}`
      : moto
      ? 'En bodega'
      : 'Disponible';
    return {
      clave: entrada.clave,
      nombre: entrada.nombre,
      iniciales: moto ? iniciales(entrada.nombre) : 'EN',
      subtitulo: moto ? 'Moto · mensajero propio' : 'Camión · envíos a otras ciudades',
      estado,
      claseEstado: entrada.enRuta ? 't-info' : 't-slate',
      claseAvatar: moto ? COLORES_AVATAR[i % COLORES_AVATAR.length] : 't-slate',
      enRuta: entrada.enRuta,
      aria: `${entrada.nombre}, ${estado}. Ver al ${moto ? 'mensajero' : 'transportador'}`,
      pedidoIds: entrada.pedidoIds.slice(),
    };
  });
}
