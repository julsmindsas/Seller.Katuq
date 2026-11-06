import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

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
    public activeModal: NgbActiveModal,
    private translate: TranslateService
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
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
      return;
    }

    this.loading = true;
    
    const canalData = this.canalForm.value;
    delete canalData.id; // Removemos el ID para creación
    
    this.service.crearCanal(canalData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          title: this.translate.instant('proceso.comun.guardado'),
          text: this.translate.instant('proceso.crearCanales.guardadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear canal:', error);
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.crearCanales.errorGuardar'), 'error');
      }
    });
  }

  editar(): void {
    if (this.canalForm.invalid) {
      this.marcarCamposComoTocados();
      Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.comun.completeCampos'), 'error');
      return;
    }

    this.loading = true;
    
    const canalData = this.canalForm.value;
    const canalId = canalData.id;
    
    this.service.actualizarCanal(canalId, canalData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          title: this.translate.instant('proceso.comun.actualizado'),
          text: this.translate.instant('proceso.crearCanales.actualizadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al actualizar canal:', error);
        Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.crearCanales.errorActualizar'), 'error');
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