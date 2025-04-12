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

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})

export class PosCheckoutComponent {
  @ViewChild('clienteBuscar') 'clienteBuscar': ElementRef

  public checkoutMethod1 = checkoutMethod;
  datos: any = '';
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
      this.isModalOpen = true;
    }
  }

  selectMethod(method: any) {
    this.method = method;
  }


  closeModalPayment(): void {
    this.isModalOpen = false;
  }

  openModal() {
    this.modal.open(CreateCustomerModalComponent, { centered: true, size: 'lg', modalDialogClass: 'create-customers custom-input' })
  }

  limpiar() {
    this.datos = '';
    this.clienteBuscar.nativeElement.value = '';
  }

  buscar() {

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

          this.datos = res;



        } catch (error) {
          console.log(error);
        }

      }

    });
  }
}
