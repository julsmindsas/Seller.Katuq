/** Un archivo que ya está subido en la sesión de adjuntos (D-549, plan B). */
export interface ArchivoDeSesion {
  /** Número de orden dentro de la sesión; con él se quita. */
  n: number;
  nombre: string;
  bytes: number;
}

/** Topes por archivo, en bytes: lo que dice el servidor (una sola fuente de verdad). */
export interface TopesAdjuntos {
  general: number;
  audioVideo: number;
}

/** Lo que el servidor responde al abrir el enlace: para quién es y qué se permite. */
export interface SesionAdjuntos {
  comercio: string;
  esTicketExistente: boolean;
  tipos: string[];
  topes: TopesAdjuntos;
  maximo: number;
  archivos: ArchivoDeSesion[];
  expiraEn: string;
}

export interface RespuestaSesionAdjuntos extends SesionAdjuntos {
  success: boolean;
}

/** La URL firmada para subir UN archivo directo al almacenamiento, con las cabeceras que exige. */
export interface PermisoSubida {
  success: boolean;
  uploadUrl: string;
  ruta: string;
  encabezados: Record<string, string>;
  expiraEn: string;
  maximoBytes: number;
  archivosEnSolicitud: number;
}

export interface PedidoPermiso {
  nombreArchivo: string;
  contentType: string;
  bytes: number;
}

/** Códigos estables con los que el servidor explica por qué no se pudo seguir. */
export type CodigoErrorAdjuntos =
  | 'INVALIDO' | 'VENCIDO' | 'USADO' | 'NO_DISPONIBLE' | 'NO_ENCONTRADO'
  | 'TIPO_NO_PERMITIDO' | 'ARCHIVO_VACIO' | 'ARCHIVO_MUY_GRANDE' | 'CUPO_LLENO'
  | 'DEMASIADAS_SOLICITUDES' | 'ERROR';
