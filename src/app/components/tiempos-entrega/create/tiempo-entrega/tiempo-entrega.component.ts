import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tiempo-entrega',
  templateUrl: './tiempo-entrega.component.html',
  styleUrls: ['./tiempo-entrega.component.scss']
})
export class TiempoEntregaComponent implements OnInit {
  form: FormGroup;
  empresaActual: any;
  isEditing = false;

  constructor(
    private formBuilder: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) { }

  ngOnInit(): void {
    const tiempoEntregaStr = sessionStorage.getItem("tiempoEntregaEdit");
    const tiempoEntregaEdit = tiempoEntregaStr ? JSON.parse(tiempoEntregaStr) : null;

    this.service.consultarEmpresasByUser(null).subscribe((r: any) => {
      this.empresaActual = (r as any[])[0];
    });

    this.form = this.formBuilder.group({
      nombreInterno: [tiempoEntregaEdit ? tiempoEntregaEdit.nombreInterno : '', Validators.required],
      nombreExterno: [tiempoEntregaEdit ? tiempoEntregaEdit.nombreExterno : '', Validators.required],
      descripcion: [tiempoEntregaEdit ? tiempoEntregaEdit.descripcion : '', Validators.required],
      minDias: [tiempoEntregaEdit ? tiempoEntregaEdit.minDias : null, Validators.required],
      posicion: [tiempoEntregaEdit ? tiempoEntregaEdit.posicion : null, Validators.required],
      activo: [tiempoEntregaEdit ? tiempoEntregaEdit.activo : true],
      ciudad: [tiempoEntregaEdit ? tiempoEntregaEdit.ciudad : [], Validators.required],
      cd: [tiempoEntregaEdit ? tiempoEntregaEdit.cd : null]
    });

    this.isEditing = !!tiempoEntregaEdit;
  }

  onSubmit() {
    if (this.form.valid) {
      if (this.form.value.cd == null) {
        this.service.createTiempoEntrega(this.form.value).subscribe(res => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Tiempo de entrega creado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.activeModal.close('success');
          });
        });
      } else {
        this.service.updateTiempoEntrega(this.form.value).subscribe(res => {
          Swal.fire({
            title: 'Actualizado!',
            text: 'Tiempo de entrega actualizado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.activeModal.close('success');
          });
        });
      }
    }
  }
}