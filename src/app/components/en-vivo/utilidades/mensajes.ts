import { EstadoConexion, MotivoSinAcceso, VistaEnVivo } from '../servicios/en-vivo.modelos';

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
export function mensajeSinAcceso(motivo: MotivoSinAcceso | null, vista: VistaEnVivo): MensajeSinAcceso {
  if (motivo === 'sesion') {
    return {
      titulo: 'Tu sesión venció',
      texto: 'Vuelve a iniciar sesión para ver "En vivo".',
    };
  }
  if (motivo === 'prohibido' || (motivo === null && vista === 'katuq')) {
    return {
      titulo: 'Esta vista es solo para el equipo de Katuq',
      texto:
        '"Katuq en vivo" muestra a todos los comercios a la vez y solo está disponible para las cuentas de la plataforma. ' +
        'Para ver la operación de tu comercio, entra a "En vivo" desde el menú "Operaciones".',
    };
  }
  return {
    titulo: 'Tu rol no tiene "En vivo" activo',
    texto:
      'Esta pantalla está apagada para tu rol, por eso no se muestran datos. Para activarla, un administrador debe agregar ' +
      '"En vivo" a los menús de tu rol en Roles; después vuelve a iniciar sesión.',
  };
}

/** Lo que dice la pantalla mientras todavía no llega la primera foto. */
export function textoDeCarga(conexion: EstadoConexion): string {
  switch (conexion) {
    case 'reconectando':
      return 'Reconectando… En cuanto vuelva la conexión verás el estado al día.';
    case 'sondeo':
      return 'Cargando el estado de tu operación…';
    case 'pausado':
      return 'En pausa. Vuelve a esta pestaña para ponerte al día.';
    default:
      return 'Conectando con tu operación…';
  }
}
