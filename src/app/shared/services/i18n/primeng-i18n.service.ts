import { Injectable, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNGConfig, Translation } from 'primeng/api';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { DEFAULT_APP_LANGUAGE } from '../../utils/app-language.utils';

/**
 * D-540 (D5): textos de PrimeNG (calendarios, filtros de tabla, carga de archivos, contraseña)
 * en el idioma del panel. Los toma del objeto `primeng` de cada diccionario.
 *
 * Solo textos: no pasa `dateFormat` ni `firstDayOfWeek` (formato, Ola 0) y no toca las opciones
 * de filtro que configura produccion/dashboard. Lo arranca una vez `app.component.ts`; el selector no lo llama,
 * porque cambiar de idioma ya dispara `onLangChange`.
 */
@Injectable({ providedIn: 'root' })
export class PrimengI18nService implements OnDestroy {
  private static readonly SOLO_FORMATO = ['dateFormat', 'firstDayOfWeek'];

  private iniciado = false;
  private destroy$ = new Subject<void>();

  constructor(
    private translate: TranslateService,
    private config: PrimeNGConfig
  ) { }

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.aplicar();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.aplicar());
  }

  private aplicar(): void {
    this.translate.get('primeng')
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: valor => {
          // Si falta el objeto, ngx-translate devuelve la clave cruda: PrimeNG conserva sus textos.
          if (!PrimengI18nService.esObjeto(valor)) return;
          // Respaldo en español por texto: a un diccionario con el objeto incompleto no le queda
          // ningún texto en el idioma anterior ni en el inglés de PrimeNG.
          const textos: Record<string, unknown> = { ...this.respaldoEspanol(), ...valor };
          PrimengI18nService.SOLO_FORMATO.forEach(clave => delete textos[clave]);
          this.config.setTranslation(textos as Translation);
        },
        // Un diccionario que no carga deja los textos que ya tenía PrimeNG; no rompe el arranque.
        error: () => undefined
      });
  }

  /** Objeto `primeng` de español si ya está cargado (setDefaultLang('es') lo carga al arrancar). */
  private respaldoEspanol(): Record<string, unknown> {
    const es = this.translate.translations?.[DEFAULT_APP_LANGUAGE.code]?.primeng;
    return PrimengI18nService.esObjeto(es) ? es : {};
  }

  private static esObjeto(valor: unknown): valor is Record<string, unknown> {
    return !!valor && typeof valor === 'object' && !Array.isArray(valor);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
