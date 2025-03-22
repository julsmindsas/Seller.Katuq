import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder,FormControl, Validators,FormArray } from '@angular/forms';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-crear-variables',
  templateUrl: './crear-variables.component.html',
  styleUrls: ['./crear-variables.component.scss']
})
export class CrearVariablesComponent implements OnInit {

  variableForm: FormGroup;
  constructor(private fb: FormBuilder,private service:MaestroService) {
    this.variableForm = this.fb.group({
      id: ['', Validators.required],
      titulo: ['', Validators.required],
      variable: ['', Validators.required],
      valor: ['', Validators.required],
    });
   }
  ngOnInit(): void {
  }
  guardar(){
    this.service.crearEditarVariables(this.variableForm.value).subscribe(r=> {console.log(r)
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      })});
  }
}
