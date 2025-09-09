import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { FeatureFlagsService } from '../../../shared/services/feature-flags.service';

/**
 * Marketing Service
 * Servicio principal del módulo de marketing
 * Completamente independiente del sistema operativo
 */
@Injectable()
export class MarketingService {
  
  private baseUrl = '/api/v1/marketing';
  
  // Estado del módulo
  private moduleEnabled$ = new BehaviorSubject<boolean>(false);
  
  // Métricas generales
  private marketingMetrics$ = new BehaviorSubject<MarketingMetrics | null>(null);
  
  constructor(
    private http: HttpClient,
    private featureFlags: FeatureFlagsService
  ) {
    this.checkModuleStatus();
  }
  
  /**
   * Verifica si el módulo de marketing está habilitado
   */
  private checkModuleStatus(): void {
    const enabled = this.featureFlags.isEnabled('ENABLE_MARKETING_MODULE');
    this.moduleEnabled$.next(enabled);
    
    if (!enabled) {
      console.log('⚠️ Módulo de Marketing deshabilitado por feature flag');
    }
  }
  
  /**
   * Obtiene el estado del módulo
   */
  isModuleEnabled(): Observable<boolean> {
    return this.moduleEnabled$.asObservable();
  }
  
  /**
   * Obtiene métricas generales de marketing
   */
  getMarketingMetrics(): Observable<MarketingMetrics> {
    if (!this.moduleEnabled$.getValue()) {
      return of(this.getEmptyMetrics());
    }
    
    return this.http.get<MarketingMetrics>(`${this.baseUrl}/metrics`).pipe(
      tap(metrics => this.marketingMetrics$.next(metrics)),
      catchError(error => {
        console.error('Error obteniendo métricas:', error);
        return of(this.getEmptyMetrics());
      })
    );
  }
  
  /**
   * Obtiene eventos de marketing trackeable
   */
  getMarketingEvents(): Observable<MarketingEvent[]> {
    return this.http.get<MarketingEvent[]>(`${this.baseUrl}/events`).pipe(
      catchError(error => {
        console.error('Error obteniendo eventos:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Registra un evento de marketing
   */
  trackEvent(event: MarketingEvent): Observable<any> {
    if (!this.moduleEnabled$.getValue()) {
      console.log('Evento no registrado - módulo deshabilitado');
      return of({ success: false });
    }
    
    // Procesar en background sin afectar operaciones
    setTimeout(() => {
      this.http.post(`${this.baseUrl}/events/track`, event).subscribe({
        next: () => console.log(`📊 Evento registrado: ${event.type}`),
        error: (error) => console.error('Error registrando evento:', error)
      });
    }, 0);
    
    return of({ success: true });
  }
  
  /**
   * Obtiene configuración del módulo
   */
  getConfiguration(): Observable<MarketingConfig> {
    return this.http.get<MarketingConfig>(`${this.baseUrl}/config`).pipe(
      catchError(error => {
        console.error('Error obteniendo configuración:', error);
        return of(this.getDefaultConfig());
      })
    );
  }
  
  /**
   * Actualiza configuración del módulo
   */
  updateConfiguration(config: Partial<MarketingConfig>): Observable<any> {
    return this.http.put(`${this.baseUrl}/config`, config);
  }
  
  /**
   * Métricas vacías por defecto
   */
  private getEmptyMetrics(): MarketingMetrics {
    return {
      campaigns: {
        active: 0,
        scheduled: 0,
        completed: 0,
        draft: 0
      },
      customers: {
        total: 0,
        active: 0,
        segments: 0,
        avgLifetimeValue: 0
      },
      performance: {
        emailOpenRate: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        roi: 0
      },
      cartRecovery: {
        abandoned: 0,
        recovered: 0,
        recoveryRate: 0,
        revenue: 0
      }
    };
  }
  
  /**
   * Configuración por defecto
   */
  private getDefaultConfig(): MarketingConfig {
    return {
      enabled: false,
      channels: {
        email: false,
        whatsapp: false,
        sms: false,
        push: false
      },
      automation: {
        cartRecovery: false,
        welcomeSeries: false,
        winBack: false,
        postPurchase: false
      },
      limits: {
        maxEmailsPerDay: 1000,
        maxCampaignsPerMonth: 10,
        maxSegments: 20
      }
    };
  }
}

// Interfaces
export interface MarketingMetrics {
  campaigns: {
    active: number;
    scheduled: number;
    completed: number;
    draft: number;
  };
  customers: {
    total: number;
    active: number;
    segments: number;
    avgLifetimeValue: number;
  };
  performance: {
    emailOpenRate: number;
    clickThroughRate: number;
    conversionRate: number;
    roi: number;
  };
  cartRecovery: {
    abandoned: number;
    recovered: number;
    recoveryRate: number;
    revenue: number;
  };
}

export interface MarketingEvent {
  type: MarketingEventType;
  customerId?: string;
  orderId?: string;
  data?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum MarketingEventType {
  // Comportamiento de Compra
  FIRST_PURCHASE = 'FIRST_PURCHASE',
  REPEAT_PURCHASE = 'REPEAT_PURCHASE',
  HIGH_VALUE_PURCHASE = 'HIGH_VALUE_PURCHASE',
  
  // Carritos
  CART_CREATED = 'CART_CREATED',
  CART_UPDATED = 'CART_UPDATED',
  CART_ABANDONED = 'CART_ABANDONED',
  CART_RECOVERED = 'CART_RECOVERED',
  
  // Engagement
  EMAIL_OPENED = 'EMAIL_OPENED',
  EMAIL_CLICKED = 'EMAIL_CLICKED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  
  // Ciclo de Vida
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_REACTIVATED = 'CUSTOMER_REACTIVATED',
  CUSTOMER_CHURNED = 'CUSTOMER_CHURNED'
}

export interface MarketingConfig {
  enabled: boolean;
  channels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    push: boolean;
  };
  automation: {
    cartRecovery: boolean;
    welcomeSeries: boolean;
    winBack: boolean;
    postPurchase: boolean;
  };
  limits: {
    maxEmailsPerDay: number;
    maxCampaignsPerMonth: number;
    maxSegments: number;
  };
}