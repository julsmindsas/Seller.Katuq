import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

interface FormaEntrega {
  nombre: string;
  horariosSeleccionados: any[];
  horariosPorFormaDeEntrega?: any[];
  posicion: number;
  ciudad: string[];
  activo: boolean;
  _id?: string;
}

/**
 * Step: Delivery Methods Configuration
 * Configuración de formas de entrega
 */
@Component({
  selector: 'app-delivery-methods-step',
  templateUrl: './delivery-methods-step.component.html',
  styleUrls: ['./delivery-methods-step.component.scss']
})
export class DeliveryMethodsStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  deliveryForm!: FormGroup;
  deliveryMethodsList: FormaEntrega[] = [];
  horarios: any[] = []; // Lista de horarios disponibles
  ciudadesDisponibles: any[] = []; // Ciudades de entrega desde localStorage
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  // Plantillas predefinidas
  predefinedTemplates = [
    {
      nombre: 'Domicilio',
      horariosSeleccionados: [],
      posicion: 1,
      ciudad: [],
      activo: true
    },
    {
      nombre: 'Recogida en Tienda',
      horariosSeleccionados: [],
      posicion: 2,
      ciudad: [],
      activo: true
    },
    {
      nombre: 'Mensajería',
      horariosSeleccionados: [],
      posicion: 3,
      ciudad: [],
      activo: true
    },
    {
      nombre: 'Coordinadora',
      horariosSeleccionados: [],
      posicion: 4,
      ciudad: [],
      activo: true
    },
    {
      nombre: 'Servientrega',
      horariosSeleccionados: [],
      posicion: 5,
      ciudad: [],
      activo: true
    },
    {
      nombre: 'Interrapidísimo',
      horariosSeleccionados: [],
      posicion: 6,
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
    this.loadHorarios();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario reactivo con los campos REALES del modelo FormaEntrega
   */
  private initForm(): void {
    this.deliveryForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      horariosSeleccionados: [[], Validators.required],
      horariosPorFormaDeEntrega: [[]],
      posicion: [null, [Validators.required, Validators.min(1)]],
      ciudad: [[], Validators.required],
      activo: [true]
    });
  }

  /**
   * Carga las ciudades de entrega desde localStorage.currentCompany
   */
  private loadCiudades(): void {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      if (currentCompany?.ciudadess?.ciudadesEntrega) {
        this.ciudadesDisponibles = currentCompany.ciudadess.ciudadesEntrega;
        console.log('✅ Ciudades cargadas desde ciudadess.ciudadesEntrega:', this.ciudadesDisponibles.length);
      } else if (currentCompany?.ciudadesEntrega) {
        this.ciudadesDisponibles = currentCompany.ciudadesEntrega;
        console.log('✅ Ciudades cargadas desde ciudadesEntrega:', this.ciudadesDisponibles.length);
      } else {
        // Fallback a ciudades principales de Colombia
        this.ciudadesDisponibles = [
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
      this.ciudadesDisponibles = [
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
   * Carga los horarios de entrega disponibles desde el servicio
   */
  private loadHorarios(): void {
    this.maestroService.getHorarioEntregas().subscribe({
      next: (horarios: any) => {
        this.horarios = (horarios as any[]).sort((a, b) => {
          const posA = parseInt(a.posicion);
          const posB = parseInt(b.posicion);
          return posA - posB;
        });
        console.log('✅ Horarios de entrega cargados:', this.horarios.length);
      },
      error: (error) => {
        console.error('❌ Error cargando horarios de entrega:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar los horarios de entrega'
        });
      }
    });
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.deliveryMethodsList = this.initialData.data;

      if (this.deliveryMethodsList.length > 0) {
        console.log('🚚 Cargando formas de entrega existentes:', this.deliveryMethodsList.length);
        setTimeout(() => {
          this.stepComplete.emit({ data: this.deliveryMethodsList });
        }, 0);
      }
    }

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
      this.deliveryMethodsList = this.aiSuggestion.suggestedData;
    } else if (this.aiSuggestion.suggestedData.deliveryMethods) {
      this.deliveryMethodsList = this.aiSuggestion.suggestedData.deliveryMethods;
    }
  }

  /**
   * Usa una plantilla predefinida
   */
  useTemplate(template: any): void {
    this.deliveryForm.patchValue(template);
  }

  /**
   * Agrega una forma de entrega a la lista
   */
  addDeliveryMethod(): void {
    if (this.deliveryForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const deliveryData: FormaEntrega = this.deliveryForm.value;

    const existsName = this.deliveryMethodsList.some(
      (d, idx) => d.nombre.toLowerCase() === deliveryData.nombre.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe una forma de entrega con este nombre'
      });
      return;
    }

    if (this.editingIndex !== null) {
      this.deliveryMethodsList[this.editingIndex] = deliveryData;
      this.editingIndex = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Forma de entrega actualizada correctamente'
      });
    } else {
      this.deliveryMethodsList.push(deliveryData);
      this.messageService.add({
        severity: 'success',
        summary: 'Agregado',
        detail: 'Forma de entrega agregada a la lista'
      });
    }

    this.deliveryForm.reset({
      activo: true,
      horariosSeleccionados: [],
      horariosPorFormaDeEntrega: [],
      ciudad: []
    });
    this.dataChange.emit({ data: this.deliveryMethodsList });
  }

  /**
   * Edita una forma de entrega de la lista
   */
  editDeliveryMethod(index: number): void {
    this.editingIndex = index;
    const delivery = this.deliveryMethodsList[index];
    this.deliveryForm.patchValue(delivery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cancela la edición
   */
  cancelEdit(): void {
    this.editingIndex = null;
    this.deliveryForm.reset({
      activo: true,
      horariosSeleccionados: [],
      horariosPorFormaDeEntrega: [],
      ciudad: []
    });
  }

  /**
   * Elimina una forma de entrega de la lista
   */
  removeDeliveryMethod(index: number): void {
    const delivery = this.deliveryMethodsList[index];
    this.deliveryMethodsList.splice(index, 1);
    this.dataChange.emit({ data: this.deliveryMethodsList });

    this.messageService.add({
      severity: 'info',
      summary: 'Eliminado',
      detail: `Forma de entrega "${delivery.nombre}" eliminada`
    });

    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  /**
   * Completa el paso y guarda las formas de entrega
   */
  async onComplete(): Promise<void> {
    if (this.deliveryMethodsList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos una forma de entrega para continuar'
      });
      return;
    }

    this.isSaving = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');

      for (const delivery of this.deliveryMethodsList) {
        const deliveryData = {
          ...delivery,
          company: company.nomComercial || company.nombre
        };

        await this.maestroService.createFormaEntrega(deliveryData).toPromise();
      }

      console.log('🚚 Formas de entrega guardadas:', this.deliveryMethodsList.length);
      this.stepComplete.emit({ data: this.deliveryMethodsList });

      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.deliveryMethodsList.length} forma(s) de entrega configurada(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando formas de entrega:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración de formas de entrega'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormAsTouched(): void {
    Object.keys(this.deliveryForm.controls).forEach(key => {
      this.deliveryForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.deliveryForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.deliveryForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return '';
  }
}
