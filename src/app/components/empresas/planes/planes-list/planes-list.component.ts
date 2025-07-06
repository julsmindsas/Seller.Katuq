import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SubscriptionPlan } from '../../../../shared/models/planes/plan.model';
import { PlanesService } from '../../../../shared/services/planes/planes.service';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-planes-list',
  templateUrl: './planes-list.component.html',
  styleUrls: ['./planes-list.component.scss'],
  providers: [ConfirmationService]
})
export class PlanesListComponent implements OnInit {
  planes: SubscriptionPlan[] = [];
  cargando = false;
  columnas = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'precio', header: 'Precio' },
    { field: 'tipo', header: 'Tipo' },
    { field: 'duracion', header: 'Duración (días)' },
    { field: 'activo', header: 'Activo' }
  ];

  constructor(
    private planesService: PlanesService,
    private router: Router,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes() {
    this.cargando = true;
    this.planesService.getPlanes()
      .subscribe({
        next: (data) => { this.planes = data; this.cargando = false; },
        error: () => { this.cargando = false; }
      });
  }

  crear() {
    this.router.navigate(['empresas/planes/crear']);
  }

  editar(plan: SubscriptionPlan) {
    this.router.navigate(['empresas/planes/editar', plan._id]);
  }

  eliminar(plan: SubscriptionPlan) {
    this.confirmationService.confirm({
      message: `¿Deseas eliminar el plan "${plan.nombre}"?`,
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        if (plan._id) {
          this.planesService.eliminarPlan(plan._id).subscribe(() => this.cargarPlanes());
        }
      }
    });
  }
} 