import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Producto } from 'src/app/shared/models/productos/Producto';

@Component({
  selector: 'app-editar-precio-unitario',
  templateUrl: './editar-precio-unitario.component.html',
  styleUrls: ['./editar-precio-unitario.component.scss']
})
export class EditarPrecioUnitarioComponent implements OnInit {
  @Input() producto: Producto;

  precioForm: FormGroup;
  cargando = false;
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.configurarListeners();
  }

  inicializarFormulario() {
    const precioData = this.producto?.precio || {};

    this.precioForm = this.fb.group({
      precioUnitarioSinIva: [precioData.precioUnitarioSinIva || '', [Validators.required]],
      precioUnitarioIva: [precioData.precioUnitarioIva || '0', [Validators.required]],
      valorIva: [precioData.valorIva || 0],
      precioUnitarioConIva: [precioData.precioUnitarioConIva || 0]
    });
  }

  configurarListeners() {
    // Listener para precio sin IVA
    this.precioForm.get('precioUnitarioSinIva').valueChanges.subscribe((precioSinIva) => {
      this.calcularPrecioConIva(precioSinIva);
    });

    // Listener para porcentaje IVA
    this.precioForm.get('precioUnitarioIva').valueChanges.subscribe(() => {
      const precioSinIva = this.precioForm.get('precioUnitarioSinIva').value;
      this.calcularPrecioConIva(precioSinIva);
    });
  }

  calcularPrecioConIva(precioSinIva: any) {
    if (precioSinIva !== null && precioSinIva !== undefined && precioSinIva !== '') {
      let precioSinIvaNum = precioSinIva;
      if (typeof precioSinIva === 'string') {
        precioSinIvaNum = parseFloat(precioSinIva.replace(/[^0-9.-]/g, '')) || 0;
      }

      const porcentajeIva = parseFloat(this.precioForm.get('precioUnitarioIva').value) || 0;
      const valorIva = precioSinIvaNum * (porcentajeIva / 100);
      const precioConIva = precioSinIvaNum + valorIva;

      this.precioForm.get('valorIva').setValue(valorIva, { emitEvent: false });
      this.precioForm.get('precioUnitarioConIva').setValue(precioConIva, { emitEvent: false });
    } else {
      this.precioForm.get('valorIva').setValue(0, { emitEvent: false });
      this.precioForm.get('precioUnitarioConIva').setValue(0, { emitEvent: false });
    }
  }

  guardar() {
    if (this.precioForm.invalid) {
      return;
    }

    this.guardando = true;

    // Actualizar el objeto precio del producto
    const precioActualizado = {
      ...this.producto.precio,
      precioUnitarioSinIva: parseFloat(this.precioForm.get('precioUnitarioSinIva').value) || 0,
      precioUnitarioIva: this.precioForm.get('precioUnitarioIva').value,
      valorIva: this.precioForm.get('valorIva').value,
      precioUnitarioConIva: this.precioForm.get('precioUnitarioConIva').value
    };

    const productoActualizado = {
      ...this.producto,
      precio: precioActualizado,
      date_edit: new Date().toISOString()
    };

    console.log('Guardando precio unitario:', productoActualizado);

    this.service.editProductByReference(productoActualizado).subscribe({
      next: (response) => {
        console.log('Precio unitario actualizado exitosamente:', response);
        this.guardando = false;
        this.activeModal.close({
          success: true,
          producto: productoActualizado
        });
      },
      error: (error) => {
        console.error('Error al actualizar precio unitario:', error);
        this.guardando = false;
        this.activeModal.close({
          success: false,
          error: error
        });
      }
    });
  }

  cancelar() {
    this.activeModal.dismiss();
  }
}
