import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DropshippingService } from '../services/dropshipping.service';
import { ProveedoresService } from '../services/proveedores.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { OrdenDropshippingSummary } from '../interfaces';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-dashboard-dropshipping',
  templateUrl: './dashboard-dropshipping.component.html',
  styleUrls: ['./dashboard-dropshipping.component.scss'],
  providers: [MessageService]
})
export class DashboardDropshippingComponent implements OnInit {

  // Métricas básicas
  totalProveedores = 0;
  totalProductos = 0;
  ordenesPendientes = 0;
  ventasDelMes = 0;
  totalGanancias = 0;
  productosActivos = 0;
  loading = false;

  constructor(
    private router: Router,
    private dropshippingService: DropshippingService,
    private proveedoresService: ProveedoresService,
    private maestroService: MaestroService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.cargarMetricas();
  }

  cargarMetricas(): void {
    this.loading = true;
    
    // Cargar todas las métricas en paralelo
    Promise.all([
      this.dropshippingService.getDropshippingSummary().toPromise(),
      this.proveedoresService.getProveedores().toPromise(),
      this.maestroService.getProductosDropshipping().toPromise(),
      this.dropshippingService.getOrdenesDropshipping().toPromise()
    ]).then(([summary, proveedores, productos, ordenes]) => {
      // Métricas del resumen
      if (summary) {
        this.ordenesPendientes = summary.ordenes_pendientes;
        this.ventasDelMes = summary.valor_total_mes;
        this.totalGanancias = summary.ganancia_total_mes;
      }
      
      // Proveedores activos
      this.totalProveedores = (proveedores || []).filter(p => p.activo).length;
      
      // Productos activos (el maestroService devuelve un objeto con productos, no un array directo)
      this.productosActivos = productos?.products ? productos.products.filter(p => p.identificacion?.tipoProducto === 'dropshipping').length : 0;
      this.totalProductos = productos?.products?.length || 0;
      
      this.loading = false;
    }).catch(error => {
      console.error('Error loading dashboard metrics:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar las métricas del dashboard'
      });
      
      // Fallback a valores por defecto en caso de error
      this.totalProveedores = 0;
      this.totalProductos = 0;
      this.ordenesPendientes = 0;
      this.ventasDelMes = 0;
      this.totalGanancias = 0;
      this.productosActivos = 0;
      this.loading = false;
    });
  }

  navegarA(ruta: string): void {
    this.router.navigate([`/dropshipping/${ruta}`]);
  }
}