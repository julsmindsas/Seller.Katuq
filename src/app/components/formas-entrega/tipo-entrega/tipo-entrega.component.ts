import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipo-entrega',
  templateUrl: './tipo-entrega.component.html',
  styleUrls: ['./tipo-entrega.component.scss']
})
export class TipoEntregaComponent implements OnInit,OnDestroy {
  formasEntrega: ArrayBuffer;
  form: FormGroup;

  constructor(private formBuilder: FormBuilder, private service: MaestroService, private router: Router) { }
 

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
      formaEntrega: [formaEntregaEdit ? formaEntregaEdit.formaEntrega : [], Validators.required], // Suponiendo que formaEntrega es un array que debe convertirse a una cadena separada por comas.
      cd: [formaEntregaEdit ? formaEntregaEdit.cd : null],
    });
  }


  onSubmit() {
    if (this.form.valid) {
      // form is valid, do something with the form values
      console.log(this.form.value);
      if (this.form.value.cd == null) {
        this.service.createTipoEntrega(this.form.value).subscribe(res => {
          console.log("🚀 ~ file: horario-entrega.component.ts:33 ~ HorarioEntregaComponent ~ this.service.createHorario ~ res", res)
          Swal.fire({
            icon: 'success',
            title: 'Creado',
            text: 'Se creo correctamente',
            showConfirmButton: false,
            timer: 1500
          });
          this.router.navigateByUrl('/formasEntrega/tipoentrega/lista')
        });
      } else {
        this.service.updateTipoEntrega(this.form.value).subscribe(res => {
          console.log("🚀 ~ file: horario-entrega.component.ts:33 ~ HorarioEntregaComponent ~ this.service.createHorario ~ res", res)
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Se actualizo correctamente',
            showConfirmButton: false,
            timer: 1500
          });
          this.router.navigateByUrl('/formasEntrega/tipoentrega/lista');
        });
      }
    } else {
      // form is invalid, show an error message
    }
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem("formaEntregaEdit");
  }

}
