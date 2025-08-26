/**
 * Interfaz para el modelo de datos CRM Lead
 * Representa un lead capturado desde la aplicación móvil Katuq Flow
 */
export interface CrmLead {
  /**
   * ID único del lead en el sistema móvil
   */
  mobile_id: number;

  /**
   * Nombre del contacto/lead
   */
  name: string;

  /**
   * Correo electrónico del lead
   */
  email: string;

  /**
   * Número telefónico del lead
   */
  phone: string;

  /**
   * Empresa/organización del usuario que registra el lead
   */
  company: string;

  /**
   * Estado actual del lead
   * Valores posibles: "Nuevo", "En Proceso", "Contactado", "Calificado", "Perdido", "Convertido"
   */
  status: LeadStatus;

  /**
   * Fuente de origen del lead
   * Ejemplo: "Transcripción de voz - Lead directo", "Formulario web", "Referido"
   */
  source: string;

  /**
   * Resumen automático o manual del lead con información relevante
   */
  summary: string;

  /**
   * Fecha y hora de creación del lead
   */
  created_at: string;

  /**
   * Usuario o sistema que creó el lead
   */
  created_by: string;

  /**
   * Fecha y hora de la última actualización
   */
  updated_at: string;

  /**
   * Fecha y hora de la última llamada realizada al lead
   */
  last_called?: string;

  /**
   * Fecha y hora de la última sincronización con el servidor
   */
  last_sync: string;

  /**
   * Usuario que realizó la sincronización
   */
  sync_user: string;
}

/**
 * Enum para los diferentes estados de un lead
 */
export enum LeadStatus {
  NUEVO = "Nuevo",
  EN_PROCESO = "En Proceso",
  CONTACTADO = "Contactado",
  CALIFICADO = "Calificado",
  PERDIDO = "Perdido",
  CONVERTIDO = "Convertido",
}

/**
 * Interfaz para filtros de búsqueda de leads
 * Basada en los parámetros disponibles en la API
 */
export interface LeadFilters {
  company?: string;
  status?: LeadStatus;
  source?: string;
  dateFrom?: string; // date_from en la API (YYYY-MM-DD)
  dateTo?: string; // date_to en la API (YYYY-MM-DD)
  searchTerm?: string; // search en la API
  assigned_to?: string; // assigned_to en la API
}

/**
 * Interfaz para la respuesta de la API de leads
 */
export interface LeadsApiResponse {
  success: boolean;
  data: CrmLead[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

/**
 * Interfaz para estadísticas de leads
 */
export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<string, number>;
  recentActivity: number;
}
