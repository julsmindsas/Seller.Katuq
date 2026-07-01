import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-descuento-promocion',
  templateUrl: './crear-descuento-promocion.component.html',
  styleUrls: ['./crear-descuento-promocion.component.scss']
})
export class CrearDescuentoPromocionComponent implements OnInit {
  @Input() mostrarCrear: boolean = true;
  @Input() descuentoData: any;

  form: FormGroup;

  tiposDescuento = [
    { label: 'Porcentaje (%)', value: 'porcentaje' },
    { label: 'Valor fijo ($)', value: 'valor_fijo' },
    { label: 'Envío gratis', value: 'envio_gratis' }
  ];

  aplicaAOpciones = [
    { label: 'Todos los productos', value: 'todos_los_productos' },
    { label: 'Categoría específica', value: 'categoria' },
    { label: 'Producto específico', value: 'producto_especifico' }
  ];

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      descripcion: [''],
      codigoPersonalizado: ['', Validators.required],
      tipo: ['porcentaje', Validators.required],
      valor: [0, [Validators.required, Validators.min(0)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      limiteUsos: [null],
      aplicaA: ['todos_los_productos', Validators.required],
      activo: [true],
      // ── Campos nuevos ────────────────────────────────────────────────────
      montoMinimo: [null, [Validators.min(0)]],
      limiteUsosPorCliente: [null, [Validators.min(1)]],
      combinable: [false]
    });
  }

  ngOnInit(): void {
    if (this.descuentoData) {
      this.mostrarCrear = false;
      this.form.patchValue(this.descuentoData);
    }
  }

  get tipoSeleccionado() { return this.form.get('tipo')?.value; }

  codigoUpper(event: any) {
    const upper = (event.target.value || '').toUpperCase();
    event.target.value = upper;
    this.form.get('codigoPersonalizado')?.setValue(upper, { emitEvent: false });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
    this.service.createDescuentoPromocion(this.form.value).subscribe({
      next: () => {
        Swal.fire('¡Creado!', 'El descuento fue creado exitosamente.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo crear el descuento.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  editar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
    this.service.editDescuentoPromocion(this.form.value).subscribe({
      next: () => {
        Swal.fire('¡Actualizado!', 'El descuento fue actualizado.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el descuento.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}
