import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Proveedor } from '../../interfaces';
import { ProveedoresService } from '../../services/proveedores.service';

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

  // Filtros
  globalFilter = '';

  constructor(
    private proveedoresService: ProveedoresService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
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
}