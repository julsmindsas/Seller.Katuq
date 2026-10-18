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
  requested: { texto: 'Solicitada', clase: 'ag-estado--solicitada' },
  confirmed: { texto: 'Confirmada', clase: 'ag-estado--confirmada' },
  completed: { texto: 'Atendida', clase: 'ag-estado--atendida' },
  cancelled: { texto: 'Cancelada', clase: 'ag-estado--cancelada' },
  no_show: { texto: 'No asistió', clase: 'ag-estado--noasistio' },
};

export const ORIGEN_CITA: Record<string, string> = {
  agenda: 'Agenda',
  sales: 'Venta asistida',
  crm: 'CRM',
  web: 'Página web',
  opttia: 'Opttia',
};

export const MODALIDADES: { valor: ModalidadServicio; texto: string }[] = [
  { valor: 'onsite', texto: 'En el local' },
  { valor: 'home', texto: 'A domicilio' },
  { valor: 'virtual', texto: 'Virtual' },
];
