import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  WhatsappBotConfig,
  WhatsappIntegrationConfigService,
} from '../../../../shared/services/notifications/whatsapp-integration-config.service';

/**
 * Configuración del BOT DE PEDIDOS por WhatsApp.
 *
 * Tarjeta independiente dentro de la pantalla de integración de WhatsApp:
 * carga y guarda su propio bloque (`bot`) sin tocar el formulario grande de
 * notificaciones, así un problema en una cosa no arrastra a la otra.
 *
 * Reglas que el backend hace cumplir y esta UI explica:
 *  - El bot solo se prende con NÚMERO PROPIO conectado (`puedeActivarse`).
 *  - Arranca en MODO SOMBRA: piensa y registra, pero no envía ni cobra.
 *  - Apagarlo siempre está permitido.
 */
@Component({
  selector: 'app-whatsapp-bot-config',
  templateUrl: './whatsapp-bot-config.component.html',
  styleUrls: ['./whatsapp-bot-config.component.scss'],
})
export class WhatsappBotConfigComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  loading = true;
  saving = false;
  loadError: string | null = null;
  /** Del servidor: solo con número propio conectado se puede prender. */
  puedeActivarse = false;

  readonly dias = [
    { valor: 1, etiqueta: 'L' },
    { valor: 2, etiqueta: 'M' },
    { valor: 3, etiqueta: 'X' },
    { valor: 4, etiqueta: 'J' },
    { valor: 5, etiqueta: 'V' },
    { valor: 6, etiqueta: 'S' },
    { valor: 0, etiqueta: 'D' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private configService: WhatsappIntegrationConfigService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      enabled: [false],
      modoSombra: [true],
      topeTurnos: [20],
      mensajeBienvenida: [''],
      anunciarQueEsBot: [true],
      horarioHabilitado: [false],
      horarioDesde: ['08:00'],
      horarioHasta: ['18:00'],
      horarioDias: [[1, 2, 3, 4, 5, 6]],
    });
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.loading = true;
    this.loadError = null;
    this.configService
      .getBotConfig()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (bot) => {
          if (!bot) {
            // Backend viejo sin el bloque del bot: se muestra el estado por
            // defecto (apagado) sin romper la pantalla.
            this.puedeActivarse = false;
            return;
          }
          this.puedeActivarse = !!bot.puedeActivarse;
          this.form.patchValue(
            {
              enabled: !!bot.enabled,
              modoSombra: bot.modoSombra !== false,
              topeTurnos: Number(bot.topeTurnos) || 20,
              mensajeBienvenida: bot.mensajeBienvenida || '',
              anunciarQueEsBot: bot.anunciarQueEsBot !== false,
              horarioHabilitado: !!bot.horarioHabilitado,
              horarioDesde: bot.horarioDesde || '08:00',
              horarioHasta: bot.horarioHasta || '18:00',
              horarioDias:
                Array.isArray(bot.horarioDias) && bot.horarioDias.length > 0
                  ? bot.horarioDias
                  : [1, 2, 3, 4, 5, 6],
            },
            { emitEvent: false }
          );
        },
        error: (err) => {
          this.loadError =
            err?.error?.message || err?.message || 'No se pudo cargar el bot.';
        },
      });
  }

  get botEncendido(): boolean {
    return !!this.form?.get('enabled')?.value;
  }

  diaActivo(valor: number): boolean {
    const dias: number[] = this.form?.get('horarioDias')?.value || [];
    return dias.includes(valor);
  }

  toggleDia(valor: number): void {
    const control = this.form.get('horarioDias');
    const dias: number[] = [...(control?.value || [])];
    const i = dias.indexOf(valor);
    if (i >= 0) dias.splice(i, 1);
    else dias.push(valor);
    control?.setValue(dias.sort((a, b) => a - b));
  }

  guardar(): void {
    if (this.saving) return;
    const raw = this.form.getRawValue();

    const tope = Math.min(Math.max(parseInt(raw.topeTurnos, 10) || 20, 1), 100);

    this.saving = true;
    this.configService
      .updateBotConfig({
        enabled: !!raw.enabled,
        modoSombra: !!raw.modoSombra,
        topeTurnos: tope,
        mensajeBienvenida: String(raw.mensajeBienvenida || '').slice(0, 500),
        anunciarQueEsBot: !!raw.anunciarQueEsBot,
        horarioHabilitado: !!raw.horarioHabilitado,
        horarioDesde: raw.horarioDesde || '08:00',
        horarioHasta: raw.horarioHasta || '18:00',
        horarioDias: raw.horarioDias || [1, 2, 3, 4, 5, 6],
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.saving = false))
      )
      .subscribe({
        next: (bot) => {
          if (bot) this.puedeActivarse = !!bot.puedeActivarse;
          this.form.patchValue({ topeTurnos: tope }, { emitEvent: false });
          this.toastr.success(
            raw.enabled
              ? raw.modoSombra
                ? 'Bot guardado en modo sombra: piensa pero no envía.'
                : 'Bot de pedidos encendido.'
              : 'Bot de pedidos apagado.',
            'WhatsApp'
          );
        },
        error: (err) => {
          const code = err?.error?.error;
          if (code === 'BOT_REQUIERE_NUMERO_PROPIO') {
            this.toastr.warning(
              'Para prender el bot, primero conectá el número propio de WhatsApp del comercio (sección Credenciales propias).',
              'Falta el número propio'
            );
            this.form.patchValue({ enabled: false }, { emitEvent: false });
            return;
          }
          this.toastr.error(
            err?.error?.message || err?.message || 'No se pudo guardar.',
            'Bot de pedidos'
          );
        },
      });
  }
}
