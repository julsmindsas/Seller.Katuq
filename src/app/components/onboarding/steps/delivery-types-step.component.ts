import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { TipoEntrega } from '../../../shared/models/productos/tipoentrega/tipoentrega';

@Component({
  selector: 'app-delivery-types-step',
  templateUrl: './delivery-types-step.component.html',
  styleUrls: ['./delivery-types-step.component.scss']
})
export class DeliveryTypesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;
  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  deliveryTypeForm!: FormGroup;
  deliveryTypesList: TipoEntrega[] = [];
  formasEntrega: any[] = []; // Lista de formas de entrega disponibles
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  predefinedTemplates = [
    {
      nombreInterno: 'estandar',
      nombreExterno: 'Estándar',
      descripcion: 'Entrega en tiempo estándar',
      posicion: 1,
      activo: true,
      formaEntrega: []
    },
    {
      nombreInterno: 'express',
      nombreExterno: 'Express',
      descripcion: 'Entrega rápida en 24-48 horas',
      posicion: 2,
      activo: true,
      formaEntrega: []
    },
    {
      nombreInterno: 'same_day',
      nombreExterno: 'Same Day',
      descripcion: 'Entrega el mismo día',
      posicion: 3,
      activo: true,
      formaEntrega: []
    },
    {
      nombreInterno: 'programada',
      nombreExterno: 'Programada',
      descripcion: 'Entrega en fecha específica',
      posicion: 4,
      activo: true,
      formaEntrega: []
    },
    {
      nombreInterno: 'internacional',
      nombreExterno: 'Internacional',
      descripcion: 'Envíos fuera del país',
      posicion: 5,
      activo: true,
      formaEntrega: []
    }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private maestroService: MaestroService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadFormasEntrega();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.deliveryTypeForm = this.fb.group({
      nombreInterno: ['', [Validators.required, Validators.minLength(3)]],
      nombreExterno: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', Validators.required],
      posicion: [null, [Validators.required, Validators.min(1)]],
      formaEntrega: [[], Validators.required],
      activo: [true],
      cd: [null]
    });
  }

  /**
   * Carga las formas de entrega disponibles desde el servicio
   */
  private loadFormasEntrega(): void {
    this.maestroService.getFormaEntrega().subscribe({
      next: (formas: any) => {
        this.formasEntrega = Array.isArray(formas) ? formas : [];
        console.log('✅ Formas de entrega cargadas:', this.formasEntrega);
      },
      error: (error) => {
        console.error('❌ Error cargando formas de entrega:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar las formas de entrega'
        });
      }
    });
  }

  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.deliveryTypesList = this.initialData.data;
      if (this.deliveryTypesList.length > 0) {
        setTimeout(() => {
          this.stepComplete.emit({ data: this.deliveryTypesList });
        }, 0);
      }
    }
  }

  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;
    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.deliveryTypesList = this.aiSuggestion.suggestedData;
    }
  }

  useTemplate(template: any): void {
    this.deliveryTypeForm.patchValue(template);
  }

  addDeliveryType(): void {
    if (this.deliveryTypeForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const typeData: TipoEntrega = this.deliveryTypeForm.value;
    const existsName = this.deliveryTypesList.some(
      (t, idx) => t.nombreInterno.toLowerCase() === typeData.nombreInterno.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe un tipo de entrega con este nombre interno'
      });
      return;
    }

    if (this.editingIndex !== null) {
      this.deliveryTypesList[this.editingIndex] = typeData;
      this.editingIndex = null;
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Tipo de entrega actualizado correctamente' });
    } else {
      this.deliveryTypesList.push(typeData);
      this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Tipo de entrega agregado a la lista' });
    }

    this.deliveryTypeForm.reset({ activo: true, formaEntrega: [], cd: null });
    this.dataChange.emit({ data: this.deliveryTypesList });
  }

  editDeliveryType(index: number): void {
    this.editingIndex = index;
    this.deliveryTypeForm.patchValue(this.deliveryTypesList[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.deliveryTypeForm.reset({ activo: true, formaEntrega: [], cd: null });
  }

  removeDeliveryType(index: number): void {
    const type = this.deliveryTypesList[index];
    this.deliveryTypesList.splice(index, 1);
    this.dataChange.emit({ data: this.deliveryTypesList });
    this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Tipo de entrega "${type.nombreExterno}" eliminado` });
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  async onComplete(): Promise<void> {
    if (this.deliveryTypesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos un tipo de entrega para continuar'
      });
      return;
    }

    this.isSaving = true;
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      for (const type of this.deliveryTypesList) {
        const typeData = { ...type, company: company.nomComercial || company.nombre };
        await this.maestroService.createTipoEntrega(typeData).toPromise();
      }
      this.stepComplete.emit({ data: this.deliveryTypesList });
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.deliveryTypesList.length} tipo(s) de entrega configurado(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando tipos de entrega:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración' });
    } finally {
      this.isSaving = false;
    }
  }

  private markFormAsTouched(): void {
    Object.keys(this.deliveryTypeForm.controls).forEach(key => {
      this.deliveryTypeForm.get(key)?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.deliveryTypeForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.deliveryTypeForm.get(field);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    if (control?.hasError('min')) {
      const min = control.errors?.['min'].min;
      return `El valor mínimo es ${min}`;
    }
    return '';
  }
}
