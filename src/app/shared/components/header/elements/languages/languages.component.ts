import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavService, Menu } from '../../../../services/nav.service';
import { UserLogged } from '../../../../../shared/models/User/UserLogged';
import { MaestroService } from '../../../../services/maestros/maestro.service';

@Component({
  selector: 'app-languages',
  templateUrl: './languages.component.html',
  styleUrls: ['./languages.component.scss']
})
export class LanguagesComponent implements OnInit {

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

    this.UserLogged = JSON.parse(localStorage.getItem('user')!) as UserLogged;

    this.translate.use(this.UserLogged.lang.code)
    this.translate.setDefaultLang(this.UserLogged.lang.code)
    this.selectedLanguage = this.UserLogged.lang;

  }

  changeLanguage(lang: any) {
    this.translate.use(lang.code)
    this.translate.setDefaultLang(lang.code)
    this.selectedLanguage = lang;
    this.guardarLenguaje(lang);
  }

  async guardarLenguaje(lang: any) {

    // const item = {
    //   email: this.UserLogged.email,
    //   emailAnt: this.UserLogged.email,
    //   idioma: lang,
    //   settings: '1',
    // }

    this.UserLogged.lang = lang;

    const item: any = {
      identificacion: this.UserLogged.nit,
      lang: lang
    }

    this.service.updateUser(item).subscribe((response: any) => {

      localStorage.setItem("user", JSON.stringify(this.UserLogged));

    });
  }

}
