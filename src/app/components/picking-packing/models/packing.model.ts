export interface InformacionEmbalaje {
  tipo: string; // caja, sobre, etc.
  dimensiones?: {
    alto: number;
    ancho: number;
    largo: number;
  };
  peso: number;
  cantidadPaquetes: number;
  etiquetas?: string[];
  fotos?: string[];
  observaciones?: string;
}

export interface PackingRequest {
  ordenId: string;
  bodegaId: string;
}

export interface PackingCompletarRequest {
  packingId: string;
  informacionEmbalaje: InformacionEmbalaje;
}

export interface PackingResponse {
  _id: string;
  ordenId: string;
  bodegaId: string;
  pickingId?: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  fechaInicio: string;
  fechaCompletado?: string;
  usuarioAsignado?: string;
  informacionEmbalaje?: InformacionEmbalaje;
} 