import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SphereVisualConfig } from '../sphere-visual/sphere-visual.component';

export interface SphereVisualEvent {
  type: 'create' | 'update' | 'celebrate' | 'notification';
  config: SphereVisualConfig;
  data?: any;
}

export interface SphereStepConfig {
  stepName: string;
  animationType: 'pulse' | 'bounce' | 'rotate' | 'wave' | 'slide' | 'glow' | 'celebrate';
  sphereColor: string;
  particleCount: number;
  audioReactive: boolean;
  celebrationMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SphereVisualService {
  private sphereEventSubject = new BehaviorSubject<SphereVisualEvent | null>(null);
  private currentSphereConfigSubject = new BehaviorSubject<SphereVisualConfig | null>(null);
  private sphereStepsSubject = new BehaviorSubject<SphereStepConfig[]>([]);

  sphereEvent$: Observable<SphereVisualEvent | null> = this.sphereEventSubject.asObservable();
  currentSphereConfig$: Observable<SphereVisualConfig | null> = this.currentSphereConfigSubject.asObservable();
  sphereSteps$: Observable<SphereStepConfig[]> = this.sphereStepsSubject.asObservable();

  // Configuración de pasos esféricos
  private readonly sphereSteps: SphereStepConfig[] = [
    {
      stepName: 'bodega',
      animationType: 'pulse',
      sphereColor: '#4CAF50',
      particleCount: 30,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'productos',
      animationType: 'bounce',
      sphereColor: '#2196F3',
      particleCount: 50,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'carrito',
      animationType: 'rotate',
      sphereColor: '#FF9800',
      particleCount: 40,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'cliente',
      animationType: 'wave',
      sphereColor: '#9C27B0',
      particleCount: 35,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'envio',
      animationType: 'slide',
      sphereColor: '#607D8B',
      particleCount: 45,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'facturacion',
      animationType: 'glow',
      sphereColor: '#E91E63',
      particleCount: 60,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'pago',
      animationType: 'pulse',
      sphereColor: '#4CAF50',
      particleCount: 70,
      audioReactive: true,
      celebrationMode: false
    },
    {
      stepName: 'confirmacion',
      animationType: 'celebrate',
      sphereColor: '#FFD700',
      particleCount: 100,
      audioReactive: true,
      celebrationMode: true
    }
  ];

  constructor() {
    this.sphereStepsSubject.next(this.sphereSteps);
  }

  /**
   * Crea una experiencia visual esférica para un paso específico
   */
  createSphereVisual(stepName: string, customConfig?: Partial<SphereVisualConfig>): void {
    const stepConfig = this.sphereSteps.find(step => step.stepName === stepName);
    
    if (!stepConfig) {
      console.warn(`Configuración no encontrada para el paso: ${stepName}`);
      return;
    }

    const config: SphereVisualConfig = {
      ...stepConfig,
      ...customConfig
    };

    const event: SphereVisualEvent = {
      type: 'create',
      config
    };

    this.sphereEventSubject.next(event);
    this.currentSphereConfigSubject.next(config);
  }

  /**
   * Actualiza la configuración de la esfera actual
   */
  updateSphereVisual(config: Partial<SphereVisualConfig>): void {
    const currentConfig = this.currentSphereConfigSubject.value;
    
    if (!currentConfig) {
      console.warn('No hay configuración actual para actualizar');
      return;
    }

    const updatedConfig: SphereVisualConfig = {
      ...currentConfig,
      ...config
    };

    const event: SphereVisualEvent = {
      type: 'update',
      config: updatedConfig
    };

    this.sphereEventSubject.next(event);
    this.currentSphereConfigSubject.next(updatedConfig);
  }

  /**
   * Activa el modo celebración
   */
  activateCelebration(celebrationType: 'success' | 'milestone' | 'completion' = 'success'): void {
    const celebrationConfig: SphereVisualConfig = {
      stepName: 'celebration',
      animationType: 'celebrate',
      sphereColor: '#FFD700',
      particleCount: 200,
      audioReactive: true,
      celebrationMode: true
    };

    const event: SphereVisualEvent = {
      type: 'celebrate',
      config: celebrationConfig,
      data: { celebrationType }
    };

    this.sphereEventSubject.next(event);
    this.currentSphereConfigSubject.next(celebrationConfig);
  }

  /**
   * Muestra una notificación esférica
   */
  showSphereNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notificationColors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };

    const notificationConfig: SphereVisualConfig = {
      stepName: 'notification',
      animationType: type === 'success' ? 'bounce' : 'pulse',
      sphereColor: notificationColors[type],
      particleCount: 25,
      audioReactive: false,
      celebrationMode: false
    };

    const event: SphereVisualEvent = {
      type: 'notification',
      config: notificationConfig,
      data: { message, type }
    };

    this.sphereEventSubject.next(event);
    this.currentSphereConfigSubject.next(notificationConfig);
  }

  /**
   * Obtiene la configuración de un paso específico
   */
  getStepConfig(stepName: string): SphereStepConfig | undefined {
    return this.sphereSteps.find(step => step.stepName === stepName);
  }

  /**
   * Obtiene todos los pasos disponibles
   */
  getAllSteps(): SphereStepConfig[] {
    return [...this.sphereSteps];
  }

  /**
   * Actualiza la configuración de un paso específico
   */
  updateStepConfig(stepName: string, config: Partial<SphereStepConfig>): void {
    const stepIndex = this.sphereSteps.findIndex(step => step.stepName === stepName);
    
    if (stepIndex !== -1) {
      this.sphereSteps[stepIndex] = { ...this.sphereSteps[stepIndex], ...config };
      this.sphereStepsSubject.next([...this.sphereSteps]);
    }
  }

  /**
   * Limpia la configuración actual
   */
  clearCurrentConfig(): void {
    this.currentSphereConfigSubject.next(null);
    this.sphereEventSubject.next(null);
  }

  /**
   * Obtiene la configuración actual
   */
  getCurrentConfig(): SphereVisualConfig | null {
    return this.currentSphereConfigSubject.value;
  }

  /**
   * Aplica una animación específica
   */
  applyAnimation(animationType: SphereVisualConfig['animationType']): void {
    const currentConfig = this.currentSphereConfigSubject.value;
    
    if (currentConfig) {
      this.updateSphereVisual({ animationType });
    }
  }

  /**
   * Cambia el color de la esfera
   */
  changeSphereColor(color: string): void {
    const currentConfig = this.currentSphereConfigSubject.value;
    
    if (currentConfig) {
      this.updateSphereVisual({ sphereColor: color });
    }
  }

  /**
   * Activa/desactiva la reactividad al audio
   */
  toggleAudioReactivity(enabled: boolean): void {
    const currentConfig = this.currentSphereConfigSubject.value;
    
    if (currentConfig) {
      this.updateSphereVisual({ audioReactive: enabled });
    }
  }

  /**
   * Activa/desactiva el modo celebración
   */
  toggleCelebrationMode(enabled: boolean): void {
    const currentConfig = this.currentSphereConfigSubject.value;
    
    if (currentConfig) {
      this.updateSphereVisual({ celebrationMode: enabled });
    }
  }
} 