import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators, FormArray } from '@angular/forms';
import { Session } from 'inspector';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { DataStoreService } from 'src/app/shared/services/dataStoreService';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-formas-pago',
  templateUrl: './crear-formas-pago.component.html',
  styleUrls: ['./crear-formas-pago.component.scss']
})
export class POSCrearFormasPagoComponent implements OnInit {
  fomrasPagoForm: FormGroup;
  editando: boolean = false;
  payEditData: any = null;
  
  constructor(
    private fb: FormBuilder, 
    private service: MaestroService,
    private dataStore: DataStoreService
  ) {
    this.fomrasPagoForm = this.fb.group({
      id: ['', Validators.required],
      online: ['Offline (Efectivo,Datafono, consignación, Transferencia, App, QR)', Validators.required],
      nombre: ['', Validators.required],
      posicion: ['', Validators.required],
      integracion: ['No', Validators.required],
      activo: [false, Validators.required],
      descripcionCorreoElectronico: ['', Validators.required],
      recordatorioCobro: ['', Validators.required]
    });
  }
  
  async ngOnInit(): Promise<void> {
    this.payEditData = await this.dataStore.get('payEdit');
    if (this.payEditData) {
      this.editando = true;
      this.fomrasPagoForm.patchValue(this.payEditData);
    }
  }
  
  guardar() {
    this.service.crearFormaPagoPOS(this.fomrasPagoForm.value).subscribe(r => {
      console.log(r);
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    });
  }
  
  editar() {
    const formValue = this.fomrasPagoForm.value;
    formValue['cd'] = this.payEditData.cd;
    this.service.editFormaPagoPOS(formValue).subscribe(r => {
      console.log(r);
      Swal.fire({
        title: 'Guardado!',
        text: 'Editado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    });
  }
}
