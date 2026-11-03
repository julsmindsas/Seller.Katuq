import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-tipo-cliente',
  templateUrl: './crear-tipo-cliente.component.html',
  styleUrls: ['./crear-tipo-cliente.component.scss']
})
export class CrearTipoClienteComponent implements OnInit {
  tipoClienteForm: FormGroup;

  @Input() tipoClienteData: any;
  @Input() mostrarCrear: boolean;
  
  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.tipoClienteForm = this.fb.group({
      id: [''],
      active: [true, Validators.required],
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      // Marca EXCLUYENTE por empresa: el precio de este tipo pasa a ser también
      // el precio base del producto. El backend apaga la marca de los demás.
      esPrecioBase: [false]
    });
  }

  ngOnInit(): void {
    if (this.tipoClienteData) {
      this.mostrarCrear = false;
      this.tipoClienteForm.patchValue({
        id: this.tipoClienteData.id,
        active: this.tipoClienteData.active ?? true,
        nombre: this.tipoClienteData.nombre,
        descripcion: this.tipoClienteData.descripcion,
        esPrecioBase: this.tipoClienteData.esPrecioBase === true
      });
    }
  }

  /**
   * Prender "precio base" cambia lo que se ESCRIBE (a partir de ahí, guardar
   * precios de este tipo también pisa el precio unitario del producto), así que
   * se confirma aparte. Apagarlo no necesita confirmación: deja de escribir.
   */
  private async confirmarPrecioBaseSiAplica(): Promise<boolean> {
    const marcado = this.tipoClienteForm.value.esPrecioBase === true;
    const yaEstaba = this.tipoClienteData?.esPrecioBase === true;
    if (!marcado || yaEstaba) return true;

    const nombre = this.tipoClienteForm.value.nombre || 'este tipo';
    const res = await Swal.fire({
      title: '¿Que este tipo defina el precio base?',
      html: `Cada vez que guardes o importes precios por tipo de cliente, el precio de
             <strong>${nombre}</strong> quedará también como <strong>precio base</strong>
             del producto.<br><br>
             La pestaña <strong>Precio unitario</strong> desaparece de Lista de precios, y si
             otro tipo era el precio base, deja de serlo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, que defina el precio base',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    });
    return res.isConfirmed;
  }

  async guardar() {
    if (this.tipoClienteForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
    if (!(await this.confirmarPrecioBaseSiAplica())) return;

    const data = {
      nombre: this.tipoClienteForm.value.nombre,
      descripcion: this.tipoClienteForm.value.descripcion,
      active: this.tipoClienteForm.value.active,
      esPrecioBase: this.tipoClienteForm.value.esPrecioBase === true
    };

    this.service.createTipoCliente(data).subscribe({
      next: () => {
        Swal.fire({
          title: 'Guardado!',
          text: 'Tipo de cliente creado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        console.error('Error guardando:', error);
        Swal.fire('Error', 'Ocurrió un error al guardar', 'error');
      }
    });
  }

  async editar() {
    if (this.tipoClienteForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
    if (!(await this.confirmarPrecioBaseSiAplica())) return;

    const data = {
      id: this.tipoClienteForm.value.id,
      nombre: this.tipoClienteForm.value.nombre,
      descripcion: this.tipoClienteForm.value.descripcion,
      active: this.tipoClienteForm.value.active,
      esPrecioBase: this.tipoClienteForm.value.esPrecioBase === true
    };

    this.service.editTipoCliente(data).subscribe({
      next: () => {
        Swal.fire({
          title: 'Actualizado!',
          text: 'Tipo de cliente actualizado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        console.error('Error actualizando:', error);
        Swal.fire('Error', 'Ocurrió un error al actualizar', 'error');
      }
    });
  }
}
