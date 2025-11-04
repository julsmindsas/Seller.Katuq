import { Injectable, InjectionToken } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { BehaviorSubject, Subject } from "rxjs";
import Swal from "sweetalert2";

import { CardPaymentComponent } from "../../../components/ventas/pos2/widgets/card-payment/card-payment";
import { CashPaymentComponent } from "../../../components/ventas/pos2/widgets/cash-payment/cash-payment";
import { EWalletPaymentComponent } from "../../../components/ventas/pos2/widgets/ewallet-payment/ewallet-payment";
import { CartService } from "../cart.service";
import { PosValidationService } from "./pos-validation.service";
import { PosOrderCreatorService } from "./pos-order-creator.service";
import { POSPedido } from "../../../components/pos/pos-modelo/pedido";
import {
  EstadoPago,
  EstadoProceso,
  Pedido,
} from "../../../components/ventas/modelo/pedido";
import { IntegrationsService } from "../../../components/integrations/integrations.service";
import { environment } from "../../../../environments/environment";

// Crear un token para PosCheckoutService
export const POS_CHECKOUT_SERVICE = new InjectionToken<PosCheckoutService>(
  "PosCheckoutService",
);

@Injectable({
  providedIn: "root",
  useFactory: posCheckoutServiceFactory,
  deps: [NgbModal, PosValidationService, PosOrderCreatorService, CartService, IntegrationsService],
})
export class PosCheckoutService {
  // Observables para el estado del checkout
  customer$ = new BehaviorSubject<any>(null);
  paymentMethod$ = new BehaviorSubject<string>("");
  warehouse$ = new BehaviorSubject<any>(null);
  pedido$ = new BehaviorSubject<Pedido | null>(null);

  // Observable para manejar solicitudes de pago con Wompi
  wompiPaymentRequested$ = new Subject<{ pedido: any; options?: any }>();

  constructor(
    private modal: NgbModal,
    private validationService: PosValidationService,
    public orderCreatorService: PosOrderCreatorService,
    private cartService: CartService,
    private integrationsService: IntegrationsService,
  ) {
    // Cargar la bodega desde localStorage al iniciar
    this.loadWarehouseFromStorage();
  }

  /**
   * Carga la bodega seleccionada desde el localStorage
   */
  private loadWarehouseFromStorage(): void {
    try {
      console.log("Intentando cargar bodega desde localStorage");
      const warehouseStr = localStorage.getItem("warehousePOS");
      console.log("Bodega en localStorage:", warehouseStr);

      if (!warehouseStr) {
        console.log("No hay bodega guardada en localStorage");
        return;
      }

      const warehouse = JSON.parse(warehouseStr);
      console.log("Bodega parseada:", warehouse);

      if (warehouse && warehouse.idBodega) {
        console.log("Bodega válida encontrada, estableciendo en warehouse$");
        this.warehouse$.next(warehouse);
      } else {
        console.log("Bodega no válida (sin idBodega)");
      }
    } catch (error) {
      console.error("Error al cargar la bodega desde localStorage:", error);
    }
  }

  /**
   * Establece el cliente seleccionado
   */
  setCustomer(customer: any): void {
    console.log("🔗 PosCheckoutService - setCustomer llamado con:", customer);
    this.customer$.next(customer);
    console.log("✅ PosCheckoutService - customer$ actualizado");

    // Verificar que realmente se actualizó
    const currentValue = this.customer$.getValue();
    console.log(
      "🔍 PosCheckoutService - valor actual de customer$:",
      currentValue,
    );
  }

  /**
   * Limpia los datos del cliente
   */
  clearCustomer(): void {
    console.log("🧹 PosCheckoutService - clearCustomer llamado");
    this.customer$.next(null);
    console.log("✅ PosCheckoutService - customer$ limpiado");
  }

  /**
   * Establece el método de pago seleccionado
   */
  setPaymentMethod(method: string): void {
    this.paymentMethod$.next(method);
  }

  /**
   * Abre el flujo de pago según el método seleccionado
   */
  openPaymentFlow(method: string): void {
    this.setPaymentMethod(method);

    // Validar antes de continuar
    if (!this.validationService.validateCheckout(true)) return;

    switch (method) {
      case "Efectivo":
        this.openCashPaymentModal();
        break;
      case "Métodos Electrónicos":
        this.openCardPaymentModal();
        break;
      case "E-Wallet":
        this.openEWalletPaymentModal();
        break;
      default:
        this.showAlert(
          "Método no soportado",
          "El método de pago seleccionado no está implementado",
        );
    }
  }

  /**
   * Abre el modal de pago en efectivo
   */
  private openCashPaymentModal(): void {
    const modalRef = this.modal.open(CashPaymentComponent, { size: "md" });
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace("$", "") || "0");

    modalRef.componentInstance.totalAmount = valor;

    modalRef.result.then(
      (result: any) => {
        if (!result) return;
        this.processPurchase({
          amountReceived: result.amountReceived,
          change: result.change,
        });
      },
      () => {},
    );
  }

  /**
   * Abre el modal de pago con tarjeta
   */
  private openCardPaymentModal(): void {
    const modalRef = this.modal.open(CardPaymentComponent, {
      size: "lg",
      centered: true,
      backdrop: "static",
    });

    modalRef.result.then(
      (result: any) => {
        if (result && result.paymentMethod) {
          this.setPaymentMethod(result.paymentMethod);

          // Si se seleccionó Wompi, iniciar flujo especial
          if (result.useWompiIntegration) {
            this.processPurchaseWithWompi(result.paymentMethod);
          } else {
            // Para otros métodos, usar el flujo normal
            this.processPurchase({});
          }
        }
      },
      () => {},
    );
  }

  /**
   * Abre el modal de pago con billetera electrónica
   */
  private openEWalletPaymentModal(): void {
    const modalRef = this.modal.open(EWalletPaymentComponent, { size: "md" });

    modalRef.result.then(
      (result: any) => {
        if (!result) return;
        this.processPurchase(result);
      },
      () => {},
    );
  }

  /**
   * Procesa la compra con los datos proporcionados
   */
  processPurchase(paymentDetails: any): void {
    const customer = this.customer$.getValue();
    const paymentMethod = this.paymentMethod$.getValue();
    const warehouse = this.warehouse$.getValue();

    // Crear el pedido
    const pedido = this.orderCreatorService.createPedidoObject(
      customer,
      paymentMethod,
      warehouse,
    );

    // Actualizar campos específicos del pago
    if (paymentDetails.amountReceived) {
      pedido.pagoRecibido = paymentDetails.amountReceived;
    }

    if (paymentDetails.change) {
      pedido.cambioEntregado = paymentDetails.change;
    }

    // Establecer estados
    pedido.estadoPago = EstadoPago.Aprobado;
    pedido.estadoProceso = EstadoProceso.Entregado;
    pedido.formaEntrega = paymentMethod;
    pedido.formaDePago = paymentMethod;
    pedido.nroFactura = pedido.nroPedido;

    // Asegurar fechaEntrega para que aparezca en la lista de pedidos (filtro por fechaEntrega)
    if (!pedido.fechaEntrega) {
      pedido.fechaEntrega = new Date().toISOString();
    }

    // Guardar el pedido
    this.orderCreatorService.savePedido(pedido);
  }

  /**
   * Procesa una compra usando Wompi como método de pago
   */
  processPurchaseWithWompi(paymentMethod: string): void {
    const customer = this.customer$.getValue();
    const warehouse = this.warehouse$.getValue();

    // Crear el pedido con estado pendiente
    const pedido = this.orderCreatorService.createPedidoObject(
      customer,
      paymentMethod,
      warehouse,
    );

    // Establecer estado inicial como pendiente
    pedido.estadoPago = EstadoPago.Pendiente;
    pedido.formaEntrega = paymentMethod;
    pedido.formaDePago = paymentMethod;
    // Asegurar fechaEntrega para que aparezca en la lista de pedidos (filtro por fechaEntrega)
    if (!pedido.fechaEntrega) {
      pedido.fechaEntrega = new Date().toISOString();
    }
    this.orderCreatorService.assignUserToOrder(pedido);

    // Actualizar el Observable del pedido
    // this.pedido$.next(pedido);

    // Emitir evento para procesar pago Wompi
    this.wompiPaymentRequested$.next({ pedido });
  }

  /**
   * Inicia el pago con Wompi (usando credenciales dinámicas del comercio)
   */
  async iniciarPagoConWompi(pedido: Pedido): Promise<boolean> {
    try {
      // 1. Obtener publicKey dinámicamente del comercio
      let wompiPublicKey: string;
      let credentialSource: string;

      // Obtener company ID actual
      const currentCompanyStr = localStorage.getItem("currentCompany");
      const companyId = currentCompanyStr ? JSON.parse(currentCompanyStr)?.nit : 'unknown';

      console.log('🔑 [POS-Wompi] Iniciando flujo de pago para empresa:', companyId);

      try {
        const wompiConfig = await this.integrationsService
          .getIntegration('wompi')
          .toPromise();

        console.log('📦 [POS-Wompi] Respuesta completa del backend:', wompiConfig);
        console.log('📦 [POS-Wompi] wompiConfig.enabled:', wompiConfig?.enabled);
        console.log('📦 [POS-Wompi] wompiConfig.config:', wompiConfig?.config);
        console.log('📦 [POS-Wompi] wompiConfig.config?.publicKey:', wompiConfig?.config?.publicKey);

        if (wompiConfig && wompiConfig.enabled && wompiConfig.config && wompiConfig.config.publicKey) {
          wompiPublicKey = wompiConfig.config.publicKey;
          credentialSource = 'company-config';
          console.log('✅ [POS-Wompi] Usando credenciales del comercio');
          console.log('   - Company ID:', companyId);
          console.log('   - Provider:', wompiConfig.provider || 'wompi');
          console.log('   - Public Key:', wompiConfig.config.publicKey?.substring(0, 30) + '...');
          console.log('   - Enabled:', wompiConfig.enabled);
        } else {
          const reason = !wompiConfig ? 'No config returned' :
                        !wompiConfig.enabled ? 'Config disabled' :
                        !wompiConfig.config ? 'No config object' :
                        !wompiConfig.config.publicKey ? 'No publicKey in config' :
                        'Unknown';
          throw new Error(`Configuración de Wompi no encontrada o deshabilitada: ${reason}`);
        }
      } catch (error) {
        // Fallback a claves de plataforma desde environment
        wompiPublicKey = environment.wompi.public_key;
        credentialSource = 'platform-fallback';
        console.warn('⚠️ [POS-Wompi] Usando Wompi de plataforma (fallback)');
        console.warn('   - Company ID:', companyId);
        console.warn('   - Reason:', error.message);
        console.warn('   - Fallback Source: environment.wompi.public_key');
        console.warn('   - Fallback Key:', wompiPublicKey.substring(0, 30) + '...');
      }

      // 2. Configurar el widget con la clave obtenida
      const amountInCents = Math.round(
        (pedido?.totalPedididoConDescuento ?? 0) * 100,
      );

      const reference = pedido.nroPedido || `order-${new Date().getTime()}`;

      const customerData = {
        fullName: pedido.cliente?.nombres_completos || "",
        phoneNumber: pedido.cliente?.numero_celular_comprador || "",
        phoneNumberPrefix:
          pedido.cliente?.indicativo_celular_comprador || "57",
        email: pedido.cliente?.correo_electronico_comprador || "",
      };

      const redirectUrl = window.location.origin + "/payment-callback";

      // 3. Inicializar el widget de Wompi con publicKey dinámico
      const checkout = new window["WidgetCheckout"]({
        currency: "COP",
        amountInCents: amountInCents,
        reference: reference,
        publicKey: wompiPublicKey,  // ✅ Dinámico
        redirectUrl: redirectUrl,
        taxInCents: {
          vat: Math.round((pedido?.totalImpuesto ?? 0) * 100),
          consumption: 0,
        },
        signature: {
          integrity: pedido?.pagoInformation?.integridad || "",
        },
        customerData: customerData,
      });

      // 4. Abrir el widget y manejar la respuesta
      return new Promise<boolean>((resolve, reject) => {
        checkout.open(
          (result) => {
            const { transaction } = result;
            pedido = this.pedido$.getValue() as Pedido;
            if (transaction.status === "APPROVED") {
              // Almacenar los datos de la transacción en el pedido
              pedido.transaccionId = transaction.id;
              pedido.estadoPago = EstadoPago.Aprobado;
              pedido.PagosAsentados = [
                {
                  fechaHoraAprobacionRechazo: new Date().toISOString(),
                  numeroPedido: reference,
                  numeroComprobante: transaction.id,
                  estadoVerificacion: "Aprobado",
                  formaPago: "Wompi",
                  valorRegistrado: pedido.totalPedididoConDescuento || 0,
                },
              ];

              if (pedido.pagoInformation) {
                pedido.pagoInformation.estado = "Aprobado";
                pedido.pagoInformation.fecha = new Date().toISOString();
                pedido.pagoInformation.hora = new Date().toISOString();
              }

              // Actualizar el pedido en el Observable
              this.pedido$.next(pedido);

              resolve(true); // Pago exitoso
            } else {
              pedido.estadoPago = EstadoPago.Rechazado;

              // Actualizar el pedido en el Observable
              this.pedido$.next(pedido);

              resolve(false); // Pago rechazado
            }
          },
          (error) => {
            console.error("Error en el widget de Wompi:", error);
            reject(error);
          },
        );
      });
    } catch (error) {
      console.error("Error al inicializar el widget de Wompi:", error);
      return Promise.reject(error);
    }
  }

  /**
   * Limpia el carrito y los datos del cliente
   */
  resetCheckout(): void {
    this.cartService.clearCart();
    this.clearCustomer();
    this.setPaymentMethod("");
    this.pedido$.next(null);

    // Limpiar datos temporales del localStorage
    localStorage.removeItem("selectedCustomerPOS");
    localStorage.removeItem("tempOrderData");
  }

  /**
   * Muestra una alerta con SweetAlert2
   */
  private showAlert(title: string, text: string, icon: any = "warning"): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: "Ok",
    });
  }
}

export function posCheckoutServiceFactory(
  modal: NgbModal,
  validationService: PosValidationService,
  orderCreatorService: PosOrderCreatorService,
  cartService: CartService,
  integrationsService: IntegrationsService,
) {
  return new PosCheckoutService(
    modal,
    validationService,
    orderCreatorService,
    cartService,
    integrationsService,
  );
}
