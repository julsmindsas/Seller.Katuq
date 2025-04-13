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
import { CashPaymentComponent } from '../cash-payment.ts/cash-payment';
import { CardPaymentComponent } from '../card-payment/card-payment';
import { EWalletPaymentComponent } from '../ewallet-payment/ewallet-payment';

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})

export class PosCheckoutComponent {
  @ViewChild('clienteBuscar') 'clienteBuscar': ElementRef

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

  openModalPayment(): void {

    if (this.method === '') {
      Swal.fire({
        title: 'Método de pago!',
        text: 'Debes seleccionar un método de pago',
        icon: 'warning',
        confirmButtonText: 'Ok'
      });
    } else {

      this.selectedPaymentType = this.method;

      // this.isModalOpen = true;

      const modalRef = this.modal.open(PaymentModalComponent, {
        centered: true,
        size: 'xl'
      });

      // Pasar datos al modal
      modalRef.componentInstance.paymentType = this.selectedPaymentType;
      modalRef.componentInstance.title = 'Método de Pago: ' + this.selectedPaymentType

      // Capturar datos al cerrar el modal
      modalRef.result.then(
        (result) => {
          debugger;
          console.log('Pagado con éxito:', result);

          //TAREAS:
          // 1. Guardar Pedido 
          // 2. Descontar inventario
          // 3. limpiar carro
          // 4. limpiar cliente

          try {
            // 1. Guardar Pedido 
            // this.guardarPedido();
          } catch (error) {

          }

          try {
            // 2. Descontar inventario
            // this.descontarInventario();
          } catch (error) {

          }

          try {
            // 3. limpiar carro
            this.cartService.clearCart();
          } catch (error) {

          }

          try {
            // 4. limpiar cliente
            this.limpiar();
          } catch (error) {

          }


        },
        (reason) => {
          debugger;
          console.log('Modal cerrado por:', reason);
        }
      );

    }
  }

  selectMethod(method: any) {
    this.method = method;
  }


  closeModalPayment(): void {
    // this.isModalOpen = false;
  }

  openModal() {
    this.modal.open(CrearClienteModalComponent, { centered: true, size: 'xl', modalDialogClass: 'create-customers custom-input' })
  }

  limpiar() {
    this.datosCliente = '';
    this.clienteBuscar.nativeElement.value = '';
  }

  buscar() {

    if(this.clienteBuscar.nativeElement.value === ''){
      return;
    }


    const data = {
      documento: this.clienteBuscar.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (!res.company) {
        Swal.fire({
          title: 'No encontrado!',
          text: 'No se encuentra el documento. Si desea crearlo llene los datos a continuacion',
          icon: 'warning',
          confirmButtonText: 'Ok'
        });
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
    let res = this.modal.open(CashPaymentComponent, { size: 'md' });

    const total = this.cartService.getPOSSubTotal();

    const valor = parseFloat(total?.replace('$', '') || '0');

    // Pasar datos al modal
    res.componentInstance.totalAmount = valor;
    // Capturar datos al cerrar el modal
    res.result.then(
      (result) => {
        this.buscar();
        console.log('Modal cerrado con éxito:', result);
      },
      (reason) => {
        console.log('Modal cerrado por:', reason);
      }
    );

  }

  openCardModal() {
    this.modal.open(CardPaymentComponent, { size: 'md' });
  }

  openEWalletModal() {
    this.modal.open(EWalletPaymentComponent, { size: 'md' });
  }
}
