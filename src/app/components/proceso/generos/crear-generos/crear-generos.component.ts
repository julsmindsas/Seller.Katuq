import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-crear-generos',
  templateUrl: './crear-generos.component.html',
  styleUrls: ['./crear-generos.component.scss']
})
export class CrearGenerosComponent implements OnInit {
  genreForm: FormGroup;
  selectedFile: File | null = null;
  selectedFileName: string = '';
 
  @Input() genreData: any;
  @Input() mostrarCrear: boolean;
  
  constructor(
    private fb: FormBuilder, 
    private service: MaestroService,
    public activeModal: NgbActiveModal,
    private translate: TranslateService
  ) {
    this.genreForm = this.fb.group({
      id: [''],
      activo: [false, Validators.required],
      name: ['', Validators.required],
      position: [0, Validators.required],
      image: [null]
    });
  }

  ngOnInit(): void {
    if (this.genreData) {
      this.mostrarCrear = false;
      this.genreForm.patchValue(this.genreData);
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.genreForm.get('image')?.setValue(file);
    }
  }

  guardar() {
    if (this.genreForm.invalid) {
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
      return;
    }

    this.service.createEditGenrre(this.genreForm.value).subscribe({
      next: (r) => {
        Swal.fire({
          title: this.translate.instant('proceso.comun.guardado'),
          text: this.translate.instant('proceso.crearGeneros.creadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.crearGeneros.errorGuardar'), 'error');
      }
    });
  }

  editar() {
    if (this.genreForm.invalid) {
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
      return;
    }

    const formData = {
      ...this.genreForm.value,
      id: this.genreForm.value.id
    };

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.service.createEditGenrre(formData).subscribe({
      next: (r) => {
        Swal.fire({
          title: this.translate.instant('proceso.comun.actualizado'),
          text: this.translate.instant('proceso.crearGeneros.actualizadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.crearGeneros.errorActualizar'), 'error');
      }
    });
  }
}