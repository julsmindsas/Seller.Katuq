import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder,FormControl, Validators,FormArray } from '@angular/forms';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-ocasiones',
  templateUrl: './crear-ocasiones.component.html',
  styleUrls: ['./crear-ocasiones.component.scss']
})
export class CrearOcasionesComponent implements OnInit {
  ocasionForm: FormGroup;
  mostrarCrear: boolean;
  edit: any;
  constructor(private fb: FormBuilder,private service:MaestroService) {
    this.ocasionForm = this.fb.group({
      id:[''],
      activo: [false, Validators.required],
      name: ['', Validators.required],
      position: [0, Validators.required],
      
    });
   }

  ngOnInit(): void {
    this.mostrarCrear = true
    this.edit = JSON.parse(sessionStorage.getItem('infoFormsOcasion'))
    if (this.edit != null) {
      this.mostrarCrear = false
      this.ocasionForm.patchValue(this.edit)
    }
  }
  guardar(){
    this.service.createEditOcasion(this.ocasionForm.value).subscribe(r=> {console.log(r)
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })});
  }
  editar(){
 const ocasion ={
  ... this.ocasionForm.value,
  id:this.ocasionForm.value.id
 }
    this.service.createEditOcasion(ocasion).subscribe(r=> {console.log(r)
      sessionStorage.removeItem('infoFormsOcasion')
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })});
  }

}

