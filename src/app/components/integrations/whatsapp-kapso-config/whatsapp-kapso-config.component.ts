import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  WhatsappIntegrationConfig,
  WhatsappIntegrationConfigService,
  WhatsappNotificationType,
} from '../../../shared/services/notifications/whatsapp-integration-config.service';
import { SecurityService } from '../../../shared/services/security/security.service';

interface NotificationTypeOption {
  id: WhatsappNotificationType;
  label: string;
  description: string;
}

@Component({
  selector: 'app-whatsapp-kapso-config',
  templateUrl: './whatsapp-kapso-config.component.html',
  styleUrls: ['./whatsapp-kapso-config.component.scss'],
})
export class WhatsappKapsoConfigComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  loading = false;
  saving = false;
  testing = false;
  acceptingOptIn = false;
  loadError: string | null = null;

  currentConfig: WhatsappIntegrationConfig | null = null;
  currentCompanyName = '';

  showAdvancedCredentials = false;
  hasStoredApiKey = false;

  readonly notificationTypeOptions: NotificationTypeOption[] = [
    {
      id: 'ORDER_CREATED',
      label: 'Pedido creado',
      description: 'Se envía cuando el comercio recibe un nuevo pedido.',
    },
    {
      id: 'PAYMENT_APPROVED',
      label: 'Pago aprobado',
      description: 'Confirmación de pago exitoso al cliente.',
    },
    {
      id: 'PRODUCTION_COMPLETED',
      label: 'Producción terminada',
      description: 'El pedido está listo para despachar.',
    },
    {
      id: 'ORDER_DISPATCHED',
      label: 'Pedido despachado',
      description: 'El pedido salió a ruta de entrega.',
    },
    {
      id: 'ORDER_DELIVERED',
      label: 'Pedido entregado',
      description: 'Confirmación de entrega al cliente.',
    },
    {
      id: 'ORDER_PROCESS_REJECTED',
      label: 'Proceso rechazado',
      description: 'Alerta de rechazo en el flujo del pedido.',
    },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private configService: WhatsappIntegrationConfigService,
    private toastr: ToastrService,
    private security: SecurityService
  ) {}

  ngOnInit(): void {
    this.resolveCurrentCompanyName();
    this.buildForm();
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // Estado derivado
  // ============================================================

  get optInAccepted(): boolean {
    return this.currentConfig?.optIn?.accepted === true;
  }

  get statusLabel(): string {
    if (!this.optInAccepted) return 'Pendiente opt-in';
    return this.form?.get('enabled')?.value ? 'Activo' : 'Inactivo';
  }

  get statusClass(): string {
    if (!this.optInAccepted) return 'status-chip status-chip--warning';
    return this.form?.get('enabled')?.value
      ? 'status-chip status-chip--success'
      : 'status-chip status-chip--muted';
  }

  get canSendTest(): boolean {
    return this.optInAccepted && this.form?.get('enabled')?.value && !this.saving;
  }

  get autoRespondPreview(): string {
    const raw = this.form?.get('autoRespond.message')?.value || '';
    const contact = this.form?.get('autoRespond.contact')?.value || '';
    const nombreComercio =
      this.form?.get('commercialNameOverride')?.value
        ? this.form?.get('commercialName')?.value || this.currentCompanyName
        : this.currentCompanyName;
    return String(raw)
      .replace(/\{nombreComercio\}/g, nombreComercio || '')
      .replace(/\{contacto\}/g, contact || '');
  }

  get commercialNamePlaceholder(): string {
    return this.currentCompanyName || 'Nombre del comercio';
  }

  // ============================================================
  // Construcción del form
  // ============================================================

  private buildForm(): void {
    this.form = this.fb.group({
      enabled: [false],
      commercialName: [''],
      commercialNameOverride: [false],
      enabledNotificationTypes: this.fb.group(
        this.notificationTypeOptions.reduce((acc, opt) => {
          acc[opt.id] = [true];
          return acc;
        }, {} as Record<string, any>)
      ),
      autoRespond: this.fb.group({
        enabled: [false],
        message: [
          'Gracias por escribir a {nombreComercio}. Un asesor te responderá pronto. Contacto: {contacto}',
        ],
        contact: [''],
      }),
      ownCredentials: this.fb.group({
        enabled: [false],
        apiKey: [''],
        phoneNumberId: [''],
        baseUrl: [''],
      }),
    });
  }

  // ============================================================
  // Carga / Persistencia
  // ============================================================

  private resolveCurrentCompanyName(): void {
    try {
      const info: any = this.security?.getCompanyInformationLogged?.();
      this.currentCompanyName =
        info?.nomComercial ||
        info?.nombreComercio ||
        info?.razonSocial ||
        info?.nombre ||
        '';
    } catch {
      this.currentCompanyName = '';
    }
  }

  loadConfig(): void {
    this.loading = true;
    this.loadError = null;

    this.configService
      .getConfig()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res) => {
          if (res?.success && res.data) {
            this.applyConfig(res.data);
          } else {
            this.loadError = 'No se pudo cargar la configuración de WhatsApp.';
          }
        },
        error: (err) => {
          this.loadError =
            err?.error?.message ||
            err?.message ||
            'Error inesperado al cargar la configuración.';
        },
      });
  }

  private applyConfig(cfg: WhatsappIntegrationConfig): void {
    this.currentConfig = cfg;

    const enabledTypesGroup = this.notificationTypeOptions.reduce(
      (acc, opt) => {
        acc[opt.id] = (cfg.enabledNotificationTypes || []).includes(opt.id);
        return acc;
      },
      {} as Record<string, boolean>
    );

    this.hasStoredApiKey = !!(
      cfg.ownCredentials?.enabled &&
      // El backend NO devuelve la apiKey en claro; devuelve flag o mask.
      ((cfg.ownCredentials as any)?.hasApiKey ||
        (cfg.ownCredentials?.apiKey && cfg.ownCredentials.apiKey.length > 0))
    );

    this.form.patchValue(
      {
        enabled: !!cfg.enabled,
        commercialName: cfg.commercialName || '',
        commercialNameOverride: !!cfg.commercialNameOverride,
        enabledNotificationTypes: enabledTypesGroup,
        autoRespond: {
          enabled: !!cfg.autoRespond?.enabled,
          message: cfg.autoRespond?.message || '',
          contact: cfg.autoRespond?.contact || '',
        },
        ownCredentials: {
          enabled: !!cfg.ownCredentials?.enabled,
          // No precargamos apiKey por seguridad; solo se manda si el user la cambia.
          apiKey: '',
          phoneNumberId: cfg.ownCredentials?.phoneNumberId || '',
          baseUrl: cfg.ownCredentials?.baseUrl || '',
        },
      },
      { emitEvent: false }
    );

    this.showAdvancedCredentials = !!cfg.ownCredentials?.enabled;
  }

  toggleAdvancedCredentials(): void {
    this.showAdvancedCredentials = !this.showAdvancedCredentials;
  }

  // ============================================================
  // Acciones
  // ============================================================

  acceptOptIn(): void {
    if (this.acceptingOptIn) return;
    this.acceptingOptIn = true;

    this.configService
      .acceptOptIn()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.acceptingOptIn = false))
      )
      .subscribe({
        next: (res) => {
          if (res?.success && res.data) {
            this.applyConfig(res.data);
            this.toastr.success(
              'Aceptaste los términos. Ya podés activar WhatsApp.',
              'Opt-in registrado'
            );
          } else {
            this.toastr.error(
              res?.message || 'No fue posible registrar el opt-in.'
            );
          }
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message || err?.message || 'Error registrando opt-in.'
          );
        },
      });
  }

  saveConfig(): void {
    if (this.saving) return;

    if (!this.optInAccepted && this.form.get('enabled')?.value) {
      this.toastr.warning(
        'Primero tenés que aceptar los Términos y Condiciones.',
        'Opt-in requerido'
      );
      return;
    }

    const raw = this.form.getRawValue();
    const enabledTypes: WhatsappNotificationType[] =
      this.notificationTypeOptions
        .filter((opt) => !!raw.enabledNotificationTypes?.[opt.id])
        .map((opt) => opt.id);

    const payload: Partial<WhatsappIntegrationConfig> = {
      enabled: !!raw.enabled,
      commercialName: raw.commercialName || null,
      commercialNameOverride: !!raw.commercialNameOverride,
      enabledNotificationTypes: enabledTypes,
      autoRespond: {
        enabled: !!raw.autoRespond?.enabled,
        message: raw.autoRespond?.message || null,
        contact: raw.autoRespond?.contact || null,
      },
      ownCredentials: {
        enabled: !!raw.ownCredentials?.enabled,
        // Solo enviamos apiKey si el usuario digitó una nueva
        ...(raw.ownCredentials?.apiKey
          ? { apiKey: raw.ownCredentials.apiKey }
          : {}),
        phoneNumberId: raw.ownCredentials?.phoneNumberId || null,
        baseUrl: raw.ownCredentials?.baseUrl || null,
      },
    };

    this.saving = true;
    this.configService
      .updateConfig(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.saving = false))
      )
      .subscribe({
        next: (res) => {
          if (res?.success && res.data) {
            this.applyConfig(res.data);
            this.toastr.success(
              'Configuración de WhatsApp actualizada.',
              'Guardado'
            );
          } else {
            this.toastr.error(
              res?.message || 'No fue posible guardar la configuración.'
            );
          }
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message ||
              err?.message ||
              'Error guardando la configuración.'
          );
        },
      });
  }

  sendTest(): void {
    if (!this.canSendTest || this.testing) return;
    this.testing = true;

    this.configService
      .sendTest()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.testing = false))
      )
      .subscribe({
        next: (res) => {
          if (res?.success) {
            this.toastr.success(
              res.message || 'Mensaje de prueba enviado.',
              'Envío exitoso'
            );
          } else {
            this.toastr.warning(
              res?.message || 'No fue posible enviar el mensaje de prueba.'
            );
          }
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message ||
              err?.message ||
              'Error enviando mensaje de prueba.'
          );
        },
      });
  }
}
