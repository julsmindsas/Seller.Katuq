import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder,FormControl, Validators,FormArray } from '@angular/forms';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-crear-generos',
  templateUrl: './crear-generos.component.html',
  styleUrls: ['./crear-generos.component.scss']
})
export class CrearGenerosComponent implements OnInit {
  genreForm: FormGroup;
  mostrarCrear: boolean;
  edit: any;

  constructor(private fb: FormBuilder,private service:MaestroService) {
    this.genreForm = this.fb.group({
      activo: [false, Validators.required],
      name: ['', Validators.required],
      position: [0, Validators.required],
    });
   }
   ngAfterContentInit() {
    
   }

  ngOnInit(): void {
    this.mostrarCrear = true
    this.edit = JSON.parse(sessionStorage.getItem('infoFormsGender'))
    if (this.edit != null) {
      this.mostrarCrear = false
      this.genreForm.patchValue(this.edit)
    }
  }
  guardar(){
    this.service.createEditGenrre(this.genreForm.value).subscribe(r=> {console.log(r)
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })});
  }
  editar(){
    this.service.createEditOcasion(this.genreForm.value).subscribe(r=> {console.log(r)
      sessionStorage.removeItem('infoFormsGender')
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })});
  }

}
