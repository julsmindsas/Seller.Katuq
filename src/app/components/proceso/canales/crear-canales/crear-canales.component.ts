import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-canales',
  templateUrl: './crear-canales.component.html',
  styleUrls: ['./crear-canales.component.scss']
})
export class CrearCanalesComponent implements OnInit {
  canalForm: FormGroup;
  @Input() canalData: any;
  @Input() mostrarCrear: boolean = true;
  
  // Tipos de canales disponibles
  tiposCanal: any[] = [
    { id: 'Físico', name: 'Físico' },
    { id: 'E-commerce', name: 'E-commerce' },
    { id: 'Marketplace', name: 'Marketplace' },
    { id: 'Delivery', name: 'Delivery' },
    { id: 'Otros', name: 'Otros' }
  ];
  
  loading: boolean = false;
  
  constructor(
    private fb: FormBuilder, 
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    // Si estamos editando, cargar los datos del canal
    if (this.canalData && !this.mostrarCrear) {
      this.cargarDatosEdicion();
    }
  }

  inicializarFormulario(): void {
    this.canalForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      tipo: ['', Validators.required],
      activo: [true]
    });
  }

  cargarDatosEdicion(): void {
    if (this.canalData.id) {
      this.loading = true;
      this.service.getCanalById(this.canalData.id).subscribe({
        next: (canal) => {
          this.canalForm.patchValue(canal);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar datos del canal:', error);
          // Si hay un error, cargamos los datos que nos pasaron directamente
          this.canalForm.patchValue(this.canalData);
          this.loading = false;
        }
      });
    } else {
      this.canalForm.patchValue(this.canalData);
    }
  }

  guardar(): void {
    if (this.canalForm.invalid) {
      this.marcarCamposComoTocados();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    this.loading = true;
    
    const canalData = this.canalForm.value;
    delete canalData.id; // Removemos el ID para creación
    
    this.service.crearCanal(canalData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          title: '¡Guardado!',
          text: 'Canal guardado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear canal:', error);
        Swal.fire('Error', 'Ocurrió un error al guardar el canal', 'error');
      }
    });
  }

  editar(): void {
    if (this.canalForm.invalid) {
      this.marcarCamposComoTocados();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    this.loading = true;
    
    const canalData = this.canalForm.value;
    const canalId = canalData.id;
    
    this.service.actualizarCanal(canalId, canalData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          title: '¡Actualizado!',
          text: 'Canal actualizado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al actualizar canal:', error);
        Swal.fire('Error', 'Ocurrió un error al actualizar el canal', 'error');
      }
    });
  }
  
  marcarCamposComoTocados(): void {
    Object.keys(this.canalForm.controls).forEach(key => {
      this.canalForm.get(key)?.markAsTouched();
    });
  }
  
  get f() { 
    return this.canalForm.controls; 
  }
} 