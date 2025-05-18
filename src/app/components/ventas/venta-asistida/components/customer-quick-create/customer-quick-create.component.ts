import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-customer-quick-create',
  templateUrl: './customer-quick-create.component.html',
  styleUrls: ['./customer-quick-create.component.scss']
})
export class CustomerQuickCreateComponent {
  @Input() visible: boolean = false;
  @Output() clienteCreado = new EventEmitter<any>();
  @Output() cerrar = new EventEmitter<void>();

  clienteForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.clienteForm = this.fb.group({
      nombres_completos: ['', Validators.required],
      documento: ['', Validators.required],
      numero_celular_comprador: ['', Validators.required],
      correo_electronico_comprador: ['', [Validators.required, Validators.email]]
    });
  }

  submit() {
    if (this.clienteForm.valid) {
      this.clienteCreado.emit(this.clienteForm.value);
    } else {
      this.clienteForm.markAllAsTouched();
    }
  }

  cerrarModal() {
    this.cerrar.emit();
  }
} 