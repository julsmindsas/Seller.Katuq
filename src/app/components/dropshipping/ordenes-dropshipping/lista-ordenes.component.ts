import { Component, OnInit } from '@angular/core';
import { OrdenDropshipping, EstadoOrdenDropshipping, Proveedor } from '../interfaces';
import { DropshippingService } from '../services/dropshipping.service';
import { ProveedoresService } from '../services/proveedores.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-ordenes',
  templateUrl: './lista-ordenes.component.html',
  styleUrls: ['./lista-ordenes.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ListaOrdenesComponent implements OnInit {

  ordenes: OrdenDropshipping[] = [];
  proveedores: Proveedor[] = [];
  loading = false;
  
  // Filtros
  globalFilter = '';
  selectedEstadoFilter: EstadoOrdenDropshipping | null = null;
  selectedProveedorFilter: string | null = null;
  
  estadosOrden = [
    { label: 'Pendiente', value: 'pendiente', severity: 'warning' },
    { label: 'Enviado a Proveedor', value: 'enviado_proveedor', severity: 'info' },
    { label: 'Confirmado por Proveedor', value: 'confirmado_proveedor', severity: 'info' },
    { label: 'Procesando', value: 'procesando', severity: 'info' },
    { label: 'Enviado', value: 'enviado', severity: 'primary' },
    { label: 'En Tránsito', value: 'en_transito', severity: 'primary' },
    { label: 'Entregado', value: 'entregado', severity: 'success' },
    { label: 'Cancelado', value: 'cancelado', severity: 'danger' },
    { label: 'Devuelto', value: 'devuelto', severity: 'warning' }
  ];

  constructor(
    private dropshippingService: DropshippingService,
    private proveedoresService: ProveedoresService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    Promise.all([
      this.dropshippingService.getOrdenesDropshipping().toPromise(),
      this.proveedoresService.getProveedores().toPromise()
    ]).then(([ordenes, proveedores]) => {
      this.ordenes = ordenes || [];
      this.proveedores = proveedores || [];
      this.loading = false;
    }).catch(error => {
      console.error('Error loading data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar los datos'
      });
      this.loading = false;
    });
  }

  getEstadoConfig(estado: EstadoOrdenDropshipping) {
    return this.estadosOrden.find(e => e.value === estado) || 
           { label: estado, value: estado, severity: 'secondary' };
  }

  cambiarEstado(orden: OrdenDropshipping, nuevoEstado: EstadoOrdenDropshipping): void {
    if (!orden.id) return;

    this.confirmationService.confirm({
      message: `¿Confirma cambiar el estado de la orden ${orden.numero_orden} a "${this.getEstadoConfig(nuevoEstado).label}"?`,
      header: 'Confirmar Cambio de Estado',
      icon: 'pi pi-question-circle',
      accept: () => {
        this.dropshippingService.updateEstadoOrden(orden.id!, nuevoEstado).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Estado actualizado correctamente'
            });
            this.loadData();
          },
          error: (error) => {
            console.error('Error updating order status:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al actualizar el estado'
            });
          }
        });
      }
    });
  }

  verDetalles(orden: OrdenDropshipping): void {
    let productosHtml = '';
    orden.productos.forEach(producto => {
      productosHtml += `
        <tr>
          <td>${producto.nombre}</td>
          <td>${producto.sku_proveedor}</td>
          <td>${producto.cantidad}</td>
          <td>$${producto.precio_unitario.toLocaleString()}</td>
          <td>$${producto.precio_total.toLocaleString()}</td>
        </tr>
      `;
    });

    Swal.fire({
      title: `Orden ${orden.numero_orden}`,
      html: `
        <div style="text-align: left;">
          <h6>Información del Cliente</h6>
          <p><strong>Nombre:</strong> ${orden.cliente_info.nombre}</p>
          <p><strong>Email:</strong> ${orden.cliente_info.email}</p>
          <p><strong>Teléfono:</strong> ${orden.cliente_info.telefono || 'No especificado'}</p>
          
          <h6>Dirección de Envío</h6>
          <p>${orden.direccion_envio.direccion_linea1}</p>
          <p>${orden.direccion_envio.ciudad}, ${orden.direccion_envio.estado}</p>
          <p>${orden.direccion_envio.codigo_postal}, ${orden.direccion_envio.pais}</p>
          
          <h6>Productos</h6>
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cant.</th>
                <th>Precio Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${productosHtml}
            </tbody>
          </table>
          
          <h6>Resumen Financiero</h6>
          <p><strong>Subtotal:</strong> $${orden.subtotal.toLocaleString()}</p>
          <p><strong>Costo Envío:</strong> $${orden.costo_envio.toLocaleString()}</p>
          <p><strong>Total:</strong> $${orden.total.toLocaleString()}</p>
          <p><strong>Comisión Proveedor:</strong> $${orden.comision_proveedor.toLocaleString()}</p>
          <p><strong>Ganancia Neta:</strong> $${orden.ganancia_neta.toLocaleString()}</p>
        </div>
      `,
      width: '800px',
      confirmButtonText: 'Cerrar'
    });
  }

  agregarTracking(orden: OrdenDropshipping): void {
    Swal.fire({
      title: 'Agregar Número de Tracking',
      input: 'text',
      inputLabel: 'Número de tracking',
      inputValue: orden.tracking_number || '',
      inputPlaceholder: 'Ej: TK123456789',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || value.length < 3) {
          return 'Debe ingresar un número de tracking válido';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && orden.id) {
        this.dropshippingService.updateOrdenDropshipping(orden.id, {
          tracking_number: result.value
        }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Número de tracking agregado'
            });
            this.loadData();
          },
          error: (error) => {
            console.error('Error adding tracking:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al agregar el tracking'
            });
          }
        });
      }
    });
  }

  exportarOrdenes(): void {
    // TODO: Implementar exportación a Excel/PDF
    this.messageService.add({
      severity: 'info',
      summary: 'Función en desarrollo',
      detail: 'La exportación estará disponible próximamente'
    });
  }

  onGlobalFilter(event: Event, dt: any): void {
    const target = event.target as HTMLInputElement;
    dt.filterGlobal(target.value, 'contains');
  }

  getTotalGanancias(): number {
    return this.ordenes
      .filter(orden => orden.estado === 'entregado')
      .reduce((total, orden) => total + orden.ganancia_neta, 0);
  }

  getOrdenesDelMes(): number {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    return this.ordenes.filter(orden => 
      new Date(orden.fecha_creacion) >= inicioMes
    ).length;
  }

  getOrdenesPendientes(): number {
    return this.ordenes.filter(orden => 
      ['pendiente', 'procesando', 'enviado', 'en_transito'].includes(orden.estado)
    ).length;
  }
}