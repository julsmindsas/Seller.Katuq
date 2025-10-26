import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  IAgentAdapter,
  AdapterRegistration,
  AgentIndustry
} from '../models/agent-adapter.interface';

/**
 * Registry service para gestionar adapters plug & play
 * Permite agregar nuevas industrias sin modificar el core
 */
@Injectable({
  providedIn: 'root'
})
export class AdapterRegistryService {
  private adapters = new Map<AgentIndustry, AdapterRegistration>();

  private currentAdapterSubject = new BehaviorSubject<IAgentAdapter | null>(null);
  public currentAdapter$ = this.currentAdapterSubject.asObservable();

  constructor() {
    console.log('🔧 AdapterRegistryService initialized');
  }

  /**
   * Registra un nuevo adapter
   */
  registerAdapter(
    adapter: IAgentAdapter,
    enabled: boolean = true,
    priority: number = 0
  ): void {
    const registration: AdapterRegistration = {
      adapter,
      enabled,
      priority
    };

    this.adapters.set(adapter.industry, registration);

    console.log(`✅ Adapter registered: ${adapter.name} (${adapter.industry})`);
  }

  /**
   * Registra múltiples adapters
   */
  registerAdapters(registrations: AdapterRegistration[]): void {
    registrations.forEach(reg => {
      this.registerAdapter(reg.adapter, reg.enabled, reg.priority);
    });
  }

  /**
   * Obtiene un adapter por industria
   */
  getAdapter(industry: AgentIndustry): IAgentAdapter | null {
    const registration = this.adapters.get(industry);

    if (!registration) {
      console.warn(`⚠️ No adapter found for industry: ${industry}`);
      return null;
    }

    if (!registration.enabled) {
      console.warn(`⚠️ Adapter for industry ${industry} is disabled`);
      return null;
    }

    return registration.adapter;
  }

  /**
   * Obtiene todos los adapters habilitados
   */
  getEnabledAdapters(): IAgentAdapter[] {
    const enabled: IAgentAdapter[] = [];

    this.adapters.forEach((registration) => {
      if (registration.enabled) {
        enabled.push(registration.adapter);
      }
    });

    // Ordenar por prioridad (descendente)
    return enabled.sort((a, b) => {
      const prioA = this.adapters.get(a.industry)?.priority || 0;
      const prioB = this.adapters.get(b.industry)?.priority || 0;
      return prioB - prioA;
    });
  }

  /**
   * Obtiene todas las industrias disponibles
   */
  getAvailableIndustries(): AgentIndustry[] {
    const industries: AgentIndustry[] = [];

    this.adapters.forEach((registration, industry) => {
      if (registration.enabled) {
        industries.push(industry);
      }
    });

    return industries;
  }

  /**
   * Establece el adapter actual
   */
  setCurrentAdapter(industry: AgentIndustry): boolean {
    const adapter = this.getAdapter(industry);

    if (!adapter) {
      return false;
    }

    this.currentAdapterSubject.next(adapter);
    console.log(`🎯 Current adapter set to: ${adapter.name}`);

    return true;
  }

  /**
   * Limpia el adapter actual
   */
  clearCurrentAdapter(): void {
    this.currentAdapterSubject.next(null);
    console.log('🧹 Current adapter cleared');
  }

  /**
   * Habilita/deshabilita un adapter
   */
  setAdapterEnabled(industry: AgentIndustry, enabled: boolean): void {
    const registration = this.adapters.get(industry);

    if (registration) {
      registration.enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Adapter ${industry} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Elimina un adapter del registro
   */
  unregisterAdapter(industry: AgentIndustry): void {
    if (this.adapters.has(industry)) {
      this.adapters.delete(industry);
      console.log(`🗑️ Adapter unregistered: ${industry}`);

      // Si era el adapter actual, limpiar
      const current = this.currentAdapterSubject.value;
      if (current?.industry === industry) {
        this.clearCurrentAdapter();
      }
    }
  }

  /**
   * Verifica si existe un adapter para una industria
   */
  hasAdapter(industry: AgentIndustry): boolean {
    return this.adapters.has(industry);
  }

  /**
   * Obtiene información de un adapter sin instanciarlo
   */
  getAdapterInfo(industry: AgentIndustry): {
    name: string;
    description: string;
    enabled: boolean;
    priority: number;
  } | null {
    const registration = this.adapters.get(industry);

    if (!registration) {
      return null;
    }

    return {
      name: registration.adapter.name,
      description: registration.adapter.description,
      enabled: registration.enabled,
      priority: registration.priority || 0
    };
  }

  /**
   * Obtiene el conteo de adapters registrados
   */
  getAdapterCount(): number {
    return this.adapters.size;
  }

  /**
   * Obtiene el conteo de adapters habilitados
   */
  getEnabledAdapterCount(): number {
    let count = 0;

    this.adapters.forEach((registration) => {
      if (registration.enabled) {
        count++;
      }
    });

    return count;
  }

  /**
   * Limpia todos los adapters
   */
  clearAll(): void {
    this.adapters.clear();
    this.clearCurrentAdapter();
    console.log('🧹 All adapters cleared');
  }

  /**
   * Obtiene lista de adapters para UI (con info básica)
   */
  getAdapterListForUI(): Array<{
    industry: AgentIndustry;
    name: string;
    description: string;
    enabled: boolean;
    isCurrent: boolean;
  }> {
    const list: Array<any> = [];
    const current = this.currentAdapterSubject.value;

    this.adapters.forEach((registration, industry) => {
      list.push({
        industry,
        name: registration.adapter.name,
        description: registration.adapter.description,
        enabled: registration.enabled,
        isCurrent: current?.industry === industry
      });
    });

    // Ordenar por prioridad
    return list.sort((a, b) => {
      const prioA = this.adapters.get(a.industry)?.priority || 0;
      const prioB = this.adapters.get(b.industry)?.priority || 0;
      return prioB - prioA;
    });
  }

  /**
   * Getters
   */
  get currentAdapter(): IAgentAdapter | null {
    return this.currentAdapterSubject.value;
  }
}
