import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipo-entrega',
  templateUrl: './tipo-entrega.component.html',
  styleUrls: ['./tipo-entrega.component.scss']
})
export class TipoEntregaComponent implements OnInit, OnDestroy {
  formasEntrega: ArrayBuffer;
  form: FormGroup;
  isEditing = false;

  constructor(
    private formBuilder: FormBuilder, 
    private service: MaestroService, 
    public activeModal: NgbActiveModal
  ) { }

  ngOnInit(): void {
    const formaEntregaEditStr = sessionStorage.getItem("formaEntregaEdit");
    const formaEntregaEdit = formaEntregaEditStr ? JSON.parse(formaEntregaEditStr) : null;

    this.service.getFormaEntrega().subscribe(r => {
      this.formasEntrega = r;
    });

    this.form = this.formBuilder.group({
      nombreInterno: [formaEntregaEdit ? formaEntregaEdit.nombreInterno : '', Validators.required],
      nombreExterno: [formaEntregaEdit ? formaEntregaEdit.nombreExterno : '', Validators.required],
      descripcion: [formaEntregaEdit ? formaEntregaEdit.descripcion : '', Validators.required],
      posicion: [formaEntregaEdit ? formaEntregaEdit.posicion : null, Validators.required],
      activo: [formaEntregaEdit ? formaEntregaEdit.activo : true],
      formaEntrega: [formaEntregaEdit ? formaEntregaEdit.formaEntrega : [], Validators.required],
      cd: [formaEntregaEdit ? formaEntregaEdit.cd : null],
    });

    this.isEditing = !!formaEntregaEdit;
  }

  onSubmit() {
    if (this.form.valid) {
      if (this.form.value.cd == null) {
        this.service.createTipoEntrega(this.form.value).subscribe(res => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Guardado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.activeModal.close('success');
          });
        });
      } else {
        this.service.updateTipoEntrega(this.form.value).subscribe(res => {
          Swal.fire({
            title: 'Actualizado!',
            text: 'Actualizado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.activeModal.close('success');
          });
        });
      }
    }
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem("formaEntregaEdit");
  }
}