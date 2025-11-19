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
import { TourService } from '../../../shared/services/tour.service';

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
    private checkoutService: PosCheckoutService,
    private tourService: TourService
  ) {}

  ngOnInit(): void {
    // Debug logging para verificar contexto de empresa
    const currentCompanyStr = localStorage.getItem("currentCompany");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    console.log("🏢 [POS Init] Current Company from localStorage:",
      currentCompanyStr ? JSON.parse(currentCompanyStr) : null);
    console.log("👤 [POS Init] User Company:", user.company);

    // Sync company data to both storages for receipt compatibility
    if (currentCompanyStr) {
      sessionStorage.setItem("currentCompany", currentCompanyStr);
      console.log("✅ [POS Init] Company data synced to sessionStorage for receipt");
    } else {
      console.warn("⚠️ [POS Init] No company data found in localStorage - receipt may have incomplete info");
    }

    // Limpiar datos al inicializar el POS para empezar siempre con estado limpio
    this.limpiarDatos();
  }

  ngAfterViewInit(): void {
    // Carga inicial de productos después de que los componentes hijos estén listos
    // Verifica si ya hay una bodega seleccionada en localStorage al iniciar
    const initialBodega = JSON.parse(localStorage.getItem('warehousePOS')!);
    const initialBodegaId = initialBodega?.idBodega;

    if (this.productComponent) {
      if (!initialBodegaId) {
        // No cargar productos si no hay bodega seleccionada
        console.warn('POS: No se puede cargar productos sin una bodega asignada');
        // El componente product mostrará un mensaje al usuario
      } else {
        this.productComponent.obtenerProductos(initialBodegaId);
      }
    }

    // Initialize POS tour after view is loaded only if not completed
    const completedTours = JSON.parse(localStorage.getItem('katuq_completed_tours') || '[]');
    if (!completedTours.includes('pos')) {
      setTimeout(() => {
        this.tourService.startTour('pos', this.tourService.getPosTour());
      }, 2000);
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

  startPosTour(): void {
    this.tourService.startTour('pos', this.tourService.getPosTour());
  }
}
