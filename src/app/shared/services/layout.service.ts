import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Interfaz para el estado del sidebar
export interface SidebarState {
  isAutoHideEnabled: boolean;
  isAutoCollapseEnabled: boolean; // NUEVO: Modo auto-collapse
  isVisible: boolean;
  isPinned: boolean;
  isHovering: boolean;
  isCollapsed: boolean;
  isCompactMode: boolean;
  isTemporarilyExpanded: boolean; // NUEVO: Estado temporal de expansión en auto-collapse
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  public config = {
    settings: {
      layout: 'Dubai',
      layout_type: 'ltr',
      layout_version: 'light-only',
      sidebar_type: 'default-sidebar',
    },
    color: {
      primary_color: '#9b00ff',
      secondary_color: '##00fcd6'
    }
  }

  // Estado del sidebar con BehaviorSubject para reactividad
  private sidebarState = new BehaviorSubject<SidebarState>({
    isAutoHideEnabled: false,
    isAutoCollapseEnabled: false, // NUEVO: Modo auto-collapse desactivado por defecto
    isVisible: true,
    isPinned: false, // Cambiado a false por defecto
    isHovering: false,
    isCollapsed: false,
    isCompactMode: false,
    isTemporarilyExpanded: false // NUEVO: No expandido temporalmente por defecto
  });

  // Observable público para suscribirse a los cambios
  public sidebarState$: Observable<SidebarState> = this.sidebarState.asObservable();

  // Configuración de auto-hide
  public autoHideConfig = {
    hoverDelay: 200, // ms antes de mostrar en hover
    hideDelay: 300, // ms antes de ocultar
    hoverZoneWidth: 20, // píxeles de zona de activación
    enableOnMobile: true,
    swipeThreshold: 50 // píxeles mínimos para detectar swipe
  };

  // Configuración de auto-collapse
  public autoCollapseConfig = {
    expandDelay: 0, // Sin delay al expandir en hover
    collapseDelay: 300, // ms antes de colapsar al salir
    animationDuration: 300, // Duración de la animación en ms
    collapsedWidth: 70, // Ancho cuando está colapsado (px)
    expandedWidth: 260 // Ancho cuando está expandido (px)
  };

  constructor() {
    if(this.config.settings.layout_type == 'rtl')
      document.getElementsByTagName('html')[0].setAttribute('dir', this.config.settings.layout_type);

    document.documentElement.style.setProperty('--theme-deafult', this.config.color.primary_color);
    document.documentElement.style.setProperty('--theme-secondary', this.config.color.secondary_color);

    // Cargar configuración guardada del sidebar
    this.loadSidebarState();
  }

  // Métodos para gestionar el estado del sidebar
  public updateSidebarState(partialState: Partial<SidebarState>): void {
    const currentState = this.sidebarState.value;
    const newState = { ...currentState, ...partialState };
    this.sidebarState.next(newState);
    this.saveSidebarState(newState);
  }

  public getSidebarState(): SidebarState {
    return this.sidebarState.value;
  }

  // Métodos específicos para auto-hide
  public toggleAutoHide(): void {
    const currentState = this.sidebarState.value;
    const newAutoHideState = !currentState.isAutoHideEnabled;

    // Si se activa auto-hide, asegurar que no esté colapsado manualmente
    // Auto-hide y colapso manual son mutuamente excluyentes
    this.updateSidebarState({
      isAutoHideEnabled: newAutoHideState,
      isVisible: newAutoHideState ? false : true, // Si auto-hide activo, ocultar inicialmente
      isPinned: false, // Sin funcionalidad de pin
      isCollapsed: newAutoHideState ? false : currentState.isCollapsed, // Desactivar colapso si auto-hide activo
      isTemporarilyExpanded: false
    });
  }

  public showSidebar(): void {
    // Solo mostrar si auto-hide está activo
    if (this.sidebarState.value.isAutoHideEnabled) {
      this.updateSidebarState({ isVisible: true });
    }
  }

  public hideSidebar(): void {
    // Solo ocultar si auto-hide está activo
    if (this.sidebarState.value.isAutoHideEnabled) {
      this.updateSidebarState({ isVisible: false });
    }
  }

  // Función de pin eliminada - ya no es necesaria
  // El auto-hide funciona sin necesidad de pin

  public setHovering(hovering: boolean): void {
    this.updateSidebarState({ isHovering: hovering });
  }

  public toggleCollapse(): void {
    const currentState = this.sidebarState.value;

    // Si auto-hide está activo, desactivarlo antes de colapsar
    // Auto-hide y colapso manual son mutuamente excluyentes
    if (currentState.isAutoHideEnabled) {
      this.updateSidebarState({
        isAutoHideEnabled: false,
        isVisible: true,
        isCollapsed: !currentState.isCollapsed
      });
    } else {
      this.updateSidebarState({ isCollapsed: !currentState.isCollapsed });
    }
  }

  public toggleCompactMode(): void {
    const currentState = this.sidebarState.value;
    this.updateSidebarState({ isCompactMode: !currentState.isCompactMode });
  }

  // Métodos para auto-collapse
  public toggleAutoCollapse(): void {
    const currentState = this.sidebarState.value;
    const newAutoCollapseState = !currentState.isAutoCollapseEnabled;

    // Auto-collapse es incompatible con auto-hide y colapso manual
    this.updateSidebarState({
      isAutoCollapseEnabled: newAutoCollapseState,
      isAutoHideEnabled: false, // Desactivar auto-hide si auto-collapse está activo
      isCollapsed: false, // Desactivar colapso manual
      isVisible: true, // Siempre visible en auto-collapse
      isTemporarilyExpanded: false // Empezar colapsado
    });
  }

  public setTemporarilyExpanded(expanded: boolean): void {
    // Solo aplicar si auto-collapse está activo
    if (this.sidebarState.value.isAutoCollapseEnabled) {
      this.updateSidebarState({ isTemporarilyExpanded: expanded });
    }
  }

  public isAutoCollapseActive(): boolean {
    return this.sidebarState.value.isAutoCollapseEnabled;
  }

  // Persistencia en localStorage
  private saveSidebarState(state: SidebarState): void {
    try {
      const stateToSave = {
        isAutoHideEnabled: state.isAutoHideEnabled,
        isAutoCollapseEnabled: state.isAutoCollapseEnabled,
        isCompactMode: state.isCompactMode,
        isCollapsed: state.isCollapsed
      };
      localStorage.setItem('katuq_sidebar_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving sidebar state:', e);
    }
  }

  private loadSidebarState(): void {
    try {
      const savedState = localStorage.getItem('katuq_sidebar_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.updateSidebarState({
          isAutoHideEnabled: parsed.isAutoHideEnabled || false,
          isAutoCollapseEnabled: parsed.isAutoCollapseEnabled || false,
          isPinned: false, // Sin funcionalidad de pin
          isCompactMode: parsed.isCompactMode || false,
          isCollapsed: parsed.isCollapsed || false,
          isVisible: parsed.isAutoHideEnabled ? false : true,
          isTemporarilyExpanded: false // Siempre empezar colapsado en auto-collapse
        });
      }
    } catch (e) {
      console.error('Error loading sidebar state:', e);
    }
  }

  // Método para detectar dispositivo móvil
  public isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  // Método para limpiar el estado (útil para logout)
  public resetSidebarState(): void {
    this.sidebarState.next({
      isAutoHideEnabled: false,
      isAutoCollapseEnabled: false,
      isVisible: true,
      isPinned: false,
      isHovering: false,
      isCollapsed: false,
      isCompactMode: false,
      isTemporarilyExpanded: false
    });
    localStorage.removeItem('katuq_sidebar_state');
  }

}
