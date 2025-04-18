import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor() { }

  getAdvancedMetrics(): Observable<any> {
    return of({
      // KPIs Principales
      activeUsers: 850,
      retentionRate: 0.78,
      averageLTV: 2500,
      averageSessionTime: 12,
      
      // Métricas de Crecimiento
      growthMetrics: {
        newStores: 45,
        activeStores: 320,
        totalOrders: 12500,
        totalRevenue: 12500000,
        mrr: 850000,
        churnRate: 0.12
      },

      // Tendencias de Engagement
      engagementTrend: [65, 72, 68, 80, 85, 90, 95, 100, 105, 110, 115, 120],
      engagementDates: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      
      // Tendencias de LTV
      ltvTrend: [1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900],
      ltvDates: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      
      // Métricas de Conversión
      conversionMetrics: {
        storeSignupRate: 0.35,
        firstOrderRate: 0.28,
        repeatOrderRate: 0.65,
        averageOrderValue: 1200,
        cartAbandonmentRate: 0.25
      },

      // Análisis de Usuarios
      userAnalysis: [
        {
          id: 1,
          name: 'Tienda Premium',
          sessions: 85,
          averageTime: 15,
          conversionRate: 0.82,
          ltv: 3500,
          engagement: 92,
          trend: 15,
          orders: 450,
          revenue: 540000,
          categories: ['Electrónica', 'Hogar'],
          location: 'Bogotá'
        },
        {
          id: 2,
          name: 'Tienda Express',
          sessions: 65,
          averageTime: 10,
          conversionRate: 0.75,
          ltv: 2800,
          engagement: 88,
          trend: 12,
          orders: 320,
          revenue: 384000,
          categories: ['Alimentos', 'Bebidas'],
          location: 'Medellín'
        },
        {
          id: 3,
          name: 'Tienda Fashion',
          sessions: 45,
          averageTime: 8,
          conversionRate: 0.68,
          ltv: 2200,
          engagement: 82,
          trend: 8,
          orders: 280,
          revenue: 336000,
          categories: ['Moda', 'Accesorios'],
          location: 'Cali'
        }
      ],

      // Métricas de Rendimiento
      performanceMetrics: {
        averageDeliveryTime: 35,
        customerSatisfaction: 4.7,
        supportResponseTime: 15,
        systemUptime: 99.9,
        errorRate: 0.1
      },

      // Tendencias de Categorías
      categoryTrends: [
        { name: 'Electrónica', growth: 25, revenue: 4500000 },
        { name: 'Alimentos', growth: 18, revenue: 3200000 },
        { name: 'Moda', growth: 15, revenue: 2800000 },
        { name: 'Hogar', growth: 12, revenue: 2000000 }
      ],

      // Métricas de Marketing
      marketingMetrics: {
        cpa: 120,
        roas: 4.5,
        emailOpenRate: 0.35,
        clickThroughRate: 0.12,
        socialEngagement: 0.08
      }
    });
  }
} 