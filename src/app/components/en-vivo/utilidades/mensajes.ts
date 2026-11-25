import { EstadoConexion, MotivoSinAcceso, VistaEnVivo } from '../servicios/en-vivo.modelos';
import { Traductor } from './traductor';

/** Mensaje de la pantalla cuando no se puede ver "En vivo". Sin datos de ningún tipo. */
export interface MensajeSinAcceso {
  titulo: string;
  texto: string;
}

/**
 * Por qué no hay pantalla y qué hacer. `rol` = el rol no tiene la entrada "En vivo" (la agrega el
 * administrador en Roles); `sesion` = la sesión venció; `prohibido` = la vista de toda Katuq es
 * solo para el equipo de Katuq.
 */
export function mensajeSinAcceso(motivo: MotivoSinAcceso | null, vista: VistaEnVivo, t: Traductor): MensajeSinAcceso {
  if (motivo === 'sesion') {
    return {
      titulo: t('enVivo.mensajes.sesionVencioTitulo'),
      texto: t('enVivo.mensajes.sesionVencioTexto'),
    };
  }
  if (motivo === 'prohibido' || (motivo === null && vista === 'katuq')) {
    return {
      titulo: t('enVivo.mensajes.prohibidoTitulo'),
      texto: t('enVivo.mensajes.prohibidoTexto'),
    };
  }
  return {
    titulo: t('enVivo.mensajes.rolTitulo'),
    texto: t('enVivo.mensajes.rolTexto'),
  };
}

/** Lo que dice la pantalla mientras todavía no llega la primera foto. */
export function textoDeCarga(conexion: EstadoConexion, t: Traductor): string {
  switch (conexion) {
    case 'reconectando':
      return t('enVivo.mensajes.cargaReconectando');
    case 'sondeo':
      return t('enVivo.mensajes.cargaSondeo');
    case 'pausado':
      return t('enVivo.mensajes.cargaPausado');
    default:
      return t('enVivo.mensajes.cargaConectando');
  }
}
