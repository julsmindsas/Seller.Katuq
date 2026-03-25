// ─── Status & Source Enums ────────────────────────────────────

export type ContactStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'lost';

export type ContactSource =
  | 'manual'
  | 'web_form'
  | 'referral'
  | 'social_media'
  | 'phone'
  | 'event'
  | 'crm_mobile'
  | 'ecommerce';

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'status_change'
  | 'task_created'
  | 'task_completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'other';

// ─── Entities ────────────────────────────────────────────────

export interface CrmContact {
  id: string;
  company: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  companyName?: string;
  position?: string;
  sector?: string;
  city?: string;
  status: ContactStatus;
  source: ContactSource;
  priority?: TaskPriority;
  assignedTo?: string;
  tags?: string[];
  estimatedValue?: number;
  linkedClientId?: string;
  mobileId?: number;
  legacyProspectId?: string;
  summary?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
  lastContactedAt?: string;
  convertedAt?: string;
  recentActivities?: CrmActivity[];
}

export interface CrmActivity {
  id: string;
  company: string;
  contactId: string;
  type: ActivityType;
  description: string;
  detail?: string;
  oldStatus?: ContactStatus;
  newStatus?: ContactStatus;
  createdAt: string;
  createdBy: string;
}

export interface CrmTask {
  id: string;
  company: string;
  contactId: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  completedAt?: string;
  assignedTo: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ─── API Responses ───────────────────────────────────────────

export interface CrmPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CrmPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: CrmPagination;
  message?: string;
}

export interface CrmSingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Stats ───────────────────────────────────────────────────

export interface CrmStats {
  total: number;
  byStatus: Record<ContactStatus, number>;
  conversionRate: number;
  totalPipelineValue: number;
  tasksDueToday: number;
  tasksOverdue: number;
  recentActivity: number;
}

// ─── Filters ─────────────────────────────────────────────────

export interface CrmContactFilters {
  status?: ContactStatus;
  source?: ContactSource;
  assignedTo?: string;
  priority?: TaskPriority;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Dropdown options (for UI) ───────────────────────────────

export const CONTACT_STATUS_OPTIONS: { label: string; value: ContactStatus }[] = [
  { label: 'Nuevo', value: 'new' },
  { label: 'Contactado', value: 'contacted' },
  { label: 'Calificado', value: 'qualified' },
  { label: 'Propuesta', value: 'proposal' },
  { label: 'Negociación', value: 'negotiation' },
  { label: 'Convertido', value: 'converted' },
  { label: 'Perdido', value: 'lost' },
];

export const CONTACT_SOURCE_OPTIONS: { label: string; value: ContactSource }[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'Formulario web', value: 'web_form' },
  { label: 'Referido', value: 'referral' },
  { label: 'Redes sociales', value: 'social_media' },
  { label: 'Teléfono', value: 'phone' },
  { label: 'Evento', value: 'event' },
  { label: 'CRM Móvil', value: 'crm_mobile' },
  { label: 'E-commerce', value: 'ecommerce' },
];

export const TASK_PRIORITY_OPTIONS: { label: string; value: TaskPriority }[] = [
  { label: 'Baja', value: 'low' },
  { label: 'Media', value: 'medium' },
  { label: 'Alta', value: 'high' },
  { label: 'Urgente', value: 'urgent' },
];

export const TASK_TYPE_OPTIONS: { label: string; value: TaskType }[] = [
  { label: 'Llamada', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Reunión', value: 'meeting' },
  { label: 'Seguimiento', value: 'follow_up' },
  { label: 'Otro', value: 'other' },
];

// ─── Severity Mapping (PrimeNG p-tag) ────────────────────────

export function getStatusSeverity(status: ContactStatus): string {
  const map: Record<ContactStatus, string> = {
    new: 'info',
    contacted: 'warning',
    qualified: 'success',
    proposal: 'info',
    negotiation: 'warning',
    converted: 'success',
    lost: 'danger',
  };
  return map[status] || 'info';
}

export function getStatusLabel(status: ContactStatus): string {
  const found = CONTACT_STATUS_OPTIONS.find(o => o.value === status);
  return found ? found.label : status;
}

export function getPrioritySeverity(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger',
  };
  return map[priority] || 'info';
}
