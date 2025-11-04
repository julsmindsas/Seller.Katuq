import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

interface ZonaCobro {
  ciudad: string;
  nombreZonaCobro: string;
  valorZonaCobro: number;
  impuestoZonaCobro: number;
  impuesto?: number;  // Calculated
  total?: number;     // Calculated
  activo: boolean;
  company?: string;
}

/**
 * Step: Billing Zones Configuration
 * Configuración de zonas de cobro y tarifas de envío
 */
@Component({
  selector: 'app-billing-zones-step',
  templateUrl: './billing-zones-step.component.html',
  styleUrls: ['./billing-zones-step.component.scss']
})
export class BillingZonesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  zoneForm!: FormGroup;
  zonesList: ZonaCobro[] = [];
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  // Ciudades disponibles (cargadas desde localStorage, formato {label, value})
  availableCities: any[] = [];

  // Plantillas predefinidas (ciudad se deja vacía para que el usuario la seleccione)
  predefinedTemplates = [
    { ciudad: '', nombreZonaCobro: 'Zona Norte', valorZonaCobro: 5000, impuestoZonaCobro: 19, activo: true },
    { ciudad: '', nombreZonaCobro: 'Zona Sur', valorZonaCobro: 8000, impuestoZonaCobro: 19, activo: true },
    { ciudad: '', nombreZonaCobro: 'Zona Centro', valorZonaCobro: 4000, impuestoZonaCobro: 19, activo: true },
    { ciudad: '', nombreZonaCobro: 'Zona Oriente', valorZonaCobro: 6000, impuestoZonaCobro: 19, activo: true },
    { ciudad: '', nombreZonaCobro: 'Zona Occidente', valorZonaCobro: 6000, impuestoZonaCobro: 19, activo: true },
    { ciudad: '', nombreZonaCobro: 'Nacional', valorZonaCobro: 15000, impuestoZonaCobro: 19, activo: true }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private maestroService: MaestroService
  ) {}

  ngOnInit(): void {
    this.loadCitiesFromLocalStorage();
    this.initForm();
    this.loadInitialData();
    this.setupCalculations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga ciudades desde localStorage
   */
  private loadCitiesFromLocalStorage(): void {
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      if (company.ciudadess?.ciudadesEntrega) {
        this.availableCities = company.ciudadess.ciudadesEntrega;
        console.log('✅ Ciudades cargadas desde ciudadess.ciudadesEntrega:', this.availableCities.length);
      } else if (company.ciudadesEntrega) {
        this.availableCities = company.ciudadesEntrega;
        console.log('✅ Ciudades cargadas desde ciudadesEntrega:', this.availableCities.length);
      } else {
        // Fallback a ciudades principales de Colombia
        this.availableCities = [
          { label: 'Bogotá', value: 'Bogotá' },
          { label: 'Medellín', value: 'Medellín' },
          { label: 'Cali', value: 'Cali' },
          { label: 'Barranquilla', value: 'Barranquilla' },
          { label: 'Cartagena', value: 'Cartagena' },
          { label: 'Bucaramanga', value: 'Bucaramanga' }
        ];
        console.log('ℹ️ Usando ciudades por defecto (fallback)');
      }
    } catch (error) {
      console.error('❌ Error loading cities from localStorage:', error);
      this.availableCities = [
        { label: 'Bogotá', value: 'Bogotá' },
        { label: 'Medellín', value: 'Medellín' },
        { label: 'Cali', value: 'Cali' },
        { label: 'Barranquilla', value: 'Barranquilla' },
        { label: 'Cartagena', value: 'Cartagena' },
        { label: 'Bucaramanga', value: 'Bucaramanga' }
      ];
    }
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.zoneForm = this.fb.group({
      ciudad: ['', Validators.required],
      nombreZonaCobro: ['', [Validators.required, Validators.minLength(3)]],
      valorZonaCobro: [null, [Validators.required, Validators.min(1)]],
      impuestoZonaCobro: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
      activo: [true]
    });
  }

  /**
   * Configura cálculos automáticos
   */
  private setupCalculations(): void {
    this.zoneForm.get('valorZonaCobro')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateCalculations());

    this.zoneForm.get('impuestoZonaCobro')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateCalculations());
  }

  /**
   * Actualiza cálculos de impuesto y total
   */
  private updateCalculations(): void {
    const valor = this.zoneForm.get('valorZonaCobro')?.value || 0;
    const impuestoPorcentaje = this.zoneForm.get('impuestoZonaCobro')?.value || 0;
    // Impuesto y total se calculan al guardar
  }

  /**
   * Calcula impuesto y total para una zona
   */
  private calculateZoneValues(zone: Partial<ZonaCobro>): ZonaCobro {
    const valor = zone.valorZonaCobro || 0;
    const impuestoPorcentaje = zone.impuestoZonaCobro || 0;
    const impuesto = (valor * impuestoPorcentaje) / 100;
    const total = valor + impuesto;

    return {
      ...zone,
      impuesto,
      total
    } as ZonaCobro;
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.zonesList = this.initialData.data;

      // Auto-completar si ya hay zonas configuradas
      if (this.zonesList.length > 0) {
        console.log('📍 Cargando zonas de cobro existentes:', this.zonesList.length);
        setTimeout(() => {
          this.stepComplete.emit({ data: this.zonesList });
        }, 0);
      }
    }

    // Aplicar sugerencia de IA si existe
    if (this.aiSuggestion && !this.initialData) {
      this.applySuggestion();
    }
  }

  /**
   * Aplica sugerencia de IA
   */
  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;

    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.zonesList = this.aiSuggestion.suggestedData;
    } else if (this.aiSuggestion.suggestedData.billingZones) {
      this.zonesList = this.aiSuggestion.suggestedData.billingZones;
    }
  }

  /**
   * Usa una plantilla predefinida
   */
  useTemplate(template: any): void {
    this.zoneForm.patchValue(template);
  }

  /**
   * Agrega una zona de cobro a la lista
   */
  addZone(): void {
    if (this.zoneForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const formValue = this.zoneForm.value;

    // Calcular impuesto y total
    const zoneData: ZonaCobro = this.calculateZoneValues(formValue);

    // Verificar que no exista ya una zona con el mismo nombre
    const existsName = this.zonesList.some(
      (z, idx) => z.nombreZonaCobro.toLowerCase() === zoneData.nombreZonaCobro.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe una zona de cobro con este nombre'
      });
      return;
    }

    if (this.editingIndex !== null) {
      // Editar zona existente
      this.zonesList[this.editingIndex] = zoneData;
      this.editingIndex = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Zona de cobro actualizada correctamente'
      });
    } else {
      // Agregar nueva zona
      this.zonesList.push(zoneData);
      this.messageService.add({
        severity: 'success',
        summary: 'Agregado',
        detail: 'Zona de cobro agregada a la lista'
      });
    }

    this.zoneForm.reset({ activo: true, valorZonaCobro: null, impuestoZonaCobro: 19 });
    this.dataChange.emit({ data: this.zonesList });
  }

  /**
   * Edita una zona de la lista
   */
  editZone(index: number): void {
    this.editingIndex = index;
    const zone = this.zonesList[index];
    this.zoneForm.patchValue(zone);

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cancela la edición
   */
  cancelEdit(): void {
    this.editingIndex = null;
    this.zoneForm.reset({ activo: true, valorZonaCobro: null, impuestoZonaCobro: 19 });
  }

  /**
   * Elimina una zona de la lista
   */
  removeZone(index: number): void {
    const zone = this.zonesList[index];
    this.zonesList.splice(index, 1);
    this.dataChange.emit({ data: this.zonesList });

    this.messageService.add({
      severity: 'info',
      summary: 'Eliminado',
      detail: `Zona "${zone.nombreZonaCobro}" eliminada`
    });

    // Si estaba editando esta zona, cancelar
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  /**
   * Completa el paso y guarda las zonas de cobro
   */
  async onComplete(): Promise<void> {
    if (this.zonesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos una zona de cobro para continuar'
      });
      return;
    }

    this.isSaving = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');

      // Crear zonas de cobro en el backend
      for (const zone of this.zonesList) {
        const zoneData = {
          ...zone,
          company: company.nomComercial || company.nombre
        };

        await this.maestroService.createBillingZone(zoneData).toPromise();
      }

      console.log('📍 Zonas de cobro guardadas:', this.zonesList.length);
      this.stepComplete.emit({ data: this.zonesList });

      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.zonesList.length} zona(s) de cobro configurada(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando zonas de cobro:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración de zonas de cobro'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Formatea el costo como moneda COP
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormAsTouched(): void {
    Object.keys(this.zoneForm.controls).forEach(key => {
      this.zoneForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.zoneForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.zoneForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    if (control?.hasError('min')) {
      const min = control.errors?.['min'].min;
      return `El valor mínimo es ${min}`;
    }

    if (control?.hasError('max')) {
      const max = control.errors?.['max'].max;
      return `El valor máximo es ${max}`;
    }

    return '';
  }
}
