// ─── Types ────────────────────────────────────────────────────

export type CrmEntityType = 'company' | 'client' | 'corporate';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Pipeline stages por contexto (vienen del backend via GET /stages)
export type CompanyStage = 'registro' | 'contactado' | 'demo' | 'trial' | 'activo' | 'premium' | 'churned';
export type ClientStage = 'nuevo' | 'contactado' | 'calificado' | 'propuesta' | 'negociacion' | 'convertido' | 'perdido';

// Etapa personalizable del pipeline (CLIENT/CORPORATE). `key` es estable e
// inmutable (se guarda en CrmLead.stage); `label` es lo que el comercio edita.
export interface CrmStage {
  key: string;
  label: string;
  color?: string;
  isWon?: boolean;
  isLost?: boolean;
  active?: boolean;
}

export type ActivityType = 'note' | 'call' | 'email' | 'whatsapp' | 'meeting' | 'stage_change' | 'task_created' | 'task_completed';
export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// ─── Entities ─────────────────────────────────────────────────

export interface CrmLead {
  id: string;
  entityType: CrmEntityType;
  name: string;
  email?: string;
  phone?: string;
  nit?: string;
  city?: string;
  etiquetas?: string[];
  activo?: boolean;
  // Company-specific
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  logo?: string;
  // CRM pipeline
  stage: string;
  assignedTo?: string;
  priority?: Priority;
  estimatedValue?: number;
  source?: string;
  lastContactedAt?: string;
  // Verificación de compra al cerrar (isWon)
  verifiedBuyer?: boolean;
  verifiedAt?: string;
  verifiedOrderId?: string;
  // Cierre forzado sin compra verificada (override manual)
  forcedClose?: boolean;
  forcedReason?: string;
  forcedBy?: string;
  forcedAt?: string;
}

export interface CrmActivity {
  id: string;
  entityId: string;
  type: ActivityType;
  description: string;
  detail?: string;
  oldStage?: string;
  newStage?: string;
  createdAt: string;
  createdBy: string;
}

export interface CrmTask {
  id: string;
  entityId: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  assignedTo: string;
  completedAt?: string;
  createdAt: string;
  createdBy: string;
  lastReviewedAt?: string;
}

export interface CrmStats {
  total: number;
  byStage: Record<string, number>;
  totalValue: number;
  tasksOverdue: number;
  tasksDueToday: number;
  tasksPending: number;
  // Indicadores de gestión (opcionales — backend extendido)
  tasksDue7d?: number;
  citasEstaSemana?: number;
  nuevos7d?: number;
  nuevos30d?: number;
  leadsEstancados?: number;
  convertidos?: number;
  perdidos?: number;
  conversionRate?: number;
  perdidaRate?: number;
}

// ─── API Responses ────────────────────────────────────────────

export interface CrmPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── UI Helpers ───────────────────────────────────────────────

export function getStageSeverity(stage: string): string {
  const map: Record<string, string> = {
    // Company stages
    registro: 'info', contactado: 'warning', demo: 'info',
    trial: 'warning', activo: 'success', premium: 'success', churned: 'danger',
    // Client stages
    nuevo: 'info', calificado: 'success', propuesta: 'info',
    negociacion: 'warning', convertido: 'success', perdido: 'danger',
  };
  return map[stage] || 'info';
}

export function getPrioritySeverity(priority: string): string {
  const map: Record<string, string> = { low: 'info', medium: 'warning', high: 'danger', urgent: 'danger' };
  return map[priority] || 'info';
}

export const ACTIVITY_TYPE_OPTIONS = [
  { label: 'Nota', value: 'note', icon: 'pi pi-pencil' },
  { label: 'Llamada', value: 'call', icon: 'pi pi-phone' },
  { label: 'Email', value: 'email', icon: 'pi pi-envelope' },
  { label: 'WhatsApp', value: 'whatsapp', icon: 'pi pi-comments' },
  { label: 'Reunión', value: 'meeting', icon: 'pi pi-users' },
];

export const TASK_TYPE_OPTIONS = [
  { label: 'Llamada', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Reunión', value: 'meeting' },
  { label: 'Seguimiento', value: 'follow_up' },
  { label: 'Otro', value: 'other' },
];

export const PRIORITY_OPTIONS = [
  { label: 'Baja', value: 'low' },
  { label: 'Media', value: 'medium' },
  { label: 'Alta', value: 'high' },
  { label: 'Urgente', value: 'urgent' },
];
