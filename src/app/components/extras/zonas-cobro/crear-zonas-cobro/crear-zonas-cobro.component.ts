import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-zonas-cobro',
  templateUrl: './crear-zonas-cobro.component.html',
  styleUrls: ['./crear-zonas-cobro.component.scss']
})
export class CrearZonasCobroComponent implements OnInit {
  zonasCorbroForm: FormGroup;
  editando: boolean = false;
  ciudades: string[] = [];

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.zonasCorbroForm = this.fb.group({
      ciudad: ['Seleccione', Validators.required],
      nombreZonaCobro: ['', Validators.required],
      valorZonaCobro: [0, Validators.required],
      impuestoZonaCobro: [0, Validators.required],
      impuesto: [0, Validators.required],
      total: [0, Validators.required]
    });
  }

  ngOnInit(): void {
    // Cargar ciudades desde localStorage o sessionStorage de forma segura
    try {
      const companyStr = localStorage.getItem('currentCompany') || sessionStorage.getItem('currentCompany');
      if (companyStr) {
        const company = JSON.parse(companyStr);
        this.ciudades = company?.ciudadess?.ciudadesEntrega || [];
      } else {
        this.ciudades = [];
      }
    } catch {
      this.ciudades = [];
    }

    // Cargar datos a editar del sessionStorage (si existen) de forma segura
    const editStr = sessionStorage.getItem('billingZoneEdit');
    if (editStr) {
      try {
        const data = JSON.parse(editStr);
        this.editando = true;
        this.zonasCorbroForm.patchValue(data);
      } catch {
        this.editando = false;
      }
    }
  }

  guardar() {
    this.zonasCorbroForm.value.impuesto = (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100));
    this.zonasCorbroForm.value.total = (this.zonasCorbroForm.value.valorZonaCobro + (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100)));
    
    this.service.createBillingZone(this.zonasCorbroForm.value).subscribe(r => {
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con éxito',
        icon: 'success',
        confirmButtonText: 'Ok'
      }).then(() => {
        this.activeModal.close('success');
      });
    });
  }

  editar() {
    this.zonasCorbroForm.value.impuesto = (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100));
    this.zonasCorbroForm.value.total = (this.zonasCorbroForm.value.valorZonaCobro + (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100)));
    this.zonasCorbroForm.value['cd'] = JSON.parse(sessionStorage.getItem('billingZoneEdit')).cd;
    
    this.service.editBillingZone(this.zonasCorbroForm.value).subscribe(r => {
      if (r) {
        Swal.fire({
          title: 'Guardado!',
          text: 'Editado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          sessionStorage.removeItem('billingZoneEdit');
          this.activeModal.close('success');
        });
      }
    });
  }
}