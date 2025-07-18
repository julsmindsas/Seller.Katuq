import { Component, PLATFORM_ID, Inject, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { map, delay, withLatestFrom, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { SwUpdate } from '@angular/service-worker';
import Swal from 'sweetalert2';
import { env } from 'process';
import { environment } from './../environments/environment';
import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { Keepalive } from '@ng-idle/keepalive';
import { Router } from '@angular/router';
import { NotificationService } from './shared/services/notification.service'
import { NotificationrlService } from './shared/services/notificationrl.service'
import { Toast, ToastrService } from 'ngx-toastr';
import { ErrorHandlerService } from './shared/services/errores/error-handler.service';
import { AuthService } from './shared/services/firebase/auth.service';
import { LayoutService } from './shared/services/layout.service';
import { NgpThemeService } from './shared/services/ngtheme.service';
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
  loaders = this.loader.progress$.pipe(
    delay(1000),
    withLatestFrom(this.loader.progress$),
    map(v => v[1]),
  );
  unreadNotifications: any[];
  newTickets: any[];
  private destroy$ = new Subject<void>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
    private notificationService: NotificationService,
    private notificationrlService: NotificationrlService,
    private idle: Idle,
    private keepalive: Keepalive,
    private router: Router,
    private toastrService: ToastrService,
    private authService: AuthService,
    public layout: LayoutService,
    public ngpService: NgpThemeService,
    private loader: LoadingBarService, translate: TranslateService, private updates: SwUpdate,
    private errorHandlerService: ErrorHandlerService) {
    if (isPlatformBrowser(this.platformId)) {
      translate.setDefaultLang('es');
      translate.addLangs(['en', 'de', 'es', 'fr', 'pt', 'cn', 'ae']);
    }
    // if (environment.production) {
    updates.checkForUpdate().then(() => { }
      // this.updateCheckText = 'resolved';
    ).catch(err => { }
      // this.updateCheckText = rejected: ${ err.message }
    );

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

    updates.available
      .pipe(takeUntil(this.destroy$))
      .subscribe(async event => {
      // Add a notification
      this.notificationService.addNotification({
        message: 'Tenemos una actualización nueva. Para acceder a nuevas funcionalidades y mejoras. Dale REINICIAR AHORA. Detalles de la actualización: [detalles]',
        timestamp: new Date(),
        type: 'function',
        typeIcon: 'warning',
        action: () => {
          updates.activateUpdate().then(() => document.location.reload());
        },
        btnName: 'Reiniciar Ahora',
        details: ''
      });

      // Show a toast
      this.toastrService.warning('¡Nueva versión disponible!', 'Actualización', {
        timeOut: 5000,
        progressBar: true,
        positionClass: 'toast-top-right'
      });

    });

    // Configuración de timeout más flexible para evitar cierres prematuros
    idle.setIdle(120); // 2 horas de inactividad antes de mostrar warning
    idle.setTimeout(600); // 10 minutos adicionales antes de cerrar sesión
    idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);

    idle.onIdleEnd.subscribe(() => {
      this.reset();
    });

    idle.onTimeout.subscribe(() => {
      this.timedOut = true;
      this.authService.SignOut();
      this.reset();
    });

    idle.onIdleStart.subscribe(() => { });

    idle.onTimeoutWarning.subscribe((countdown) => {
      // Mostrar warning solo cuando quedan 2 minutos (120 segundos)
      if (countdown === 120 && !this.router.url.includes('login')) {
        Swal.fire({
          icon: 'warning',
          title: '¡ Sesión inactiva por 2 horas, se cerrará en 2 minutos !',
          text: 'Mueve el mouse o haz clic para mantener la sesión activa',
          showConfirmButton: true,
          confirmButtonText: 'Mantener sesión activa',
          timer: 30000 // Auto-cerrar después de 30 segundos
        }).then((result) => {
          if (result.isConfirmed) {
            // Resetear el timer de inactividad
            this.reset();
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

    window.addEventListener('error', (event) => {
      console.error('Error global de ventana:', event.error);
      this.errorHandlerService.logError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promesa no manejada:', event.reason);
      this.errorHandlerService.logError(event.reason);
    });

    // Restaurar datos de sesión al inicializar la aplicación
    this.initializeSessionData();

    this.UserLogged = JSON.parse(localStorage.getItem('user')!);

    const tema = this.UserLogged?.tema;

    this.layout.config.settings.layout_version = tema ? 'dark-only' : 'light';

    this.ngpService.switchTheme(this.layout.config.settings.layout_version = tema ? 'md-dark-deeppurple' : 'lara-light-blue');

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
    this.idle.watch();
    this.IdleState = 'Started.';
    this.timedOut = false;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}




