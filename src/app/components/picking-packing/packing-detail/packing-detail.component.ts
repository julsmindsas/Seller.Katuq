import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PickingPackingService } from '../../../shared/services/picking-packig/picking-packing.service';
import { PackingResponse, PackingRequest, PackingCompletarRequest, InformacionEmbalaje } from '../models/packing.model';

@Component({
  selector: 'app-packing-detail',
  templateUrl: './packing-detail.component.html',
  styleUrls: ['./packing-detail.component.scss']
})
export class PackingDetailComponent implements OnInit {
  packingId: string = '';
  ordenId: string = '';
  isNuevo: boolean = false;
  packing: PackingResponse | null = null;
  packingForm: FormGroup;
  embalajeForm: FormGroup;
  loading: boolean = false;
  submitting: boolean = false;
  
  // Para nuevo packing
  bodegasDisponibles: any[] = [];
  ordenesPendientes: any[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private packingService: PickingPackingService
  ) {
    this.packingForm = this.fb.group({
      ordenId: ['', Validators.required],
      bodegaId: ['', Validators.required]
    });
    
    this.embalajeForm = this.fb.group({
      tipo: ['', Validators.required],
      alto: [null],
      ancho: [null],
      largo: [null],
      peso: [null, Validators.required],
      cantidadPaquetes: [1, [Validators.required, Validators.min(1)]],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.packingId = params['id'];
      
      if (this.packingId === 'nuevo') {
        this.isNuevo = true;
        this.cargarDatosIniciales();
      } else {
        this.cargarDetallePacking();
      }
    });
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    
    // Cargar bodegas disponibles
    this.packingService.getBodegasDisponibles().subscribe(bodegas => {
      this.bodegasDisponibles = bodegas;
      
      // Cargar órdenes pendientes
      this.packingService.getOrdenesPendientes().subscribe(ordenes => {
        this.ordenesPendientes = ordenes;
        this.loading = false;
      });
    });
  }

  cargarDetallePacking(): void {
    this.loading = true;
    this.packingService.getEstadoPacking(this.packingId).subscribe({
      next: (data) => {
        this.packing = data;
        this.ordenId = data.ordenId;
        this.loading = false;
        
        // Si hay información de embalaje, cargar en el formulario
        if (data.informacionEmbalaje) {
          this.embalajeForm.patchValue({
            tipo: data.informacionEmbalaje.tipo,
            peso: data.informacionEmbalaje.peso,
            cantidadPaquetes: data.informacionEmbalaje.cantidadPaquetes,
            observaciones: data.informacionEmbalaje.observaciones || '',
            ...data.informacionEmbalaje.dimensiones
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar packing:', error);
        this.loading = false;
      }
    });
  }

  iniciarPacking(): void {
    if (this.packingForm.invalid) {
      this.packingForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const data: PackingRequest = {
      ordenId: this.packingForm.get('ordenId')?.value,
      bodegaId: this.packingForm.get('bodegaId')?.value
    };

    this.packingService.iniciarPacking(data).subscribe({
      next: (response) => {
        this.submitting = false;
        this.router.navigate(['/picking-packing/packing', response._id]);
      },
      error: (error) => {
        console.error('Error al iniciar packing:', error);
        this.submitting = false;
      }
    });
  }

  completarPacking(): void {
    if (!this.packing || !this.packing._id || this.embalajeForm.invalid) {
      this.embalajeForm.markAllAsTouched();
      return;
    }
    
    this.submitting = true;
    
    // Construir objeto de información de embalaje
    const formValues = this.embalajeForm.value;
    const informacionEmbalaje: InformacionEmbalaje = {
      tipo: formValues.tipo,
      peso: formValues.peso,
      cantidadPaquetes: formValues.cantidadPaquetes,
      observaciones: formValues.observaciones,
      dimensiones: {
        alto: formValues.alto,
        ancho: formValues.ancho,
        largo: formValues.largo
      }
    };
    
    const data: PackingCompletarRequest = {
      packingId: this.packing._id,
      informacionEmbalaje: informacionEmbalaje
    };

    this.packingService.completarPacking(data).subscribe({
      next: () => {
        this.submitting = false;
        this.cargarDetallePacking();
      },
      error: (error) => {
        console.error('Error al completar packing:', error);
        this.submitting = false;
      }
    });
  }

  volverALista(): void {
    this.router.navigate(['/picking-packing/packing']);
  }
} 