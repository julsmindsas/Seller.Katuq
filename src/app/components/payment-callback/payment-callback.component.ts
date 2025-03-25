import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-callback',
  templateUrl: './payment-callback.component.html'
})
export class PaymentCallbackComponent implements OnInit {

  paymentReference: string | null = null;
  aprobada: boolean = false;
  idOrden: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Procesar el parámetro de referencia del pago
    this.route.queryParams.subscribe(params => {
      this.paymentReference = params['ref'] || 'Sin referencia';
      this.idOrden = params['order'] || 'Sin número de orden';
      
      // Determinar si la transacción fue aprobada
      // Aquí puedes agregar la lógica para determinar el estado según tus parámetros
      this.aprobada = params['status'] === 'approved' || params['estado'] === 'aprobado';
      
      console.log('Referencia de pago recibida:', this.paymentReference);
      console.log('Estado de la transacción:', this.aprobada ? 'Aprobada' : 'Rechazada');
    });
  }

  returnToHome(): void {
    // Navegar al inicio de la aplicación
    this.router.navigate(['/']);
  }
}
