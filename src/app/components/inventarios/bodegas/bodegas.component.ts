import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearBodegasComponent } from './crear-bodegas/crear-bodegas.component';
import { SelectorCiudadesCoberturaComponent } from './selector-ciudades-cobertura/selector-ciudades-cobertura.component';
import { ImportarBodegasModalComponent } from './importar-bodegas-modal/importar-bodegas-modal.component';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { FulfillmentService } from '../../../shared/services/fulfillment/fulfillment.service';
import { CiudadCobertura } from '../../../shared/models/inventarios/bodega.model';
import { FulfillmentWarehouse } from '../../../shared/models/fulfillment/fulfillment.model';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-bodegas',
  templateUrl: './bodegas.component.html',
  styleUrls: ['./bodegas.component.scss']
})
export class BodegasComponent implements OnInit {
  cargando: boolean = false;
  bodegas: any[] = [];
  selectedColumns: any[] = [];
  importandoFulfillment: boolean = false;

  constructor(
    private modalService: NgbModal,
    private bodegaService: BodegaService,
    private fulfillmentService: FulfillmentService
  ) { }

  ngOnInit(): void {
    this.cargarBodegas();
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe(bodegas => {
      this.bodegas = bodegas;
      this.cargando = false;
    });
  }

  abrirModalCrear() {
    const modalRef = this.modalService.open(CrearBodegasComponent, {
      size: 'xl',
      centered: true
    });

    modalRef.result.then((result) => {
      if (result) {
        this.cargarBodegas();
      }
    }, () => { });
  }

  abrirModalEditar(bodega: any) {
    const modalRef = this.modalService.open(CrearBodegasComponent, {
      size: 'xl',
      backdrop: 'static',

      centered: true
    });

    modalRef.componentInstance.bodegaData = bodega;
    modalRef.componentInstance.isEditMode = true;

    modalRef.result.then((result) => {
      if (result) {
        this.bodegaService.actualizarBodega(result);
      }
    }, () => { });
  }

  eliminarBodega(bodega: any) {
    Swal.fire({
      title: '¿Está seguro de eliminar esta bodega?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        this.bodegaService.eliminarBodega(bodega.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Bodega eliminada correctamente.', 'success');
            this.cargarBodegas();
          },
          error: () => {
            Swal.fire('Error', 'Ocurrió un error al eliminar la bodega.', 'error');
            this.cargando = false;
          }
        });
      }
    });
  }

  abrirModalCobertura(bodega: any): void {
    const modalRef = this.modalService.open(SelectorCiudadesCoberturaComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.ciudadesSeleccionadas = bodega.ciudadesCobertura || [];
    modalRef.componentInstance.coberturaNacional = bodega.coberturaNacional || false;

    modalRef.result.then((result: { coberturaNacional: boolean; ciudadesCobertura: CiudadCobertura[] }) => {
      if (result) {
        const bodegaActualizada = {
          ...bodega,
          coberturaNacional: result.coberturaNacional,
          ciudadesCobertura: result.ciudadesCobertura
        };
        this.cargando = true;
        this.bodegaService.actualizarBodega(bodegaActualizada).subscribe({
          next: () => {
            Swal.fire('Actualizado', 'Cobertura actualizada correctamente.', 'success');
            this.cargarBodegas();
          },
          error: () => {
            Swal.fire('Error', 'Error al actualizar la cobertura.', 'error');
            this.cargando = false;
          }
        });
      }
    }, () => {});
  }

  getCoberturaTooltip(bodega: any): string {
    if (bodega.coberturaNacional) {
      return 'Cobertura Nacional - Atiende todas las ciudades de Colombia';
    }
    if (!bodega.ciudadesCobertura || bodega.ciudadesCobertura.length === 0) {
      return 'Sin ciudades de cobertura';
    }
    const primeras = bodega.ciudadesCobertura.slice(0, 5).map((c: CiudadCobertura) => c.nombre).join(', ');
    if (bodega.ciudadesCobertura.length > 5) {
      return primeras + ` y ${bodega.ciudadesCobertura.length - 5} mas...`;
    }
    return primeras;
  }

  exportarExcel() {
    // Lógica para exportar a Excel
    console.log('Exportando a Excel...');
  }

  /**
   * Importa bodegas desde proveedores de fulfillment configurados
   */
  importarBodegasFulfillment() {
    console.log('[BodegasComponent] Click en importarBodegasFulfillment');
    this.importandoFulfillment = true;

    // 1. Obtener providers configurados
    console.log('[BodegasComponent] Llamando a fulfillmentService.getConfiguredProviders()...');
    this.fulfillmentService.getConfiguredProviders().subscribe({
      next: (providers) => {
        console.log('[BodegasComponent] Providers recibidos:', providers);
        if (!providers || providers.length === 0) {
          console.log('[BodegasComponent] No hay providers - mostrando mensaje');
          this.importandoFulfillment = false;
          Swal.fire({
            icon: 'info',
            title: 'Sin proveedores',
            text: 'No hay proveedores de fulfillment configurados. Configure un proveedor en Integraciones.'
          });
          return;
        }

        // 2. Obtener bodegas de cada provider
        const warehouseRequests = providers
          .filter(p => p.configured)
          .map(p => this.fulfillmentService.getWarehouses(p.provider).pipe(
            catchError(() => of([]))
          ));

        if (warehouseRequests.length === 0) {
          this.importandoFulfillment = false;
          Swal.fire({
            icon: 'info',
            title: 'Sin proveedores activos',
            text: 'No hay proveedores de fulfillment activos.'
          });
          return;
        }

        forkJoin(warehouseRequests).subscribe({
          next: (warehousesArrays) => {
            // Aplanar y agregar provider a cada bodega
            const allWarehouses: any[] = [];
            providers.filter(p => p.configured).forEach((provider, index) => {
              const warehouses = warehousesArrays[index] || [];
              warehouses.forEach((wh: FulfillmentWarehouse) => {
                allWarehouses.push({
                  ...wh,
                  provider: provider.provider,
                  providerName: this.fulfillmentService.getProviderDisplayName(provider.provider)
                });
              });
            });

            this.importandoFulfillment = false;

            if (allWarehouses.length === 0) {
              Swal.fire({
                icon: 'info',
                title: 'Sin bodegas',
                text: 'No se encontraron bodegas en los proveedores de fulfillment.'
              });
              return;
            }

            // 3. Mostrar modal de selección
            this.mostrarModalSeleccionBodegas(allWarehouses);
          },
          error: (error) => {
            this.importandoFulfillment = false;
            console.error('Error obteniendo bodegas de fulfillment:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error al obtener bodegas del fulfillment.'
            });
          }
        });
      },
      error: (error) => {
        this.importandoFulfillment = false;
        console.error('Error obteniendo providers:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al verificar proveedores de fulfillment.'
        });
      }
    });
  }

  /**
   * Muestra modal para seleccionar qué bodegas importar
   */
  private mostrarModalSeleccionBodegas(warehouses: any[]) {
    // Filtrar las que ya existen en Katuq por fulfillmentId
    const bodegasExistentes = this.bodegas
      .filter(b => b.fulfillmentId)
      .map(b => b.fulfillmentId);

    const bodegasDisponibles = warehouses.filter(
      wh => !bodegasExistentes.includes(wh.id)
    );

    if (bodegasDisponibles.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Bodegas ya importadas',
        text: 'Todas las bodegas del fulfillment ya están registradas en Katuq.'
      });
      return;
    }

    // Abrir modal mejorado con filtros
    const modalRef = this.modalService.open(ImportarBodegasModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });

    // Pasar datos al modal
    modalRef.componentInstance.warehouses = bodegasDisponibles.map(wh => ({
      ...wh,
      selected: true
    }));
    modalRef.componentInstance.bodegasExistentes = bodegasExistentes;

    // Manejar resultado
    modalRef.result.then((seleccionadas) => {
      if (seleccionadas && seleccionadas.length > 0) {
        this.crearBodegasImportadas(seleccionadas);
      }
    }).catch(() => {
      // Modal cerrado sin selección
    });
  }

  /**
   * Crea las bodegas seleccionadas en Katuq
   */
  private crearBodegasImportadas(warehouses: any[]) {
    this.cargando = true;
    let creadas = 0;
    let errores = 0;

    const crearSiguiente = (index: number) => {
      if (index >= warehouses.length) {
        this.cargando = false;
        this.cargarBodegas();
        Swal.fire({
          icon: errores === 0 ? 'success' : 'warning',
          title: 'Importación completada',
          text: `Se crearon ${creadas} bodegas${errores > 0 ? `, ${errores} con errores` : ''}.`
        });
        return;
      }

      const wh = warehouses[index];
      const nuevaBodega = {
        nombre: wh.name,
        idBodega: `FF-${wh.id?.substring(0, 8) || Date.now()}`,
        tipo: 'Física',
        ciudad: wh.city || wh.location || 'Sin especificar',
        departamento: wh.state || wh.region || '',
        direccion: wh.address || '',
        fulfillmentId: wh.id,
        fulfillmentProvider: wh.provider,
        origenFulfillment: true,
        coberturaNacional: false,
        ciudadesCobertura: []
      };

      this.bodegaService.agregarBodega(nuevaBodega).subscribe({
        next: () => {
          creadas++;
          crearSiguiente(index + 1);
        },
        error: (err) => {
          console.error('Error creando bodega:', err);
          errores++;
          crearSiguiente(index + 1);
        }
      });
    };

    crearSiguiente(0);
  }
}
