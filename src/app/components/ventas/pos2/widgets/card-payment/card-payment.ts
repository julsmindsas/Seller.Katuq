// card-payment.component.ts
import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';
import { EstadoPago } from '../../../modelo/pedido';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';

interface PaymentCategory {
  categoria: string;
  formasPago: any[];
}

@Component({
  selector: 'app-card-payment',
  templateUrl: './card-payment.html',
  styleUrls: ['./card-payment.scss']
})
export class CardPaymentComponent implements OnInit {

  // Categorías y métodos de pago a mostrar
  paymentCategories: PaymentCategory[] = [];

  // Placeholder por defecto si la imagen no existe
  readonly placeholderIcon = 'assets/images/payment/credit-card.svg';

  constructor(
    public activeModal: NgbActiveModal,
    private checkoutService: PosCheckoutService,
    private maestroService: MaestroService
  ) {}

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  /**
   * Carga las formas de pago desde el backend (solo POS) y las agrupa por categoría
   */
  private loadPaymentMethods(): void {
    this.maestroService.consultarFormaPagoPOS().subscribe(
      (formas: any) => {
        if (!Array.isArray(formas)) return;

        const map: { [key: string]: any[] } = {};
        formas.forEach((fp: any) => {
          // Usamos el campo "online" como categoría; si no existe, caemos en "Otros"
          const cat = fp.online || 'Otros';
          if (!map[cat]) {
            map[cat] = [];
          }
          map[cat].push(fp);
        });

        this.paymentCategories = Object.keys(map).map(categoria => ({
          categoria,
          formasPago: map[categoria]
        }));
      },
      (err) => {
        console.error('Error cargando formas de pago POS:', err);
      }
    );
  }

  /**
   * Devuelve la clase de ícono (FontAwesome) para una categoría dada
   */
  getCategoryIcon(categoria: string): string {
    const cat = (categoria || '').toLowerCase();
    if (cat.includes('offline') || cat.includes('efectivo')) return 'fa fa-money-bill-wave';
    if (cat.includes('online')) return 'fa fa-globe';
    if (cat.includes('billeteras')) return 'fa fa-wallet';
    if (cat.includes('cripto')) return 'fa fa-bitcoin';
    if (cat.includes('crédito')) return 'fa fa-credit-card';
    return 'fa fa-credit-card';
  }

  /**
   * Determina la ruta del ícono para un método de pago
   */
  getPaymentIconPath(metodo: any): string {
    if (metodo?.iconPath) return metodo.iconPath;
    // Generar slug a partir del nombre para buscar svg en assets/images/payment/{slug}.svg
    const slug = (metodo?.nombre || 'default')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const path = `assets/images/payment/${slug}.svg`;
    return path;
  }

  /**
   * Fallback cuando la imagen falla al cargar
   */
  onImgError(ev: Event): void {
    const img = ev.target as HTMLImageElement;
    img.src = this.placeholderIcon;
  }

  /**
   * Selecciona un método de pago y cierra el modal devolviendo la información
   * @param method Nombre del método de pago seleccionado
   */
  selectPaymentMethod(method: string) {
    if (method.toLowerCase() === 'wompi') {
      // Si es Wompi, primero se guarda el pedido y luego se procesa con el widget de Wompi
      this.activeModal.close({
        paymentMethod: method,
        useWompiIntegration: true
      });
    } else {
      // Para otros métodos de pago electrónicos, solo se cierra el modal
      this.activeModal.close({
        paymentMethod: method
      });
    }
  }

  /**
   * Inicia el proceso de pago con Wompi
   * Este método puede ser llamado desde el servicio de checkout
   */
  iniciarPagoConWompi(pedido: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Configuración del widget de Wompi
        const amountInCents = Math.round((pedido?.totalPedididoConDescuento ?? 0) * 100); // Convertir a centavos

        // Clave pública de Wompi (debería venir de environment)
        const wompiPublicKey = 'pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy';
        const wompiProdPublicKey = 'pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf';



        // Usar el número de pedido como referencia
        const reference = pedido.nroPedido || `order-${new Date().getTime()}`;

        // Configurar datos del cliente para el formulario de pago
        const customerData = {
          fullName: pedido.cliente?.nombres_completos || '',
          phoneNumber: pedido.cliente?.numero_celular_comprador || '',
          phoneNumberPrefix: pedido.cliente?.indicativo_celular_comprador || '57',
          email: pedido.cliente?.correo_electronico_comprador || ''
        };

        const redirectUrl = window.location.origin + '/payment-callback';

       

        // Inicializar el widget de Wompi
        const checkout = new window['WidgetCheckout']({
          currency: 'COP',
          amountInCents: amountInCents,
          reference: reference,
          publicKey: wompiProdPublicKey,
          redirectUrl: redirectUrl, // Debería venir de environment
          taxInCents: {
            vat: Math.round((pedido?.totalImpuesto ?? 0) * 100),
            consumption: 0
          },
          signature: {
            integrity: pedido?.pagoInformation?.integridad || '',
          },
          customerData: customerData,
        });

        // Abrir el widget y manejar la respuesta
        checkout.open((result) => {
          const { transaction } = result;

          if (transaction.status === 'APPROVED') {
            // Almacenar los datos de la transacción en el pedido
            pedido.transaccionId = transaction.id;
            pedido.estadoPago = EstadoPago.Aprobado;
            pedido.PagosAsentados = [{
              fechaHoraAprobacionRechazo: new Date().toISOString(),
              numeroPedido: reference,
              numeroComprobante: transaction.id,
              estadoVerificacion: 'Aprobado',
              formaPago: 'Wompi',
              valorRegistrado: pedido.totalPedididoConDescuento || 0
            }];

            resolve(true); // Pago exitoso
          } else {
            pedido.estadoPago = EstadoPago.Rechazado;
            resolve(false); // Pago rechazado
          }
        }, (error) => {
          console.error('Error en el widget de Wompi:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Error al inicializar el widget de Wompi:', error);
        reject(error);
      }
    });
  }
}