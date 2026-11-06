import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

interface Canal {
  id: string;
  name: string;
  tipo: string;
  activo: boolean;
}

interface Bodega {
  id: string;
  idBodega: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  asignada?: boolean;
}

@Component({
  selector: 'app-bodegas-por-canal',
  templateUrl: './bodegas-por-canal.component.html',
  styleUrls: ['./bodegas-por-canal.component.scss']
})
export class BodegasPorCanalComponent implements OnInit {

  // Forms
  seleccionForm: FormGroup;
  
  // Data arrays
  canales: Canal[] = [];
  todasLasBodegas: Bodega[] = [];
  bodegasAsignadas: Bodega[] = [];
  bodegasDisponibles: Bodega[] = [];
  
  // Loading states
  cargando: boolean = false;
  cargandoBodegas: boolean = false;
  
  // Selected States
  canalSeleccionado: Canal | null = null;
  
  constructor(
    private fb: FormBuilder,
    private maestroService: MaestroService,
    private bodegaService: BodegaService,
    private translate: TranslateService
  ) {
    this.seleccionForm = this.fb.group({
      canal: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Verificar la integración con los nuevos servicios
    this.verificarIntegracion();
    
    // Primero cargamos los canales activos
    this.cargarCanales();
    
    // Configuramos el listener para cuando se seleccione un canal
    this.seleccionForm.get('canal')?.valueChanges.subscribe((canalId) => {
      if (canalId) {
        this.canalSeleccionado = this.canales.find(c => c.id === canalId) || null;
        
        // Al seleccionar un canal, cargamos todas las bodegas y las asociadas a este canal
        this.cargarBodegasParaCanal(canalId);
      } else {
        this.canalSeleccionado = null;
        this.bodegasAsignadas = [];
        this.bodegasDisponibles = [];
      }
    });
  }

  verificarIntegracion(): void {
    console.log('Iniciando verificación de integración en el componente BodegasPorCanal');
    this.bodegaService.verificarIntegracionBodegaCanal();
  }

  cargarCanales(): void {
    this.cargando = true;
    
    this.maestroService.getCanalesActivos().subscribe({
      next: (response: any[]) => {
        this.canales = response;
        this.cargando = false;
        console.log('Canales activos cargados:', this.canales);
      },
      error: (error) => {
        console.error('Error al cargar canales activos:', error);
        this.cargando = false;
        Swal.fire({
          title: this.translate.instant('comun.error'),
          text: this.translate.instant('proceso.bodegasPorCanal.errorCanales'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      }
    });
  }

  cargarBodegasParaCanal(canalId: string): void {
    this.cargandoBodegas = true;
    console.log('Cargando bodegas para el canal:', canalId);

    // Cargar bodegas asociadas al canal
    this.bodegaService.getBodegasPorCanal(canalId, true).subscribe({
      next: (bodegasAsociadas) => {
        console.log('Bodegas asociadas al canal:', bodegasAsociadas);
        this.bodegasAsignadas = bodegasAsociadas;

        // Cargar todas las bodegas disponibles
        this.bodegaService.getBodegas().subscribe({
          next: (todasLasBodegas) => {
            console.log('Todas las bodegas disponibles:', todasLasBodegas);
            
            // Marcar las bodegas como asignadas o disponibles
            this.bodegasDisponibles = todasLasBodegas.map(bodega => ({
              ...bodega,
              asignada: this.bodegasAsignadas.some(asignada => asignada.id === bodega.id)
            }));
            
            console.log('Bodegas disponibles después de procesar:', this.bodegasDisponibles);
            this.cargandoBodegas = false;
          },
          error: (error) => {
            console.error('Error al cargar bodegas disponibles:', error);
            this.cargandoBodegas = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar bodegas asociadas:', error);
        this.cargandoBodegas = false;
      }
    });
  }
  
  asignarBodega(bodega: any): void {
    if (!this.canalSeleccionado || bodega.asignada) {
      console.error('No hay canal seleccionado o la bodega ya está asignada');
      return;
    }

    this.cargandoBodegas = true;
    const canalId = this.canalSeleccionado.id;
    const canalName = this.canalSeleccionado.name;
    
    this.bodegaService.asociarBodegasACanal(canalId, [bodega.id]).subscribe({
      next: (response) => {
        console.log('Bodega asignada exitosamente:', response);
        // Actualizar las listas
        this.bodegasAsignadas.push(bodega);
        // Actualizar el estado de la bodega en la lista de disponibles
        const bodegaIndex = this.bodegasDisponibles.findIndex(b => b.id === bodega.id);
        if (bodegaIndex !== -1) {
          this.bodegasDisponibles[bodegaIndex].asignada = true;
        }
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('proceso.bodegasPorCanal.asignadaTitulo'),
          text: this.translate.instant('proceso.bodegasPorCanal.asignadaTexto', { bodega: bodega.nombre, canal: canalName }),
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      },
      error: (error) => {
        console.error('Error al asignar bodega:', error);
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('comun.error'),
          text: this.translate.instant('proceso.bodegasPorCanal.errorAsignar'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      }
    });
  }
  
  removerBodega(bodega: any): void {
    if (!this.canalSeleccionado) {
      console.error('No hay canal seleccionado');
      return;
    }

    this.cargandoBodegas = true;
    const canalId = this.canalSeleccionado.id;
    const canalName = this.canalSeleccionado.name;
    
    this.bodegaService.desasociarBodegasDeCanal(canalId, [bodega.id]).subscribe({
      next: (response) => {
        console.log('Bodega removida exitosamente:', response);
        // Actualizar las listas
        this.bodegasAsignadas = this.bodegasAsignadas.filter(b => b.id !== bodega.id);
        // Actualizar el estado de la bodega en la lista de disponibles
        const bodegaIndex = this.bodegasDisponibles.findIndex(b => b.id === bodega.id);
        if (bodegaIndex !== -1) {
          this.bodegasDisponibles[bodegaIndex].asignada = false;
        }
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('proceso.bodegasPorCanal.removidaTitulo'),
          text: this.translate.instant('proceso.bodegasPorCanal.removidaTexto', { bodega: bodega.nombre, canal: canalName }),
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      },
      error: (error) => {
        console.error('Error al remover bodega:', error);
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('comun.error'),
          text: this.translate.instant('proceso.bodegasPorCanal.errorRemover'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      }
    });
  }

  // Método para asignar múltiples bodegas al canal seleccionado
  asignarMultiplesBodegas(bodegasIds: string[]): void {
    if (!this.canalSeleccionado || bodegasIds.length === 0) return;
    
    this.cargandoBodegas = true;
    const canalId = this.canalSeleccionado.id;
    const canalName = this.canalSeleccionado.name;
    
    this.bodegaService.asociarBodegasACanal(canalId, bodegasIds).subscribe({
      next: () => {
        // Actualizamos las listas localmente
        const bodegasSeleccionadas = this.todasLasBodegas.filter(b => bodegasIds.includes(b.id));
        this.bodegasAsignadas = [...this.bodegasAsignadas, ...bodegasSeleccionadas];
        this.bodegasDisponibles = this.bodegasDisponibles.filter(b => !bodegasIds.includes(b.id));
        
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('proceso.bodegasPorCanal.variasAsignadasTitulo'),
          text: this.translate.instant('proceso.bodegasPorCanal.variasAsignadasTexto', { n: bodegasIds.length, canal: canalName }),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      },
      error: (error) => {
        console.error('Error al asignar múltiples bodegas al canal:', error);
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('comun.error'),
          text: this.translate.instant('proceso.bodegasPorCanal.errorAsignarVarias'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      }
    });
  }
  
  // Método para remover múltiples bodegas del canal seleccionado
  removerMultiplesBodegas(bodegasIds: string[]): void {
    if (!this.canalSeleccionado || bodegasIds.length === 0) return;
    
    this.cargandoBodegas = true;
    const canalId = this.canalSeleccionado.id;
    const canalName = this.canalSeleccionado.name;
    
    this.bodegaService.desasociarBodegasDeCanal(canalId, bodegasIds).subscribe({
      next: () => {
        // Actualizamos las listas localmente
        const bodegasSeleccionadas = this.todasLasBodegas.filter(b => bodegasIds.includes(b.id));
        this.bodegasDisponibles = [...this.bodegasDisponibles, ...bodegasSeleccionadas];
        this.bodegasAsignadas = this.bodegasAsignadas.filter(b => !bodegasIds.includes(b.id));
        
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('proceso.bodegasPorCanal.variasRemovidasTitulo'),
          text: this.translate.instant('proceso.bodegasPorCanal.variasRemovidasTexto', { n: bodegasIds.length, canal: canalName }),
          icon: 'success',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      },
      error: (error) => {
        console.error('Error al remover múltiples bodegas del canal:', error);
        this.cargandoBodegas = false;
        
        Swal.fire({
          title: this.translate.instant('comun.error'),
          text: this.translate.instant('proceso.bodegasPorCanal.errorRemoverVarias'),
          icon: 'error',
          confirmButtonText: this.translate.instant('comun.aceptar')
        });
      }
    });
  }
} 