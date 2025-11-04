import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

interface FormaPago {
  id?: string;
  online: string;
  nombre: string;
  posicion: number | string;
  integracion: string;
  activo: boolean;
  descripcionCorreoElectronico: string;
  recordatorioCobro: string;
  cd?: string;
}

/**
 * Step: Payment Methods Configuration
 * Configuración de formas de pago
 */
@Component({
  selector: 'app-payment-methods-step',
  templateUrl: './payment-methods-step.component.html',
  styleUrls: ['./payment-methods-step.component.scss']
})
export class PaymentMethodsStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  paymentForm!: FormGroup;
  paymentMethodsList: FormaPago[] = [];
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;
  createForPOS = true; // Checkbox state

  // Plantillas predefinidas (FormaPago real)
  predefinedTemplates = [
    {
      nombre: 'Efectivo',
      online: 'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)',
      posicion: 1,
      integracion: 'No',
      activo: true,
      descripcionCorreoElectronico: 'Pago en efectivo al momento de la entrega',
      recordatorioCobro: 'Por favor tenga el dinero exacto preparado'
    },
    {
      nombre: 'Tarjeta de Crédito',
      online: 'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)',
      posicion: 2,
      integracion: 'No',
      activo: true,
      descripcionCorreoElectronico: 'Pago con tarjeta de crédito',
      recordatorioCobro: 'Recuerde tener su tarjeta disponible'
    },
    {
      nombre: 'PSE',
      online: 'Online (Pasarelas de pago, wompi, payu, mercado pago)',
      posicion: 3,
      integracion: 'Si',
      activo: true,
      descripcionCorreoElectronico: 'Pago seguro en línea PSE',
      recordatorioCobro: 'Complete el pago a través del portal bancario'
    },
    {
      nombre: 'Transferencia Bancaria',
      online: 'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)',
      posicion: 4,
      integracion: 'No',
      activo: true,
      descripcionCorreoElectronico: 'Pago mediante transferencia bancaria',
      recordatorioCobro: 'Por favor envíe el comprobante de transferencia'
    },
    {
      nombre: 'Wompi',
      online: 'Online (Pasarelas de pago, wompi, payu, mercado pago)',
      posicion: 5,
      integracion: 'Si',
      activo: true,
      descripcionCorreoElectronico: 'Pago mediante pasarela Wompi',
      recordatorioCobro: 'Complete el pago en el enlace proporcionado'
    }
  ];

  onlineOptions = [
    { label: 'Offline', value: 'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)' },
    { label: 'Online', value: 'Online (Pasarelas de pago, wompi, payu, mercado pago)' }
  ];

  integracionOptions = [
    { label: 'No', value: 'No' },
    { label: 'Sí', value: 'Si' }
  ];

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
    this.paymentForm = this.fb.group({
      id: [''],
      online: ['Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      posicion: ['', [Validators.required, Validators.min(1)]],
      integracion: ['No', Validators.required],
      activo: [true, Validators.required],
      descripcionCorreoElectronico: ['', [Validators.required, Validators.minLength(10)]],
      recordatorioCobro: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.paymentMethodsList = this.initialData.data;

      // Auto-completar si ya hay métodos configurados
      if (this.paymentMethodsList.length > 0) {
        console.log('💳 Cargando métodos de pago existentes:', this.paymentMethodsList.length);
        setTimeout(() => {
          this.stepComplete.emit({ data: this.paymentMethodsList });
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
      this.paymentMethodsList = this.aiSuggestion.suggestedData;
    } else if (this.aiSuggestion.suggestedData.paymentMethods) {
      this.paymentMethodsList = this.aiSuggestion.suggestedData.paymentMethods;
    }
  }

  /**
   * Usa una plantilla predefinida
   */
  useTemplate(template: any): void {
    this.paymentForm.patchValue(template);
  }

  /**
   * Agrega un método de pago a la lista
   */
  addPaymentMethod(): void {
    if (this.paymentForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const paymentData: FormaPago = this.paymentForm.value;

    // Verificar que no exista ya un método con el mismo nombre
    const existsName = this.paymentMethodsList.some(
      (p, idx) => p.nombre.toLowerCase() === paymentData.nombre.toLowerCase() && idx !== this.editingIndex
    );

    if (existsName) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nombre Duplicado',
        detail: 'Ya existe un método de pago con este nombre'
      });
      return;
    }

    if (this.editingIndex !== null) {
      // Editar método existente
      this.paymentMethodsList[this.editingIndex] = paymentData;
      this.editingIndex = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Método de pago actualizado correctamente'
      });
    } else {
      // Agregar nuevo método
      this.paymentMethodsList.push(paymentData);
      this.messageService.add({
        severity: 'success',
        summary: 'Agregado',
        detail: 'Método de pago agregado a la lista'
      });
    }

    this.paymentForm.reset({
      online: 'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)',
      integracion: 'No',
      activo: true
    });
    this.dataChange.emit({ data: this.paymentMethodsList });
  }

  /**
   * Edita un método de pago de la lista
   */
  editPaymentMethod(index: number): void {
    this.editingIndex = index;
    const payment = this.paymentMethodsList[index];
    this.paymentForm.patchValue(payment);

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cancela la edición
   */
  cancelEdit(): void {
    this.editingIndex = null;
    this.paymentForm.reset({
      online: 'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)',
      integracion: 'No',
      activo: true
    });
  }

  /**
   * Elimina un método de pago de la lista
   */
  removePaymentMethod(index: number): void {
    const payment = this.paymentMethodsList[index];
    this.paymentMethodsList.splice(index, 1);
    this.dataChange.emit({ data: this.paymentMethodsList });

    this.messageService.add({
      severity: 'info',
      summary: 'Eliminado',
      detail: `Método de pago "${payment.nombre}" eliminado`
    });

    // Si estaba editando este método, cancelar
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  /**
   * Completa el paso y guarda los métodos de pago
   */
  async onComplete(): Promise<void> {
    if (this.paymentMethodsList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos un método de pago para continuar'
      });
      return;
    }

    this.isSaving = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');

      // Crear métodos de pago en el backend
      for (let i = 0; i < this.paymentMethodsList.length; i++) {
        const payment = this.paymentMethodsList[i];
        const paymentData = {
          id: payment.id || String(i + 1),
          online: payment.online,
          nombre: payment.nombre,
          posicion: payment.posicion || (i + 1),
          integracion: payment.integracion,
          activo: payment.activo,
          descripcionCorreoElectronico: payment.descripcionCorreoElectronico,
          recordatorioCobro: payment.recordatorioCobro
        };

        // Crear en formas de pago normales
        await this.maestroService.crearFormaPago(paymentData).toPromise();

        // Si el checkbox está marcado, también crear en POS
        if (this.createForPOS) {
          await this.maestroService.crearFormaPagoPOS(paymentData).toPromise();
        }
      }

      console.log('💳 Métodos de pago guardados:', this.paymentMethodsList.length);
      this.stepComplete.emit({ data: this.paymentMethodsList });

      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.paymentMethodsList.length} método(s) de pago configurado(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando métodos de pago:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración de métodos de pago'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormAsTouched(): void {
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.paymentForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.paymentForm.get(field);

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
