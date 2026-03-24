import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearBodegasComponent } from './crear-bodegas/crear-bodegas.component';
import { SelectorCiudadesCoberturaComponent } from './selector-ciudades-cobertura/selector-ciudades-cobertura.component';
import { ImportarBodegasModalComponent } from './importar-bodegas-modal/importar-bodegas-modal.component';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { FulfillmentService } from '../../../shared/services/fulfillment/fulfillment.service';
import { DaneCodesService } from '../../../shared/services/dane-codes.service';
import { CiudadCobertura } from '../../../shared/models/inventarios/bodega.model';
import { FulfillmentWarehouse } from '../../../shared/models/fulfillment/fulfillment.model';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

@Component({
  selector: 'app-bodegas',
  templateUrl: './bodegas.component.html',
  styleUrls: ['./bodegas.component.scss']
})
export class BodegasComponent implements OnInit {
  cargando: boolean = false;
  bodegas: any[] = [];
  todasLasBodegas: any[] = [];  // Incluye inactivas para verificar fulfillmentId
  selectedColumns: any[] = [];
  importandoFulfillment: boolean = false;

  constructor(
    private modalService: NgbModal,
    private bodegaService: BodegaService,
    private fulfillmentService: FulfillmentService,
    private daneCodesService: DaneCodesService
  ) { }

  ngOnInit(): void {
    this.cargarBodegas();
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe(bodegas => {
      this.todasLasBodegas = bodegas;
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
    // Usar id o cd como fallback (la API puede devolver cualquiera)
    const bodegaId = bodega?.id || bodega?.cd;

    if (!bodegaId) {
      Swal.fire('Error', 'No se pudo identificar la bodega a eliminar.', 'error');
      return;
    }

    Swal.fire({
      title: '¿Está seguro de desactivar esta bodega?',
      text: 'La bodega quedará inactiva pero podrá ser reactivada posteriormente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        this.bodegaService.eliminarBodega(bodegaId).subscribe({
          next: () => {
            Swal.fire('Desactivada', 'Bodega desactivada correctamente.', 'success');
            this.cargarBodegas();
          },
          error: (err) => {
            console.error('Error desactivando bodega:', err);
            Swal.fire('Error', 'Ocurrió un error al desactivar la bodega.', 'error');
            this.cargando = false;
          }
        });
      }
    });
  }

  /**
   * Elimina permanentemente una bodega del maestro (hard delete)
   * Esta acción NO se puede deshacer
   */
  eliminarBodegaPermanente(bodega: any) {
    const bodegaId = bodega?.id || bodega?.cd;

    if (!bodegaId) {
      Swal.fire('Error', 'No se pudo identificar la bodega a eliminar.', 'error');
      return;
    }

    Swal.fire({
      title: '⚠️ Eliminación Permanente',
      html: `
        <div class="text-start">
          <p><strong>Bodega:</strong> ${bodega.nombre}</p>
          <p class="text-danger"><strong>¡ADVERTENCIA!</strong> Esta acción eliminará la bodega <strong>permanentemente</strong> del sistema.</p>
          <ul class="text-muted small">
            <li>Se perderá toda la información de la bodega</li>
            <li>Se eliminarán las asociaciones con canales</li>
            <li>Esta acción <strong>NO</strong> se puede deshacer</li>
          </ul>
          <p>Escriba <strong>"ELIMINAR"</strong> para confirmar:</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Escriba ELIMINAR',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar permanentemente',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (value !== 'ELIMINAR') {
          return 'Debe escribir "ELIMINAR" para confirmar';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;
        this.bodegaService.eliminarBodegaPermanente(bodegaId).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminada',
              text: 'La bodega ha sido eliminada permanentemente del sistema.'
            });
            this.cargarBodegas();
          },
          error: (err) => {
            console.error('Error eliminando bodega permanentemente:', err);
            const mensaje = err?.error?.message || 'Ocurrió un error al eliminar la bodega.';
            Swal.fire('Error', mensaje, 'error');
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
   * Muestra modal para seleccionar qué bodegas importar/actualizar
   */
  private mostrarModalSeleccionBodegas(warehouses: any[]) {
    // Mostrar TODAS las bodegas del fulfillment (para crear o actualizar)
    const bodegasDisponibles = warehouses;

    if (bodegasDisponibles.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin bodegas',
        text: 'No se encontraron bodegas en el fulfillment.'
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
    modalRef.componentInstance.bodegasExistentes = [];  // Ya no filtramos, sincronizamos todas

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
   * Crea, actualiza o reactiva las bodegas seleccionadas en Katuq
   */
  private crearBodegasImportadas(warehouses: any[]) {
    this.cargando = true;
    let creadas = 0;
    let actualizadas = 0;
    let errores = 0;

    const crearSiguiente = (index: number) => {
      if (index >= warehouses.length) {
        this.cargando = false;
        this.cargarBodegas();
        const mensajes: string[] = [];
        if (creadas > 0) mensajes.push(`${creadas} creadas`);
        if (actualizadas > 0) mensajes.push(`${actualizadas} actualizadas`);
        if (errores > 0) mensajes.push(`${errores} con errores`);
        Swal.fire({
          icon: errores === 0 ? 'success' : 'warning',
          title: 'Sincronización completada',
          text: mensajes.join(', ') + '.'
        });
        return;
      }

      const wh = warehouses[index];

      // Buscar si existe una bodega con el mismo fulfillmentId (activa o inactiva)
      const bodegaExistente = this.todasLasBodegas.find(
        b => b.fulfillmentId === wh.id
      );

      // Buscar ciudad en códigos DANE para agregar cobertura
      this.buscarCiudadCobertura(wh.name).then(ciudadCobertura => {
        const coberturaArray: CiudadCobertura[] = ciudadCobertura ? [ciudadCobertura] : [];

        if (bodegaExistente) {
          // Actualizar la bodega existente con datos nuevos del fulfillment
          const bodegaActualizada = {
            ...bodegaExistente,
            active: true,  // Reactivar si estaba inactiva
            nombre: wh.name,
            idBodega: wh.code || bodegaExistente.idBodega,
            fulfillmentProvider: wh.provider,
            // Actualizar ubicación con datos del fulfillment
            ciudad: wh.name,  // El nombre de la bodega suele ser la ciudad
            pais: this.mapearCodigoPais(wh.location?.country),
            // Agregar cobertura si se encontró la ciudad
            ciudadesCobertura: this.mergeCoberturas(bodegaExistente.ciudadesCobertura, coberturaArray)
          };

          this.bodegaService.actualizarBodega(bodegaActualizada).subscribe({
            next: () => {
              actualizadas++;
              crearSiguiente(index + 1);
            },
            error: (err) => {
              console.error('Error actualizando bodega:', err);
              errores++;
              crearSiguiente(index + 1);
            }
          });
        } else {
          // Crear nueva bodega
          const nuevaBodega = {
            nombre: wh.name,
            idBodega: wh.code || `FF-${wh.id?.substring(0, 8) || Date.now()}`,
            tipo: 'Física',
            ciudad: wh.name,  // El nombre de la bodega suele ser la ciudad
            departamento: ciudadCobertura?.departamento || '',
            pais: this.mapearCodigoPais(wh.location?.country),
            direccion: wh.address || '',
            fulfillmentId: wh.id,
            fulfillmentProvider: wh.provider,
            origenFulfillment: true,
            coberturaNacional: false,
            ciudadesCobertura: coberturaArray,
            active: true
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
        }
      });
    };

    crearSiguiente(0);
  }

  /**
   * Convierte código de país ISO a nombre completo
   */
  private mapearCodigoPais(codigoISO: string | undefined): string {
    if (!codigoISO) return '';

    const paises: { [key: string]: string } = {
      'CO': 'Colombia',
      'US': 'United States',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'BR': 'Brazil',
      'CL': 'Chile',
      'PE': 'Peru',
      'EC': 'Ecuador',
      'VE': 'Venezuela',
      'PA': 'Panama',
      'CR': 'Costa Rica',
      'GT': 'Guatemala',
      'ES': 'Spain'
    };

    return paises[codigoISO.toUpperCase()] || codigoISO;
  }

  /**
   * Busca una ciudad por nombre en los códigos DANE
   */
  private async buscarCiudadCobertura(nombreCiudad: string): Promise<CiudadCobertura | null> {
    if (!nombreCiudad) return null;

    return new Promise((resolve) => {
      this.daneCodesService.searchMunicipios(nombreCiudad).pipe(take(1)).subscribe({
        next: (municipios) => {
          // Buscar coincidencia exacta primero
          const exacto = municipios.find(m =>
            m.nombre.toUpperCase() === nombreCiudad.toUpperCase()
          );

          if (exacto) {
            resolve({
              codigo: exacto.codigo,
              nombre: exacto.nombre,
              departamento: exacto.departamento
            });
          } else if (municipios.length > 0) {
            // Si no hay exacta, tomar la primera coincidencia
            const primero = municipios[0];
            resolve({
              codigo: primero.codigo,
              nombre: primero.nombre,
              departamento: primero.departamento
            });
          } else {
            resolve(null);
          }
        },
        error: () => resolve(null)
      });
    });
  }

  /**
   * Combina coberturas existentes con nuevas sin duplicados
   */
  private mergeCoberturas(
    existentes: CiudadCobertura[] | undefined,
    nuevas: CiudadCobertura[]
  ): CiudadCobertura[] {
    const resultado = [...(existentes || [])];

    for (const nueva of nuevas) {
      const existe = resultado.some(e => e.codigo === nueva.codigo);
      if (!existe) {
        resultado.push(nueva);
      }
    }

    return resultado;
  }
}
