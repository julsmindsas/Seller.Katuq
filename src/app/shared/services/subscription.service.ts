import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  SubscriptionPlan,
  SubscriptionUsage,
  SubscriptionStatusResponse,
  UsageStatsResponse,
  UpgradeResponse,
  PaymentLinkRequest,
  PaymentLinkResponse,
  IsFirstTimeResponse,
  WidgetSignatureResponse,
  SubscriptionRecordResponse
} from '../models/subscription.model';
import { environment } from '../../../environments/environment';

/**
 * Subscription Service
 *
 * Servicio principal para gestión de suscripciones en Katuq Seller
 * Maneja planes, límites, estadísticas de uso y upgrades
 */
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private baseUrl = `${environment.urlApi}/v1/subscriptions`;

  private subscriptionSubject = new BehaviorSubject<SubscriptionPlan | null>(null);
  public subscription$ = this.subscriptionSubject.asObservable();

  private usageSubject = new BehaviorSubject<SubscriptionUsage | null>(null);
  public usage$ = this.usageSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSubscriptionStatus().subscribe();
    this.getUsageStats().subscribe();
  }

  /**
   * Cargar estado de suscripción desde backend
   */
  loadSubscriptionStatus(): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionStatusResponse>(`${this.baseUrl}/status`).pipe(
      map(response => response.subscription),
      tap(subscription => {
        this.subscriptionSubject.next(subscription);
        // Guardar en localStorage para acceso rápido
        localStorage.setItem('katuq_subscription', JSON.stringify(subscription));
      }),
      catchError(error => {
        console.error('Error loading subscription status:', error);
        // Intentar cargar desde localStorage
        const cached = this.getSubscriptionSync();
        if (cached) {
          this.subscriptionSubject.next(cached);
        }
        throw error;
      })
    );
  }

  /**
   * Obtener estadísticas de uso
   */
  getUsageStats(): Observable<SubscriptionUsage> {
    return this.http.get<UsageStatsResponse>(`${this.baseUrl}/usage`).pipe(
      map(response => {
        const usage = response.usage;
        // Calcular remaining
        return {
          orders: {
            current: usage.orders.current || 0,
            limit: usage.orders.limit,
            remaining: usage.orders.limit === -1 ? -1 : (usage.orders.limit - (usage.orders.current || 0)),
            resetDate: usage.orders.resetDate
          },
          ai: {
            chat: {
              used: usage.ai.chat?.used || 0,
              limit: usage.ai.chat?.limit || 10,
              remaining: usage.ai.chat?.remaining || 10
            },
            products: {
              used: usage.ai.products?.used || 0,
              limit: usage.ai.products?.limit || 10,
              remaining: usage.ai.products?.remaining || 10
            },
            voice: {
              used: usage.ai.voice?.used || 0,
              limit: usage.ai.voice?.limit || 0,
              remaining: usage.ai.voice?.remaining || 0
            },
            video: {
              used: usage.ai.video?.used || 0,
              limit: usage.ai.video?.limit || 0,
              remaining: usage.ai.video?.remaining || 0
            }
          },
          resetTime: usage.resetTime || 'mañana'
        };
      }),
      tap(usage => {
        this.usageSubject.next(usage);
        // Guardar en localStorage para acceso rápido
        localStorage.setItem('katuq_usage', JSON.stringify(usage));
      }),
      catchError(error => {
        console.error('Error loading usage stats:', error);
        // Intentar cargar desde localStorage
        const cached = localStorage.getItem('katuq_usage');
        if (cached) {
          const usage = JSON.parse(cached);
          this.usageSubject.next(usage);
        }
        throw error;
      })
    );
  }

  /**
   * Verificar si puede usar una feature
   */
  canUseFeature(feature: string): boolean {
    const subscription = this.subscriptionSubject.value;
    if (!subscription) return true; // Por defecto permitir

    if (subscription.plan === 'premium') return true;

    // Verificar features bloqueadas para freemium
    const blockedFeatures = ['production', 'integrations', 'dropshipping', 'multiple-warehouses'];
    return !blockedFeatures.includes(feature);
  }

  /**
   * Verificar si es plan premium
   */
  isPremium(): boolean {
    const subscription = this.subscriptionSubject.value;
    return subscription?.plan === 'premium';
  }

  /**
   * Verificar si es plan freemium
   */
  isFreemium(): boolean {
    const subscription = this.subscriptionSubject.value;
    return subscription?.plan === 'freemium';
  }

  /**
   * Obtener plan actual
   */
  getCurrentPlan(): 'freemium' | 'premium' | null {
    const subscription = this.subscriptionSubject.value;
    return subscription?.plan || null;
  }

  /**
   * Obtener pedidos restantes del mes
   */
  getRemainingOrders(): number {
    const subscription = this.subscriptionSubject.value;
    if (!subscription) return -1;

    if (subscription.plan === 'premium') return -1; // Ilimitado

    const limit = subscription.limits.orders.monthly;
    const current = subscription.limits.orders.current;
    return Math.max(0, limit - current);
  }

  /**
   * Cambiar plan (upgrade/downgrade)
   */
  upgradePlan(newPlan: 'premium' | 'freemium'): Observable<UpgradeResponse> {
    return this.http.post<UpgradeResponse>(`${this.baseUrl}/upgrade`, { plan: newPlan }).pipe(
      tap(response => {
        if (response.success) {
          this.loadSubscriptionStatus().subscribe();
          this.getUsageStats().subscribe();
        }
      })
    );
  }

  /**
   * Obtener suscripción desde localStorage (sync)
   */
  getSubscriptionSync(): SubscriptionPlan | null {
    const stored = localStorage.getItem('katuq_subscription');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Obtener uso desde localStorage (sync)
   */
  getUsageSync(): SubscriptionUsage | null {
    const stored = localStorage.getItem('katuq_usage');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Refrescar datos de suscripción y uso
   */
  refresh(): void {
    this.loadSubscriptionStatus().subscribe();
    this.getUsageStats().subscribe();
  }

  /**
   * Crear enlace de pago para actualizar a Premium
   */
  createPaymentLink(
    plan: 'premium' | 'freemium',
    billingPeriod: 'monthly' | 'quarterly' | 'yearly',
    customerEmail?: string
  ): Observable<PaymentLinkResponse> {
    const request: PaymentLinkRequest = {
      plan,
      billingPeriod,
      customerEmail
    };

    return this.http.post<PaymentLinkResponse>(
      `${this.baseUrl}/create-payment-link`,
      request
    ).pipe(
      tap(response => {
        console.log('Payment link created:', response);
      }),
      catchError(error => {
        console.error('Error creating payment link:', error);
        throw error;
      })
    );
  }

  /**
   * Verificar si es primera vez que el usuario compra Premium
   * Usado para decidir entre Widget Embebido vs Payment Link
   */
  isFirstTimeUser(): Observable<IsFirstTimeResponse> {
    return this.http.get<IsFirstTimeResponse>(`${this.baseUrl}/is-first-time`).pipe(
      tap(response => {
        console.log('Is first time user check:', response);
      }),
      catchError(error => {
        console.error('Error checking first-time user:', error);
        // En caso de error, asumir que no es primera vez (usar payment link)
        return [{
          success: false,
          isFirstTime: false,
          currentPlan: 'freemium' as 'freemium' | 'premium'
        }];
      })
    );
  }

  /**
   * Generar firma SHA256 para widget de Wompi
   * Calcula el hash en el backend de forma segura
   */
  generateWidgetSignature(reference: string, amountInCents: number, currency: string): Observable<WidgetSignatureResponse> {
    return this.http.post<WidgetSignatureResponse>(`${this.baseUrl}/generate-widget-signature`, {
      reference,
      amountInCents,
      currency
    }).pipe(
      tap(response => {
        console.log('✅ Firma generada desde backend:', response.signature.substring(0, 20) + '...');
        console.log('   Ambiente:', response.environment);
      }),
      catchError(error => {
        console.error('❌ Error generando firma:', error);
        throw error;
      })
    );
  }

  /**
   * Crear registro de suscripción en Firestore para uso con Widget Embebido
   * Este método debe llamarse ANTES de abrir el widget para obtener el subscriptionId
   * que se usará como reference en el widget
   */
  createSubscriptionRecord(
    plan: 'premium' | 'freemium',
    billingPeriod: 'monthly' | 'quarterly' | 'yearly',
    customerEmail?: string
  ): Observable<SubscriptionRecordResponse> {
    return this.http.post<SubscriptionRecordResponse>(`${this.baseUrl}/create-subscription-record`, {
      plan,
      billingPeriod,
      customerEmail
    }).pipe(
      tap(response => {
        console.log('📝 Registro de suscripción creado:', response.subscriptionId);
        console.log('   Plan:', response.plan);
        console.log('   Período:', response.billingPeriod);
        console.log('   Monto:', response.amount, 'COP');
      }),
      catchError(error => {
        console.error('❌ Error creando registro de suscripción:', error);
        throw error;
      })
    );
  }
}
