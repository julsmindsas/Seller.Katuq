import { Component, ViewChild, AfterViewInit } from '@angular/core'; // Importar AfterViewInit
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ProductCategoryComponent } from "./widgets/product-category/product-category.component";
import { ProductComponent } from './widgets/product/product.component';
import { PosCheckoutComponent } from "./widgets/pos-checkout/pos-checkout.component";
import { WarehouseSelectorComponent } from './widgets/warehouse-selector/warehouse-selector'; // Importar WarehouseSelectorComponent
import { CashClosingComponent } from './widgets/cash-closing/cash-closing.component';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})

export class PosComponent implements AfterViewInit { // Implementar AfterViewInit
  @ViewChild(ProductComponent) productComponent: ProductComponent;
  @ViewChild(WarehouseSelectorComponent) warehouseSelectorComponent: WarehouseSelectorComponent; // Añadir ViewChild para WarehouseSelector

  constructor(private modal: NgbModal) {}

  ngAfterViewInit(): void {
    // Carga inicial de productos después de que los componentes hijos estén listos
    // Verifica si ya hay una bodega seleccionada en localStorage al iniciar
    const initialBodega = JSON.parse(localStorage.getItem('warehousePOS')!);
    const initialBodegaId = initialBodega ? initialBodega.idBodega : undefined;
    if (this.productComponent) {
       this.productComponent.obtenerProductos(initialBodegaId);
    }
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
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  }
}
