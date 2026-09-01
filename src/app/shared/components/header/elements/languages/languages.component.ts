import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { NavService, Menu } from '../../../../services/nav.service';
import { UserLogged } from '../../../../../shared/models/User/UserLogged';
import { MaestroService } from '../../../../services/maestros/maestro.service';
import {
  APP_LANGUAGES,
  AppLanguage,
  DEFAULT_APP_LANGUAGE,
  normalizeAppLanguage
} from '../../../../utils/app-language.utils';

@Component({
  selector: 'app-languages',
  templateUrl: './languages.component.html',
  styleUrls: ['./languages.component.scss']
})
export class LanguagesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public language: boolean = false;

  public languages: ReadonlyArray<AppLanguage> = APP_LANGUAGES;

  public selectedLanguage: AppLanguage = { ...DEFAULT_APP_LANGUAGE };

  UserLogged: any;

  constructor(
    private translate: TranslateService,
    public navServices: NavService,
    public service: MaestroService
  ) { }

  ngOnInit() {
    // Validar localStorage antes de parsear
    try {
      const userData = localStorage.getItem('user');
      this.UserLogged = userData ? JSON.parse(userData) as UserLogged : null;
    } catch {
      this.UserLogged = null;
    }

    this.selectedLanguage = normalizeAppLanguage(this.UserLogged?.lang);
    this.translate.setDefaultLang(DEFAULT_APP_LANGUAGE.code);
    this.translate.use(this.selectedLanguage.code);
    document.documentElement.lang = this.selectedLanguage.code;
  }

  changeLanguage(lang: unknown) {
    this.selectedLanguage = normalizeAppLanguage(lang);
    this.translate.setDefaultLang(DEFAULT_APP_LANGUAGE.code);
    this.translate.use(this.selectedLanguage.code);
    document.documentElement.lang = this.selectedLanguage.code;
    this.guardarLenguaje(this.selectedLanguage);
  }

  async guardarLenguaje(lang: AppLanguage) {
    if (!this.UserLogged) return;
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
