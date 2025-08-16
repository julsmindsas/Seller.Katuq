import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { DropshippingProductConfig, DropshippingProvider, TipoProductoDropshipping } from '../../../shared/models/productos/DropshippingConfig';
import { Producto } from '../../../shared/models/productos/Producto';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-productos-dropshipping-config',
  templateUrl: './productos-dropshipping-config.component.html',
  styleUrls: ['./productos-dropshipping-config.component.scss']
})
export class ProductosDropshippingConfigComponent implements OnInit {

  dropshippingForm: FormGroup;
  producto: Producto | null = null;
  productId: string | null = null;
  loading = false;
  saving = false;
  proveedores: DropshippingProvider[] = [];
  
  tiposMargen = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'fijo', label: 'Valor Fijo ($)' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private maestroService: MaestroService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.loadProducto();
    } else {
      this.router.navigate(['/productos']);
    }
  }

  initializeForm(): void {
    this.dropshippingForm = this.fb.group({
      enabled: [false],
      supplierId: ['', [Validators.required]],
      supplierName: ['', [Validators.required]],
      supplierSku: [''],
      supplierProductUrl: [''],
      leadTimeDays: [7, [Validators.required, Validators.min(1)]],
      tipoMargen: ['porcentaje', [Validators.required]],
      margenPorcentaje: [0, [Validators.min(0)]],
      margenFijo: [0, [Validators.min(0)]],
      proveedorContacto: [''],
      proveedorTelefono: [''],
      proveedorEmail: ['', [Validators.email]],
      costoProveedor: [0, [Validators.required, Validators.min(0)]],
      monedaProveedor: ['COP', [Validators.required]],
      condicionesEspeciales: [''],
      activo: [true]
    });

    // Validación condicional del margen
    this.dropshippingForm.get('tipoMargen')?.valueChanges.subscribe(tipo => {
      const margenPorcentajeControl = this.dropshippingForm.get('margenPorcentaje');
      const margenFijoControl = this.dropshippingForm.get('margenFijo');
      
      if (tipo === 'porcentaje') {
        margenPorcentajeControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
        margenFijoControl?.clearValidators();
      } else {
        margenFijoControl?.setValidators([Validators.required, Validators.min(0)]);
        margenPorcentajeControl?.clearValidators();
      }
      
      margenPorcentajeControl?.updateValueAndValidity();
      margenFijoControl?.updateValueAndValidity();
    });
  }

  loadProducto(): void {
    this.loading = true;
    // Aquí implementarías la carga del producto por ID
    // Por ahora simulamos la carga
    setTimeout(() => {
      // Simular producto cargado
      this.producto = {
        identificacion: { referencia: 'PROD-001' },
        crearProducto: { titulo: 'Producto de Ejemplo' },
        dropshippingConfig: null
      } as Producto;

      // Si ya tiene configuración, cargarla en el formulario
      if (this.producto.dropshippingConfig) {
        this.loadDropshippingConfig(this.producto.dropshippingConfig);
      }

      this.loading = false;
    }, 1000);
  }

  loadDropshippingConfig(config: DropshippingProductConfig): void {
    this.dropshippingForm.patchValue({
      enabled: config.enabled,
      supplierId: config.supplierId,
      supplierName: config.supplierName,
      supplierSku: config.supplierSku,
      supplierProductUrl: config.supplierProductUrl,
      leadTimeDays: config.leadTimeDays,
      tipoMargen: config.tipoMargen,
      margenPorcentaje: config.margenPorcentaje,
      margenFijo: config.margenFijo,
      proveedorContacto: config.proveedorContacto,
      proveedorTelefono: config.proveedorTelefono,
      proveedorEmail: config.proveedorEmail,
      costoProveedor: config.costoProveedor,
      monedaProveedor: config.monedaProveedor,
      condicionesEspeciales: config.condicionesEspeciales,
      activo: config.activo
    });
  }

  onSubmit(): void {
    if (this.dropshippingForm.valid && this.producto) {
      this.saving = true;

      const dropshippingConfig: DropshippingProductConfig = {
        ...this.dropshippingForm.value,
        fechaConfiguracion: new Date().toISOString(),
        usuarioConfiguracion: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).nombre : 'Usuario'
      };

      // Actualizar el producto con la configuración
      this.producto.dropshippingConfig = dropshippingConfig;

      // Aquí implementarías el guardado en el backend
      setTimeout(() => {
        Swal.fire({
          title: '¡Configuración Guardada!',
          text: 'La configuración de dropshipping se ha guardado exitosamente',
          icon: 'success',
          confirmButtonText: 'Entendido'
        }).then(() => {
          this.router.navigate(['/productos']);
        });
        this.saving = false;
      }, 1000);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/productos']);
  }

  onToggleEnabled(): void {
    const enabled = this.dropshippingForm.get('enabled')?.value;
    
    if (enabled) {
      // Activar validaciones cuando se habilita dropshipping
      this.dropshippingForm.get('supplierId')?.setValidators([Validators.required]);
      this.dropshippingForm.get('supplierName')?.setValidators([Validators.required]);
      this.dropshippingForm.get('costoProveedor')?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      // Limpiar validaciones cuando se deshabilita
      this.dropshippingForm.get('supplierId')?.clearValidators();
      this.dropshippingForm.get('supplierName')?.clearValidators();
      this.dropshippingForm.get('costoProveedor')?.clearValidators();
    }
    
    // Actualizar validaciones
    this.dropshippingForm.get('supplierId')?.updateValueAndValidity();
    this.dropshippingForm.get('supplierName')?.updateValueAndValidity();
    this.dropshippingForm.get('costoProveedor')?.updateValueAndValidity();
  }

  calcularPrecioVenta(): number {
    const costo = this.dropshippingForm.get('costoProveedor')?.value || 0;
    const tipoMargen = this.dropshippingForm.get('tipoMargen')?.value;
    const margenPorcentaje = this.dropshippingForm.get('margenPorcentaje')?.value || 0;
    const margenFijo = this.dropshippingForm.get('margenFijo')?.value || 0;

    if (tipoMargen === 'porcentaje') {
      return costo * (1 + margenPorcentaje / 100);
    } else {
      return costo + margenFijo;
    }
  }

  calcularGanancia(): number {
    const costo = this.dropshippingForm.get('costoProveedor')?.value || 0;
    return this.calcularPrecioVenta() - costo;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.dropshippingForm.controls).forEach(key => {
      const control = this.dropshippingForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dropshippingForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.dropshippingForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
      if (field.errors['max']) return `El valor máximo es ${field.errors['max'].max}`;
      if (field.errors['email']) return 'El formato del email no es válido';
    }
    return '';
  }
}