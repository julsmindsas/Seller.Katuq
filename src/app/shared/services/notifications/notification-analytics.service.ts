import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FeatureFlagsService } from '../feature-flags.service';
import { NotificationManagerService } from './notification-manager.service';
import { 
  KatuqNotification, 
  NotificationType, 
  NotificationStatus,
  NotificationChannel,
  NotificationStats
} from './notification.types';

/**
 * Notification Analytics Service
 * Servicio de tracking y analytics para notificaciones
 * Opera de forma completamente no invasiva
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationAnalyticsService {
  
  // Métricas en tiempo real
  private metrics$ = new BehaviorSubject<NotificationMetrics>(this.getEmptyMetrics());
  
  // Historial de eventos
  private eventHistory: NotificationAnalyticsEvent[] = [];
  private maxHistorySize = 1000;
  
  // Cache de estadísticas
  private statsCache = new Map<string, CachedStats>();
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutos
  
  constructor(
    private featureFlags: FeatureFlagsService,
    private notificationManager: NotificationManagerService
  ) {
    this.initialize();
  }
  
  /**
   * Inicializa el servicio de analytics
   */
  private initialize(): void {
    // Solo activar si el flag está habilitado
    if (!this.featureFlags.isEnabled('ENABLE_NOTIFICATION_ANALYTICS')) {
      console.log('📊 Analytics de notificaciones deshabilitado');
      return;
    }
    
    console.log('📊 Inicializando Analytics de Notificaciones...');
    
    // Escuchar eventos de notificación
    this.subscribeToNotificationEvents();
    
    // Actualizar métricas cada minuto
    interval(60000).subscribe(() => {
      this.updateMetrics();
    });
    
    // Limpiar cache cada 10 minutos
    interval(600000).subscribe(() => {
      this.cleanupCache();
    });
  }
  
  /**
   * Suscribe a eventos de notificación para tracking
   */
  private subscribeToNotificationEvents(): void {
    // Escuchar nuevas notificaciones
    this.notificationManager.events$.pipe(
      filter(() => this.featureFlags.isEnabled('ENABLE_NOTIFICATION_ANALYTICS'))
    ).subscribe(event => {
      this.trackNotificationEvent({
        type: 'NOTIFICATION_TRIGGERED',
        notificationType: event.type,
        channel: event.channels?.[0] || NotificationChannel.IN_APP,
        timestamp: new Date(),
        metadata: event.metadata
      });
    });
    
    // Escuchar cambios en notificaciones
    this.notificationManager.notifications$.pipe(
      filter(() => this.featureFlags.isEnabled('ENABLE_NOTIFICATION_ANALYTICS'))
    ).subscribe(notifications => {
      this.processNotificationChanges(notifications);
    });
  }
  
  /**
   * Registra un evento de notificación
   */
  trackNotificationEvent(event: NotificationAnalyticsEvent): void {
    try {
      // Agregar timestamp si no existe
      if (!event.timestamp) {
        event.timestamp = new Date();
      }
      
      // Agregar al historial
      this.eventHistory.push(event);
      
      // Mantener tamaño del historial
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }
      
      // Actualizar métricas en tiempo real
      this.updateRealtimeMetrics(event);
      
      // Log para debugging
      if (!this.isProduction()) {
        console.log(`📈 Evento tracked: ${event.type}`, event);
      }
      
    } catch (error) {
      console.error('Error tracking evento:', error);
    }
  }
  
  /**
   * Obtiene métricas actuales
   */
  getMetrics(): Observable<NotificationMetrics> {
    return this.metrics$.asObservable();
  }
  
  /**
   * Obtiene estadísticas detalladas
   */
  async getDetailedStats(period: 'day' | 'week' | 'month' = 'day'): Promise<DetailedStats> {
    const cacheKey = `stats_${period}`;
    const cached = this.statsCache.get(cacheKey);
    
    // Retornar cache si es válido
    if (cached && Date.now() - cached.timestamp < this.cacheValidityMs) {
      return cached.stats;
    }
    
    // Calcular nuevas estadísticas
    const stats = await this.calculateDetailedStats(period);
    
    // Guardar en cache
    this.statsCache.set(cacheKey, {
      stats,
      timestamp: Date.now()
    });
    
    return stats;
  }
  
  /**
   * Obtiene reporte de rendimiento
   */
  getPerformanceReport(): PerformanceReport {
    const metrics = this.metrics$.getValue();
    const events = this.eventHistory;
    
    return {
      summary: {
        totalSent: metrics.totalSent,
        totalDelivered: metrics.totalDelivered,
        totalRead: metrics.totalRead,
        totalFailed: metrics.totalFailed,
        deliveryRate: metrics.totalSent > 0 ? (metrics.totalDelivered / metrics.totalSent) * 100 : 0,
        readRate: metrics.totalDelivered > 0 ? (metrics.totalRead / metrics.totalDelivered) * 100 : 0
      },
      byChannel: this.calculateChannelPerformance(),
      byType: this.calculateTypePerformance(),
      trends: this.calculateTrends(),
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  /**
   * Calcula estadísticas detalladas
   */
  private async calculateDetailedStats(period: 'day' | 'week' | 'month'): Promise<DetailedStats> {
    const now = new Date();
    const startDate = this.getStartDate(period);
    
    // Filtrar eventos por período
    const periodEvents = this.eventHistory.filter(e => 
      e.timestamp >= startDate && e.timestamp <= now
    );
    
    return {
      period: {
        start: startDate,
        end: now
      },
      totals: {
        sent: periodEvents.filter(e => e.type === 'NOTIFICATION_SENT').length,
        delivered: periodEvents.filter(e => e.type === 'NOTIFICATION_DELIVERED').length,
        read: periodEvents.filter(e => e.type === 'NOTIFICATION_READ').length,
        clicked: periodEvents.filter(e => e.type === 'NOTIFICATION_CLICKED').length,
        failed: periodEvents.filter(e => e.type === 'NOTIFICATION_FAILED').length
      },
      avgResponseTime: this.calculateAvgResponseTime(periodEvents),
      peakHours: this.calculatePeakHours(periodEvents),
      topNotificationTypes: this.getTopNotificationTypes(periodEvents),
      errorRate: this.calculateErrorRate(periodEvents)
    };
  }
  
  /**
   * Actualiza métricas en tiempo real
   */
  private updateRealtimeMetrics(event: NotificationAnalyticsEvent): void {
    const currentMetrics = this.metrics$.getValue();
    
    switch (event.type) {
      case 'NOTIFICATION_SENT':
        currentMetrics.totalSent++;
        break;
      case 'NOTIFICATION_DELIVERED':
        currentMetrics.totalDelivered++;
        break;
      case 'NOTIFICATION_READ':
        currentMetrics.totalRead++;
        break;
      case 'NOTIFICATION_CLICKED':
        currentMetrics.clickThrough++;
        break;
      case 'NOTIFICATION_FAILED':
        currentMetrics.totalFailed++;
        break;
    }
    
    // Actualizar tasas
    if (currentMetrics.totalSent > 0) {
      currentMetrics.deliveryRate = (currentMetrics.totalDelivered / currentMetrics.totalSent) * 100;
    }
    if (currentMetrics.totalDelivered > 0) {
      currentMetrics.openRate = (currentMetrics.totalRead / currentMetrics.totalDelivered) * 100;
    }
    if (currentMetrics.totalRead > 0) {
      currentMetrics.clickThroughRate = (currentMetrics.clickThrough / currentMetrics.totalRead) * 100;
    }
    
    this.metrics$.next(currentMetrics);
  }
  
  /**
   * Procesa cambios en notificaciones
   */
  private processNotificationChanges(notifications: KatuqNotification[]): void {
    // Contar por estado
    const statusCounts = notifications.reduce((acc, notif) => {
      acc[notif.status] = (acc[notif.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Actualizar métricas basadas en estados
    const metrics = this.metrics$.getValue();
    metrics.pendingCount = statusCounts[NotificationStatus.PENDING] || 0;
    metrics.activeNotifications = notifications.filter(n => 
      n.status !== NotificationStatus.READ && n.status !== NotificationStatus.FAILED
    ).length;
    
    this.metrics$.next(metrics);
  }
  
  /**
   * Calcula rendimiento por canal
   */
  private calculateChannelPerformance(): ChannelPerformance[] {
    const channelStats = new Map<NotificationChannel, ChannelStats>();
    
    this.eventHistory.forEach(event => {
      if (!event.channel) return;
      
      if (!channelStats.has(event.channel)) {
        channelStats.set(event.channel, {
          sent: 0,
          delivered: 0,
          read: 0,
          clicked: 0,
          failed: 0
        });
      }
      
      const stats = channelStats.get(event.channel)!;
      
      switch (event.type) {
        case 'NOTIFICATION_SENT':
          stats.sent++;
          break;
        case 'NOTIFICATION_DELIVERED':
          stats.delivered++;
          break;
        case 'NOTIFICATION_READ':
          stats.read++;
          break;
        case 'NOTIFICATION_CLICKED':
          stats.clicked++;
          break;
        case 'NOTIFICATION_FAILED':
          stats.failed++;
          break;
      }
    });
    
    return Array.from(channelStats.entries()).map(([channel, stats]) => ({
      channel,
      stats,
      performance: {
        deliveryRate: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0,
        openRate: stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0,
        clickRate: stats.read > 0 ? (stats.clicked / stats.read) * 100 : 0,
        failureRate: stats.sent > 0 ? (stats.failed / stats.sent) * 100 : 0
      }
    }));
  }
  
  /**
   * Calcula rendimiento por tipo
   */
  private calculateTypePerformance(): TypePerformance[] {
    const typeStats = new Map<NotificationType, number>();
    
    this.eventHistory
      .filter(e => e.notificationType)
      .forEach(event => {
        const count = typeStats.get(event.notificationType!) || 0;
        typeStats.set(event.notificationType!, count + 1);
      });
    
    return Array.from(typeStats.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }
  
  /**
   * Calcula tendencias
   */
  private calculateTrends(): TrendData {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayEvents = this.eventHistory.filter(e => e.timestamp >= oneDayAgo);
    const weekEvents = this.eventHistory.filter(e => e.timestamp >= oneWeekAgo);
    
    return {
      daily: {
        sent: todayEvents.filter(e => e.type === 'NOTIFICATION_SENT').length,
        delivered: todayEvents.filter(e => e.type === 'NOTIFICATION_DELIVERED').length,
        read: todayEvents.filter(e => e.type === 'NOTIFICATION_READ').length
      },
      weekly: {
        sent: weekEvents.filter(e => e.type === 'NOTIFICATION_SENT').length,
        delivered: weekEvents.filter(e => e.type === 'NOTIFICATION_DELIVERED').length,
        read: weekEvents.filter(e => e.type === 'NOTIFICATION_READ').length
      }
    };
  }
  
  /**
   * Genera recomendaciones basadas en métricas
   */
  private generateRecommendations(metrics: NotificationMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.deliveryRate < 90) {
      recommendations.push('La tasa de entrega está por debajo del 90%. Verifica la configuración de los canales.');
    }
    
    if (metrics.openRate < 20) {
      recommendations.push('La tasa de apertura es baja. Considera mejorar los títulos de las notificaciones.');
    }
    
    if (metrics.clickThroughRate < 2) {
      recommendations.push('El CTR es bajo. Revisa el contenido y los CTAs de las notificaciones.');
    }
    
    if (metrics.totalFailed > metrics.totalSent * 0.1) {
      recommendations.push('Más del 10% de las notificaciones están fallando. Revisa los logs de error.');
    }
    
    return recommendations;
  }
  
  /**
   * Calcula tiempo promedio de respuesta
   */
  private calculateAvgResponseTime(events: NotificationAnalyticsEvent[]): number {
    // Implementación simplificada
    return 0;
  }
  
  /**
   * Calcula horas pico
   */
  private calculatePeakHours(events: NotificationAnalyticsEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour]++;
    });
    
    // Obtener top 3 horas
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }
  
  /**
   * Obtiene tipos de notificación más usados
   */
  private getTopNotificationTypes(events: NotificationAnalyticsEvent[]): NotificationType[] {
    const typeCounts = new Map<NotificationType, number>();
    
    events
      .filter(e => e.notificationType)
      .forEach(event => {
        const count = typeCounts.get(event.notificationType!) || 0;
        typeCounts.set(event.notificationType!, count + 1);
      });
    
    return Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);
  }
  
  /**
   * Calcula tasa de error
   */
  private calculateErrorRate(events: NotificationAnalyticsEvent[]): number {
    const totalEvents = events.length;
    if (totalEvents === 0) return 0;
    
    const failedEvents = events.filter(e => e.type === 'NOTIFICATION_FAILED').length;
    return (failedEvents / totalEvents) * 100;
  }
  
  /**
   * Obtiene fecha de inicio según período
   */
  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
  
  /**
   * Actualiza métricas generales
   */
  private updateMetrics(): void {
    if (!this.featureFlags.isEnabled('ENABLE_NOTIFICATION_ANALYTICS')) {
      return;
    }
    
    // Recalcular métricas basadas en el historial
    const metrics = this.calculateMetricsFromHistory();
    this.metrics$.next(metrics);
  }
  
  /**
   * Calcula métricas desde el historial
   */
  private calculateMetricsFromHistory(): NotificationMetrics {
    const metrics = this.getEmptyMetrics();
    
    this.eventHistory.forEach(event => {
      switch (event.type) {
        case 'NOTIFICATION_SENT':
          metrics.totalSent++;
          break;
        case 'NOTIFICATION_DELIVERED':
          metrics.totalDelivered++;
          break;
        case 'NOTIFICATION_READ':
          metrics.totalRead++;
          break;
        case 'NOTIFICATION_CLICKED':
          metrics.clickThrough++;
          break;
        case 'NOTIFICATION_FAILED':
          metrics.totalFailed++;
          break;
      }
    });
    
    // Calcular tasas
    if (metrics.totalSent > 0) {
      metrics.deliveryRate = (metrics.totalDelivered / metrics.totalSent) * 100;
    }
    if (metrics.totalDelivered > 0) {
      metrics.openRate = (metrics.totalRead / metrics.totalDelivered) * 100;
    }
    if (metrics.totalRead > 0) {
      metrics.clickThroughRate = (metrics.clickThrough / metrics.totalRead) * 100;
    }
    
    return metrics;
  }
  
  /**
   * Limpia cache antiguo
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    this.statsCache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheValidityMs * 2) {
        this.statsCache.delete(key);
      }
    });
  }
  
  /**
   * Verifica si estamos en producción
   */
  private isProduction(): boolean {
    return window.location.hostname !== 'localhost';
  }
  
  /**
   * Obtiene métricas vacías
   */
  private getEmptyMetrics(): NotificationMetrics {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
      clickThrough: 0,
      deliveryRate: 0,
      openRate: 0,
      clickThroughRate: 0,
      avgResponseTime: 0,
      pendingCount: 0,
      activeNotifications: 0
    };
  }
}

// Interfaces
export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  clickThrough: number;
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
  avgResponseTime: number;
  pendingCount: number;
  activeNotifications: number;
}

export interface NotificationAnalyticsEvent {
  type: 'NOTIFICATION_TRIGGERED' | 'NOTIFICATION_SENT' | 'NOTIFICATION_DELIVERED' | 
        'NOTIFICATION_READ' | 'NOTIFICATION_CLICKED' | 'NOTIFICATION_FAILED';
  notificationType?: NotificationType;
  channel?: NotificationChannel;
  timestamp: Date;
  userId?: string;
  metadata?: any;
}

export interface DetailedStats {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    failed: number;
  };
  avgResponseTime: number;
  peakHours: number[];
  topNotificationTypes: NotificationType[];
  errorRate: number;
}

export interface PerformanceReport {
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
  };
  byChannel: ChannelPerformance[];
  byType: TypePerformance[];
  trends: TrendData;
  recommendations: string[];
}

export interface ChannelPerformance {
  channel: NotificationChannel;
  stats: ChannelStats;
  performance: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    failureRate: number;
  };
}

export interface ChannelStats {
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  failed: number;
}

export interface TypePerformance {
  type: NotificationType;
  count: number;
}

export interface TrendData {
  daily: {
    sent: number;
    delivered: number;
    read: number;
  };
  weekly: {
    sent: number;
    delivered: number;
    read: number;
  };
}

export interface CachedStats {
  stats: DetailedStats;
  timestamp: number;
}