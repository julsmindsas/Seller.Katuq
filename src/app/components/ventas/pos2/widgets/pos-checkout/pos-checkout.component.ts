// import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
// import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { CreateCustomerModalComponent } from '../create-customer-modal/create-customer-modal.component';
import { checkoutMethod } from '../../../../../../assets/data/pos';
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { PaymentModalComponent } from '../payment-modal.ts/payment-modal';
import { CrearClienteModalComponent } from '../../../clientes/crear-cliente-modal/crear-cliente-modal.component';
import { CashPaymentComponent } from '../cash-payment/cash-payment';
import { CardPaymentComponent } from '../card-payment/card-payment';
import { EWalletPaymentComponent } from '../ewallet-payment/ewallet-payment';
// import { DataStoreService } from '../../../../../shared/services/dataStoreService'

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})

export class PosCheckoutComponent {
  @ViewChild('clienteBuscar') clienteBuscar: ElementRef;

  public checkoutMethod1 = checkoutMethod;
  datosCliente: any = '';
  isModalOpen = false;
  selectedPaymentType = '';
  method = '';

  constructor(
    public cartService: CartService,
    private modal: NgbModal,
    private service: MaestroService) {
    const nombre: string = this.checkoutMethod1[0].title;
  }

  // Helper para mostrar alertas
  private showAlert(title: string, text: string, icon: any = 'warning') {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'Ok'
    });
  }

  // Validación centralizada
  private validateCheckout(requireWarehouse: boolean = false): boolean {
    if (!this.datosCliente) {
      this.showAlert('Cliente!', 'Debes buscar o crear un cliente');
      return false;
    }
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace('$', '') || '0');
    if (valor === 0) {
      this.showAlert('Productos!', 'Debes adicionar productos para la venta');
      return false;
    }
    if (requireWarehouse) {
      const ware = JSON.parse(localStorage.getItem('warehousePOS') || '{}');
      if (!ware) {
        this.showAlert('Bodega!', 'Debes seleccionar una bodega');
        return false;
      }
    }
    return true;
  }

  private limpiarCarroYCliente() {
    try {
      this.cartService.clearCart();
    } catch { }
    try {
      this.limpiar();
    } catch { }
  }

  openModalPayment(): void {
    if (!this.validateCheckout(false)) return;
    if (!this.method) {
      this.showAlert('Método de pago!', 'Debes seleccionar un método de pago');
      return;
    }
    this.selectedPaymentType = this.method;
    const modalRef = this.modal.open(PaymentModalComponent, {
      centered: true,
      size: 'xl'
    });
    modalRef.componentInstance.paymentType = this.selectedPaymentType;
    modalRef.componentInstance.title = 'Método de Pago: ' + this.selectedPaymentType;
    modalRef.result.then(
      (result: any) => {
        if (result !== 'Pagado') return;
        console.log('Pagado con éxito:', result);
        // Tareas: guardar pedido, descontar inventario, limpiar carro y cliente
        // this.guardarPedido();
        // this.descontarInventario();
        this.limpiarCarroYCliente();
      },
      (reason: any) => {
        console.log('Modal cerrado por:', reason);
      }
    );
  }

  validaciones() {
    // Obsoleto: usar validateCheckout(true)
    return this.validateCheckout(true);
  }

  selectMethod(method: string) {
    this.method = method;
  }

  closeModalPayment(): void {
    // this.isModalOpen = false;
  }

  openModal() {
    this.modal.open(CrearClienteModalComponent, { centered: true, size: 'xl', modalDialogClass: 'create-customers custom-input' });
  }

  limpiar() {
    this.datosCliente = '';
    if (this.clienteBuscar) {
      this.clienteBuscar.nativeElement.value = '';
    }
  }

  buscar() {
    if (!this.clienteBuscar?.nativeElement.value) return;
    const data = { documento: this.clienteBuscar.nativeElement.value };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (!res.company) {
        this.showAlert('No encontrado!', 'No se encuentra el documento. Si desea crearlo llene los datos a continuacion');
      } else {
        try {
          this.datosCliente = res;
        } catch (error) {
          console.log(error);
        }
      }
    });
  }

  openCashModal() {
    this.method = 'Efectivo';
    if (!this.validateCheckout(true)) return;
    let res = this.modal.open(CashPaymentComponent, { size: 'md' });
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace('$', '') || '0');
    res.componentInstance.totalAmount = valor;
    res.result.then(
      (result: any) => {
        if (result !== 'Pagado') return;
        console.log('Pagado con éxito:', result);
        // this.guardarPedido();
        // this.descontarInventario();
        this.limpiarCarroYCliente();
      },
      (reason: any) => {
        console.log('Modal cerrado por:', reason);
      }
    );
  }

  openCardModal() {
    this.method = 'Tarjeta';
    if (!this.validateCheckout(true)) return;
    this.modal.open(CardPaymentComponent, { size: 'md' });
  }

  openEWalletModal() {
    this.method = 'E-Wallet';
    if (!this.validateCheckout(true)) return;
    this.modal.open(EWalletPaymentComponent, { size: 'md' });
  }
}
