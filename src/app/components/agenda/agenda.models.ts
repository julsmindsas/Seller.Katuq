/**
 * Agenda de servicios (D-491, openspec/changes/servicios-y-agenda). Mismos
 * nombres que el backend (`/v1/appointments`, `utils/agenda.js`).
 */

export type EstadoCita = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type ModoAgenda = 'hourly' | 'window';
export type ModalidadServicio = 'onsite' | 'home' | 'virtual';

export interface ClienteCita {
  clientId?: string | null;
  name: string;
  phone?: string;
  email?: string | null;
}

export interface ServicioCita {
  productId: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface HistorialCita {
  at: string;
  by: string;
  what: 'created' | 'moved' | 'status' | 'edited' | 'order';
  from?: any;
  to?: any;
  reason?: string;
}

export interface Cita {
  id: string;
  status: EstadoCita;
  date: string;
  startTime: string | null;
  endTime: string | null;
  window: string | null;
  durationMinutes: number | null;
  staffId: string | null;
  staffName: string | null;
  customer: ClienteCita;
  services: ServicioCita[];
  reason?: string | null;
  location?: { mode: ModalidadServicio; address?: string | null; city?: string | null };
  source: 'agenda' | 'sales' | 'crm' | 'web' | 'opttia';
  orderId?: string | null;
  notes?: string | null;
  history?: HistorialCita[];
  createdAt?: string;
}

export interface PersonaAgenda {
  id: string;
  name: string;
  email?: string;
  userId?: string | null;
  serviceIds: string[];
  active: boolean;
}

export interface ConfigAgenda {
  mode: ModoAgenda;
  slotMinutes: number;
  /** "1" (lunes) … "7" (domingo) → [["08:00","12:00"], …] */
  hours: Record<string, string[][]>;
  windows: string[];
  capacity: number;
  maxDaysAhead: number;
  webDurationMinutes: number;
  staff: PersonaAgenda[];
  notifyEmails: string[];
}

export interface ServicioAgenda {
  productId: string;
  name: string;
  durationMinutes: number | null;
  price: number;
  mode: ModalidadServicio;
  requiresAppointment: boolean;
  active: boolean;
}

export interface Disponibilidad {
  mode: ModoAgenda;
  horas?: { hora: string; staffIds: string[] }[];
  franjas?: { franja: string; disponible: boolean }[];
}

export interface EntradaCita {
  date: string;
  startTime?: string;
  window?: string;
  durationMinutes?: number;
  serviceIds: string[];
  staffId?: string | null;
  customer: ClienteCita;
  location?: { mode: ModalidadServicio; address?: string; city?: string };
  reason?: string;
  notes?: string;
  source?: 'agenda' | 'sales' | 'crm';
  requestId?: string;
}

export const ESTADOS_CITA: Record<EstadoCita, { texto: string; clase: string }> = {
  requested: { texto: 'agenda.estados.solicitada', clase: 'ag-estado--solicitada' },
  confirmed: { texto: 'agenda.estados.confirmada', clase: 'ag-estado--confirmada' },
  completed: { texto: 'agenda.estados.atendida', clase: 'ag-estado--atendida' },
  cancelled: { texto: 'agenda.estados.cancelada', clase: 'ag-estado--cancelada' },
  no_show: { texto: 'agenda.estados.noAsistio', clase: 'ag-estado--noasistio' },
};

export const ORIGEN_CITA: Record<string, string> = {
  agenda: 'agenda.origen.agenda',
  sales: 'agenda.origen.ventaAsistida',
  crm: 'agenda.origen.crm',
  web: 'agenda.origen.paginaWeb',
  opttia: 'agenda.origen.opttia',
};

export const MODALIDADES: { valor: ModalidadServicio; texto: string }[] = [
  { valor: 'onsite', texto: 'agenda.modalidad.enElLocal' },
  { valor: 'home', texto: 'agenda.modalidad.aDomicilio' },
  { valor: 'virtual', texto: 'agenda.modalidad.virtual' },
];
