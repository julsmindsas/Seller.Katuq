import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ToastrService } from 'ngx-toastr';

import { LogisticaServiceV2 } from '../../../../../shared/services/despachos/logistica.service.v2';
import { EnviameHelperService } from '../services/enviame-helper.service';
import { EnviameCancelRequest, EnviameCancelResponse } from '../models/enviame.interfaces';
import { Pedido } from '../../../../ventas/modelo/pedido';

@Component({
  selector: 'app-enviame-cancel-modal',
  templateUrl: './enviame-cancel-modal.component.html',
  styleUrls: ['./enviame-cancel-modal.component.scss']
})
export class EnviameCancelModalComponent implements OnInit {

  cancelForm: FormGroup;
  pedido: Pedido;
  companyId: string;

  loading = false;
  cancelling = false;

  // Motivos predefinidos de cancelación
  cancelReasons = [
    { label: 'Error en dirección de entrega', value: 'wrong_address' },
    { label: 'Cliente solicitó cancelación', value: 'customer_request' },
    { label: 'Producto agotado', value: 'out_of_stock' },
    { label: 'Error en información del pedido', value: 'order_error' },
    { label: 'Cambio de transportadora', value: 'change_carrier' },
    { label: 'Problemas de pago', value: 'payment_issues' },
    { label: 'Otro motivo', value: 'other' }
  ];

  constructor(
    private fb: FormBuilder,
    private logisticaService: LogisticaServiceV2,
    private enviameHelper: EnviameHelperService,
    private toastr: ToastrService,
    private dialogRef: DynamicDialogRef,
    private dialogConfig: DynamicDialogConfig
  ) {
    // Obtener datos del modal
    this.pedido = this.dialogConfig.data?.pedido;
    this.companyId = this.dialogConfig.data?.companyId || 'default_company';

    this.createForm();
  }

  ngOnInit(): void {
    this.loadPedidoInfo();
  }

  createForm(): void {
    this.cancelForm = this.fb.group({
      reason: ['', Validators.required],
      customReason: [''],
      notes: [''],
      confirmCancel: [false, Validators.requiredTrue]
    });

    // Validar razón personalizada cuando se selecciona "Otro motivo"
    this.cancelForm.get('reason')?.valueChanges.subscribe(value => {
      const customReasonControl = this.cancelForm.get('customReason');

      if (value === 'other') {
        customReasonControl?.setValidators([Validators.required, Validators.minLength(10)]);
      } else {
        customReasonControl?.clearValidators();
        customReasonControl?.setValue('');
      }

      customReasonControl?.updateValueAndValidity();
    });
  }

  loadPedidoInfo(): void {
    // Verificar si el envío puede ser cancelado
    if (this.pedido.estadoProceso && !this.enviameHelper.canCancelShipment(this.pedido.estadoProceso)) {
      this.toastr.warning(
        'Este envío no puede ser cancelado en su estado actual',
        'Cancelación no disponible'
      );
    }
  }

  onConfirmCancel(): void {
    if (this.cancelForm.invalid) {
      this.markFormGroupTouched(this.cancelForm);
      this.toastr.warning('Por favor completa todos los campos requeridos', 'Formulario incompleto');
      return;
    }

    const formData = this.cancelForm.value;

    // Determinar la razón final
    let finalReason = '';
    if (formData.reason === 'other') {
      finalReason = formData.customReason;
    } else {
      const selectedReason = this.cancelReasons.find(r => r.value === formData.reason);
      finalReason = selectedReason ? selectedReason.label : formData.reason;
    }

    const cancelRequest: EnviameCancelRequest = {
      companyId: this.companyId,
      provider: 'enviame',
      trackingNumber: this.pedido.shippingOrder || '',
      reason: finalReason,
      options: {
        notes: formData.notes,
        requestedBy: 'seller', // Podría ser dinámico según el usuario
        requestDate: new Date().toISOString()
      }
    };

    this.cancelling = true;

    this.logisticaService.cancelShipment(cancelRequest).subscribe({
      next: (response: EnviameCancelResponse) => {
        this.cancelling = false;

        if (response.success) {
          this.toastr.success(
            response.message || 'Envío cancelado exitosamente',
            'Cancelación Exitosa'
          );

          // Mostrar información de reembolso si está disponible
          if (response.refundAmount && response.refundAmount > 0) {
            this.toastr.info(
              `Reembolso de ${this.enviameHelper.formatPrice(response.refundAmount, response.refundCurrency)} será procesado`,
              'Información de Reembolso'
            );
          }

          // Cerrar modal con resultado exitoso
          this.dialogRef.close({
            cancelled: true,
            reason: finalReason,
            response: response
          });

        } else {
          this.toastr.error(
            response.message || 'No se pudo cancelar el envío',
            'Error en Cancelación'
          );
        }
      },
      error: (error) => {
        console.error('Error al cancelar envío:', error);
        this.cancelling = false;

        let errorMessage = 'Error al conectar con el servicio de Enviame.io';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.toastr.error(errorMessage, 'Error de Cancelación');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close({ cancelled: false });
  }

  // Getters para el template
  get canCancel(): boolean {
    return this.pedido && this.pedido.estadoProceso
      ? this.enviameHelper.canCancelShipment(this.pedido.estadoProceso)
      : false;
  }

  get trackingNumber(): string {
    return this.pedido?.shippingOrder || 'N/A';
  }

  get currentStatus(): string {
    return this.pedido?.estadoProceso || 'Desconocido';
  }

  get currentStatusName(): string {
    return this.enviameHelper.getStatusDisplayName(this.currentStatus);
  }

  get statusIcon(): string {
    return this.enviameHelper.getStatusIcon(this.currentStatus);
  }

  get isReasonOther(): boolean {
    return this.cancelForm.get('reason')?.value === 'other';
  }

  // Utility methods
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.cancelForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.cancelForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `Este campo es obligatorio`;
      }
      if (field.errors['requiredTrue']) {
        return 'Debes confirmar la cancelación';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }
}