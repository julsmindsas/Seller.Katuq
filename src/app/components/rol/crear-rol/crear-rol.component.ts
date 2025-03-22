import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service'
import Swal from 'sweetalert2'

@Component({
  selector: 'app-crear-rol',
  templateUrl: './crear-rol.component.html',
  styleUrls: ['./crear-rol.component.scss']
})
export class CrearRolComponent implements OnInit {
  public f: FormGroup
  constructor(private fb: FormBuilder,private service: MaestroService) {
    this.f = fb.group({
      nombre: ['', [Validators.required, Validators.email]],
      descripcion: ['', Validators.required],
      permisos: ['', [Validators.required]],


    });
   }

  ngOnInit(): void {
  }
  guardar() {

    this.service.createRol(this.f.value).subscribe(r=> {console.log(r)
    Swal.fire({
      title: 'Guardado!',
      text: 'Guardado con exito',
      icon: 'success',
      confirmButtonText: 'Ok'
    })});
  }

}
