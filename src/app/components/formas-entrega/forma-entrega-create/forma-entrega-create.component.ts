import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { HorarioEntregaComponent } from '../horario-entrega/horario-entrega.component';
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
  
  constructor(
    private formBuilder: FormBuilder, 
    private service: MaestroService, 
    public activeModal: NgbActiveModal,
    private modalService: NgbModal, 
    private ref: ChangeDetectorRef
  ) {
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
        const nameA = parseInt(a.posicion);
        const nameB = parseInt(b.posicion);
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
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
            text: 'Guardado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.activeModal.close('success');
          });
        });
      } else {
        var values = this.form2.value;
        values["_id"] = JSON.parse(sessionStorage.getItem("formaEntrega")!)._id;
        this.service.editFormaEntrega(values).subscribe(res => {
          Swal.fire({
            title: 'Editado!',
            text: 'Editado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.activeModal.close('success');
          });
        });
      }
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
      if (result != "Cross click") {
        this.horarios.push(result.nombre);
        this.horariosGuardar.push(result);
      }
      this.form2.controls["horariosPorFormaDeEntrega"].setValue(this.horariosGuardar);
      this.form2.controls["horariosSeleccionados"].setValue(this.horarios);
      this.horarios = [...this.horarios];
      this.ref.detectChanges();
    }, () => { });
  }

  eliminar(index, item) {
    this.horarioSeleccionados.splice(index, 1);
    this.form2.controls["horariosSeleccionados"].setValue(this.horarioSeleccionados);
  }

  deleter(index, item) {
    this.horarios.splice(index, 1);
    this.horarioSeleccionados.splice(index, 1);
    this.horarios = [...this.horarios];
    this.ref.detectChanges();
    this.form2.controls["horariosSeleccionados"].setValue(this.horarioSeleccionados);
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem("formaEntrega");
  }
}