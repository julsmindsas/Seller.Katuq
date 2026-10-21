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
  AppLanguageCode,
  DEFAULT_APP_LANGUAGE,
  DEFAULT_VISIBLE_LANGUAGES,
  StoredAppLanguage,
  idiomaParaGuardar,
  idiomasVisibles,
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

  // D-532: solo los idiomas visibles para este usuario (Deutsch (CH) nace oculto).
  public languages: ReadonlyArray<AppLanguage> = APP_LANGUAGES.filter(l => DEFAULT_VISIBLE_LANGUAGES.includes(l.code));

  private visibles: AppLanguageCode[] = [...DEFAULT_VISIBLE_LANGUAGES];

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

    // D-532: un idioma oculto se muestra en español sin reescribir users.lang.
    this.visibles = idiomasVisibles(this.UserLogged);
    this.languages = APP_LANGUAGES.filter(l => this.visibles.includes(l.code));
    this.selectedLanguage = normalizeAppLanguage(this.UserLogged?.lang, this.visibles);
    this.translate.setDefaultLang(DEFAULT_APP_LANGUAGE.code);
    this.translate.use(this.selectedLanguage.code);
    document.documentElement.lang = this.selectedLanguage.htmlLang;
  }

  changeLanguage(lang: unknown) {
    this.selectedLanguage = normalizeAppLanguage(lang, this.visibles);
    this.translate.setDefaultLang(DEFAULT_APP_LANGUAGE.code);
    this.translate.use(this.selectedLanguage.code);
    document.documentElement.lang = this.selectedLanguage.htmlLang;
    // D-532: users.lang conserva su forma de siempre, sin htmlLang.
    this.guardarLenguaje(idiomaParaGuardar(this.selectedLanguage));
  }

  async guardarLenguaje(lang: StoredAppLanguage) {
    if (!this.UserLogged) return;
    this.UserLogged.lang = lang;

    const item: any = {
      identificacion: this.UserLogged.nit,
      lang: lang
    }

    this.service.updateUser(item)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        // D-502: releer el user justo antes de guardar y cambiar solo `lang`; la copia leída al
        // montar devolvía el `tema` anterior.
        let actual: any = null;
        try {
          actual = JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
          actual = null;
        }
        if (!actual) return; // la sesión terminó mientras se guardaba
        actual.lang = lang;
        localStorage.setItem("user", JSON.stringify(actual));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
