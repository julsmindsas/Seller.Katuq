import { Component, PLATFORM_ID, Inject, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { map, delay, withLatestFrom } from 'rxjs/operators';
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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

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

    this.notificationService.notifications$.subscribe(
      notifications => {
        if (notifications.length > 0) {
          this.toastrService.info("Tienes notificaciones pendientes", 'Notification', {
            timeOut: 5000,
            progressBar: true,
            positionClass: 'toast-bottom-right'
          });
        }
      }
    );

    updates.available.subscribe(async event => {
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
        positionClass: 'toast-bottom-right'
      });

    });

    idle.setIdle(5);
    idle.setTimeout(1500);
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
      if (countdown === 12 && !this.router.url.includes('login')) {

        Swal.fire({
          icon: 'warning',
          title: '¡ Sesión inactiva por 25 minutos, cerrada !',
          showConfirmButton: true
        });
      }
    });

    keepalive.interval(1);

    keepalive.onPing.subscribe(() => this.lastPing = new Date());

    this.reset();



  }

  loadNotifications() {
    this.notificationrlService.getNotifications().subscribe((notifications) => {
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


    this.UserLogged = JSON.parse(localStorage.getItem('user')!);

    this.layout.config.settings.layout_version = this.UserLogged.tema ? 'dark-only' : 'light';
    this.ngpService.switchTheme(this.layout.config.settings.layout_version = this.UserLogged.tema ? 'md-dark-deeppurple' : 'lara-light-blue');

    document.body.style.backgroundColor = this.UserLogged.tema ? 'black' : 'white';

  }

  reset() {
    this.idle.watch();
    this.IdleState = 'Started.';
    this.timedOut = false;
  }

}




