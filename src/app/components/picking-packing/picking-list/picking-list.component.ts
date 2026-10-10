import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PickingPackingService } from '../../../shared/services/picking-packig/picking-packing.service';
import { PickingResponse } from '../models/picking.model';
import { Order } from '../models/order.model';
import { avisoDeErrorPicking, puedeAlistarse, textoDeEstadoPedido } from '../picking-mensajes';

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

  // Textos para la plantilla
  textoEstadoPedido = textoDeEstadoPedido;
  
  constructor(
    private pickingService: PickingPackingService,
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService
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
        this.loading = false;
        this.avisarError(error);
      }
    );
  }

  buscarPorNroPedido(): void {
    const nroPedido = this.filtroForm.get('nroPedido')?.value;
    if (nroPedido) {
      this.loading = true;
      this.pickingService.buscarPedidos(nroPedido).subscribe(
        (ordenes) => {
          this.ordenesPendientes = ordenes;
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          this.avisarError(error);
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
    // El número del pedido viaja en la URL: la pantalla de detalle lo busca y de ahí saca el alistamiento
    if (orden.nroPedido) {
      this.router.navigate(['/picking-packing/picking/orden', orden.nroPedido]);
    }
  }

  puedeIniciarPicking(orden: Order): boolean {
    return puedeAlistarse(String(orden.estadoProceso));
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

  private avisarError(error: any): void {
    const aviso = avisoDeErrorPicking(error, 'listar');
    if (aviso) {
      this.toastr.error(aviso.mensaje, aviso.titulo);
    }
  }
} 