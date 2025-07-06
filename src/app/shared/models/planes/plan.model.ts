export interface LimitesPlan {
  maxUsuarios?: number;
  maxProductos?: number;
  maxPedidos?: number | string; // "ilimitado" u otro número
}

export interface SubscriptionPlan {
  _id?: string;
  nombre: string;
  descripcion?: string;
  precio: number; // 0 para Early Adopters
  duracion: number; // en días. 30 por defecto
  tipo: string; // "mensual", "anual", etc.
  caracteristicas?: string[];
  limites?: LimitesPlan;
  activo?: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
} 