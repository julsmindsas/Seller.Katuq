import { AfterViewInit, Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router'
import * as feather from 'feather-icons';
import { LayoutService, SidebarState } from '../../../services/layout.service';
import { NavService } from '../../../services/nav.service';
import { fadeInAnimation } from '../../../data/router-animation/router-animation';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss'],
  animations: [fadeInAnimation]
})
export class ContentComponent implements OnInit, AfterViewInit, OnDestroy {
  private sidebarStateSubscription: Subscription;
  public sidebarState: SidebarState;

  constructor(
    private route: ActivatedRoute,
    public navServices: NavService,
    public layout: LayoutService,
    private elementRef: ElementRef
  ) {
    this.route.queryParams.subscribe((params) => {
      this.layout.config.settings.layout = params.layout ? params.layout : this.layout.config.settings.layout
    })
  }

  ngAfterViewInit() {
    setTimeout(() => {
      feather.replace();
    });
  }

  public getRouterOutletState(outlet) {
    return outlet.isActivated ? outlet.activatedRoute : '';
  }

  get layoutClass() {
    switch (this.layout.config.settings.layout) {
      case "Dubai":
        return "compact-wrapper"
      case "London":
        return "only-body"
      case "Seoul":
        return "compact-wrapper modern-type"
      case "LosAngeles":
        return this.navServices.horizontal ? "horizontal-wrapper material-type" : "compact-wrapper material-type"
      case "Paris":
        return "compact-wrapper dark-sidebar"
      case "Tokyo":
        return "compact-sidebar"
      case "Madrid":
        return "compact-wrapper color-sidebar"
      case "Moscow":
        return "compact-sidebar compact-small"
      case "NewYork":
        return "compact-wrapper box-layout"
      case "Singapore":
        return this.navServices.horizontal ? "horizontal-wrapper enterprice-type" : "compact-wrapper enterprice-type"
      case "Rome":
        return "compact-sidebar compact-small material-icon"
      case "Barcelona":
        return this.navServices.horizontal ? "horizontal-wrapper enterprice-type advance-layout" : "compact-wrapper enterprice-type advance-layout"
    }
  }

  ngOnInit() {
    // Suscribirse a los cambios de estado del sidebar
    this.sidebarStateSubscription = this.layout.sidebarState$.subscribe(state => {
      this.sidebarState = state;
      this.updateContentLayout(state);
    });
  }

  /**
   * Detecta clicks en el área de contenido para auto-ocultar el sidebar
   */
  @HostListener('click', ['$event'])
  onContentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Ignorar clicks en elementos que no deberían cerrar el sidebar
    if (target.closest('.sidebar-container') ||
        target.closest('.sidebar-hover-zone') ||
        target.closest('.sidebar-edge-indicator') ||
        target.closest('.sidebar-toggle-btn') ||
        target.closest('.modal') ||
        target.closest('.dropdown-menu')) {
      return;
    }

    // Si el auto-hide está activo, el sidebar está visible y no está pineado
    if (this.sidebarState &&
        this.sidebarState.isAutoHideEnabled &&
        this.sidebarState.isVisible &&
        !this.sidebarState.isPinned) {
      // Ocultar el sidebar
      this.layout.hideSidebar();
    }
  }

  /**
   * Actualiza el layout del contenido según el estado del sidebar
   */
  private updateContentLayout(state: SidebarState): void {
    const wrapperElement = this.elementRef.nativeElement.querySelector('.page-wrapper');
    if (!wrapperElement) return;

    // Remover todas las clases de estado previas
    wrapperElement.classList.remove(
      'sidebar-auto-hidden',
      'sidebar-collapsed',
      'sidebar-compact',
      'sidebar-auto-collapse'
    );

    // Aplicar clases según el nuevo estado
    if (state.isAutoCollapseEnabled) {
      // En auto-collapse, el área de trabajo siempre está expandida
      wrapperElement.classList.add('sidebar-auto-collapse');
    } else if (state.isAutoHideEnabled && !state.isVisible) {
      wrapperElement.classList.add('sidebar-auto-hidden');
    } else if (state.isCollapsed) {
      wrapperElement.classList.add('sidebar-collapsed');
    }

    if (state.isCompactMode) {
      wrapperElement.classList.add('sidebar-compact');
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.sidebarStateSubscription) {
      this.sidebarStateSubscription.unsubscribe();
    }
  }

}
