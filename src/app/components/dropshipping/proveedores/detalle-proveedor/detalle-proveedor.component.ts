import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Proveedor, ProveedorSummary } from '../../interfaces';
import { ProveedoresService } from '../../services/proveedores.service';

@Component({
  selector: 'app-detalle-proveedor',
  templateUrl: './detalle-proveedor.component.html',
  styleUrls: ['./detalle-proveedor.component.scss']
})
export class DetalleProveedorComponent implements OnInit {

  proveedor: Proveedor | null = null;
  summary: ProveedorSummary | null = null;
  loading = false;
  proveedorId: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proveedoresService: ProveedoresService
  ) {
    this.proveedorId = this.route.snapshot.params['id'];
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    
    // Cargar proveedor y resumen en paralelo
    Promise.all([
      this.proveedoresService.getProveedor(this.proveedorId).toPromise(),
      this.proveedoresService.getProveedorSummary(this.proveedorId).toPromise()
    ]).then(([proveedor, summary]) => {
      this.proveedor = proveedor;
      this.summary = summary;
      this.loading = false;
    }).catch(error => {
      console.error('Error cargando datos del proveedor:', error);
      this.loading = false;
    });
  }

  editarProveedor(): void {
    this.router.navigate(['/dropshipping/proveedores/editar', this.proveedorId]);
  }

  verProductos(): void {
    this.router.navigate(['/dropshipping/productos'], { 
      queryParams: { proveedor: this.proveedorId } 
    });
  }

  verOrdenes(): void {
    this.router.navigate(['/dropshipping/ordenes'], { 
      queryParams: { proveedor: this.proveedorId } 
    });
  }

  volver(): void {
    this.router.navigate(['/dropshipping/proveedores']);
  }

  getSeverityEstado(activo: boolean): string {
    return activo ? 'success' : 'danger';
  }

  getTextEstado(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  getTipoIntegracionLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'manual': 'Manual',
      'api': 'API',
      'csv': 'CSV',
      'webhook': 'Webhook'
    };
    return tipos[tipo] || tipo;
  }
}