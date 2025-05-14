import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { PickingPackingService } from '../../../shared/services/picking-packig/picking-packing.service';
import { PickingResponse } from '../models/picking.model';
import { Order } from '../models/order.model';

@Component({
  selector: 'app-picking-list',
  templateUrl: './picking-list.component.html',
  styleUrls: ['./picking-list.component.scss']
})
export class PickingListComponent implements OnInit {
  pickingList: PickingResponse[] = [];
  ordenesPendientes: Order[] = [];
  filtroForm: FormGroup;
  loading = false;
  
  constructor(
    private pickingService: PickingPackingService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.filtroForm = this.fb.group({
      nroPedido: [''],
      estado: [''],
      fechaDesde: [null],
      fechaHasta: [null]
    });
  }

  ngOnInit(): void {
    this.cargarPickings();
    this.cargarOrdenesPendientes();
  }

  cargarPickings(): void {
    this.loading = true;
    // Aquí normalmente harías una llamada para obtener todos los pickings
    // Como no tenemos un endpoint específico, podríamos implementar esto cuando esté disponible
    this.loading = false;
  }

  cargarOrdenesPendientes(): void {
    this.loading = true;
    this.pickingService.getOrdenesPendientes().subscribe(
      (ordenes) => {
        this.ordenesPendientes = ordenes;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar órdenes pendientes', error);
        this.loading = false;
      }
    );
  }

  buscarPorNroPedido(): void {
    const nroPedido = this.filtroForm.get('nroPedido')?.value;
    if (nroPedido) {
      this.loading = true;
      this.pickingService.getOrderByNroPedido(nroPedido).subscribe(
        (orden) => {
          if (orden) {
            this.ordenesPendientes = [orden];
          } else {
            this.ordenesPendientes = [];
          }
          this.loading = false;
        },
        (error) => {
          console.error('Error al buscar pedido', error);
          this.loading = false;
        }
      );
    } else {
      this.cargarOrdenesPendientes();
    }
  }

  verDetalle(picking: PickingResponse): void {
    this.router.navigate(['/picking-packing/picking', picking._id]);
  }

  verDetallePedido(orden: Order): void {
    if (orden._id) {
      this.router.navigate(['/picking-packing/picking/orden', orden._id]);
    }
  }

  iniciarNuevoPicking(): void {
    this.router.navigate(['/picking-packing/picking/nuevo']);
  }

  aplicarFiltros(): void {
    this.buscarPorNroPedido();
  }

  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.cargarOrdenesPendientes();
  }
} 