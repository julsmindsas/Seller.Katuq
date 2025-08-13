import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Proveedor } from '../../interfaces';
import { ProveedoresService } from '../../services/proveedores.service';

@Component({
  selector: 'app-crear-proveedor',
  templateUrl: './crear-proveedor.component.html',
  styleUrls: ['./crear-proveedor.component.scss'],
  providers: [MessageService]
})
export class CrearProveedorComponent implements OnInit {

  form: FormGroup;
  isEditMode = false;
  proveedorId: string | null = null;
  loading = false;
  saving = false;

  tiposIntegracion = [
    { label: 'Manual', value: 'manual' },
    { label: 'API', value: 'api' },
    { label: 'CSV', value: 'csv' },
    { label: 'Webhook', value: 'webhook' }
  ];

  constructor(
    private fb: FormBuilder,
    private proveedoresService: ProveedoresService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.proveedorId = params['id'];
        this.cargarProveedor();
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      contacto: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      direccion: [''],
      comision_porcentaje: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      tiempo_procesamiento_dias: [1, [Validators.required, Validators.min(1)]],
      activo: [true],
      api_config: this.fb.group({
        tipo_integracion: ['manual', Validators.required],
        endpoint: [''],
        api_key: ['']
      })
    });
  }

  cargarProveedor(): void {
    if (!this.proveedorId) return;
    
    this.loading = true;
    this.proveedoresService.getProveedor(this.proveedorId).subscribe({
      next: (proveedor) => {
        this.form.patchValue(proveedor);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando proveedor:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los datos del proveedor'
        });
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const formValue = this.form.value;
    const proveedor: Proveedor = {
      ...formValue,
      api_config: this.cleanApiConfig(formValue.api_config)
    };

    if (this.isEditMode && this.proveedorId) {
      this.proveedoresService.updateProveedor(this.proveedorId, proveedor).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proveedor actualizado correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/dropshipping/proveedores']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error actualizando proveedor:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al actualizar el proveedor'
          });
          this.saving = false;
        }
      });
    } else {
      this.proveedoresService.createProveedor(proveedor).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proveedor creado correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/dropshipping/proveedores']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creando proveedor:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al crear el proveedor'
          });
          this.saving = false;
        }
      });
    }
  }

  cleanApiConfig(apiConfig: any) {
    if (apiConfig.tipo_integracion === 'manual') {
      return {
        tipo_integracion: 'manual'
      };
    }
    return apiConfig;
  }

  markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
      
      if (control && control.value && typeof control.value === 'object') {
        Object.keys(control.value).forEach(nestedKey => {
          const nestedControl = control.get(nestedKey);
          nestedControl?.markAsTouched();
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dropshipping/proveedores']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    }
    return '';
  }

  get showApiConfig(): boolean {
    const tipoIntegracion = this.form.get('api_config.tipo_integracion')?.value;
    return tipoIntegracion && tipoIntegracion !== 'manual';
  }
}