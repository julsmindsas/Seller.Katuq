import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

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
    public activeModal: NgbActiveModal
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
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    this.service.createEditGenrre(this.genreForm.value).subscribe({
      next: (r) => {
        Swal.fire({
          title: 'Guardado!',
          text: 'Género creado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Ocurrió un error al guardar el género', 'error');
      }
    });
  }

  editar() {
    if (this.genreForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
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
          title: 'Actualizado!',
          text: 'Género actualizado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Ocurrió un error al actualizar el género', 'error');
      }
    });
  }
}