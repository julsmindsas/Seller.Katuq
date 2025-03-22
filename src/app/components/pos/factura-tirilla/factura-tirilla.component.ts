import { Component, Input, AfterViewInit } from '@angular/core';
import { POSPedido } from '../pos-modelo/pedido';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-factura-tirilla',
  templateUrl: './factura-tirilla.component.html',
  styleUrls: ['./factura-tirilla.component.scss']
})
export class FacturaTirillaComponent implements AfterViewInit {
  @Input() pedido: POSPedido;

  ngAfterViewInit(): void {
    // Si se desea, se puede invocar window.print() automáticamente
    setTimeout(() => window.print(), 500);
  }
  /**
   *
   */
  constructor(private modal: NgbModal) {

  }

  print(): void {
    window.print();
  }

  goBack(): void {
    window.history.back();
    this.modal.dismissAll();  // Cerrar el modal  
  }
}
