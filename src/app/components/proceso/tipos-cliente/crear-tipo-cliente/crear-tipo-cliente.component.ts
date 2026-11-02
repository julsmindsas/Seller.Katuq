import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

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
    public activeModal: NgbActiveModal,
    private translate: TranslateService
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

    const nombre = this.tipoClienteForm.value.nombre || this.translate.instant('proceso.crearTipoCliente.esteTipo');
    const res = await Swal.fire({
      title: this.translate.instant('proceso.crearTipoCliente.confirmarTitulo'),
      html: this.translate.instant('proceso.crearTipoCliente.confirmarHtml', { nombre }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('proceso.crearTipoCliente.confirmarBoton'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      focusCancel: true
    });
    return res.isConfirmed;
  }

  async guardar() {
    if (this.tipoClienteForm.invalid) {
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
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
          title: this.translate.instant('proceso.comun.guardado'),
          text: this.translate.instant('proceso.crearTipoCliente.creadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        console.error('Error guardando:', error);
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.errorGuardar'), 'error');
      }
    });
  }

  async editar() {
    if (this.tipoClienteForm.invalid) {
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
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
          title: this.translate.instant('proceso.comun.actualizado'),
          text: this.translate.instant('proceso.crearTipoCliente.actualizadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        console.error('Error actualizando:', error);
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.errorActualizar'), 'error');
      }
    });
  }
}
