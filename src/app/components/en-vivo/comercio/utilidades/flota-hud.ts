import { EntradaFlota } from '../../utilidades/flota';
import { duracion, iniciales } from '../../utilidades/formato';
import { Traductor } from '../../utilidades/traductor';

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
export function filasFlotaHud(entradas: ReadonlyArray<EntradaFlota>, ahoraMs: number, t: Traductor): FilaFlotaHud[] {
  return entradas.map((entrada, i) => {
    const moto = entrada.tipo === 'mensajero';
    const minutos = entrada.enRuta && entrada.salioEn !== null ? duracion(Math.max(0, ahoraMs - entrada.salioEn), t) : '';
    const estado = entrada.enRuta
      ? minutos
        ? t('enVivo.comercio.flota.enRutaTiempo', { pedidos: entrada.pedidos, tiempo: minutos })
        : t('enVivo.comercio.flota.enRuta', { pedidos: entrada.pedidos })
      : moto
      ? t('enVivo.comercio.flota.enBodega')
      : t('enVivo.comercio.flota.disponible');
    return {
      clave: entrada.clave,
      nombre: entrada.nombre,
      iniciales: moto ? iniciales(entrada.nombre) : t('enVivo.comercio.flota.inicialesTransportadora'),
      subtitulo: t(moto ? 'enVivo.comercio.flota.subtituloMoto' : 'enVivo.comercio.flota.subtituloCamion'),
      estado,
      claseEstado: entrada.enRuta ? 't-info' : 't-slate',
      claseAvatar: moto ? COLORES_AVATAR[i % COLORES_AVATAR.length] : 't-slate',
      enRuta: entrada.enRuta,
      aria: t(moto ? 'enVivo.comercio.flota.ariaMensajero' : 'enVivo.comercio.flota.ariaTransportadora', { nombre: entrada.nombre, estado }),
      pedidoIds: entrada.pedidoIds.slice(),
    };
  });
}
