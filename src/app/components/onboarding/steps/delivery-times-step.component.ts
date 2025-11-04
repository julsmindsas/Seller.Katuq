import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

interface TiempoEntrega {
  nombreInterno: string;
  nombreExterno: string;
  descripcion: string;
  minDias: number;
  posicion: number;
  ciudad: string[];
  activo: boolean;
  cd?: string;
}

@Component({
  selector: 'app-delivery-times-step',
  templateUrl: './delivery-times-step.component.html',
  styleUrls: ['./delivery-times-step.component.scss']
})
export class DeliveryTimesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;
  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  deliveryTimeForm!: FormGroup;
  deliveryTimesList: TiempoEntrega[] = [];
  ciudades: any[] = []; // Lista de ciudades disponibles desde el currentCompany (formato {label, value})
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  predefinedTemplates = [
    {
      nombreInterno: '24_horas',
      nombreExterno: '24 horas',
      descripcion: 'Entrega en 24 horas',
      minDias: 1,
      posicion: 1,
      ciudad: [],
      activo: true
    },
    {
      nombreInterno: '2_3_dias',
      nombreExterno: '2-3 días',
      descripcion: 'Entrega en 2 a 3 días',
      minDias: 2,
      posicion: 2,
      ciudad: [],
      activo: true
    },
    {
      nombreInterno: '3_5_dias',
      nombreExterno: '3-5 días',
      descripcion: 'Entrega en 3 a 5 días',
      minDias: 3,
      posicion: 3,
      ciudad: [],
      activo: true
    },
    {
      nombreInterno: '5_7_dias',
      nombreExterno: '5-7 días',
      descripcion: 'Entrega en 5 a 7 días',
      minDias: 5,
      posicion: 4,
      ciudad: [],
      activo: true
    },
    {
      nombreInterno: '1_2_semanas',
      nombreExterno: '1-2 semanas',
      descripcion: 'Entrega en 1 a 2 semanas',
      minDias: 7,
      posicion: 5,
      ciudad: [],
      activo: true
    }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private maestroService: MaestroService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCiudades();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.deliveryTimeForm = this.fb.group({
      nombreInterno: ['', [Validators.required, Validators.minLength(3)]],
      nombreExterno: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', Validators.required],
      minDias: [1, [Validators.required, Validators.min(1)]],
      posicion: [null, [Validators.required, Validators.min(1)]],
      ciudad: [[], Validators.required],
      activo: [true],
      cd: [null]
    });
  }

  /**
   * Carga las ciudades disponibles desde el currentCompany en localStorage
   */
  private loadCiudades(): void {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      if (currentCompany?.ciudadess?.ciudadesEntrega) {
        this.ciudades = currentCompany.ciudadess.ciudadesEntrega;
        console.log('✅ Ciudades cargadas desde currentCompany:', this.ciudades.length);
      } else if (currentCompany?.ciudadesEntrega) {
        this.ciudades = currentCompany.ciudadesEntrega;
        console.log('✅ Ciudades cargadas desde ciudadesEntrega:', this.ciudades.length);
      } else {
        // Fallback a ciudades principales de Colombia
        this.ciudades = [
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
      console.error('❌ Error cargando ciudades:', error);
      // Fallback en caso de error
      this.ciudades = [
        { label: 'Bogotá', value: 'Bogotá' },
        { label: 'Medellín', value: 'Medellín' },
        { label: 'Cali', value: 'Cali' },
        { label: 'Barranquilla', value: 'Barranquilla' },
        { label: 'Cartagena', value: 'Cartagena' },
        { label: 'Bucaramanga', value: 'Bucaramanga' }
      ];
    }
  }

  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.deliveryTimesList = this.initialData.data;
      if (this.deliveryTimesList.length > 0) {
        setTimeout(() => {
          this.stepComplete.emit({ data: this.deliveryTimesList });
        }, 0);
      }
    }
  }

  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;
    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.deliveryTimesList = this.aiSuggestion.suggestedData;
    }
  }

  useTemplate(template: any): void {
    this.deliveryTimeForm.patchValue(template);
  }

  addDeliveryTime(): void {
    if (this.deliveryTimeForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const timeData: TiempoEntrega = this.deliveryTimeForm.value;
    const existsName = this.deliveryTimesList.some(
      (t, idx) => t.nombreInterno.toLowerCase() === timeData.nombreInterno.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe un tiempo de entrega con este nombre interno'
      });
      return;
    }

    if (this.editingIndex !== null) {
      this.deliveryTimesList[this.editingIndex] = timeData;
      this.editingIndex = null;
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Tiempo de entrega actualizado correctamente' });
    } else {
      this.deliveryTimesList.push(timeData);
      this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Tiempo de entrega agregado a la lista' });
    }

    this.deliveryTimeForm.reset({ minDias: 1, activo: true, ciudad: [], cd: null });
    this.dataChange.emit({ data: this.deliveryTimesList });
  }

  editDeliveryTime(index: number): void {
    this.editingIndex = index;
    this.deliveryTimeForm.patchValue(this.deliveryTimesList[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.deliveryTimeForm.reset({ minDias: 1, activo: true, ciudad: [], cd: null });
  }

  removeDeliveryTime(index: number): void {
    const time = this.deliveryTimesList[index];
    this.deliveryTimesList.splice(index, 1);
    this.dataChange.emit({ data: this.deliveryTimesList });
    this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Tiempo de entrega "${time.nombreExterno}" eliminado` });
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  async onComplete(): Promise<void> {
    if (this.deliveryTimesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos un tiempo de entrega para continuar'
      });
      return;
    }

    this.isSaving = true;
    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      for (const time of this.deliveryTimesList) {
        const timeData = { ...time, company: company.nomComercial || company.nombre };
        await this.maestroService.createTiempoEntrega(timeData).toPromise();
      }
      this.stepComplete.emit({ data: this.deliveryTimesList });
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.deliveryTimesList.length} tiempo(s) de entrega configurado(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando tiempos de entrega:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración' });
    } finally {
      this.isSaving = false;
    }
  }

  private markFormAsTouched(): void {
    Object.keys(this.deliveryTimeForm.controls).forEach(key => {
      this.deliveryTimeForm.get(key)?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.deliveryTimeForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.deliveryTimeForm.get(field);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('min')) {
      const min = control.errors?.['min'].min;
      return `El valor mínimo es ${min}`;
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    return '';
  }
}
