import { Component, PLATFORM_ID, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { map, delay, withLatestFrom, takeUntil, filter } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
// import { SwUpdate } from '@angular/service-worker'; // SW desactivado (2026-03-25)
import Swal from 'sweetalert2';
import { env } from 'process';
import { environment } from './../environments/environment';
import { Idle } from '@ng-idle/core';
import { Keepalive } from '@ng-idle/keepalive';
import { Router, NavigationEnd } from '@angular/router';
import { NotificationService } from './shared/services/notification.service'
import { NotificationrlService } from './shared/services/notificationrl.service'
import { NotificationManagerService } from './shared/services/notifications/notification-manager.service'
import { NotificationType, NotificationPriority } from './shared/services/notifications/notification.types'
import { Toast, ToastrService } from 'ngx-toastr';
import { ErrorHandlerService } from './shared/services/errores/error-handler.service';
import { AuthService } from './shared/services/firebase/auth.service';
import { LayoutService } from './shared/services/layout.service';
import { NgpThemeService } from './shared/services/ngtheme.service';
import { IdleInterruptService, IdleConfiguration } from './shared/services/idle-interrupt.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  //IDle timeout
  IdleState = 'Not Started.';
  timedOut = false;
  lastPing?: Date;
  UserLogged: any;

  // For Progressbar
  loaders: any;
  unreadNotifications: any[];
  newTickets: any[];
  private destroy$ = new Subject<void>();

  // Lista de rutas donde NO se debe mostrar el floating button
  // Incluye rutas públicas y rutas de experiencia inmersiva (fullscreen)
  private readonly PUBLIC_ROUTES = [
    '/login',
    '/authentication',
    '/nuevo-registro',
    '/change-password',
    '/terms-conditions',
    '/privacy-policy',
    '/video-agent',
    '/live-audio'
  ];

  // Propiedad para verificar si estamos en una ruta donde NO debe mostrarse el floating button
  public isPublicRoute: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private notificationService: NotificationService,
    private notificationrlService: NotificationrlService,
    private notificationManager: NotificationManagerService,
    private idle: Idle,
    private keepalive: Keepalive,
    private router: Router,
    private toastrService: ToastrService,
    public authService: AuthService,
    public layout: LayoutService,
    public ngpService: NgpThemeService,
    private idleInterruptService: IdleInterruptService,
    private loader: LoadingBarService,
    translate: TranslateService,
    // private updates: SwUpdate, // SW desactivado (2026-03-25)
    private errorHandlerService: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize loader
    this.loaders = this.loader.progress$.pipe(
      delay(1000),
      withLatestFrom(this.loader.progress$),
      map(v => v[1]),
    );

    if (isPlatformBrowser(this.platformId)) {
      translate.setDefaultLang('es');
      translate.addLangs(['en', 'de', 'es', 'fr', 'pt', 'cn', 'ae']);
    }
    // Service Worker desactivado (2026-03-25) - duplicaba requests HTTP y degradaba rendimiento
    // updates.checkForUpdate().then(() => { }).catch(err => { });

    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        notifications => {
          if (notifications.length > 0) {
            this.toastrService.info("Tienes notificaciones pendientes", 'Notification', {
              timeOut: 5000,
              progressBar: true,
              positionClass: 'toast-top-right'
            });
          }
        }
      );

    // Service Worker update listener desactivado (2026-03-25)
    // updates.available
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(async event => {
    //   this.notificationService.addNotification({
    //     message: 'Tenemos una actualización nueva...',
    //     timestamp: new Date(),
    //     type: 'function',
    //     typeIcon: 'warning',
    //     action: () => {
    //       updates.activateUpdate().then(() => document.location.reload());
    //     },
    //     btnName: 'Reiniciar Ahora',
    //     details: ''
    //   });
    //   this.toastrService.warning('¡Nueva versión disponible!', 'Actualización', {
    //     timeOut: 5000,
    //     progressBar: true,
    //     positionClass: 'toast-top-right'
    //   });
    // });

    // Enhanced idle configuration using IdleInterruptService
    this.configureIdleSettings();

    idle.onIdleEnd.subscribe(() => {
      console.log('Sesión reactivada');
      this.idleInterruptService.trackActivity();
      this.reset();
    });

    idle.onTimeout.subscribe(() => {
      const config = this.idleInterruptService.getCurrentConfiguration();
      const totalMinutes = Math.floor((config.idleTime + config.timeoutTime) / 60);
      console.log(`Sesión inactiva por ${totalMinutes} minutos, cerrando sesión automáticamente`);
      
      this.timedOut = true;
      this.authService.SignOut();
      this.reset();
      
      // Show logout notification
      this.toastrService.error(
        `Sesión cerrada por inactividad de ${totalMinutes} minutos`, 
        'Sesión Terminada',
        { timeOut: 10000 }
      );
    });

    idle.onIdleStart.subscribe(() => { });

    idle.onTimeoutWarning.subscribe((countdown) => {
      const config = this.idleInterruptService.getCurrentConfiguration();
      const warningThreshold = Math.min(120, Math.floor(config.timeoutTime * 0.2)); // 20% of timeout or 120s max
      
      if (countdown === warningThreshold && !this.router.url.includes('login')) {
        const idleMinutes = Math.floor(config.idleTime / 60);
        const remainingSeconds = countdown;
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        
        Swal.fire({
          icon: 'warning',
          title: `¡ Sesión inactiva por ${idleMinutes} minutos, se cerrará en ${remainingMinutes > 0 ? remainingMinutes + ' minutos' : remainingSeconds + ' segundos'} !`,
          text: 'Mueve el mouse, toca la pantalla o haz clic para mantener la sesión activa',
          showConfirmButton: true,
          confirmButtonText: 'Mantener sesión activa',
          timer: 30000,
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then((result) => {
          if (result.isConfirmed) {
            this.reset();
            this.toastrService.success('Sesión extendida exitosamente', 'Sesión Activa');
          }
        });
      }
    });

    keepalive.interval(1);

    keepalive.onPing.subscribe(() => this.lastPing = new Date());

    this.reset();

  }

  loadNotifications() {
    this.notificationrlService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        this.unreadNotifications = notifications.filter((n) => !n.read); // Filtra las no leídas
        this.newTickets = notifications; // Lista completa de notificaciones
      });
  }

  // Marcar una notificación como leída
  markNotificationAsRead(notificationId: string) {
    this.notificationrlService.markAsRead(notificationId).then(() => {
      console.log(`Notificación ${notificationId} marcada como leída`);
      this.loadNotifications(); // Recarga la lista después de actualizar
    });
  }

  ngOnInit(): void {

    // Verificar ruta inicial
    this.checkPublicRoute();

    // Suscribirse a cambios de ruta para actualizar isPublicRoute
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkPublicRoute();
      });

    // Configurar manejadores de error global para debugging
    if (!environment.production) {
      window.addEventListener('error', (event) => {
        // Filtrar errores del Angular DevTools
        if (event.error && event.error.stack &&
            (event.error.stack.includes('ng-debug-api') ||
             event.error.stack.includes('getComponent'))) {
          console.warn('Angular DevTools error ignorado:', event.error.message);
          event.preventDefault();
          return;
        }
        console.error('Error global de ventana:', event.error);
        this.errorHandlerService.logError(event.error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        // Filtrar errores del Angular DevTools
        if (event.reason && event.reason.stack &&
            (event.reason.stack.includes('ng-debug-api') ||
             event.reason.message?.includes('getComponent'))) {
          console.warn('Angular DevTools promise rejection ignorada:', event.reason);
          event.preventDefault();
          return;
        }
        console.error('Promesa no manejada:', event.reason);
        this.errorHandlerService.logError(event.reason);
      });
    }

    // Restaurar datos de sesión al inicializar la aplicación
    this.initializeSessionData();

    try {
      const raw = localStorage.getItem('user');
      this.UserLogged = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('user en localStorage corrupto, ignorado:', e);
      this.UserLogged = null;
    }

    const tema = this.UserLogged?.tema;

    this.layout.config.settings.layout_version = tema ? 'dark-only' : 'light';

    this.ngpService.switchTheme(tema ? 'md-dark-deeppurple' : 'lara-light-blue');

    // Apply dark-only class to body for proper dark mode styling
    if (tema) {
      document.body.classList.add('dark-only');
    } else {
      document.body.classList.remove('dark-only');
    }

    document.body.style.backgroundColor = tema ? 'black' : 'white';


  }


  /**
   * Inicializa y restaura los datos de sesión críticos
   */
  private initializeSessionData(): void {
    try {
      // Verificar si hay datos de usuario válidos
      const userDataString = localStorage.getItem('user');
      if (!userDataString) {
        console.warn('No hay datos de usuario en localStorage');
        return;
      }

      let userData: any;
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        return;
      }

      // Restaurar información de la empresa si no existe
      const currentCompany = localStorage.getItem('currentCompany');
      if (!currentCompany && userData.company) {
        console.log('Restaurando información de empresa desde datos de usuario');
        
        // Crear información básica de empresa desde los datos del usuario
        const companyInfo = {
          nombreComercio: userData.company,
          imgUrlLogo: undefined, // Se usará el logo por defecto
          razonSocial: userData.company
        };

        // Guardar en localStorage
        localStorage.setItem('currentCompany', JSON.stringify(companyInfo));
        console.log('Información de empresa restaurada exitosamente');
      }

      // Verificar que el menú esté disponible
      const authorizedMenuItems = localStorage.getItem('authorizedMenuItems');
      if (!authorizedMenuItems && userData.menu) {
        console.log('Restaurando menú autorizado desde datos de usuario');
        localStorage.setItem('authorizedMenuItems', JSON.stringify(userData.menu));
      }

      console.log('Datos de sesión inicializados correctamente');
    } catch (error) {
      console.error('Error inicializando datos de sesión:', error);
    }
  }

  reset() {
    console.log('Resetting idle timer');
    this.idle.watch();
    this.IdleState = 'Started.';
    this.timedOut = false;
  }

  private configureIdleSettings(): void {
    // Determine profile based on current route or user role
    let profile: 'admin' | 'user' | 'pos' = 'user';
    
    if (this.router.url.includes('/pos')) {
      profile = 'pos';
    } else if (this.UserLogged?.role === 'admin' || this.UserLogged?.isAdmin) {
      profile = 'admin';
    }

    // Set the profile
    this.idleInterruptService.setProfile(profile);
    
    // Get configuration for current profile
    const config = this.idleInterruptService.getCurrentConfiguration();
    
    // Apply configuration to idle service
    this.idle.setIdle(config.idleTime);
    this.idle.setTimeout(config.timeoutTime);
    
    // Set enhanced interrupt sources
    const interruptSources = this.idleInterruptService.createEnhancedInterruptSources();
    this.idle.setInterrupts(interruptSources);
    
    // Log configuration for debugging
    this.idleInterruptService.logConfiguration();
    
    console.log(`Idle system configured for profile: ${profile}`);
  }

  public switchIdleProfile(profile: 'admin' | 'user' | 'pos'): void {
    console.log(`Switching idle profile from ${this.idleInterruptService.getCurrentConfiguration().profile} to ${profile}`);
    
    // Stop current idle watching
    this.idle.stop();
    
    // Reconfigure with new profile
    this.idleInterruptService.setProfile(profile);
    this.configureIdleSettings();
    
    // Restart idle watching
    this.reset();
    
    this.toastrService.info(`Perfil de inactividad cambiado a: ${profile}`, 'Configuración');
  }

  /**
   * Verifica si la ruta actual es una ruta pública
   * donde NO se debe mostrar el floating button
   */
  private checkPublicRoute(): void {
    const currentUrl = this.router.url;
    const wasPublic = this.isPublicRoute;
    this.isPublicRoute = this.PUBLIC_ROUTES.some(route =>
      currentUrl.startsWith(route)
    );

    // Log de depuración
    if (wasPublic !== this.isPublicRoute || !environment.production) {
      console.log('🔍 [FloatingButton] Verificación de ruta:', {
        currentUrl,
        isPublicRoute: this.isPublicRoute,
        shouldShowButton: !this.isPublicRoute
      });
    }

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup idle interrupt sources
    this.idleInterruptService.cleanup();

    // Stop idle watching
    this.idle.stop();
  }

}




