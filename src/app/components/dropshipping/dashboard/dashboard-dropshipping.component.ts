import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-dropshipping',
  templateUrl: './dashboard-dropshipping.component.html',
  styleUrls: ['./dashboard-dropshipping.component.scss']
})
export class DashboardDropshippingComponent implements OnInit {

  // Métricas básicas
  totalProveedores = 0;
  totalProductos = 0;
  ordenesPendientes = 0;
  ventasDelMes = 0;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.cargarMetricas();
  }

  cargarMetricas(): void {
    // TODO: Implementar carga real de métricas
    this.totalProveedores = 5;
    this.totalProductos = 127;
    this.ordenesPendientes = 8;
    this.ventasDelMes = 15420;
  }

  navegarA(ruta: string): void {
    this.router.navigate([`/dropshipping/${ruta}`]);
  }
}