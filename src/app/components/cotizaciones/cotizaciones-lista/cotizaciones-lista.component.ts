import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cotizacion, EstadoCotizacion } from '../cotizaciones.component';
import { CotizacionesService } from '../cotizaciones.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
@Component({
  selector: 'app-cotizaciones-lista',
  templateUrl: './cotizaciones-lista.component.html',
  styleUrls: ['./cotizaciones-lista.component.scss']
})
export class CotizacionesListaComponent implements OnInit {

  @ViewChild('detalleModal') detalleModal!: TemplateRef<any>;

  public cotizaciones: Cotizacion[] = [];
  public cotizacionesFiltradas: Cotizacion[] = [];
  public isLoading: boolean = false;
  public searchTerm: string = '';
  public selectedEstado: string = '';
  public selectedFecha: string = '';
  public selectedAsesor: string = '';

  // Paginación
  public currentPage: number = 1;
  public pageSize: number = 10;
  public totalItems: number = 0;
  public totalPages: number = 0;

  // Opciones de filtros
  public estados = [
    { value: '', label: 'Todos los estados' },
    { value: 'Borrador', label: 'Borrador' },
    { value: 'Enviada', label: 'Enviada' },
    { value: 'Aprobada', label: 'Aprobada' },
    { value: 'Rechazada', label: 'Rechazada' },
    { value: 'Expirada', label: 'Expirada' },
    { value: 'Convertida', label: 'Convertida' }
  ];

  public pageSizes = [5, 10, 20, 50];

  // Exponer Math para usar en el template
  public Math = Math;

  // Cotización seleccionada para el modal
  public cotizacionSeleccionada: Cotizacion | null = null;

  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private cotizacionesService: CotizacionesService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.cargarCotizaciones();
  }
  /**
 * Cambia el estado de una cotización específica
 */
public async cambiarEstadoCotizacion(cotizacion: any): Promise<void> {
  try {
    // Preparar las opciones de estado disponibles
    const estadosDisponibles: { [key: string]: string } = {
      'Borrador': 'Borrador',
      'Enviada': 'Enviada', 
      'Aprobada': 'Aprobada',
      'Rechazada': 'Rechazada',
      'Expirada': 'Expirada'
    };

    // Determinar estados válidos según el estado actual
    let opcionesEstado: { [key: string]: string } = {};
    
    switch (cotizacion.estadoCotizacion || cotizacion.estado) {
      case 'Borrador':
      case 'borrador':
        opcionesEstado = {
          'Enviada': 'Enviar cotización',
          'Aprobada': 'Marcar como aprobada',
          'Rechazada': 'Marcar como rechazada'
        };
        break;
      case 'Enviada':
      case 'enviada':
        opcionesEstado = {
          'Aprobada': 'Marcar como aprobada',
          'Rechazada': 'Marcar como rechazada',
          'Borrador': 'Volver a borrador'
        };
        break;
      case 'Aprobada':
      case 'aceptada':
        opcionesEstado = {
          'Rechazada': 'Marcar como rechazada',
          'Borrador': 'Volver a borrador'
        };
        break;
      case 'Rechazada':
      case 'rechazada':
        opcionesEstado = {
          'Aprobada': 'Marcar como aprobada',
          'Borrador': 'Volver a borrador'
        };
        break;
      default:
        opcionesEstado = {
          'Borrador': 'Borrador',
          'Enviada': 'Enviada',
          'Aprobada': 'Aprobada',
          'Rechazada': 'Rechazada'
        };
    }

    // Crear las opciones para el select de SweetAlert
    const selectOptions: { [key: string]: string } = {};
    Object.entries(opcionesEstado).forEach(([estado, descripcion]) => {
      selectOptions[estado] = descripcion;
    });

    const result = await Swal.fire({
      title: 'Cambiar estado de cotización',
      text: `Cotización: ${cotizacion.nroCotizacion || cotizacion.numero || 'Sin número'}`,
      icon: 'question',
      input: 'select',
      inputOptions: selectOptions,
      inputPlaceholder: 'Seleccione el nuevo estado',
      showCancelButton: true,
      confirmButtonText: 'Cambiar estado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe seleccionar un estado';
        }
        return null;
      }
    });

    if (result.isConfirmed && result.value) {
      await this.actualizarEstadoCotizacion(cotizacion, result.value);
    }

  } catch (error) {
    console.error('Error en cambio de estado:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cambiar el estado de la cotización',
      confirmButtonText: 'Entendido'
    });
  }
}

/**
 * Actualiza el estado de la cotización en el backend
 */
private async actualizarEstadoCotizacion(cotizacion: any, nuevoEstado: string): Promise<void> {
  try {
    this.isLoading = true;

    // Preparar los datos para la actualización
    const datosActualizacion = {
      id: cotizacion.id || cotizacion._id,
      estadoCotizacion: nuevoEstado
    };

    console.log('Actualizando estado de cotización:', datosActualizacion);

    // Llamar al servicio para actualizar el estado
    const response = await firstValueFrom(
      this.cotizacionesService.actualizarEstadoCotizacion(datosActualizacion.id, nuevoEstado)
    );

    if (response && response.success !== false) {
      // Actualizar la cotización en la lista local
      const index = this.cotizaciones.findIndex(c => 
        c.id === cotizacion.id
      );
      
      if (index !== -1) {
        this.cotizaciones[index] = {
          ...this.cotizaciones[index],
          estadoCotizacion: nuevoEstado as 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Expirada' | 'Convertida',
          estado: this.mapearEstadoAPI(nuevoEstado),
          date_edit: new Date().toISOString(),
          user_edit: this.obtenerUsuarioActual()?.email || 'Usuario actual'
        };
        
        // Actualizar también las listas filtradas si existen
        this.actualizarListasFiltradas();
      }

      // Mostrar mensaje de éxito con información del cambio
      const mensajeEstado = this.obtenerDescripcionEstado(nuevoEstado);
      
      Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: `La cotización ${cotizacion.nroCotizacion || cotizacion.numero} ahora está ${mensajeEstado}`,
        timer: 3000,
        showConfirmButton: false
      });

    } else {
      throw new Error(response.message || 'Error al actualizar el estado');
    }

  } catch (error) {
    console.error('Error actualizando estado:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo actualizar el estado de la cotización. Inténtelo nuevamente.',
      confirmButtonText: 'Entendido'
    });
  } finally {
    this.isLoading = false;
  }
}

/**
 * Mapea el estado de la API al estado local para compatibilidad
 */
private mapearEstadoAPI(estadoAPI: string): 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida' {
  switch (estadoAPI) {
    case 'Borrador':
      return 'borrador';
    case 'Enviada':
      return 'enviada';
    case 'Aprobada':
      return 'aceptada';
    case 'Rechazada':
      return 'rechazada';
    case 'Expirada':
      return 'vencida';
    case 'Convertida':
      return 'aceptada';
    default:
      return 'borrador';
  }
}

/**
 * Obtiene una descripción amigable del estado
 */
private obtenerDescripcionEstado(estado: string): string {
  const descripciones: { [key: string]: string } = {
    'Borrador': 'en borrador',
    'Enviada': 'enviada',
    'Aprobada': 'aprobada',
    'Rechazada': 'rechazada',
    'Expirada': 'expirada',
    'Convertida': 'convertida a pedido'
  };
  
  return descripciones[estado] || 'en estado desconocido';
}

/**
 * Obtiene los datos del usuario actual desde sessionStorage
 */
private obtenerUsuarioActual(): any {
  try {
    const userData = sessionStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
}

/**
 * Actualiza las listas filtradas después de un cambio de estado
 */
private actualizarListasFiltradas(): void {
  // Si tienes filtros aplicados, actualizar las listas filtradas
  if (this.cotizacionesFiltradas) {
    this.cotizacionesFiltradas = [...this.cotizaciones];
  }
  
  // Aplicar filtros existentes si los hay
  if (this.selectedEstado && this.selectedEstado !== '') {
    this.aplicarFiltros();
  }
}


  /**
   * Carga las cotizaciones desde la API
   */
  private async cargarCotizaciones(): Promise<void> {
    try {
      this.isLoading = true;
      
      const response = await this.cotizacionesService.obtenerCotizaciones(
        this.currentPage,
        this.pageSize,
        this.selectedEstado || undefined,
        this.selectedAsesor || undefined
      ).toPromise();

      if (response && response.success !== false) {
        this.cotizaciones = response.data || [];
        
        // Actualizar información de paginación
        if (response.pagination) {
          this.totalItems = response.pagination.total;
          this.totalPages = response.pagination.totalPages;
          this.currentPage = response.pagination.page;
        }
        
        // Aplicar filtros locales adicionales
        this.aplicarFiltros();
        
        console.log('Cotizaciones cargadas:', this.cotizaciones);
      } else {
        console.error('Error al cargar cotizaciones:', response);
        this.toastrService.error('Error al cargar las cotizaciones');
        this.cotizaciones = [];
      }
      
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
      this.toastrService.error('Error al cargar las cotizaciones');
      this.cotizaciones = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Aplica filtros locales a las cotizaciones
   */
  private aplicarFiltros(): void {
    this.cotizacionesFiltradas = this.cotizaciones.filter(cotizacion => {
      const matchesSearch = !this.searchTerm || 
        cotizacion.nroCotizacion?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        cotizacion.numero?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        cotizacion.cliente?.nombres_completos?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        cotizacion.cliente?.documento?.includes(this.searchTerm);

      const matchesFecha = !this.selectedFecha || 
        cotizacion.fechaCreacion?.includes(this.selectedFecha) ||
        cotizacion.fecha?.includes(this.selectedFecha);

      return matchesSearch && matchesFecha;
    });
  }

  /**
   * Maneja el cambio de página
   */
  public onPageChange(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cargarCotizaciones();
    }
  }

  /**
   * Maneja el cambio de tamaño de página
   */
  public onPageSizeChange(): void {
    this.currentPage = 1;
    this.cargarCotizaciones();
  }

  /**
   * Maneja el cambio de estado
   */
  public onEstadoChange(): void {
    this.currentPage = 1;
    this.cargarCotizaciones();
  }

  /**
   * Maneja el cambio de asesor
   */
  public onAsesorChange(): void {
    this.currentPage = 1;
    this.cargarCotizaciones();
  }

  /**
   * Maneja la búsqueda
   */
  public onSearch(): void {
    this.aplicarFiltros();
  }

  /**
   * Maneja el cambio de fecha
   */
  public onFechaChange(): void {
    this.aplicarFiltros();
  }

  /**
   * Limpia todos los filtros
   */
  public limpiarFiltros(): void {
    this.searchTerm = '';
    this.selectedEstado = '';
    this.selectedFecha = '';
    this.selectedAsesor = '';
    this.currentPage = 1;
    this.cargarCotizaciones();
  }

  /**
   * Refresca la lista de cotizaciones
   */
  public refrescarLista(): void {
    this.cargarCotizaciones();
  }

  /**
   * Navega a la creación de una nueva cotización
   */
  public crearCotizacion(): void {
    this.router.navigate(['/cotizaciones/nueva']);
  }

  /**
   * Navega a la edición de una cotización
   */
  public editarCotizacion(cotizacion: Cotizacion): void {
    this.router.navigate(['/cotizaciones/editar', cotizacion.id]);
  }

  /**
   * Muestra el modal con los detalles de la cotización
   */
  public verDetalleCotizacion(cotizacion: Cotizacion): void {
    this.cotizacionSeleccionada = cotizacion;
    this.modalService.open(this.detalleModal, { size: 'lg' });
  }

  /**
   * Imprime el PDF de la cotización
   */
  public imprimirPDF(cotizacion: Cotizacion): void {
    // Navegar a la página de cotización con parámetro para generar PDF
    this.router.navigate(['/cotizaciones/editar', cotizacion.id], { 
      queryParams: { action: 'pdf' } 
    });
  }

  /**
   * Duplica una cotización
   */
  /**
 * Duplica una cotización existente llamando directamente al servicio de creación
 */
public async duplicarCotizacion(cotizacion: any): Promise<void> {
  try {
    // Mostrar confirmación al usuario
    const result = await Swal.fire({
      icon: 'question',
      title: 'Duplicar cotización',
      text: `¿Está seguro de que desea duplicar la cotización ${cotizacion.nroCotizacion || cotizacion.numero}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, duplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isLoading = true;

    // Preparar los datos para la nueva cotización
    const nuevaCotizacionData = {
      cliente: {
        correo_electronico_comprador: cotizacion.cliente?.correo_electronico_comprador || cotizacion.cliente?.correo_electronico || '',
        nombres_completos: cotizacion.cliente?.nombres_completos || '',
        apellidos_completos: cotizacion.cliente?.apellidos_completos || '',
        documento: cotizacion.cliente?.documento || '',
        tipo_documento_comprador: cotizacion.cliente?.tipo_documento_comprador || 'CC',
        numero_celular_comprador: cotizacion.cliente?.numero_celular_comprador || cotizacion.cliente?.numero_celular || '',
        indicativo_celular_comprador: cotizacion.cliente?.indicativo_celular_comprador || '+57',
        direccion: cotizacion.cliente?.direccion || '',
        ciudad: cotizacion.cliente?.ciudad || '',
        departamento: cotizacion.cliente?.departamento || '',
        pais: cotizacion.cliente?.pais || 'Colombia'
      },
      items: cotizacion.items.map((item: any) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        descuento: item.descuento || 0,
        configuracion: item.configuracion || null,
        notaProduccion: item.notaProduccion || []
      })),
      fechaVencimiento: this.calcularFechaVencimiento(cotizacion.validezDias || 30),
      validezDias: cotizacion.validezDias || 30,
      formaDePago: 'Contado',
      observaciones: `${cotizacion.observaciones || ''}\n\n[Duplicada de: ${cotizacion.nroCotizacion || cotizacion.numero}]`.trim(),
      asesorAsignado: cotizacion.asesorAsignado || this.obtenerAsesorActual()
    };

    // Llamar al servicio para crear la nueva cotización
    const response = await firstValueFrom(
      this.cotizacionesService.crearCotizacion(nuevaCotizacionData)
    );

    if (response && response.success !== false) {
      // Mostrar mensaje de éxito
      const nuevoCodigo = response.data?.nroCotizacion || response.nroCotizacion || 'Nueva cotización';
      
      Swal.fire({
        icon: 'success',
        title: 'Cotización duplicada',
        text: `La cotización ha sido duplicada exitosamente como: ${nuevoCodigo}`,
        timer: 3000,
        showConfirmButton: false
      });

      // Actualizar la lista de cotizaciones
      await this.cargarCotizaciones();
      
    } else {
      throw new Error(response.message || 'Error al duplicar la cotización');
    }

  } catch (error) {
    console.error('Error duplicando cotización:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo duplicar la cotización. Por favor, inténtelo nuevamente.',
      confirmButtonText: 'Entendido'
    });
  } finally {
    this.isLoading = false;
  }
}

/**
 * Calcula la fecha de vencimiento basada en los días de validez
 */
private calcularFechaVencimiento(validezDias: number): string {
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + validezDias);
  return fechaVencimiento.toISOString();
}

/**
 * Obtiene los datos del asesor actual desde sessionStorage
 */
private obtenerAsesorActual(): any {
  try {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    const empresaData = JSON.parse(sessionStorage.getItem('empresa') || '{}');
    
    return userData.email ? {
      email: userData.email,
      name: userData.name || userData.nombres_completos || 'Asesor',
      nit: empresaData.nit || ''
    } : null;
  } catch (error) {
    console.error('Error obteniendo asesor actual:', error);
    return null;
  }
}


  /**
   * Elimina una cotización
   */
  public eliminarCotizacion(cotizacion: Cotizacion): void {
    Swal.fire({
      title: '¿Eliminar cotización?',
      text: `Esta acción no se puede deshacer. ¿Está seguro de eliminar ${cotizacion.nroCotizacion || cotizacion.numero}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          this.isLoading = true;
          
          const response = await this.cotizacionesService.eliminarCotizacion(cotizacion.id!).toPromise();
          
          if (response && response.success !== false) {
            this.toastrService.success('Cotización eliminada correctamente');
            this.cargarCotizaciones();
          } else {
            this.toastrService.error(response.message || 'Error al eliminar la cotización');
          }
        } catch (error) {
          console.error('Error al eliminar cotización:', error);
          this.toastrService.error('Error al eliminar la cotización');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  /**
   * Convierte una cotización a pedido
   */
  public convertirAPedido(cotizacion: Cotizacion): void {
    if (cotizacion.estadoCotizacion !== 'Aprobada') {
      this.toastrService.warning('Solo se pueden convertir cotizaciones aprobadas');
      return;
    }

    if (cotizacion.convertidaAPedido) {
      this.toastrService.info('Esta cotización ya fue convertida a pedido');
      return;
    }

    Swal.fire({
      title: '¿Convertir a pedido?',
      text: `Se creará un pedido basado en la cotización ${cotizacion.nroCotizacion || cotizacion.numero}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          this.isLoading = true;
          
          const response = await this.cotizacionesService.convertirCotizacionAPedido(cotizacion.id!).toPromise();
          
          if (response && response.success !== false) {
            this.toastrService.success(`Cotización convertida a pedido: ${response.data?.nroPedido}`);
            this.cargarCotizaciones();
          } else {
            this.toastrService.error(response.message || 'Error al convertir la cotización');
          }
        } catch (error) {
          console.error('Error al convertir cotización:', error);
          this.toastrService.error('Error al convertir la cotización');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  /**
   * Obtiene la clase CSS para el estado
   */
  public getEstadoClass(estado: string): string {
    const estadoMap: { [key: string]: string } = {
      'Borrador': 'badge-secondary',
      'Enviada': 'badge-primary',
      'Aprobada': 'badge-success',
      'Rechazada': 'badge-danger',
      'Expirada': 'badge-warning',
      'Convertida': 'badge-info'
    };
    
    return estadoMap[estado] || 'badge-secondary';
  }

  /**
   * Formatea el precio para mostrar
   */
  public formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  }

  /**
   * Formatea la fecha para mostrar
   */
  public formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  /**
   * Obtiene el array de páginas para la paginación
   */
  public getPaginationArray(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
} 