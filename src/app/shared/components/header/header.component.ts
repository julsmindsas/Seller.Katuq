import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { NotificationrlService } from '../../services/notificationrl.service';
import { ThemeModeService } from '../../services/theme-mode.service';
import { MaestroService } from '../../services/maestros/maestro.service';
import { TourNavigationService } from '../../services/tour-navigation.service';
import { SubscriptionService } from '../../services/subscription.service';
import { OpttiaChatService } from '../../services/opttia-chat.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public elem: any;
  // D-502: refleja el tema aplicado por ThemeModeService (también pinta aria-pressed)
  public dark: boolean = false;

  public newTickets: any[] = []; // Lista de tickets nuevos o pendientes
  public unreadNotifications: any[] = []; // Lista de notificaciones no leídas
  UserLogged: any;

  constructor(
    public layout: LayoutService,
    public navServices: NavService,
    private service: MaestroService,
    @Inject(DOCUMENT) private document: any,
    private notificationService: NotificationrlService,
    private tourNavigationService: TourNavigationService,
    public subscriptionService: SubscriptionService,
    private themeMode: ThemeModeService,
    public opttiaChat: OpttiaChatService) {
  }
  loadNotifications() {
    this.notificationService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        this.unreadNotifications = notifications.filter((n) => !n.read); // Filtra las no leídas
        this.newTickets = notifications; // Lista completa de notificaciones
      });
  }
  // Marcar una notificación como leída
  markNotificationAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId).then(() => {
      console.log(`Notificación ${notificationId} marcada como leída`);
      this.loadNotifications(); // Recarga la lista después de actualizar
    });
  }

  ngOnInit() {
    this.elem = document.documentElement;
    this.loadNotifications();

    // Validar localStorage antes de parsear
    const userData = localStorage.getItem('user');
    this.UserLogged = userData ? JSON.parse(userData) : {};

    // D-502: el header ya no toca el DOM del tema; solo lo refleja.
    this.themeMode.isDark$
      .pipe(takeUntil(this.destroy$))
      .subscribe(dark => this.dark = dark);
  }

  // Método para aplicar marca de expansión temporal desde fuera
  public setTemporarilyExpandedHeader(isExpanded: boolean) {
    const headerEl = document.querySelector('.page-header');
    if (!headerEl) return;
    if (isExpanded) {
      headerEl.classList.add('temporarily-expanded');
    } else {
      headerEl.classList.remove('temporarily-expanded');
    }
  }

  sidebarToggle() {
    // Sincronizar con LayoutService (estado único)
    this.layout.toggleCollapse();
    this.navServices.collapseSidebar = this.layout.getSidebarState().isCollapsed;
    this.navServices.megaMenu = false;
    this.navServices.levelMenu = false;
  }

  layoutToggle() {
    const dark = !this.dark;

    // D-502: aplica y guarda `tema` en el navegador de inmediato (solo ese campo del user).
    this.themeMode.setPreference(dark);

    // actualizar tema en el backend
    const item = {
      identificacion: this.UserLogged?.nit,
      tema: dark,
    }

    this.service.updateUser(item)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        // D-502 (valor por defecto 9): si el backend lo rechaza no se revierte ni se cierra
        // la sesión; el interceptor ya avisa y en el siguiente inicio de sesión manda el backend.
        error: () => { }
      });
  }

  searchToggle() {
    this.navServices.search = true;
  }

  languageToggle() {
    this.navServices.language = !this.navServices.language;
  }

  toggleFullScreen() {
    this.navServices.fullScreen = !this.navServices.fullScreen;
    if (this.navServices.fullScreen) {
      if (this.elem.requestFullscreen) {
        this.elem.requestFullscreen();
      } else if (this.elem.mozRequestFullScreen) {
        /* Firefox */
        this.elem.mozRequestFullScreen();
      } else if (this.elem.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        this.elem.webkitRequestFullscreen();
      } else if (this.elem.msRequestFullscreen) {
        /* IE/Edge */
        this.elem.msRequestFullscreen();
      }
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (this.document.mozCancelFullScreen) {
        /* Firefox */
        this.document.mozCancelFullScreen();
      } else if (this.document.webkitExitFullscreen) {
        /* Chrome, Safari and Opera */
        this.document.webkitExitFullscreen();
      } else if (this.document.msExitFullscreen) {
        /* IE/Edge */
        this.document.msExitFullscreen();
      }
    }
  }

  openTourMenu() {
    console.log('Opening tour menu...');
    this.tourNavigationService.showTourMenu();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
