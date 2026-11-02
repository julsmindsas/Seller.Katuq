import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-crear-ocasiones',
  templateUrl: './crear-ocasiones.component.html',
  styleUrls: ['./crear-ocasiones.component.scss']
})
export class CrearOcasionesComponent implements OnInit {
  ocasionForm: FormGroup;
  selectedFile: File | null = null;
  selectedFileName: string = '';
 
  @Input() ocasionData: any; // Usa @Input en lugar de @Inject
  @Input() mostrarCrear: boolean;
  
  constructor(
    private fb: FormBuilder, 
    private service: MaestroService,
    public activeModal: NgbActiveModal,
    private translate: TranslateService
  ) {
    this.ocasionForm = this.fb.group({
      id: [''],
      activo: [false, Validators.required],
      name: ['', Validators.required],
      position: [0, Validators.required],
      image: [null]
    });
  }

  ngOnInit(): void {
    if (this.ocasionData) {
      this.mostrarCrear = false;
      this.ocasionForm.patchValue(this.ocasionData);
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.ocasionForm.get('image')?.setValue(file);
    }
  }

  guardar() {
    if (this.ocasionForm.invalid) {
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
      return;
    }

    // const formData = []
    // Object.keys(this.ocasionForm.value).forEach(key => {
    //   if (key !== 'image' && this.ocasionForm.get(key)?.value !== null) {
    //     formData.push(key, this.ocasionForm.get(key)?.value);
    //   }
    // });

    // 

    this.service.createEditOcasion(this.ocasionForm.value).subscribe({
      next: (r) => {
        Swal.fire({
          title: this.translate.instant('proceso.comun.guardado'),
          text: this.translate.instant('proceso.comun.guardadoExito'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.errorGuardar'), 'error');
      }
    });
  }

  editar() {
    if (this.ocasionForm.invalid) {
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
      return;
    }

    const formData ={
      ... this.ocasionForm.value,
      id:this.ocasionForm.value.id
     }

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.service.createEditOcasion(formData).subscribe({
      next: (r) => {
        Swal.fire({
          title: this.translate.instant('proceso.comun.actualizado'),
          text: this.translate.instant('proceso.comun.actualizadoExito'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.errorActualizar'), 'error');
      }
    });
  }
}