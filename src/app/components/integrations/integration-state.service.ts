import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of, timer } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, catchError, switchMap, debounceTime, filter } from 'rxjs/operators';
import { Integration, IntegrationCategory } from './integrations.service';
import { ValidationResult } from './integration-form-validator.service';

export interface IntegrationState {
  integrations: Integration[];
  selectedIntegration: Integration | null;
  currentCategory: IntegrationCategory | null;
  validationResults: { [integrationId: string]: ValidationResult };
  loading: {
    list: boolean;
    save: boolean;
    test: boolean;
    delete: boolean;
  };
  errors: {
    list: string | null;
    save: string | null;
    test: string | null;
    delete: string | null;
  };
  filters: {
    search: string;
    category: IntegrationCategory | null;
    status: 'all' | 'active' | 'inactive' | 'error';
    provider: string | null;
  };
  cache: {
    lastUpdated: number;
    ttl: number; // Time to live in ms
  };
  ui: {
    viewMode: 'grid' | 'list';
    sortBy: 'name' | 'type' | 'lastModified' | 'status';
    sortDirection: 'asc' | 'desc';
    selectedIds: string[];
    showAdvanced: boolean;
  };
}

const initialState: IntegrationState = {
  integrations: [],
  selectedIntegration: null,
  currentCategory: null,
  validationResults: {},
  loading: {
    list: false,
    save: false,
    test: false,
    delete: false
  },
  errors: {
    list: null,
    save: null,
    test: null,
    delete: null
  },
  filters: {
    search: '',
    category: null,
    status: 'all',
    provider: null
  },
  cache: {
    lastUpdated: 0,
    ttl: 5 * 60 * 1000 // 5 minutos
  },
  ui: {
    viewMode: 'grid',
    sortBy: 'name',
    sortDirection: 'asc',
    selectedIds: [],
    showAdvanced: false
  }
};

@Injectable({
  providedIn: 'root'
})
export class IntegrationStateService {
  private readonly state$ = new BehaviorSubject<IntegrationState>(initialState);
  
  // Selectores principales
  readonly integrations$ = this.select(state => state.integrations);
  readonly selectedIntegration$ = this.select(state => state.selectedIntegration);
  readonly currentCategory$ = this.select(state => state.currentCategory);
  readonly loading$ = this.select(state => state.loading);
  readonly errors$ = this.select(state => state.errors);
  readonly filters$ = this.select(state => state.filters);
  readonly ui$ = this.select(state => state.ui);

  // Selectores computados
  readonly filteredIntegrations$ = combineLatest([
    this.integrations$,
    this.filters$,
    this.ui$
  ]).pipe(
    map(([integrations, filters, ui]) => 
      this.applyFiltersAndSort(integrations || [], filters, ui)
    ),
    shareReplay(1)
  );

  readonly integrationsByCategory$ = this.integrations$.pipe(
    map(integrations => this.groupByCategory(integrations || [])),
    shareReplay(1)
  );

  readonly activeIntegrationsCount$ = this.integrations$.pipe(
    map(integrations => (integrations || []).filter(i => i.enabled).length),
    distinctUntilChanged()
  );

  readonly hasErrors$ = this.errors$.pipe(
    map(errors => Object.values(errors).some(error => error !== null)),
    distinctUntilChanged()
  );

  readonly isLoading$ = this.loading$.pipe(
    map(loading => Object.values(loading).some(isLoading => isLoading)),
    distinctUntilChanged()
  );

  // Cache management
  readonly isCacheValid$ = this.select(state => {
    const now = Date.now();
    return (now - state.cache.lastUpdated) < state.cache.ttl;
  });

  constructor() {
    // Auto-cleanup de errores después de 10 segundos
    this.errors$.pipe(
      filter(errors => Object.values(errors).some(error => error !== null)),
      debounceTime(10000)
    ).subscribe(() => {
      this.clearErrors();
    });

    // Auto-refresh de datos cada 5 minutos si hay integraciones activas
    timer(0, 5 * 60 * 1000).pipe(
      switchMap(() => this.activeIntegrationsCount$),
      filter(count => count > 0),
      switchMap(() => this.isCacheValid$),
      filter(isValid => !isValid)
    ).subscribe(() => {
      this.markCacheInvalid();
    });
  }

  private select<T>(selector: (state: IntegrationState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    );
  }

  private updateState(updater: (state: IntegrationState) => Partial<IntegrationState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...updater(currentState) };
    this.state$.next(newState);
  }

  // Actions para gestión de integraciones
  setIntegrations(integrations: Integration[]): void {
    this.updateState(state => ({
      integrations: integrations || [],
      cache: {
        ...state.cache,
        lastUpdated: Date.now()
      },
      errors: {
        ...state.errors,
        list: null
      }
    }));
  }

  addIntegration(integration: Integration): void {
    this.updateState(state => ({
      integrations: [...(state.integrations || []), integration],
      cache: {
        ...state.cache,
        lastUpdated: Date.now()
      }
    }));
  }

  updateIntegration(integration: Integration): void {
    this.updateState(state => ({
      integrations: (state.integrations || []).map(i => 
        i.id === integration.id ? integration : i
      ),
      selectedIntegration: state.selectedIntegration?.id === integration.id 
        ? integration 
        : state.selectedIntegration,
      cache: {
        ...state.cache,
        lastUpdated: Date.now()
      }
    }));
  }

  removeIntegration(integrationId: string): void {
    this.updateState(state => ({
      integrations: (state.integrations || []).filter(i => i.id !== integrationId),
      selectedIntegration: state.selectedIntegration?.id === integrationId 
        ? null 
        : state.selectedIntegration,
      cache: {
        ...state.cache,
        lastUpdated: Date.now()
      }
    }));
  }

  selectIntegration(integration: Integration | null): void {
    this.updateState(() => ({ selectedIntegration: integration }));
  }

  setCurrentCategory(category: IntegrationCategory | null): void {
    this.updateState(() => ({ currentCategory: category }));
  }

  // Actions para validaciones
  setValidationResult(integrationId: string, result: ValidationResult): void {
    this.updateState(state => ({
      validationResults: {
        ...state.validationResults,
        [integrationId]: result
      }
    }));
  }

  clearValidationResult(integrationId: string): void {
    this.updateState(state => {
      const { [integrationId]: removed, ...rest } = state.validationResults;
      return { validationResults: rest };
    });
  }

  // Actions para loading states
  setLoading(operation: keyof IntegrationState['loading'], isLoading: boolean): void {
    this.updateState(state => ({
      loading: {
        ...state.loading,
        [operation]: isLoading
      }
    }));
  }

  // Actions para errores
  setError(operation: keyof IntegrationState['errors'], error: string | null): void {
    this.updateState(state => ({
      errors: {
        ...state.errors,
        [operation]: error
      }
    }));
  }

  clearErrors(): void {
    this.updateState(() => ({
      errors: {
        list: null,
        save: null,
        test: null,
        delete: null
      }
    }));
  }

  // Actions para filtros
  updateFilters(filters: Partial<IntegrationState['filters']>): void {
    this.updateState(state => ({
      filters: {
        ...state.filters,
        ...filters
      }
    }));
  }

  resetFilters(): void {
    this.updateState(() => ({
      filters: {
        search: '',
        category: null,
        status: 'all',
        provider: null
      }
    }));
  }

  // Actions para UI
  updateUI(ui: Partial<IntegrationState['ui']>): void {
    this.updateState(state => ({
      ui: {
        ...state.ui,
        ...ui
      }
    }));
  }

  toggleSelection(integrationId: string): void {
    this.updateState(state => {
      const currentSelections = state.ui.selectedIds;
      const isSelected = currentSelections.includes(integrationId);
      
      return {
        ui: {
          ...state.ui,
          selectedIds: isSelected
            ? currentSelections.filter(id => id !== integrationId)
            : [...currentSelections, integrationId]
        }
      };
    });
  }

  selectAll(integrationIds: string[]): void {
    this.updateState(state => ({
      ui: {
        ...state.ui,
        selectedIds: integrationIds
      }
    }));
  }

  clearSelection(): void {
    this.updateState(state => ({
      ui: {
        ...state.ui,
        selectedIds: []
      }
    }));
  }

  // Cache management
  markCacheInvalid(): void {
    this.updateState(state => ({
      cache: {
        ...state.cache,
        lastUpdated: 0
      }
    }));
  }

  // Utility methods
  private applyFiltersAndSort(
    integrations: Integration[], 
    filters: IntegrationState['filters'],
    ui: IntegrationState['ui']
  ): Integration[] {
    let filtered = [...integrations];

    // Aplicar filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(integration =>
        integration.name.toLowerCase().includes(searchLower) ||
        integration.type.toLowerCase().includes(searchLower) ||
        integration.category?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de categoría
    if (filters.category) {
      filtered = filtered.filter(integration => integration.category === filters.category);
    }

    // Aplicar filtro de estado
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(integration => integration.enabled);
          break;
        case 'inactive':
          filtered = filtered.filter(integration => !integration.enabled);
          break;
        case 'error':
          filtered = filtered.filter(integration => !integration.enabled);
          break;
      }
    }

    // Aplicar filtro de proveedor
    if (filters.provider) {
      filtered = filtered.filter(integration => integration.type === filters.provider);
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (ui.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'lastModified':
          const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
          comparison = aDate - bDate;
          break;
        case 'status':
          const aStatus = a.enabled ? 1 : 0;
          const bStatus = b.enabled ? 1 : 0;
          comparison = bStatus - aStatus;
          break;
      }
      
      return ui.sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }

  private groupByCategory(integrations: Integration[]): { [key: string]: Integration[] } {
    return integrations.reduce((groups, integration) => {
      const category = integration.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(integration);
      return groups;
    }, {} as { [key: string]: Integration[] });
  }

  // Estado actual (para debugging y casos especiales)
  get currentState(): IntegrationState {
    return this.state$.value;
  }

  // Reset completo del estado
  reset(): void {
    this.state$.next(initialState);
  }
} 