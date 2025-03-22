import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { HorarioEntregaComponent } from '../horario-entrega/horario-entrega.component'
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forma-entrega-create',
  templateUrl: './forma-entrega-create.component.html',
  styleUrls: ['./forma-entrega-create.component.scss']
})
export class FormaEntregaCreateComponent implements OnInit, OnDestroy {
  form2: FormGroup;
  horarios: any[] = [];
  isEditing = false;
  empresaActual: any;
  listaHorariosParciales: any[];
  horarioSeleccionados: any;
  indice: number;
  horariosGuardar: any[] = [];
  constructor(private formBuilder: FormBuilder, private service: MaestroService, private router: Router, private modalService: NgbModal, private ref: ChangeDetectorRef,) {
    this.listaHorariosParciales = [];
    this.form2 = this.formBuilder.group({
      nombre: ['', Validators.required],
      horariosSeleccionados: [[], Validators.required],
      horariosPorFormaDeEntrega: [[]],
      posicion: ['', Validators.required],
      ciudad: ['', Validators.required],
      activo: [true]
    });
  }



  ngOnInit(): void {
    this.service.consultarEmpresas().subscribe((r: any) => {
      this.empresaActual = (r as any[])[0];
    });

    // this.cargarHorarios();
    if (sessionStorage.getItem("formaEntrega") != null) {
      this.form2.patchValue(JSON.parse(sessionStorage.getItem("formaEntrega")!));
      this.horarios = this.form2.controls["horariosPorFormaDeEntrega"].value;
      this.isEditing = true;
      this.horarioSeleccionados = [...this.form2.controls["horariosSeleccionados"].value];
    }
    this.form2.valueChanges.subscribe((horariosSeleccionados) => {
      this.horarioSeleccionados = [...this.form2.controls["horariosSeleccionados"].value];
    });

  }

  private cargarHorarios() {
    this.service.getHorarioEntregas().subscribe((r: any) => {
      this.horarios = (r as any[]).sort((a, b) => {
        const nameA = parseInt(a.posicion); // ignore upper and lowercase
        const nameB = parseInt(b.posicion); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
    });
  }

  submit() {
    if (this.form2.valid) {
      if (this.isEditing == false) {
        this.service.createFormaEntrega(this.form2.value).subscribe(res => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Guardado con exito',
            icon: 'success',
            confirmButtonText: 'Ok'
          })
          this.router.navigateByUrl('/formasEntrega');

        })
      }
      else {
        var values = this.form2.value;
        values["_id"] = JSON.parse(sessionStorage.getItem("formaEntrega")!)._id;
        this.service.editFormaEntrega(values).subscribe(res => {
          Swal.fire({
            title: 'Editado!',
            text: 'Editado con exito',
            icon: 'success',
            confirmButtonText: 'Ok'
          })
          this.router.navigateByUrl('/formasEntrega');
        })
      }
    } else {
      // form is invalid, show an error message
    }
  }

  addHorario() {
    const config: NgbModalOptions = {
      backdrop: "static",
      size: 'xl',
      keyboard: false
    }
    const modalRef = this.modalService.open(HorarioEntregaComponent, config);

    modalRef.result.then((result) => {
      // const horarios = this.form2.controls["horariosPorFormaDeEntrega"].value;
      // horarios.push(result)
      if (result != "Cross click") {
        this.horarios.push(result.nombre);
        this.horariosGuardar.push(result)
      }
      this.form2.controls["horariosPorFormaDeEntrega"].setValue(this.horariosGuardar);
      this.form2.controls["horariosSeleccionados"].setValue(this.horarios);
      this.horarios = [...this.horarios];
      this.ref.detectChanges();
      // setTimeout(async () => {
      //   await this.cargarHorarios();
      // }, 1050);

    }, () => { });
  }


  getName(item: any) {
    console.log("🚀 ~ file: forma-entrega-create.component.ts:120 ~ FormaEntregaCreateComponent ~ getName ~ item:", item)

  }

  eliminar(index, item) {
    console.log("🚀 ~ file: forma-entrega-create.component.ts:124 ~ FormaEntregaCreateComponent ~ editar ~ item:")

    // const indice=this.horarios.findIndex((elemento) => elemento == item)
    // if (indice !== -1) {
    this.horarioSeleccionados.splice(index, 1);
    this.form2.controls["horariosSeleccionados"].setValue(this.horarioSeleccionados)
    // }

  }
  deleter(index, item) {
    console.log("🚀 ~ file: forma-entrega-create.component.ts:124 ~ FormaEntregaCreateComponent ~ editar ~ item:")

    // const indice=this.horarios.findIndex((elemento) => elemento == item)
    // if (indice !== -1) {
    this.horarios.splice(index, 1);
    this.horarioSeleccionados.splice(index, 1);
    this.horarios = [...this.horarios];
    this.ref.detectChanges();
    this.form2.controls["horariosSeleccionados"].setValue(this.horarioSeleccionados)
    // }

  }

  regresar() {
    this.router.navigateByUrl("/formasEntrega")
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem("formaEntrega");
  }


}
