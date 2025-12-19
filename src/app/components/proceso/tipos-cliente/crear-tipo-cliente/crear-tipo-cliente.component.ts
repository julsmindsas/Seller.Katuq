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
      descripcion: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.tipoClienteData) {
      this.mostrarCrear = false;
      this.tipoClienteForm.patchValue({
        id: this.tipoClienteData.id,
        active: this.tipoClienteData.active ?? true,
        nombre: this.tipoClienteData.nombre,
        descripcion: this.tipoClienteData.descripcion
      });
    }
  }

  guardar() {
    if (this.tipoClienteForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    const data = {
      nombre: this.tipoClienteForm.value.nombre,
      descripcion: this.tipoClienteForm.value.descripcion,
      active: this.tipoClienteForm.value.active
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

  editar() {
    if (this.tipoClienteForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    const data = {
      id: this.tipoClienteForm.value.id,
      nombre: this.tipoClienteForm.value.nombre,
      descripcion: this.tipoClienteForm.value.descripcion,
      active: this.tipoClienteForm.value.active
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
