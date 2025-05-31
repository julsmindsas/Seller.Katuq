import { Component, ViewChild, AfterViewInit, OnInit } from '@angular/core'; // Importar OnInit
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ProductCategoryComponent } from "./widgets/product-category/product-category.component";
import { ProductComponent } from './widgets/product/product.component';
import { PosCheckoutComponent } from "./widgets/pos-checkout/pos-checkout.component";
import { WarehouseSelectorComponent } from './widgets/warehouse-selector/warehouse-selector'; // Importar WarehouseSelectorComponent
import { CashClosingComponent } from './widgets/cash-closing/cash-closing.component';
import { CashClosingHistoryComponent } from './widgets/cash-closing-history/cash-closing-history.component';
import { CartService } from '../../../shared/services/cart.service';
import { PosCheckoutService } from '../../../shared/services/ventas/pos-checkout.service';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})

export class PosComponent implements OnInit, AfterViewInit { // Implementar OnInit además de AfterViewInit
  @ViewChild(ProductComponent) productComponent: ProductComponent;
  @ViewChild(WarehouseSelectorComponent) warehouseSelectorComponent: WarehouseSelectorComponent; // Añadir ViewChild para WarehouseSelector

  constructor(
    private modal: NgbModal,
    private cartService: CartService,
    private checkoutService: PosCheckoutService
  ) {}

  ngOnInit(): void {
    // Limpiar datos al inicializar el POS para empezar siempre con estado limpio
    this.limpiarDatos();
  }

  ngAfterViewInit(): void {
    // Carga inicial de productos después de que los componentes hijos estén listos
    // Verifica si ya hay una bodega seleccionada en localStorage al iniciar
    const initialBodega = JSON.parse(localStorage.getItem('warehousePOS')!);
    const initialBodegaId = initialBodega ? initialBodega.idBodega : undefined;
    if (this.productComponent) {
       this.productComponent.obtenerProductos(initialBodegaId);
    }
  }

  /**
   * Limpia los datos del carrito y cliente al inicializar el POS
   */
  private limpiarDatos(): void {
    // Limpiar carrito
    this.cartService.clearCart();
    
    // Limpiar datos del cliente
    this.checkoutService.clearCustomer();
    
    // Limpiar cualquier dato temporal del POS
    localStorage.removeItem('selectedCustomerPOS');
    localStorage.removeItem('tempOrderData');
  }

  /**
   * Método público para iniciar una nueva venta limpiando todos los datos
   */
  public nuevaVenta(): void {
    this.limpiarDatos();
    
    // Opcional: mostrar mensaje de confirmación
    console.log('POS limpiado - listo para nueva venta');
  }

  onWarehouseChanged() {
    const bodegaSeleccionada = JSON.parse(localStorage.getItem('warehousePOS')!);
    const bodegaId = bodegaSeleccionada ? bodegaSeleccionada.idBodega : undefined;
    // Asegúrate de que productComponent esté inicializado
    if (this.productComponent) {
      this.productComponent.obtenerProductos(bodegaId);
    } else {
      console.error("ProductComponent no está disponible todavía.");
    }
  }

  openCashClosingModal() {
    this.modal.open(CashClosingComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
  }

  openCashClosingHistoryModal() {
    this.modal.open(CashClosingHistoryComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
  }
}
