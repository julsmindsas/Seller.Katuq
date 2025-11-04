/**
 * Modelos para el sistema de Onboarding de Seller Center Katuq
 * Define la estructura completa del estado y progreso del onboarding
 */

/**
 * Estados posibles de un paso del onboarding
 */
export enum OnboardingStepStatus {
  PENDING = 'pending',           // No iniciado
  IN_PROGRESS = 'in-progress',   // En progreso
  COMPLETED = 'completed',       // Completado
  SKIPPED = 'skipped'            // Omitido (solo pasos opcionales)
}

/**
 * Identificadores únicos para cada paso del onboarding
 */
export enum OnboardingStepId {
  COMPANY_INFO = 'company-info',
  ROLES_SETUP = 'roles-setup',
  USERS_SETUP = 'users-setup',
  DELIVERY_METHODS = 'delivery-methods',
  DELIVERY_TYPES = 'delivery-types',
  DELIVERY_TIMES = 'delivery-times',
  PAYMENT_METHODS = 'payment-methods',
  BILLING_ZONES = 'billing-zones',
  CATEGORIES = 'categories',
  ADDONS = 'addons',
  WAREHOUSES = 'warehouses',
  FIRST_PRODUCT = 'first-product',
  IMPORT_CUSTOMERS = 'import-customers',
  IMPORT_PRODUCTS = 'import-products',
  SEQUENCES = 'sequences'
}

/**
 * Interfaz para un paso individual del onboarding
 */
export interface OnboardingStep {
  id: OnboardingStepId;
  number: number;                  // Número del paso (1-15)
  title: string;                   // Título del paso
  description: string;             // Descripción del paso
  icon: string;                    // Icono PrimeNG
  status: OnboardingStepStatus;    // Estado actual
  isRequired: boolean;             // Si es obligatorio
  hasAISuggestion: boolean;        // Si tiene sugerencias de IA
  estimatedTime: number;           // Tiempo estimado en minutos
  data?: any;                      // Datos guardados del paso
  completedAt?: Date;              // Fecha de completado
  validationRules?: any;           // Reglas de validación
}

/**
 * Interfaz para el estado completo del onboarding
 */
export interface OnboardingState {
  userId: string;                  // ID del usuario
  userEmail: string;               // Email del usuario
  companyId?: string;              // ID de la empresa (se crea en paso 1)
  companyName?: string;            // Nombre de la empresa
  steps: Map<OnboardingStepId, OnboardingStep>;  // Mapa de todos los pasos
  currentStepId: OnboardingStepId; // Paso actual
  isCompleted: boolean;            // Si todo el onboarding está completado
  postponedAt?: Date;              // Fecha de pospuesto
  startedAt: Date;                 // Fecha de inicio
  completedAt?: Date;              // Fecha de completado total
  lastUpdated: Date;               // Última actualización
  progressPercentage: number;      // Porcentaje de completado (0-100)
  totalSteps: number;              // Total de pasos (15)
  completedSteps: number;          // Pasos completados
}

/**
 * Interfaz para sugerencias de IA
 */
export interface AISuggestion {
  stepId: OnboardingStepId;
  suggestedData: any;
  confidence: number;              // Confianza de la sugerencia (0-1)
  reasoning?: string;              // Explicación de por qué se sugiere
  appliedAt?: Date;                // Fecha de aplicación
}

/**
 * Interfaz para el contexto del comercio (del diagnóstico)
 */
export interface CommerceContext {
  sector: string;                  // Sector del negocio
  digitalizationLevel: string;     // Nivel de digitalización
  catalogSize: string;             // Tamaño del catálogo
  salesChannel: string;            // Canal de ventas
  inventoryManagement: string;     // Manejo de inventario
  mainGoal: string;                // Objetivo principal
  mainObstacle: string;            // Obstáculo principal
}

/**
 * Interfaz para progreso guardado en backend
 */
export interface OnboardingProgress {
  email: string;
  onboardingCompleted: boolean;
  currentStepId: string;
  steps: { [key: string]: any };
  postponedAt?: string;
  lastUpdated: string;
  progressPercentage: number;
}

/**
 * Configuración inicial de los 15 pasos del onboarding
 */
export const ONBOARDING_STEPS_CONFIG: Partial<OnboardingStep>[] = [
  {
    id: OnboardingStepId.COMPANY_INFO,
    number: 1,
    title: 'Información de Empresa',
    description: 'Completa los datos básicos de tu negocio',
    icon: 'pi-building',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 5
  },
  {
    id: OnboardingStepId.ROLES_SETUP,
    number: 2,
    title: 'Roles y Permisos',
    description: 'Configura los roles de usuario para tu equipo',
    icon: 'pi-shield',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 3
  },
  {
    id: OnboardingStepId.USERS_SETUP,
    number: 3,
    title: 'Usuarios',
    description: 'Crea el usuario administrador inicial',
    icon: 'pi-users',
    isRequired: true,
    hasAISuggestion: false,
    estimatedTime: 2
  },
  {
    id: OnboardingStepId.DELIVERY_METHODS,
    number: 4,
    title: 'Formas de Entrega',
    description: 'Define cómo entregarás los productos a tus clientes',
    icon: 'pi-truck',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 4
  },
  {
    id: OnboardingStepId.DELIVERY_TYPES,
    number: 5,
    title: 'Tipos de Entrega',
    description: 'Configura los tipos de entrega (normal, express, etc.)',
    icon: 'pi-box',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 3
  },
  {
    id: OnboardingStepId.DELIVERY_TIMES,
    number: 6,
    title: 'Tiempos de Entrega',
    description: 'Establece los tiempos de entrega para cada tipo',
    icon: 'pi-clock',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 3
  },
  {
    id: OnboardingStepId.PAYMENT_METHODS,
    number: 7,
    title: 'Formas de Pago',
    description: 'Configura los métodos de pago que aceptarás',
    icon: 'pi-credit-card',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 4
  },
  {
    id: OnboardingStepId.BILLING_ZONES,
    number: 8,
    title: 'Zonas de Cobro',
    description: 'Define las zonas geográficas y sus tarifas de envío',
    icon: 'pi-map-marker',
    isRequired: true,
    hasAISuggestion: false,
    estimatedTime: 5
  },
  {
    id: OnboardingStepId.CATEGORIES,
    number: 9,
    title: 'Categorías de Productos',
    description: 'Organiza tu catálogo con categorías',
    icon: 'pi-tags',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 4
  },
  {
    id: OnboardingStepId.ADDONS,
    number: 10,
    title: 'Adiciones (Opcional)',
    description: 'Añade productos complementarios o extras',
    icon: 'pi-plus-circle',
    isRequired: false,
    hasAISuggestion: true,
    estimatedTime: 3
  },
  {
    id: OnboardingStepId.WAREHOUSES,
    number: 11,
    title: 'Bodegas e Inventarios',
    description: 'Configura tus bodegas y canales de venta',
    icon: 'pi-home',
    isRequired: true,
    hasAISuggestion: false,
    estimatedTime: 5
  },
  {
    id: OnboardingStepId.FIRST_PRODUCT,
    number: 12,
    title: 'Primer Producto',
    description: 'Crea tu primer producto o usa uno de demostración',
    icon: 'pi-shopping-bag',
    isRequired: true,
    hasAISuggestion: true,
    estimatedTime: 6
  },
  {
    id: OnboardingStepId.IMPORT_CUSTOMERS,
    number: 13,
    title: 'Importar Clientes (Opcional)',
    description: 'Importa tus clientes desde un archivo Excel o JSON',
    icon: 'pi-users',
    isRequired: false,
    hasAISuggestion: false,
    estimatedTime: 3
  },
  {
    id: OnboardingStepId.IMPORT_PRODUCTS,
    number: 14,
    title: 'Importar Productos (Opcional)',
    description: 'Importa tu catálogo de productos desde un archivo Excel o JSON',
    icon: 'pi-upload',
    isRequired: false,
    hasAISuggestion: false,
    estimatedTime: 5
  },
  {
    id: OnboardingStepId.SEQUENCES,
    number: 15,
    title: 'Consecutivos',
    description: 'Configura los consecutivos de numeración para pedidos web y POS',
    icon: 'pi-list-check',
    isRequired: true,
    hasAISuggestion: false,
    estimatedTime: 1
  }
];

/**
 * Función helper para inicializar el estado del onboarding
 */
export function initializeOnboardingState(userEmail: string, userId: string): OnboardingState {
  const stepsMap = new Map<OnboardingStepId, OnboardingStep>();

  ONBOARDING_STEPS_CONFIG.forEach(config => {
    stepsMap.set(config.id!, {
      ...config,
      status: OnboardingStepStatus.PENDING,
      data: null,
      completedAt: undefined
    } as OnboardingStep);
  });

  return {
    userId,
    userEmail,
    steps: stepsMap,
    currentStepId: OnboardingStepId.COMPANY_INFO,
    isCompleted: false,
    startedAt: new Date(),
    lastUpdated: new Date(),
    progressPercentage: 0,
    totalSteps: ONBOARDING_STEPS_CONFIG.length,
    completedSteps: 0
  };
}

/**
 * Función helper para calcular el progreso
 */
export function calculateProgress(state: OnboardingState): number {
  const completed = Array.from(state.steps.values()).filter(
    step => step.status === OnboardingStepStatus.COMPLETED || step.status === OnboardingStepStatus.SKIPPED
  ).length;

  return Math.round((completed / state.totalSteps) * 100);
}

/**
 * Función helper para verificar si un paso está disponible
 */
export function isStepAvailable(state: OnboardingState, stepId: OnboardingStepId): boolean {
  const step = state.steps.get(stepId);
  if (!step) return false;

  // El primer paso siempre está disponible
  if (step.number === 1) return true;

  // Los demás pasos están disponibles si el anterior está completado
  const previousStepNumber = step.number - 1;
  const previousStep = Array.from(state.steps.values()).find(s => s.number === previousStepNumber);

  return previousStep?.status === OnboardingStepStatus.COMPLETED ||
         previousStep?.status === OnboardingStepStatus.SKIPPED;
}

/**
 * Función helper para obtener el siguiente paso disponible
 */
export function getNextAvailableStep(state: OnboardingState): OnboardingStepId | null {
  const sortedSteps = Array.from(state.steps.values()).sort((a, b) => a.number - b.number);

  const nextStep = sortedSteps.find(step =>
    step.status === OnboardingStepStatus.PENDING ||
    step.status === OnboardingStepStatus.IN_PROGRESS
  );

  return nextStep?.id || null;
}
