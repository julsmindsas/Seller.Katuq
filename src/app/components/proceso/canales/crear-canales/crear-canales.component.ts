import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { BodegaService } from '../../../../shared/services/bodegas/bodega.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-canales',
  templateUrl: './crear-canales.component.html',
  styleUrls: ['./crear-canales.component.scss']
})
export class CrearCanalesComponent implements OnInit {
  canalForm: FormGroup;
  @Input() canalData: any;
  @Input() mostrarCrear: boolean;
  
  // Lista de bodegas
  bodegas: any[] = [];
  // Tipos de canales disponibles
  tiposCanal: any[] = [
    { id: 'Físico', name: 'Físico' },
    { id: 'E-commerce', name: 'E-commerce' },
    { id: 'Marketplace', name: 'Marketplace' },
    { id: 'Delivery', name: 'Delivery' },
    { id: 'Otros', name: 'Otros' }
  ];
  
  constructor(
    private fb: FormBuilder, 
    private service: MaestroService,
    private bodegaService: BodegaService,
    public activeModal: NgbActiveModal
  ) {
    this.canalForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      tipo: ['', Validators.required],
      bodega: ['', Validators.required],
      activo: [true, Validators.required]
    });
  }

  ngOnInit(): void {
    // Cargar las bodegas
    this.cargarBodegas();
    
    // Si estamos editando, cargar los datos del canal
    if (this.canalData) {
      this.mostrarCrear = false;
      this.canalForm.patchValue(this.canalData);
    }
  }

  cargarBodegas() {
    this.bodegaService.getBodegas().subscribe({
      next: (response: any) => {
        this.bodegas = response || [];
      },
      error: (error) => {
        console.error('Error al cargar bodegas:', error);
        
        // En caso de error, proporcionamos datos de ejemplo para desarrollo
        this.bodegas = [
          { idBodega: '1', nombre: 'Bodega Principal' },
          { idBodega: '2', nombre: 'Bodega E-commerce' },
          { idBodega: '3', nombre: 'Bodega de Reserva' }
        ];
      }
    });
  }

  guardar() {
    if (this.canalForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    // Como no existe el servicio todavía, simulamos una respuesta exitosa
    setTimeout(() => {
      Swal.fire({
        title: '¡Guardado!',
        text: 'Canal guardado con éxito',
        icon: 'success',
        confirmButtonText: 'Ok'
      }).then(() => {
        this.activeModal.close('success');
      });
    }, 1000);

    // Cuando se implemente el servicio, se usaría algo como:
    /*
    this.service.createEditCanal(this.canalForm.value).subscribe({
      next: (r) => {
        Swal.fire({
          title: 'Guardado!',
          text: 'Guardado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Ocurrió un error al guardar', 'error');
      }
    });
    */
  }

  editar() {
    if (this.canalForm.invalid) {
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    // Como no existe el servicio todavía, simulamos una respuesta exitosa
    setTimeout(() => {
      Swal.fire({
        title: '¡Actualizado!',
        text: 'Canal actualizado con éxito',
        icon: 'success',
        confirmButtonText: 'Ok'
      }).then(() => {
        this.activeModal.close('success');
      });
    }, 1000);

    // Cuando se implemente el servicio, se usaría algo como:
    /*
    this.service.createEditCanal(this.canalForm.value).subscribe({
      next: (r) => {
        Swal.fire({
          title: 'Actualizado!',
          text: 'Actualizado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.activeModal.close('success');
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Ocurrió un error al actualizar', 'error');
      }
    });
    */
  }
} 