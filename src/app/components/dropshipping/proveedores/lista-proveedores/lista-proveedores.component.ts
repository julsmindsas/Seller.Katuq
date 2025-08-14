import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Proveedor } from '../../interfaces';
import { ProveedoresService } from '../../services/proveedores.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-proveedores',
  templateUrl: './lista-proveedores.component.html',
  styleUrls: ['./lista-proveedores.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ListaProveedoresComponent implements OnInit {

  proveedores: Proveedor[] = [];
  loading = false;
  selectedProveedor: Proveedor | null = null;
  isJulsmindUser = false;

  // Filtros
  globalFilter = '';

  constructor(
    private proveedoresService: ProveedoresService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    if (!this.isJulsmindCompany()) {
      this.showAccessDeniedMessage();
      return;
    }
    this.isJulsmindUser = true;
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.loading = true;
    this.proveedoresService.getProveedores().subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando proveedores:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proveedores'
        });
        this.loading = false;
      }
    });
  }

  crearProveedor(): void {
    this.router.navigate(['/dropshipping/proveedores/crear']);
  }

  editarProveedor(proveedor: Proveedor): void {
    this.router.navigate(['/dropshipping/proveedores/editar', proveedor.id]);
  }

  verDetalle(proveedor: Proveedor): void {
    this.router.navigate(['/dropshipping/proveedores/detalle', proveedor.id]);
  }

  confirmarEliminar(proveedor: Proveedor): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el proveedor "${proveedor.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.eliminarProveedor(proveedor);
      }
    });
  }

  eliminarProveedor(proveedor: Proveedor): void {
    if (!proveedor.id) return;
    
    this.proveedoresService.deleteProveedor(proveedor.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Proveedor eliminado correctamente'
        });
        this.cargarProveedores();
      },
      error: (error) => {
        console.error('Error eliminando proveedor:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al eliminar el proveedor'
        });
      }
    });
  }

  toggleEstadoProveedor(proveedor: Proveedor): void {
    if (!proveedor.id) return;

    const accion = proveedor.activo ? 'desactivar' : 'activar';
    const servicio = proveedor.activo 
      ? this.proveedoresService.desactivarProveedor(proveedor.id)
      : this.proveedoresService.activarProveedor(proveedor.id);

    servicio.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Proveedor ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`
        });
        this.cargarProveedores();
      },
      error: (error) => {
        console.error(`Error ${accion} proveedor:`, error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error al ${accion} el proveedor`
        });
      }
    });
  }

  onGlobalFilter(event: Event, dt: any): void {
    const target = event.target as HTMLInputElement;
    dt.filterGlobal(target.value, 'contains');
  }

  getSeverityEstado(activo: boolean): string {
    return activo ? 'success' : 'danger';
  }

  getTextEstado(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  private isJulsmindCompany(): boolean {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      return currentCompany.nomComercial?.toLowerCase().includes('julsmind') ||
             currentCompany.id?.toLowerCase().includes('julsmind') ||
             currentCompany.empresa?.toLowerCase().includes('julsmind');
    } catch (error) {
      console.error('Error verificando empresa:', error);
      return false;
    }
  }

  private showAccessDeniedMessage(): void {
    Swal.fire({
      title: '🔒 Acceso Restringido',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>El módulo de gestión de proveedores es exclusivo para la empresa Julsmind.</strong></p>
          <p>Esta sección permite a Julsmind administrar centralizadamente todas las empresas que pueden actuar como proveedores en el ecosistema de dropshipping.</p>
          <hr>
          <p><small class="text-muted">Si necesitas configurar productos dropshipping para tu empresa, ve a la sección de Productos y selecciona "Dropshipping" como tipo de producto.</small></p>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#dc3545'
    }).then(() => {
      this.router.navigate(['/dropshipping/dashboard']);
    });
  }
}