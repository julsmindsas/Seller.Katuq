import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-horario-entrega',
  templateUrl: './horario-entrega.component.html',
  styleUrls: ['./horario-entrega.component.scss']
})
export class HorarioEntregaComponent implements OnInit {

 
  form: FormGroup;

  constructor(private formBuilder: FormBuilder, private service: MaestroService,private router:Router,public activeModal: NgbActiveModal) {
    this.form = this.formBuilder.group({
      nombre: ['', Validators.required],
      colorHorario: ['', Validators.required],
      posicion: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      activo: [true]
    });
  }

  ngOnInit(): void {
  }

  submit() {
    if (this.form.valid) {
      // form is valid, do something with the form values
      console.log(this.form.value);
      this.activeModal.close(this.form.value);
      this.service.createHorario(this.form.value).subscribe(res => {
        console.log("🚀 ~ file: horario-entrega.component.ts:33 ~ HorarioEntregaComponent ~ this.service.createHorario ~ res", res)
        this.activeModal.close('creado');
        Swal.fire({
          title: 'Guardado!',
          text: 'Horario Guardado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        })
      	// this.router.navigateByUrl('/horarioEntrega')
      })
    } else {
      // form is invalid, show an error message
    }
  }

}
