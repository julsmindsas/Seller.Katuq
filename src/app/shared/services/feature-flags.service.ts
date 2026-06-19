import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Feature Flags Service - Control de características para activación/desactivación segura
 * IMPORTANTE: Este servicio permite rollback inmediato sin afectar la operación del sistema
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureFlagsService {
  
  // Flags de características - Por defecto desactivadas para seguridad
  private static readonly FLAGS = {
    ENABLE_ADVANCED_NOTIFICATIONS: false,     // Sistema avanzado de notificaciones
    ENABLE_MARKETING_MODULE: false,           // Módulo de marketing
    ENABLE_WHATSAPP_INTEGRATION: false,       // Integración con WhatsApp Business API
    ENABLE_SMS_NOTIFICATIONS: false,          // Notificaciones SMS
    ENABLE_PUSH_NOTIFICATIONS: false,         // Push notifications del navegador
    ENABLE_NOTIFICATION_CENTER: false,        // Centro de notificaciones unificado
    ENABLE_NOTIFICATION_ANALYTICS: false,     // Analytics de notificaciones
    ENABLE_EMAIL_MARKETING: false,            // Campañas de email marketing
    ENABLE_CUSTOMER_SEGMENTATION: false,      // Segmentación de clientes
    ENABLE_CART_RECOVERY: false,              // Recuperación de carritos abandonados
    ENABLE_NOTIFICATION_QUEUE: false,         // Cola de procesamiento en background
    ENABLE_REALTIME_UPDATES: true,            // Actualizaciones en tiempo real (ya existe)
    ENABLE_ORDER_STATUS_NOTIFICATIONS: false, // Notificaciones de cambio de estado
    ENABLE_PAYMENT_NOTIFICATIONS: false,      // Notificaciones de pago
    ENABLE_PRODUCTION_NOTIFICATIONS: false,   // Notificaciones de producción
    ENABLE_DISPATCH_NOTIFICATIONS: false,     // Notificaciones de despacho
    ENABLE_DELIVERY_NOTIFICATIONS: false,     // Notificaciones de entrega
    ENABLE_CUSTOMER_METRICS: true,            // Spec 009 - métricas del cliente en su ficha
  };

  private flags$ = new BehaviorSubject<typeof FeatureFlagsService.FLAGS>(
    FeatureFlagsService.FLAGS
  );

  constructor() {
    // Cargar flags desde localStorage si existen (para testing)
    this.loadFlagsFromStorage();
    
    // En desarrollo, permitir modificación desde consola
    if (!this.isProduction()) {
      (window as any).featureFlags = this;
      console.log('🚀 Feature Flags disponibles en window.featureFlags');
    }
  }

  /**
   * Verifica si una característica está habilitada
   */
  isEnabled(flag: keyof typeof FeatureFlagsService.FLAGS): boolean {
    const currentFlags = this.flags$.getValue();
    return currentFlags[flag] || false;
  }

  /**
   * Observable para escuchar cambios en los flags
   */
  getFlags$(): Observable<typeof FeatureFlagsService.FLAGS> {
    return this.flags$.asObservable();
  }

  /**
   * Habilita una característica (solo en desarrollo/testing)
   */
  enable(flag: keyof typeof FeatureFlagsService.FLAGS): void {
    if (this.isProduction()) {
      console.warn('⚠️ No se pueden modificar flags en producción');
      return;
    }
    
    const currentFlags = this.flags$.getValue();
    const updatedFlags = { ...currentFlags, [flag]: true };
    this.flags$.next(updatedFlags);
    this.saveFlagsToStorage(updatedFlags);
    
    console.log(`✅ Feature habilitada: ${flag}`);
  }

  /**
   * Deshabilita una característica (rollback seguro)
   */
  disable(flag: keyof typeof FeatureFlagsService.FLAGS): void {
    const currentFlags = this.flags$.getValue();
    const updatedFlags = { ...currentFlags, [flag]: false };
    this.flags$.next(updatedFlags);
    this.saveFlagsToStorage(updatedFlags);
    
    console.log(`🔴 Feature deshabilitada: ${flag}`);
  }

  /**
   * Habilita múltiples características
   */
  enableMultiple(flags: Array<keyof typeof FeatureFlagsService.FLAGS>): void {
    if (this.isProduction()) {
      console.warn('⚠️ No se pueden modificar flags en producción');
      return;
    }
    
    const currentFlags = this.flags$.getValue();
    const updatedFlags = { ...currentFlags };
    
    flags.forEach(flag => {
      updatedFlags[flag] = true;
    });
    
    this.flags$.next(updatedFlags);
    this.saveFlagsToStorage(updatedFlags);
    
    console.log(`✅ Features habilitadas:`, flags);
  }

  /**
   * Deshabilita todas las características (emergency rollback)
   */
  disableAll(): void {
    const allDisabled = Object.keys(FeatureFlagsService.FLAGS).reduce((acc, key) => {
      acc[key as keyof typeof FeatureFlagsService.FLAGS] = false;
      return acc;
    }, {} as typeof FeatureFlagsService.FLAGS);
    
    // Mantener las características ya estables
    allDisabled.ENABLE_REALTIME_UPDATES = true;
    
    this.flags$.next(allDisabled);
    this.saveFlagsToStorage(allDisabled);
    
    console.log('🔴 TODAS las features experimentales deshabilitadas');
  }

  /**
   * Resetea a los valores por defecto
   */
  reset(): void {
    this.flags$.next(FeatureFlagsService.FLAGS);
    localStorage.removeItem('katuq_feature_flags');
    console.log('🔄 Feature flags reseteados a valores por defecto');
  }

  /**
   * Obtiene el estado actual de todos los flags
   */
  getCurrentFlags(): typeof FeatureFlagsService.FLAGS {
    return this.flags$.getValue();
  }

  /**
   * Lista features habilitadas
   */
  getEnabledFeatures(): string[] {
    const currentFlags = this.flags$.getValue();
    return Object.entries(currentFlags)
      .filter(([_, enabled]) => enabled)
      .map(([flag, _]) => flag);
  }

  /**
   * Verifica si estamos en producción
   */
  private isProduction(): boolean {
    // Puedes ajustar esta lógica según tu configuración
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('staging');
  }

  /**
   * Carga flags desde localStorage
   */
  private loadFlagsFromStorage(): void {
    try {
      const stored = localStorage.getItem('katuq_feature_flags');
      if (stored) {
        const parsedFlags = JSON.parse(stored);
        // Merge con defaults para nuevos flags
        const mergedFlags = { ...FeatureFlagsService.FLAGS, ...parsedFlags };
        this.flags$.next(mergedFlags);
      }
    } catch (error) {
      console.error('Error cargando feature flags:', error);
    }
  }

  /**
   * Guarda flags en localStorage
   */
  private saveFlagsToStorage(flags: typeof FeatureFlagsService.FLAGS): void {
    try {
      localStorage.setItem('katuq_feature_flags', JSON.stringify(flags));
    } catch (error) {
      console.error('Error guardando feature flags:', error);
    }
  }

  /**
   * Helper para uso en templates
   */
  get flags() {
    return this.flags$.getValue();
  }
}