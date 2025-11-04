import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

/**
 * Step: First Product Configuration (Optional)
 * Creación del primer producto - paso opcional
 */
@Component({
  selector: 'app-first-product-step',
  templateUrl: './first-product-step.component.html',
  styleUrls: ['./first-product-step.component.scss']
})
export class FirstProductStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  productForm!: FormGroup;
  isSaving = false;
  uploadedImage: any = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private maestroService: MaestroService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.productForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      referencia: ['', [Validators.required, Validators.minLength(2)]],
      precio: [0, [Validators.required, Validators.min(0)]],
      descripcion: [''],
      stock: [0, [Validators.min(0)]]
    });
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data) {
      const productData = Array.isArray(this.initialData.data)
        ? this.initialData.data[0]
        : this.initialData.data;

      if (productData) {
        this.productForm.patchValue(productData);
        console.log('📦 Cargando producto existente');

        // Auto-completar si ya hay un producto configurado
        setTimeout(() => {
          this.stepComplete.emit({ data: productData });
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

    let productData = null;

    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      productData = this.aiSuggestion.suggestedData[0];
    } else if (this.aiSuggestion.suggestedData.product) {
      productData = this.aiSuggestion.suggestedData.product;
    } else {
      productData = this.aiSuggestion.suggestedData;
    }

    if (productData) {
      this.productForm.patchValue(productData);
    }
  }

  /**
   * Maneja la carga de imagen
   */
  onImageUpload(event: any): void {
    const file = event.files[0];
    if (file) {
      this.uploadedImage = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);

      this.messageService.add({
        severity: 'success',
        summary: 'Imagen Cargada',
        detail: 'La imagen se ha cargado correctamente'
      });
    }
  }

  /**
   * Elimina la imagen cargada
   */
  removeImage(): void {
    this.uploadedImage = null;
    this.imagePreview = null;
    this.messageService.add({
      severity: 'info',
      summary: 'Imagen Eliminada',
      detail: 'La imagen ha sido eliminada'
    });
  }

  /**
   * Salta este paso (opcional)
   */
  onSkip(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Paso Omitido',
      detail: 'Puedes agregar productos más tarde desde el módulo de inventario'
    });
    this.stepComplete.emit({ data: null, skipped: true });
  }

  /**
   * Guarda el producto y completa el paso
   */
  async onSave(): Promise<void> {
    if (this.productForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    this.isSaving = true;

    try {
      const company = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');

      const productData = {
        identificacion: {
          nombre: this.productForm.value.nombre,
          referencia: this.productForm.value.referencia,
          descripcion: this.productForm.value.descripcion || ''
        },
        precio: {
          precio: this.productForm.value.precio,
          precioAnterior: 0
        },
        disponibilidad: {
          stock: this.productForm.value.stock || 0,
          stockMinimo: 0
        },
        exposicion: {
          activo: true,
          destacado: false
        },
        crearProducto: {
          company: company.nomComercial || company.nombre,
          date_created: new Date().toISOString()
        }
      };

      // Aquí se guardaría el producto en el backend
      // await this.maestroService.createProduct(productData).toPromise();

      console.log('📦 Producto guardado:', productData.identificacion.nombre);

      this.stepComplete.emit({
        data: productData,
        hasImage: !!this.uploadedImage
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: '¡Tu primer producto ha sido creado correctamente!'
      });
    } catch (error) {
      console.error('Error guardando producto:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar el producto'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Formatea el precio como moneda COP
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
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.productForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.productForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    if (control?.hasError('min')) {
      return 'El valor debe ser mayor o igual a 0';
    }

    return '';
  }

  /**
   * Verifica si el formulario está completo
   */
  get isFormComplete(): boolean {
    return this.productForm.valid;
  }
}
