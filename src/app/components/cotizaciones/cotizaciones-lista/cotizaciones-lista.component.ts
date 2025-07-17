import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Cotizacion } from '../cotizaciones.component';

@Component({
  selector: 'app-cotizaciones-lista',
  templateUrl: './cotizaciones-lista.component.html',
  styleUrls: ['./cotizaciones-lista.component.scss']
})
export class CotizacionesListaComponent implements OnInit {

  public cotizaciones: Cotizacion[] = [];
  public cotizacionesFiltradas: Cotizacion[] = [];
  public isLoading: boolean = false;
  public searchTerm: string = '';
  public selectedEstado: string = '';
  public selectedFecha: string = '';

  public estados = [
    { value: '', label: 'Todos los estados' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'aceptada', label: 'Aceptada' },
    { value: 'rechazada', label: 'Rechazada' },
    { value: 'vencida', label: 'Vencida' }
  ];

  constructor(
    private router: Router,
    private toastrService: ToastrService
  ) { }

  ngOnInit(): void {
    this.cargarCotizaciones();
  }

  private async cargarCotizaciones(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Mock data - reemplazar con servicio real
      this.cotizaciones = [
        {
          id: '1',
          numero: 'COT-001',
          fecha: '2024-01-15',
          cliente: {
            nombres_completos: 'Juan Pérez',
            documento: '12345678',
            correo_electronico_comprador: 'juan@email.com'
          },
          items: [],
          subtotal: 100000,
          impuestos: 19000,
          descuento: 0,
          total: 119000,
          validez: '30',
          estado: 'enviada',
          observaciones: 'Cotización para productos de oficina'
        },
        {
          id: '2',
          numero: 'COT-002',
          fecha: '2024-01-14',
          cliente: {
            nombres_completos: 'María García',
            documento: '87654321',
            correo_electronico_comprador: 'maria@email.com'
          },
          items: [],
          subtotal: 250000,
          impuestos: 47500,
          descuento: 12500,
          total: 285000,
          validez: '15',
          estado: 'aceptada',
          observaciones: 'Cotización para equipos de cómputo'
        },
        {
          id: '3',
          numero: 'COT-003',
          fecha: '2024-01-13',
          cliente: {
            nombres_completos: 'Carlos López',
            documento: '11223344',
            correo_electronico_comprador: 'carlos@email.com'
          },
          items: [],
          subtotal: 75000,
          impuestos: 14250,
          descuento: 0,
          total: 89250,
          validez: '45',
          estado: 'borrador',
          observaciones: 'Cotización pendiente de revisión'
        }
      ];

      this.cotizacionesFiltradas = [...this.cotizaciones];
      
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      this.toastrService.error('Error al cargar las cotizaciones');
    } finally {
      this.isLoading = false;
    }
  }

  public filtrarCotizaciones(): void {
    this.cotizacionesFiltradas = this.cotizaciones.filter(cotizacion => {
      const matchesSearch = !this.searchTerm || 
        cotizacion.numero?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        cotizacion.cliente?.nombres_completos?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        cotizacion.cliente?.documento?.includes(this.searchTerm);
      
      const matchesEstado = !this.selectedEstado || cotizacion.estado === this.selectedEstado;
      
      const matchesFecha = !this.selectedFecha || cotizacion.fecha === this.selectedFecha;

      return matchesSearch && matchesEstado && matchesFecha;
    });
  }

  public limpiarFiltros(): void {
    this.searchTerm = '';
    this.selectedEstado = '';
    this.selectedFecha = '';
    this.cotizacionesFiltradas = [...this.cotizaciones];
  }

  public nuevaCotizacion(): void {
    this.router.navigate(['/cotizaciones']);
  }

  public verCotizacion(cotizacion: Cotizacion): void {
    this.router.navigate(['/cotizaciones', cotizacion.id]);
  }

  public editarCotizacion(cotizacion: Cotizacion): void {
    this.router.navigate(['/cotizaciones', cotizacion.id, 'editar']);
  }

  public duplicarCotizacion(cotizacion: Cotizacion): void {
    this.router.navigate(['/cotizaciones', 'duplicar', cotizacion.id]);
  }

  public async eliminarCotizacion(cotizacion: Cotizacion): Promise<void> {
    if (confirm(`¿Está seguro de eliminar la cotización ${cotizacion.numero}?`)) {
      try {
        this.isLoading = true;
        
        // Mock - reemplazar con servicio real
        console.log('Eliminando cotización:', cotizacion.id);
        
        // Remover de la lista local
        this.cotizaciones = this.cotizaciones.filter(c => c.id !== cotizacion.id);
        this.filtrarCotizaciones();
        
        this.toastrService.success('Cotización eliminada correctamente');
        
      } catch (error) {
        console.error('Error eliminando cotización:', error);
        this.toastrService.error('Error al eliminar la cotización');
      } finally {
        this.isLoading = false;
      }
    }
  }

  public getEstadoClass(estado: string): string {
    switch (estado) {
      case 'borrador': return 'badge-secondary';
      case 'enviada': return 'badge-info';
      case 'aceptada': return 'badge-success';
      case 'rechazada': return 'badge-danger';
      case 'vencida': return 'badge-warning';
      default: return 'badge-light';
    }
  }

  public getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'borrador': return 'Borrador';
      case 'enviada': return 'Enviada';
      case 'aceptada': return 'Aceptada';
      case 'rechazada': return 'Rechazada';
      case 'vencida': return 'Vencida';
      default: return estado;
    }
  }

  public formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  }

  public formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  public calcularFechaVencimiento(fecha: string, validez: string): string {
    const fechaCreacion = new Date(fecha);
    const diasValidez = parseInt(validez);
    const fechaVencimiento = new Date(fechaCreacion.getTime() + (diasValidez * 24 * 60 * 60 * 1000));
    return fechaVencimiento.toLocaleDateString('es-CO');
  }

  public estaVencida(fecha: string, validez: string): boolean {
    const fechaCreacion = new Date(fecha);
    const diasValidez = parseInt(validez);
    const fechaVencimiento = new Date(fechaCreacion.getTime() + (diasValidez * 24 * 60 * 60 * 1000));
    return new Date() > fechaVencimiento;
  }
} 