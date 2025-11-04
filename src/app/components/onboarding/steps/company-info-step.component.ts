import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

/**
 * Step 1: Company Information
 * Formulario para capturar la información básica de la empresa
 */
@Component({
  selector: 'app-company-info-step',
  templateUrl: './company-info-step.component.html',
  styleUrls: ['./company-info-step.component.scss']
})
export class CompanyInfoStepComponent implements OnInit {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  companyForm!: FormGroup;
  isLoading = false;

  // Opciones para dropdowns
  tipoEmpresaOptions = [
    { label: 'Persona Natural', value: 'persona_natural' },
    { label: 'Persona Jurídica', value: 'persona_juridica' },
    { label: 'Régimen Simplificado', value: 'regimen_simplificado' },
    { label: 'Gran Contribuyente', value: 'gran_contribuyente' }
  ];

  sectorOptions = [
    { label: 'Restaurantes y Comidas', value: 'restaurantes' },
    { label: 'Retail y Comercio', value: 'retail' },
    { label: 'Servicios', value: 'servicios' },
    { label: 'Manufactura', value: 'manufactura' },
    { label: 'Tecnología', value: 'tecnologia' },
    { label: 'Salud y Belleza', value: 'salud_belleza' },
    { label: 'Educación', value: 'educacion' },
    { label: 'Construcción', value: 'construccion' },
    { label: 'Agricultura', value: 'agricultura' },
    { label: 'Otro', value: 'otro' }
  ];

  paisOptions = [
    { label: 'Colombia', value: 'CO' },
    { label: 'México', value: 'MX' },
    { label: 'Argentina', value: 'AR' },
    { label: 'Chile', value: 'CL' },
    { label: 'Perú', value: 'PE' }
  ];

  ciudadesColombiaOptions = [
    { label: 'Bogotá', value: 'Bogotá' },
    { label: 'Medellín', value: 'Medellín' },
    { label: 'Cali', value: 'Cali' },
    { label: 'Barranquilla', value: 'Barranquilla' },
    { label: 'Cartagena', value: 'Cartagena' },
    { label: 'Bucaramanga', value: 'Bucaramanga' },
    { label: 'Pereira', value: 'Pereira' },
    { label: 'Manizales', value: 'Manizales' },
    { label: 'Santa Marta', value: 'Santa Marta' },
    { label: 'Cúcuta', value: 'Cúcuta' },
    { label: 'Ibagué', value: 'Ibagué' },
    { label: 'Villavicencio', value: 'Villavicencio' },
    { label: 'Otra', value: 'Otra' }
  ];

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupAutoSave();

    // Cargar datos iniciales si existen
    if (this.initialData) {
      console.log('📝 Cargando datos iniciales de empresa:', this.initialData);
      this.companyForm.patchValue(this.initialData);

      // Si el formulario queda válido, auto-completar después de un tick
      if (this.companyForm.valid) {
        console.log('✅ Formulario válido con datos existentes - auto-completando');
        setTimeout(() => {
          this.stepComplete.emit(this.initialData);
        }, 0);
      } else {
        console.log('⚠️ Formulario con datos pero inválido - requiere corrección');
      }
    }

    // Aplicar sugerencia de IA solo si NO hay datos iniciales
    if (this.aiSuggestion && !this.initialData) {
      this.applySuggestion();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.companyForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nomComercial: [''], // Corregido: usar nomComercial en lugar de nombreComercial para coincidir con Empresa
      nit: ['', [Validators.required, Validators.pattern(/^[0-9]{6,12}$/)]],
      tipoEmpresa: ['persona_juridica', Validators.required],
      sector: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      direccion: ['', Validators.required],
      ciudad: ['', Validators.required],
      pais: ['CO', Validators.required],
      descripcion: [''],
      sitioWeb: ['', Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)]
    });
  }

  /**
   * Configura el auto-guardado cuando el formulario cambia
   */
  private setupAutoSave(): void {
    this.companyForm.valueChanges
      .pipe(
        debounceTime(1000), // Esperar 1 segundo después del último cambio
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        if (this.companyForm.valid) {
          this.dataChange.emit(values);
        }
      });
  }

  /**
   * Aplica la sugerencia de IA al formulario
   */
  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;

    this.companyForm.patchValue(this.aiSuggestion.suggestedData);
  }

  /**
   * Completa el paso
   */
  onComplete(): void {
    if (this.companyForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.companyForm.controls).forEach(key => {
        this.companyForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.stepComplete.emit(this.companyForm.value);
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.companyForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.companyForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    if (control?.hasError('pattern')) {
      switch (field) {
        case 'nit':
          return 'NIT inválido (solo números, 6-12 dígitos)';
        case 'telefono':
          return 'Teléfono inválido (solo números, 7-15 dígitos)';
        case 'sitioWeb':
          return 'URL inválida';
        default:
          return 'Formato inválido';
      }
    }

    if (control?.hasError('email')) {
      return 'Email inválido';
    }

    return '';
  }

  /**
   * Verifica si el formulario es válido
   */
  isFormValid(): boolean {
    return this.companyForm.valid;
  }
}
