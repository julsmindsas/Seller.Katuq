import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { NavService, Menu } from '../../../../services/nav.service';
import { UserLogged } from '../../../../../shared/models/User/UserLogged';
import { MaestroService } from '../../../../services/maestros/maestro.service';

@Component({
  selector: 'app-languages',
  templateUrl: './languages.component.html',
  styleUrls: ['./languages.component.scss']
})
export class LanguagesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public language: boolean = false;

  public languages: any[] = [{
    language: 'English',
    code: 'en',
    type: 'US',
    icon: 'us'
  },
  {
    language: 'Español',
    code: 'es',
    type: 'CO',
    icon: 'co'
  },
  // {
  //   language: 'Français',
  //   code: 'fr',
  //   icon: 'fr'
  // },
  {
    language: 'Português',
    code: 'pt',
    type: 'BR',
    icon: 'br'
  }]

  public selectedLanguage: any = {
    language: 'Español',
    code: 'es',
    type: 'CO',
    icon: 'co'
  }

  UserLogged: any;

  constructor(
    private translate: TranslateService,
    public navServices: NavService,
    public service: MaestroService
  ) { }

  ngOnInit() {
    // Validar localStorage antes de parsear
    const userData = localStorage.getItem('user');
    this.UserLogged = userData ? JSON.parse(userData) as UserLogged : null;

    if (this.UserLogged?.lang) {
      this.translate.use(this.UserLogged.lang.code)
      this.translate.setDefaultLang(this.UserLogged.lang.code)
      this.selectedLanguage = this.UserLogged.lang;
    }
  }

  changeLanguage(lang: any) {
    this.translate.use(lang.code)
    this.translate.setDefaultLang(lang.code)
    this.selectedLanguage = lang;
    this.guardarLenguaje(lang);
  }

  async guardarLenguaje(lang: any) {
    this.UserLogged.lang = lang;

    const item: any = {
      identificacion: this.UserLogged.nit,
      lang: lang
    }

    this.service.updateUser(item)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        localStorage.setItem("user", JSON.stringify(this.UserLogged));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
