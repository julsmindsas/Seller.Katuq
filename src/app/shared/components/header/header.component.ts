import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavService } from '../../services/nav.service';
import { LayoutService } from '../../services/layout.service';
import { NotificationrlService } from '../../services/notificationrl.service';
import { NgpThemeService } from '../../services/ngtheme.service';
import { MaestroService } from '../../services/maestros/maestro.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  public elem: any;
  public dark: boolean = this.layout.config.settings.layout_version == 'dark-only' ? true : false;

  public newTickets: any[] = []; // Lista de tickets nuevos o pendientes
  public unreadNotifications: any[] = []; // Lista de notificaciones no leídas
  UserLogged: any;

  constructor(
    public layout: LayoutService,
    public navServices: NavService,
    public ngpService: NgpThemeService,
    private service: MaestroService,
    @Inject(DOCUMENT) private document: any,
    private notificationService: NotificationrlService) {
    // const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // if (darkModeMediaQuery.matches) {
    //   this.layoutToggle();

    // }
    // darkModeMediaQuery.addEventListener('change', (event) => {
    //   const newColorScheme = event.matches ? 'dark-only' : 'light';
    //   // this.layout.config.settings.layout_version = newColorScheme;
    //   this.layoutToggle();
    // });
  }
  loadNotifications() {
    this.notificationService.getNotifications().subscribe((notifications) => {
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


    this.UserLogged = JSON.parse(localStorage.getItem('user')!);

    this.dark = this.UserLogged.tema;
    this.layout.config.settings.layout_version = this.dark ? 'dark-only' : 'light';
    this.ngpService.switchTheme(this.dark ? 'md-dark-deeppurple' : 'lara-light-blue');

    document.body.style.backgroundColor = this.dark ? 'black' : 'white';
  }

  sidebarToggle() {
    this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
    this.navServices.megaMenu = false;
    this.navServices.levelMenu = false;
  }

  layoutToggle() {

    this.dark = !this.dark;

    this.ngpService.switchTheme(this.dark ? 'md-dark-deeppurple' : 'lara-light-blue');

    this.layout.config.settings.layout_version = this.dark ? 'dark-only' : 'light';

    // actualizar tema
    const item = {
      identificacion: this.UserLogged.nit,
      tema: this.dark,
    }

    this.service.updateUser(item).subscribe((res: any) => {

      // const data = await res;

      this.UserLogged.tema = this.dark;

      localStorage.setItem('user', JSON.stringify(this.UserLogged));

      document.body.style.backgroundColor = this.dark ? 'black' : 'white';

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
      if (!this.document.exitFullscreen) {
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


}
