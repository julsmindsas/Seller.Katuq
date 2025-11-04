import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SubscriptionService } from './subscription.service';
import { LimitCheckResult } from '../models/subscription.model';

/**
 * AI Limits Service
 *
 * Servicio para validación y control de límites de features de IA
 * Maneja chat, products, voice y video según el plan de suscripción
 */
@Injectable({
  providedIn: 'root'
})
export class AILimitsService {

  constructor(
    private subscriptionService: SubscriptionService
  ) {}

  /**
   * Verificar si puede usar feature de IA
   */
  checkAILimit(feature: 'voice' | 'video' | 'chat' | 'products'): Observable<LimitCheckResult> {
    return this.subscriptionService.usage$.pipe(
      map(usage => {
        if (!usage) {
          return {
            allowed: true,
            remaining: -1,
            limit: -1,
            resetTime: '',
            upgradeRequired: false
          };
        }

        const featureUsage = usage.ai[feature];

        // Si es premium (limit -1), permitir
        if (featureUsage.limit === -1) {
          return {
            allowed: true,
            remaining: -1,
            limit: -1,
            resetTime: '',
            upgradeRequired: false
          };
        }

        // Si es freemium, verificar límite
        const allowed = featureUsage.remaining > 0;

        return {
          allowed,
          remaining: featureUsage.remaining,
          limit: featureUsage.limit,
          resetTime: usage.resetTime,
          upgradeRequired: !allowed
        };
      })
    );
  }

  /**
   * Mostrar modal de upgrade cuando alcanza límite
   */
  showUpgradeModal(feature: string, message?: string): void {
    const featureNames: { [key: string]: string } = {
      voice: 'IA de Voz',
      video: 'IA de Video',
      chat: 'Chat IA',
      products: 'Generación de Productos IA',
      orders: 'Pedidos'
    };

    const featureName = featureNames[feature] || feature;
    const displayMessage = message || `Has alcanzado el límite de ${featureName}. Actualiza a Premium para uso ilimitado.`;

    // Por ahora usar alert, después se puede implementar un modal de PrimeNG
    console.warn(`[AI Limits] ${featureName} - Límite alcanzado`);

    // TODO: Implementar modal de PrimeNG más elegante
    // Por ahora, mostrar mensaje en consola y alert
    if (confirm(`${displayMessage}\n\n¿Deseas ver los planes disponibles?`)) {
      window.location.href = '/pricing';
    }
  }

  /**
   * Verificar límite específico de manera sincrónica
   */
  canUseAIFeature(feature: 'voice' | 'video' | 'chat' | 'products'): boolean {
    const subscription = this.subscriptionService.getSubscriptionSync();

    if (!subscription) return true;
    if (subscription.plan === 'premium') return true;

    // Para freemium, voz y video están bloqueadas (siempre 0 usos permitidos)
    if (feature === 'voice' || feature === 'video') {
      return false;
    }

    // Para chat y products, verificar si quedan usos disponibles
    const usage = this.subscriptionService.getUsageSync();
    if (!usage) return true; // Si no hay datos de uso, permitir (fail-open)

    const featureUsage = usage.ai[feature];

    // Si el límite es -1 (premium), permitir
    if (featureUsage.limit === -1) return true;

    // Si el límite es 0 (bloqueado), denegar
    if (featureUsage.limit === 0) return false;

    // Verificar si quedan usos disponibles
    return featureUsage.remaining > 0;
  }

  /**
   * Obtener mensaje de error para feature bloqueada
   */
  getBlockedFeatureMessage(feature: 'voice' | 'video' | 'chat' | 'products'): string {
    const messages: { [key: string]: string } = {
      voice: 'La IA de Voz no está disponible en el plan Freemium. Actualiza a Premium para acceder a esta feature.',
      video: 'La IA de Video no está disponible en el plan Freemium. Actualiza a Premium para acceder a esta feature.',
      chat: 'Has alcanzado el límite diario de mensajes de Chat IA en tu plan Freemium.',
      products: 'Has alcanzado el límite diario de generación de productos con IA en tu plan Freemium.'
    };

    return messages[feature] || 'Límite alcanzado para esta feature.';
  }

  /**
   * Verificar si debería mostrar warning de límite próximo
   */
  shouldShowLimitWarning(feature: 'voice' | 'video' | 'chat' | 'products'): boolean {
    const usage = this.subscriptionService.getUsageSync();
    if (!usage) return false;

    const featureUsage = usage.ai[feature];
    if (featureUsage.limit === -1) return false; // Premium

    // Mostrar warning cuando queda menos del 20% o menos de 3 usos
    const percentageRemaining = (featureUsage.remaining / featureUsage.limit) * 100;
    return percentageRemaining < 20 || featureUsage.remaining <= 3;
  }

  /**
   * Obtener mensaje de warning para límite próximo
   */
  getLimitWarningMessage(feature: 'voice' | 'video' | 'chat' | 'products'): string {
    const usage = this.subscriptionService.getUsageSync();
    if (!usage) return '';

    const featureUsage = usage.ai[feature];
    const featureNames: { [key: string]: string } = {
      voice: 'IA de Voz',
      video: 'IA de Video',
      chat: 'Chat IA',
      products: 'Generación de Productos IA'
    };

    return `Te quedan ${featureUsage.remaining} de ${featureUsage.limit} usos de ${featureNames[feature]}. Actualiza a Premium para uso ilimitado.`;
  }
}
