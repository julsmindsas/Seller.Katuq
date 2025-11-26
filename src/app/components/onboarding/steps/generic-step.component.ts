import { Component, OnInit, Output, EventEmitter, Input, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OnboardingStepId } from '../models/onboarding-state.model';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { MessageService } from 'primeng/api';

/**
 * Componente genérico para steps del onboarding
 * Permite completar pasos con datos básicos o configuración manual detallada
 */
@Component({
  selector: 'app-generic-step',
  template: `
    <div class="generic-step-container">
      <div class="step-info-box">
        <div class="icon-container">
          <i class="pi" [ngClass]="stepConfig.icon"></i>
        </div>
        <h3>{{ stepConfig.title }}</h3>
        <p class="description">{{ stepConfig.description }}</p>

        <div class="step-status">
          <p-chip
            [label]="'Tiempo estimado: ' + stepConfig.estimatedTime + ' min'"
            [style]="{'background-color': 'var(--blue-100)', 'color': 'var(--blue-800)'}">
          </p-chip>
        </div>
      </div>

      <!-- Info Cards -->
      <div class="info-cards" *ngIf="stepConfig.infoCards && stepConfig.infoCards.length > 0">
        <p-card *ngFor="let card of stepConfig.infoCards" styleClass="info-card">
          <div class="card-content">
            <i class="pi" [ngClass]="card.icon"></i>
            <div>
              <h4>{{ card.title }}</h4>
              <p>{{ card.text }}</p>
            </div>
          </div>
        </p-card>
      </div>

      <!-- AI Suggestion Notice -->
      <div class="ai-notice" *ngIf="aiSuggestion && stepConfig.hasAI">
        <i class="pi pi-sparkles"></i>
        <span>Tenemos sugerencias inteligentes para este paso basadas en tu sector de negocio</span>
      </div>

      <!-- Datos Existentes -->
      <p-card *ngIf="hasExistingData()">
        <div class="existing-data-notice">
          <i class="pi pi-check-circle"></i>
          <h4>¡Ya tienes esto configurado!</h4>
          <p>Encontramos {{ getDataCount() }} elementos ya configurados para este paso.</p>

          <div class="existing-data-summary">
            <p-chip
              [label]="getDataCount() + ' configurados'"
              [style]="{'background-color': 'var(--green-100)', 'color': 'var(--green-800)', 'font-size': '1.1rem'}">
            </p-chip>
          </div>

          <p class="edit-hint">Puedes editar estos datos desde el menú de configuración o continuar al siguiente paso.</p>
        </div>
      </p-card>

      <!-- Simple Form -->
      <p-card *ngIf="!isConfigured && !hasExistingData() && !showConfigForm">
        <div class="configuration-notice">
          <i class="pi pi-wrench"></i>
          <h4>Configuración Pendiente</h4>
          <p>Este paso se configurará automáticamente según los datos de tu negocio, o puedes configurarlo manualmente ahora haciendo clic en "Configurar Ahora".</p>

          <div class="quick-options mt-4" *ngIf="stepConfig.quickOptions">
            <h5>Opciones Rápidas:</h5>
            <div class="options-list">
              <div
                *ngFor="let option of stepConfig.quickOptions"
                class="option-item"
                (click)="selectQuickOption(option)">
                <i class="pi pi-check-circle"></i>
                <span>{{ option.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </p-card>

      <!-- FORMULARIOS DE CONFIGURACIÓN MANUAL -->
      <p-card *ngIf="showConfigForm && !hasExistingData()">
        <div class="config-form-container">
          <h4 class="config-form-title">
            <i class="pi pi-pencil"></i>
            Configuración Manual - {{ stepConfig.title }}
          </h4>
          <p class="config-form-description">Complete los siguientes datos para configurar este paso:</p>

          <!-- Formulario: Formas de Entrega -->
          <form *ngIf="stepId === 'delivery-methods'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreFormaEntrega">Nombre de Forma de Entrega *</label>
                <input
                  id="nombreFormaEntrega"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: Domicilio, Recogida en tienda"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="descripcionFormaEntrega">Descripción</label>
                <textarea
                  id="descripcionFormaEntrega"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe esta forma de entrega"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoFormaEntrega"
                ></p-checkbox>
                <label for="activoFormaEntrega">Activo</label>
              </div>
            </div>
          </form>

          <!-- Formulario: Tipos de Entrega -->
          <form *ngIf="stepId === 'delivery-types'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreTipoEntrega">Nombre del Tipo de Entrega *</label>
                <input
                  id="nombreTipoEntrega"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: Estándar, Express, Same Day"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="descripcionTipoEntrega">Descripción</label>
                <textarea
                  id="descripcionTipoEntrega"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe este tipo de entrega"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoTipoEntrega"
                ></p-checkbox>
                <label for="activoTipoEntrega">Activo</label>
              </div>
            </div>
          </form>

          <!-- Formulario: Tiempos de Entrega -->
          <form *ngIf="stepId === 'delivery-times'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreTiempoEntrega">Nombre del Tiempo de Entrega *</label>
                <input
                  id="nombreTiempoEntrega"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: 24 horas, 2-3 días, 1 semana"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="diasMinimos">Días Mínimos *</label>
                <p-inputNumber
                  id="diasMinimos"
                  formControlName="diasMinimos"
                  [min]="0"
                  [max]="365"
                  placeholder="Ej: 1"
                ></p-inputNumber>
                <small class="p-error" *ngIf="configForm.get('diasMinimos')?.invalid && configForm.get('diasMinimos')?.touched">
                  Los días mínimos son requeridos
                </small>
              </div>

              <div class="field">
                <label for="diasMaximos">Días Máximos *</label>
                <p-inputNumber
                  id="diasMaximos"
                  formControlName="diasMaximos"
                  [min]="0"
                  [max]="365"
                  placeholder="Ej: 3"
                ></p-inputNumber>
                <small class="p-error" *ngIf="configForm.get('diasMaximos')?.invalid && configForm.get('diasMaximos')?.touched">
                  Los días máximos son requeridos
                </small>
              </div>

              <div class="field">
                <label for="descripcionTiempoEntrega">Descripción</label>
                <textarea
                  id="descripcionTiempoEntrega"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe este tiempo de entrega"
                  rows="2"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoTiempoEntrega"
                ></p-checkbox>
                <label for="activoTiempoEntrega">Activo</label>
              </div>
            </div>
          </form>

          <!-- Formulario: Formas de Pago -->
          <form *ngIf="stepId === 'payment-methods'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreFormaPago">Nombre de Forma de Pago *</label>
                <input
                  id="nombreFormaPago"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: Efectivo, Tarjeta de Crédito, PSE"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="descripcionFormaPago">Descripción</label>
                <textarea
                  id="descripcionFormaPago"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe esta forma de pago"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoFormaPago"
                ></p-checkbox>
                <label for="activoFormaPago">Activo</label>
              </div>
            </div>
          </form>

          <!-- Formulario: Categorías -->
          <form *ngIf="stepId === 'categories'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreCategoria">Nombre de Categoría *</label>
                <input
                  id="nombreCategoria"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: Electrónicos, Ropa, Alimentos"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="descripcionCategoria">Descripción</label>
                <textarea
                  id="descripcionCategoria"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe esta categoría"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoCategoria"
                ></p-checkbox>
                <label for="activoCategoria">Activa</label>
              </div>
            </div>
          </form>

          <!-- Formulario: Zonas de Cobro -->
          <form *ngIf="stepId === 'billing-zones'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreZona">Nombre de Zona *</label>
                <input
                  id="nombreZona"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: Zona Norte, Centro, Sur"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="costoEnvio">Costo de Envío *</label>
                <p-inputNumber
                  id="costoEnvio"
                  formControlName="costoEnvio"
                  mode="currency"
                  currency="COP"
                  locale="es-CO"
                  [min]="0"
                  placeholder="Ej: 5000"
                ></p-inputNumber>
                <small class="p-error" *ngIf="configForm.get('costoEnvio')?.invalid && configForm.get('costoEnvio')?.touched">
                  El costo de envío es requerido
                </small>
              </div>

              <div class="field">
                <label for="descripcionZona">Descripción</label>
                <textarea
                  id="descripcionZona"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe esta zona de cobro (ciudades, barrios incluidos)"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoZona"
                ></p-checkbox>
                <label for="activoZona">Activa</label>
              </div>
            </div>
          </form>

          <!-- Formulario: Adiciones -->
          <form *ngIf="stepId === 'addons'" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreAdicion">Nombre de Adición *</label>
                <input
                  id="nombreAdicion"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ej: Tarjeta de regalo, Empaque especial"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="precioAdicion">Precio</label>
                <p-inputNumber
                  id="precioAdicion"
                  formControlName="precio"
                  mode="currency"
                  currency="COP"
                  locale="es-CO"
                  [min]="0"
                  placeholder="Ej: 2000"
                ></p-inputNumber>
              </div>

              <div class="field">
                <label for="descripcionAdicion">Descripción</label>
                <textarea
                  id="descripcionAdicion"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe esta adición"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoAdicion"
                ></p-checkbox>
                <label for="activoAdicion">Activa</label>
              </div>
            </div>
          </form>

          <!-- Formulario Genérico para otros pasos -->
          <form *ngIf="shouldShowGenericForm()" [formGroup]="configForm" class="onboarding-form">
            <div class="p-fluid">
              <div class="field">
                <label for="nombreGenerico">Nombre *</label>
                <input
                  id="nombreGenerico"
                  type="text"
                  pInputText
                  formControlName="nombre"
                  placeholder="Ingrese un nombre descriptivo"
                />
                <small class="p-error" *ngIf="configForm.get('nombre')?.invalid && configForm.get('nombre')?.touched">
                  El nombre es requerido
                </small>
              </div>

              <div class="field">
                <label for="descripcionGenerica">Descripción</label>
                <textarea
                  id="descripcionGenerica"
                  pInputTextarea
                  formControlName="descripcion"
                  placeholder="Describe este elemento"
                  rows="3"
                ></textarea>
              </div>

              <div class="field-checkbox">
                <p-checkbox
                  formControlName="activo"
                  [binary]="true"
                  inputId="activoGenerico"
                ></p-checkbox>
                <label for="activoGenerico">Activo</label>
              </div>
            </div>
          </form>

          <!-- Botones del formulario -->
          <div class="config-form-actions">
            <button
              pButton
              type="button"
              label="Cancelar"
              icon="pi pi-times"
              class="p-button-outlined p-button-secondary"
              (click)="cancelConfiguration()"
              [disabled]="isSaving"
            ></button>

            <button
              pButton
              type="button"
              label="Guardar Configuración"
              icon="pi pi-save"
              class="p-button-success"
              (click)="saveConfiguration()"
              [disabled]="!configForm.valid || isSaving"
              [loading]="isSaving"
            ></button>
          </div>
        </div>
      </p-card>

      <!-- Action Buttons -->
      <div class="step-actions">
        <button
          pButton
          type="button"
          label="Configurar Ahora"
          icon="pi pi-cog"
          class="p-button-outlined"
          *ngIf="!hasExistingData() && !showConfigForm && !isConfigured"
          (click)="onConfigure()">
        </button>

        <button
          pButton
          type="button"
          [label]="getCompleteButtonLabel()"
          [icon]="getCompleteButtonIcon()"
          [class.p-button-success]="canComplete()"
          [disabled]="!canComplete() && stepConfig.isRequired"
          (click)="onComplete()">
        </button>
      </div>

      <p class="skip-notice" *ngIf="!stepConfig.isRequired && !hasExistingData()">
        <i class="pi pi-info-circle"></i>
        Este paso es opcional y puede completarse más tarde
      </p>

      <p class="required-notice" *ngIf="stepConfig.isRequired && !canComplete()">
        <i class="pi pi-exclamation-triangle"></i>
        Este paso es obligatorio. Debes configurarlo para continuar.
      </p>
    </div>
  `,
  styleUrls: ['./generic-step.component.scss'],
  providers: [MessageService]
})
export class GenericStepComponent implements OnInit, OnDestroy {
  @Input() stepId!: OnboardingStepId;
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  isConfigured = false;
  showConfigForm = false;
  isSaving = false;
  configForm!: FormGroup;
  stepConfig: any = {};

  // Configuraciones para cada tipo de paso
  private stepConfigurations: { [key: string]: any } = {
    [OnboardingStepId.ROLES_SETUP]: {
      title: 'Roles y Permisos',
      description: 'Define los roles de usuario para tu equipo',
      icon: 'pi-shield',
      estimatedTime: 3,
      isRequired: true,
      hasAI: true,
      infoCards: [
        {
          icon: 'pi-users',
          title: 'Control de Acceso',
          text: 'Crea roles personalizados con permisos específicos para cada área de tu negocio'
        },
        {
          icon: 'pi-lock',
          title: 'Seguridad',
          text: 'Protege la información sensible limitando el acceso según el rol'
        }
      ],
      quickOptions: [
        { value: 'basic', label: 'Configuración Básica (Administrador, Vendedor, Bodeguero)' },
        { value: 'advanced', label: 'Configuración Avanzada (Roles Personalizados)' }
      ]
    },
    [OnboardingStepId.USERS_SETUP]: {
      title: 'Usuarios',
      description: 'Crea el usuario administrador inicial',
      icon: 'pi-users',
      estimatedTime: 2,
      isRequired: true,
      hasAI: false,
      infoCards: [
        {
          icon: 'pi-user-plus',
          title: 'Usuario Administrador',
          text: 'Configura el primer usuario con permisos completos'
        }
      ]
    },
    [OnboardingStepId.DELIVERY_METHODS]: {
      title: 'Formas de Entrega',
      description: 'Define cómo entregarás los productos a tus clientes',
      icon: 'pi-truck',
      estimatedTime: 4,
      isRequired: true,
      hasAI: true,
      infoCards: [
        {
          icon: 'pi-map-marker',
          title: 'Opciones de Entrega',
          text: 'Domicilio, Recogida en tienda, Mensajería especializada'
        }
      ],
      quickOptions: [
        { value: 'delivery', label: 'Solo Domicilio' },
        { value: 'pickup', label: 'Solo Recogida en Tienda' },
        { value: 'both', label: 'Ambas Opciones' }
      ]
    },
    [OnboardingStepId.DELIVERY_TYPES]: {
      title: 'Tipos de Entrega',
      description: 'Configura los tipos de entrega (normal, express, etc.)',
      icon: 'pi-box',
      estimatedTime: 3,
      isRequired: true,
      hasAI: true,
      quickOptions: [
        { value: 'standard', label: 'Entrega Estándar' },
        { value: 'express', label: 'Entrega Express' },
        { value: 'custom', label: 'Configuración Personalizada' }
      ]
    },
    [OnboardingStepId.DELIVERY_TIMES]: {
      title: 'Tiempos de Entrega',
      description: 'Establece los tiempos de entrega para cada tipo',
      icon: 'pi-clock',
      estimatedTime: 3,
      isRequired: true,
      hasAI: true
    },
    [OnboardingStepId.PAYMENT_METHODS]: {
      title: 'Formas de Pago',
      description: 'Configura los métodos de pago que aceptarás',
      icon: 'pi-credit-card',
      estimatedTime: 4,
      isRequired: true,
      hasAI: true,
      infoCards: [
        {
          icon: 'pi-money-bill',
          title: 'Múltiples Métodos',
          text: 'Efectivo, Tarjetas, Transferencias, Billeteras Digitales'
        }
      ],
      quickOptions: [
        { value: 'cash', label: 'Solo Efectivo' },
        { value: 'digital', label: 'Pagos Digitales' },
        { value: 'all', label: 'Todos los Métodos' }
      ]
    },
    [OnboardingStepId.BILLING_ZONES]: {
      title: 'Zonas de Cobro',
      description: 'Define las zonas geográficas y sus tarifas de envío',
      icon: 'pi-map-marker',
      estimatedTime: 5,
      isRequired: true,
      hasAI: false
    },
    [OnboardingStepId.CATEGORIES]: {
      title: 'Categorías de Productos',
      description: 'Organiza tu catálogo con categorías',
      icon: 'pi-tags',
      estimatedTime: 4,
      isRequired: true,
      hasAI: true,
      infoCards: [
        {
          icon: 'pi-th-large',
          title: 'Organización',
          text: 'Facilita la navegación de tus clientes con categorías claras'
        }
      ]
    },
    [OnboardingStepId.ADDONS]: {
      title: 'Adiciones',
      description: 'Añade productos complementarios o extras',
      icon: 'pi-plus-circle',
      estimatedTime: 3,
      isRequired: false,
      hasAI: true
    },
    [OnboardingStepId.WAREHOUSES]: {
      title: 'Bodegas e Inventarios',
      description: 'Configura tus bodegas y canales de venta',
      icon: 'pi-home',
      estimatedTime: 5,
      isRequired: true,
      hasAI: false,
      infoCards: [
        {
          icon: 'pi-warehouse',
          title: 'Gestión de Stock',
          text: 'Control de inventario en múltiples ubicaciones'
        }
      ]
    },
    [OnboardingStepId.FIRST_PRODUCT]: {
      title: 'Primer Producto',
      description: 'Crea tu primer producto o usa uno de demostración',
      icon: 'pi-shopping-bag',
      estimatedTime: 6,
      isRequired: true,
      hasAI: true,
      infoCards: [
        {
          icon: 'pi-star',
          title: 'Comienza a Vender',
          text: 'Configura tu primer producto para empezar a recibir pedidos'
        }
      ]
    },
    [OnboardingStepId.SEQUENCES]: {
      title: 'Consecutivos',
      description: 'Configura los consecutivos para tus ventas',
      icon: 'pi-list-check',
      estimatedTime: 2,
      isRequired: true,
      hasAI: false
    }
  };

  constructor(
    private fb: FormBuilder,
    private maestroService: MaestroService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.stepConfig = this.stepConfigurations[this.stepId] || {};
    this.initializeForm();

    if (this.initialData) {
      this.isConfigured = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario reactivo según el tipo de paso
   */
  private initializeForm(): void {
    switch (this.stepId) {
      case OnboardingStepId.DELIVERY_TIMES:
        this.configForm = this.fb.group({
          nombre: ['', Validators.required],
          diasMinimos: [1, [Validators.required, Validators.min(0)]],
          diasMaximos: [3, [Validators.required, Validators.min(0)]],
          descripcion: [''],
          activo: [true]
        });
        break;

      case OnboardingStepId.BILLING_ZONES:
        this.configForm = this.fb.group({
          nombre: ['', Validators.required],
          costoEnvio: [0, [Validators.required, Validators.min(0)]],
          descripcion: [''],
          activo: [true]
        });
        break;

      case OnboardingStepId.ADDONS:
        this.configForm = this.fb.group({
          nombre: ['', Validators.required],
          precio: [0, Validators.min(0)],
          descripcion: [''],
          activo: [true]
        });
        break;

      default:
        // Formulario genérico para otros pasos
        this.configForm = this.fb.group({
          nombre: ['', Validators.required],
          descripcion: [''],
          activo: [true]
        });
        break;
    }
  }

  /**
   * Determina si debe mostrar el formulario genérico
   */
  shouldShowGenericForm(): boolean {
    const specificForms = [
      'delivery-methods',
      'delivery-types',
      'delivery-times',
      'payment-methods',
      'categories',
      'billing-zones',
      'addons'
    ];
    return !specificForms.includes(this.stepId);
  }

  /**
   * Verifica si hay datos existentes para este paso
   */
  hasExistingData(): boolean {
    if (!this.initialData) return false;

    // Si tiene count > 0
    if (typeof this.initialData.count === 'number') {
      return this.initialData.count > 0;
    }

    // Si tiene data array
    if (Array.isArray(this.initialData.data)) {
      return this.initialData.data.length > 0;
    }

    // Si es un objeto con datos (ej: empresa)
    if (typeof this.initialData === 'object' && Object.keys(this.initialData).length > 1) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene el conteo de elementos configurados
   */
  getDataCount(): number {
    if (!this.initialData) return 0;

    if (typeof this.initialData.count === 'number') {
      return this.initialData.count;
    }

    if (Array.isArray(this.initialData.data)) {
      return this.initialData.data.length;
    }

    if (typeof this.initialData === 'object' && Object.keys(this.initialData).length > 1) {
      return 1; // Un registro configurado
    }

    return 0;
  }

  selectQuickOption(option: any): void {
    this.isConfigured = true;
    const data = {
      quickOption: option.value,
      configuredAt: new Date().toISOString()
    };
    this.dataChange.emit(data);
  }

  /**
   * Abre el formulario de configuración manual
   */
  onConfigure(): void {
    this.showConfigForm = true;
    this.initializeForm(); // Reinicializar el formulario
  }

  /**
   * Cancela la configuración y cierra el formulario
   */
  cancelConfiguration(): void {
    this.showConfigForm = false;
    this.configForm.reset();
    this.initializeForm();
  }

  /**
   * Guarda la configuración llamando al servicio correspondiente
   */
  async saveConfiguration(): Promise<void> {
    if (this.configForm.invalid) {
      this.markFormGroupTouched(this.configForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Inválido',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.isSaving = true;
    const formData = this.configForm.value;

    // Agregar company de sessionStorage
    const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    const dataToSave = {
      ...formData,
      company: currentCompany.nomComercial || currentCompany.nit
    };

    try {
      let response: any;

      switch (this.stepId) {
        case OnboardingStepId.DELIVERY_METHODS:
          response = await this.maestroService.createFormaEntrega(dataToSave).toPromise();
          break;

        case OnboardingStepId.DELIVERY_TYPES:
          response = await this.maestroService.createTipoEntrega(dataToSave).toPromise();
          break;

        case OnboardingStepId.DELIVERY_TIMES:
          response = await this.maestroService.createTiempoEntrega(dataToSave).toPromise();
          break;

        case OnboardingStepId.PAYMENT_METHODS:
          response = await this.maestroService.crearFormaPago(dataToSave).toPromise();
          break;

        case OnboardingStepId.CATEGORIES:
          response = await this.maestroService.createCategorias(dataToSave).toPromise();
          break;

        case OnboardingStepId.BILLING_ZONES:
          response = await this.maestroService.createBillingZone(dataToSave).toPromise();
          break;

        case OnboardingStepId.ADDONS:
          response = await this.maestroService.createAdiciones(dataToSave).toPromise();
          break;

        default:
          // Para otros pasos, solo marcar como configurado
          response = { success: true, message: 'Configuración guardada' };
          break;
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Configuración Guardada',
        detail: `${ this.stepConfig.title } configurado exitosamente`
      });

      this.isConfigured = true;
      this.showConfigForm = false;
      this.configForm.reset();

      // Emitir datos guardados
      this.dataChange.emit({
        configured: true,
        configuredAt: new Date().toISOString(),
        data: dataToSave,
        response
      });

    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'No se pudo guardar la configuración. Intente nuevamente.'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Marca todos los controles del formulario como touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onComplete(): void {
    // Si ya tiene datos existentes, marcar como completado
    if (this.hasExistingData()) {
      this.stepComplete.emit(this.initialData);
      return;
    }

    // Si configuró manualmente, emitir datos
    if (this.isConfigured) {
      const data = {
        configured: true,
        configuredAt: new Date().toISOString()
      };
      this.stepComplete.emit(data);
      return;
    }

    // Para steps requeridos, NO permitir avanzar sin configurar
    if (this.stepConfig.isRequired) {
      // No hacer nada - el botón debería estar deshabilitado
      return;
    }

    // Para steps opcionales, permitir omitir
    this.stepComplete.emit({ skipped: true });
  }

  /**
   * Verifica si puede completar el paso
   */
  canComplete(): boolean {
    return this.hasExistingData() || this.isConfigured;
  }

  /**
   * Obtiene la etiqueta del botón según el estado
   */
  getCompleteButtonLabel(): string {
    if (this.hasExistingData()) return 'Continuar';
    if (this.isConfigured) return 'Guardar y Continuar';
    if (!this.stepConfig.isRequired) return 'Omitir Paso';
    return 'Configurar Ahora';
  }

  /**
   * Obtiene el icono del botón según el estado
   */
  getCompleteButtonIcon(): string {
    if (this.hasExistingData() || this.isConfigured) return 'pi pi-check';
    if (!this.stepConfig.isRequired) return 'pi pi-forward';
    return 'pi pi-arrow-right';
  }
}
