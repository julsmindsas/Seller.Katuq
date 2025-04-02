// import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
// import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateCustomerModalComponent } from '../create-customer-modal/create-customer-modal.component';
import { checkoutMethod } from '../../../../../../assets/data/pos';
import { CartService } from '../../../../../shared/services/cart.service';

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})

export class PosCheckoutComponent {

  public checkoutMethod1 = checkoutMethod;
  
  constructor(public cartService: CartService, private modal: NgbModal) {

    const nombre: string = this.checkoutMethod1[0].title;
  }

  openModal() {
    this.modal.open(CreateCustomerModalComponent, { centered: true, size: 'lg', modalDialogClass: 'create-customers custom-input' })
  }
}
