import { Component, OnInit, OnDestroy } from '@angular/core';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';
import { CartService } from '../../../../../shared/services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})
export class PosCheckoutComponent implements OnInit, OnDestroy {
  // Banderas de control
  showPedidoConfirm: boolean = false;
  showSteper: boolean = true;
  
  // Datos del checkout
  warehouse: any = null;
  
  // Suscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    public cartService: CartService,
    public checkoutService: PosCheckoutService
  ) { }

  ngOnInit(): void {
    // Verificar si hay bodega en localStorage al iniciar
    this.checkWarehouseFromStorage();
    
    // Suscribirse a cambios en la bodega
    this.subscriptions.push(
      this.checkoutService.warehouse$.subscribe(warehouse => {
        this.warehouse = warehouse;
        console.log('PosCheckoutComponent - Bodega actualizada:', warehouse);
      })
    );
  }
  
  ngOnDestroy(): void {
    // Desuscribirse al destruir el componente
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  /**
   * Verifica si hay una bodega en localStorage y la carga
   */
  private checkWarehouseFromStorage(): void {
    try {
      const warehouseStr = localStorage.getItem('warehousePOS');
      if (warehouseStr) {
        const warehouse = JSON.parse(warehouseStr);
        if (warehouse && warehouse.idBodega) {
          console.log('PosCheckoutComponent - Bodega encontrada en localStorage:', warehouse);
          this.checkoutService.warehouse$.next(warehouse);
        }
      }
    } catch (error) {
      console.error('Error al verificar bodega en localStorage:', error);
    }
  }
}
