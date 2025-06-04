import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-callback',
  templateUrl: './payment-callback.component.html'
})
export class PaymentCallbackComponent implements OnInit {

  paymentReference: string | null = null;
  transactionId: string | null = null;
  environment: string | null = null;
  aprobada: boolean = false;
  idOrden: string | null = null;
  transactionDetails: any = null;
  loading: boolean = true;
  error: boolean = false;
  errorMessage: string = '';
  notificationSent: boolean = false;
  notificationSuccess: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Procesar los parámetros de la URL según el nuevo formato
    this.route.queryParams.subscribe(params => {
      this.paymentReference = params['reference'] || null;
      this.transactionId = params['id'] || null;
      this.environment = params['env'] || 'prod';
      
      console.log('Referencia de pago recibida:', this.paymentReference);
      console.log('ID de transacción:', this.transactionId);
      console.log('Ambiente:', this.environment);
      
      // Si tenemos el ID de la transacción, consultamos su estado
      if (this.transactionId) {
        this.getTransactionStatus();
      } else {
        this.loading = false;
        this.error = true;
        this.errorMessage = 'No se recibió un ID de transacción válido';
      }
    });
  }

  getTransactionStatus(): void {
    // Determinar la URL base según el ambiente
    const baseUrl = this.environment === 'prod' 
      ? 'https://production.wompi.co/v1' 
      : 'https://sandbox.wompi.co/v1';
      
    // Consultar estado de la transacción usando el ID
    this.http.get(`${baseUrl}/transactions/${this.transactionId}`).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.transactionDetails = response.data;
        
        // Verificar el estado de la transacción según la documentación de Wompi
        if (response.data && response.data.status) {
          this.aprobada = response.data.status === 'APPROVED';
          
          // Extraer más información relevante
          if (this.aprobada) {
            this.idOrden = this.paymentReference;
          }
          
          console.log('Estado de la transacción:', this.aprobada ? 'Aprobada' : 'Rechazada');
          console.log('Detalles completos:', this.transactionDetails);
          
          // Notificar al backend sobre la transacción
          this.sendTransactionNotification();
        } else {
          this.error = true;
          this.errorMessage = 'No se pudo determinar el estado de la transacción';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = true;
        console.error('Error al consultar la transacción:', error);
        this.errorMessage = 'Error al consultar el estado de la transacción';
      }
    });
  }

  /**
   * Envía los datos de la transacción al backend para procesamiento adicional
   */
  sendTransactionNotification(): void {
    const apiUrl = `${environment.urlApi}/v1/integration/payment-callback`;
    
    const transactionData = {
      reference: this.paymentReference,
      transactionId: this.transactionId,
      status: this.aprobada ? 'APPROVED' : 'REJECTED',
      details: this.transactionDetails,
      timestamp: new Date().toISOString()
    };
    
    this.http.post(apiUrl, transactionData).subscribe({
      next: (response: any) => {
        console.log('Notificación enviada correctamente:', response);
        this.notificationSent = true;
        this.notificationSuccess = true;
      },
      error: (error) => {
        console.error('Error al enviar notificación:', error);
        this.notificationSent = true;
        this.notificationSuccess = false;
      }
    });
  }
  
  /**
   * Intenta reenviar la notificación de la transacción
   * Esta función puede ser llamada manualmente si la notificación automática falla
   */
  resendTransactionNotification(): void {
    this.notificationSent = false;
    this.sendTransactionNotification();
  }

  returnToHome(): void {
    // Navegar al inicio de la aplicación
    this.router.navigate(['/']);
  }
}
