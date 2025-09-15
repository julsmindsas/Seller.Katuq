import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FilterState {
  searchQuery: string;
  fechaInicial: Date | null;
  fechaFinal: Date | null;
  estadoPago: string;
  estadoProceso: string;
  selectedDatePreset?: string;
  customFilters?: { [key: string]: any };
}

export interface FilterPreset {
  name: string;
  label: string;
  filters: Partial<FilterState>;
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private defaultState: FilterState = {
    searchQuery: '',
    fechaInicial: null,
    fechaFinal: null,
    estadoPago: 'all',
    estadoProceso: 'all',
    selectedDatePreset: '',
    customFilters: {}
  };

  private filterState = new BehaviorSubject<FilterState>(this.defaultState);
  private savedPresets = new BehaviorSubject<FilterPreset[]>([]);

  // Observables públicos
  public filterState$: Observable<FilterState> = this.filterState.asObservable();
  public savedPresets$: Observable<FilterPreset[]> = this.savedPresets.asObservable();

  constructor() {
    this.loadPresetsFromStorage();
    this.loadLastFilterState();
  }

  // Obtener el estado actual de los filtros
  getCurrentState(): FilterState {
    return this.filterState.value;
  }

  // Actualizar el estado de los filtros
  updateFilterState(newState: Partial<FilterState>): void {
    const currentState = this.filterState.value;
    const updatedState = { ...currentState, ...newState };
    this.filterState.next(updatedState);
    this.saveFilterStateToStorage(updatedState);
  }

  // Limpiar todos los filtros
  clearAllFilters(): void {
    this.filterState.next(this.defaultState);
    this.clearFilterStateFromStorage();
  }

  // Limpiar un filtro específico
  clearSpecificFilter(filterKey: keyof FilterState): void {
    const currentState = this.filterState.value;
    const updatedState = {
      ...currentState,
      [filterKey]: this.defaultState[filterKey]
    };
    this.filterState.next(updatedState);
    this.saveFilterStateToStorage(updatedState);
  }

  // Aplicar filtros de fecha basados en presets
  applyDatePreset(preset: string): { from: Date; to: Date } | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let from: Date;
    let to: Date;

    switch (preset) {
      case 'today':
        from = new Date(today);
        to = new Date(today);
        break;

      case 'yesterday':
        from = new Date(today);
        from.setDate(from.getDate() - 1);
        to = new Date(from);
        break;

      case 'last7days':
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        to = new Date(today);
        break;

      case 'last30days':
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        to = new Date(today);
        break;

      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today);
        break;

      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;

      case 'thisYear':
        from = new Date(today.getFullYear(), 0, 1);
        to = new Date(today);
        break;

      case 'lastYear':
        from = new Date(today.getFullYear() - 1, 0, 1);
        to = new Date(today.getFullYear() - 1, 11, 31);
        break;

      default:
        return null;
    }

    this.updateFilterState({
      fechaInicial: from,
      fechaFinal: to,
      selectedDatePreset: preset
    });

    return { from, to };
  }

  // Guardar un preset de filtros
  savePreset(name: string, label: string): void {
    const currentState = this.filterState.value;
    const preset: FilterPreset = {
      name,
      label,
      filters: { ...currentState }
    };

    const currentPresets = this.savedPresets.value;
    const existingIndex = currentPresets.findIndex(p => p.name === name);

    if (existingIndex >= 0) {
      currentPresets[existingIndex] = preset;
    } else {
      currentPresets.push(preset);
    }

    this.savedPresets.next(currentPresets);
    this.savePresetsToStorage(currentPresets);
  }

  // Cargar un preset de filtros
  loadPreset(name: string): void {
    const presets = this.savedPresets.value;
    const preset = presets.find(p => p.name === name);

    if (preset) {
      this.filterState.next({ ...this.defaultState, ...preset.filters });
      this.saveFilterStateToStorage(preset.filters as FilterState);
    }
  }

  // Eliminar un preset
  deletePreset(name: string): void {
    const currentPresets = this.savedPresets.value;
    const filteredPresets = currentPresets.filter(p => p.name !== name);
    this.savedPresets.next(filteredPresets);
    this.savePresetsToStorage(filteredPresets);
  }

  // Verificar si hay filtros activos
  hasActiveFilters(): boolean {
    const state = this.filterState.value;
    return !!(
      state.searchQuery ||
      state.fechaInicial ||
      state.fechaFinal ||
      (state.estadoPago !== 'all') ||
      (state.estadoProceso !== 'all') ||
      (state.customFilters && Object.keys(state.customFilters).some(key => state.customFilters![key]))
    );
  }

  // Contar filtros activos
  getActiveFiltersCount(): number {
    const state = this.filterState.value;
    let count = 0;

    if (state.searchQuery) count++;
    if (state.fechaInicial) count++;
    if (state.fechaFinal) count++;
    if (state.estadoPago !== 'all') count++;
    if (state.estadoProceso !== 'all') count++;

    if (state.customFilters) {
      count += Object.keys(state.customFilters).filter(key => state.customFilters![key]).length;
    }

    return count;
  }

  // Convertir el estado de filtros a parámetros de consulta
  toQueryParams(): { [key: string]: any } {
    const state = this.filterState.value;
    const params: { [key: string]: any } = {};

    if (state.searchQuery) {
      params['search'] = state.searchQuery;
    }

    if (state.fechaInicial) {
      params['dateFrom'] = this.formatDate(state.fechaInicial);
    }

    if (state.fechaFinal) {
      params['dateTo'] = this.formatDate(state.fechaFinal);
    }

    if (state.estadoPago && state.estadoPago !== 'all') {
      params['paymentStatus'] = state.estadoPago;
    }

    if (state.estadoProceso && state.estadoProceso !== 'all') {
      params['processStatus'] = state.estadoProceso;
    }

    // Agregar filtros personalizados
    if (state.customFilters) {
      Object.keys(state.customFilters).forEach(key => {
        if (state.customFilters![key]) {
          params[key] = state.customFilters![key];
        }
      });
    }

    return params;
  }

  // Restaurar filtros desde parámetros de consulta
  fromQueryParams(params: { [key: string]: any }): void {
    const newState: Partial<FilterState> = {};

    if (params['search']) {
      newState.searchQuery = params['search'];
    }

    if (params['dateFrom']) {
      newState.fechaInicial = new Date(params['dateFrom']);
    }

    if (params['dateTo']) {
      newState.fechaFinal = new Date(params['dateTo']);
    }

    if (params['paymentStatus']) {
      newState.estadoPago = params['paymentStatus'];
    }

    if (params['processStatus']) {
      newState.estadoProceso = params['processStatus'];
    }

    // Manejar filtros personalizados
    const customFilters: { [key: string]: any } = {};
    const knownKeys = ['search', 'dateFrom', 'dateTo', 'paymentStatus', 'processStatus'];

    Object.keys(params).forEach(key => {
      if (!knownKeys.includes(key)) {
        customFilters[key] = params[key];
      }
    });

    if (Object.keys(customFilters).length > 0) {
      newState.customFilters = customFilters;
    }

    this.updateFilterState(newState);
  }

  // Métodos privados para persistencia
  private saveFilterStateToStorage(state: FilterState): void {
    try {
      localStorage.setItem('katuq_filter_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving filter state:', error);
    }
  }

  private loadLastFilterState(): void {
    try {
      const saved = localStorage.getItem('katuq_filter_state');
      if (saved) {
        const state = JSON.parse(saved);
        // Convertir strings de fecha a objetos Date
        if (state.fechaInicial) {
          state.fechaInicial = new Date(state.fechaInicial);
        }
        if (state.fechaFinal) {
          state.fechaFinal = new Date(state.fechaFinal);
        }
        this.filterState.next({ ...this.defaultState, ...state });
      }
    } catch (error) {
      console.error('Error loading filter state:', error);
    }
  }

  private clearFilterStateFromStorage(): void {
    try {
      localStorage.removeItem('katuq_filter_state');
    } catch (error) {
      console.error('Error clearing filter state:', error);
    }
  }

  private savePresetsToStorage(presets: FilterPreset[]): void {
    try {
      localStorage.setItem('katuq_filter_presets', JSON.stringify(presets));
    } catch (error) {
      console.error('Error saving filter presets:', error);
    }
  }

  private loadPresetsFromStorage(): void {
    try {
      const saved = localStorage.getItem('katuq_filter_presets');
      if (saved) {
        const presets = JSON.parse(saved);
        this.savedPresets.next(presets);
      }
    } catch (error) {
      console.error('Error loading filter presets:', error);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}