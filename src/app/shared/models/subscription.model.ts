/**
 * Subscription Model
 *
 * Modelos de TypeScript para el sistema de suscripciones de Katuq
 * Incluye planes, límites de uso, estadísticas y resultados de validación
 */

export interface SubscriptionPlan {
  plan: 'freemium' | 'premium';
  status: 'active' | 'trial' | 'suspended';
  startDate?: string | null;  // Fecha de inicio de la suscripción (primer pago)
  billingPeriod?: 'monthly' | 'quarterly' | 'yearly' | null;  // Período de facturación
  nextBillingDate?: string | null;  // Fecha del próximo cobro (crítico para renovaciones)
  lastPaymentDate?: string | null;  // Fecha del último pago realizado
  lastPaymentAmount?: number | null;  // Monto del último pago
  subscriptionId?: string | null;  // ID del documento de suscripción en Firestore
  premiumUntil?: string | null;  // Fecha de corte del premium promocional (campañas de pauta)
  premiumOrigen?: 'promocion' | 'promocion_vencida' | 'pago' | null;  // Un premium pagado no trae premiumUntil
  premiumCodigo?: string | null;  // Código de la campaña con la que entró
  limits: {
    orders: {
      monthly: number;  // -1 = ilimitado
      current: number;
      resetDate: Date;
    };
    ai: {
      chatMessagesPerDay: number;
      productGenerationsPerDay: number;
      voiceMinutesPerMonth: number;
      videoMinutesPerMonth: number;
    };
  };
}

export interface SubscriptionUsage {
  orders: {
    current: number;
    limit: number;
    remaining: number;
    resetDate: Date;
  };
  ai: {
    chat: {
      used: number;
      limit: number;
      remaining: number;
    };
    products: {
      used: number;
      limit: number;
      remaining: number;
    };
    voice: {
      used: number;
      limit: number;
      remaining: number;
    };
    video: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
  resetTime: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: string;
  upgradeRequired: boolean;
}

export interface SubscriptionStatusResponse {
  subscription: SubscriptionPlan;
}

export interface UsageStatsResponse {
  usage: SubscriptionUsage;
}

export interface UpgradeResponse {
  success: boolean;
  message: string;
  subscription: SubscriptionPlan;
}

export interface PaymentLinkRequest {
  plan: 'premium' | 'freemium';
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  customerEmail?: string;
}

export interface PaymentLinkResponse {
  success: boolean;
  subscriptionId: string;
  paymentLink: string;
  paymentLinkId: string;
  amount: number;
  plan: 'premium' | 'freemium';
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: string;
  message: string;
}

export interface IsFirstTimeResponse {
  success: boolean;
  isFirstTime: boolean;
  currentPlan: 'freemium' | 'premium';
}

export interface WidgetSignatureResponse {
  success: boolean;
  signature: string;
  environment: 'production' | 'sandbox';
}

export interface SubscriptionRecordResponse {
  success: boolean;
  subscriptionId: string;
  amount: number;
  amountInCents: number;
  plan: 'premium' | 'freemium';
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: string;
  message: string;
}
