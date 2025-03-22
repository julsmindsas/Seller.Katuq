import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-callback',
  templateUrl: './payment-callback.component.html'
})
export class PaymentCallbackComponent implements OnInit {

  paymentReference: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Procesar el parámetro de referencia del pago
    this.route.queryParams.subscribe(params => {
      this.paymentReference = params['ref'] || 'Sin referencia';
      console.log('Referencia de pago recibida:', this.paymentReference);
    });
  }
}
