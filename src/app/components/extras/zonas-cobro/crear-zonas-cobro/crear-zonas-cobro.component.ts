import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder,FormControl, Validators,FormArray } from '@angular/forms';
import { Session } from 'inspector';
import { Router } from '@angular/router';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-crear-zonas-cobro',
  templateUrl: './crear-zonas-cobro.component.html',
  styleUrls: ['./crear-zonas-cobro.component.scss']
})
export class CrearZonasCobroComponent implements OnInit {

  zonasCorbroForm: FormGroup;
  editando: boolean =false;
  ciudades: string[]=[];
  constructor(private fb: FormBuilder,private service:MaestroService,private router:Router) {
    this.zonasCorbroForm = this.fb.group({
      ciudad:['Seleccione', Validators.required],
      nombreZonaCobro:['', Validators.required],
      valorZonaCobro: [0, Validators.required],
      impuestoZonaCobro:[0, Validators.required],
      impuesto:[0, Validators.required],
      total:[0, Validators.required]
      
  
     

    });
   }
  ngOnInit(): void {
    this.ciudades=JSON.parse(sessionStorage.getItem('currentCompany')).ciudadess.ciudadesEntrega
    if(sessionStorage.getItem('billingZoneEdit')){
      this.editando=true
      this.zonasCorbroForm.patchValue(JSON.parse(sessionStorage.getItem('billingZoneEdit')))

    }
  }
  regresar() {
    this.router.navigateByUrl("/extras/zonasCobro")
  }
  guardar(){
    this.zonasCorbroForm.value.impuesto=(this.zonasCorbroForm.value.valorZonaCobro*(this.zonasCorbroForm.value.impuestoZonaCobro/100))
    this.zonasCorbroForm.value.total=(this.zonasCorbroForm.value.valorZonaCobro+(this.zonasCorbroForm.value.valorZonaCobro*(this.zonasCorbroForm.value.impuestoZonaCobro/100)))
    this.service.createBillingZone(this.zonasCorbroForm.value).subscribe(r=> {
      console.log(r)
      this.router.navigateByUrl('extras/zonasCobro')
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'

      })});


  }
  editar(){
    this.zonasCorbroForm.value.impuesto=(this.zonasCorbroForm.value.valorZonaCobro*(this.zonasCorbroForm.value.impuestoZonaCobro/100))
    this.zonasCorbroForm.value.total=(this.zonasCorbroForm.value.valorZonaCobro+(this.zonasCorbroForm.value.valorZonaCobro*(this.zonasCorbroForm.value.impuestoZonaCobro/100)))
    this.zonasCorbroForm.value['cd']=JSON.parse(sessionStorage.getItem('billingZoneEdit')).cd
    this.service.editBillingZone(this.zonasCorbroForm.value).subscribe(r=> {
      console.log(r)
      if(r){
        Swal.fire({
          title: 'Guardado!',
          text: 'Editado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
          
        })
        this.router.navigateByUrl('extras/zonasCobro')
      }
      });
      sessionStorage.removeItem('billingZoneEdit')
      
    }

}
