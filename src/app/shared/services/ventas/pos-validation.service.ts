import { Injectable, Injector } from '@angular/core';
import Swal from 'sweetalert2';
import { BehaviorSubject } from 'rxjs';
import { CartService } from '../cart.service';
// Importamos solo el token
import { POS_CHECKOUT_SERVICE } from './pos-checkout.service';

@Injectable({
  providedIn: 'root'
})
export class PosValidationService {
  // Almacena el último error ocurrido
  lastError$ = new BehaviorSubject<string>('');
  // Variable para almacenar la referencia del servicio
  private checkoutService: any;

  constructor(
    private cartService: CartService,
    private injector: Injector
  ) {}

  // Método privado para obtener el servicio de checkout de forma diferida
  private getCheckoutService() {
    if (!this.checkoutService) {
      this.checkoutService = this.injector.get(POS_CHECKOUT_SERVICE);
    }
    return this.checkoutService;
  }

  /**
   * Validación centralizada para el checkout
   * @param requireWarehouse Si requiere validar que exista una bodega seleccionada
   * @returns true si todas las validaciones pasan, false si alguna falla
   */
  validateCheckout(requireWarehouse: boolean = false): boolean {
    // Validar cliente
    if (!this.validateCustomer()) {
      return false;
    }

    // Validar carrito con productos
    if (!this.validateCart()) {
      return false;
    }

    // Validar bodega si es necesario
    if (requireWarehouse && !this.validateWarehouse()) {
      return false;
    }

    return true;
  }

  /**
   * Valida que exista un cliente seleccionado
   */
  validateCustomer(): boolean {
    try {
      // Obtener el cliente desde el servicio de checkout
      const checkoutService = this.getCheckoutService();
      const datosCliente = checkoutService.customer$.getValue();
      
      if (!datosCliente) {
        this.showAlert('Cliente!', 'Debes buscar o crear un cliente');
        this.lastError$.next('Cliente no seleccionado');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error al validar cliente:', error);
      this.showAlert('Error', 'Ocurrió un error al validar el cliente');
      return false;
    }
  }

  /**
   * Valida que el carrito tenga productos y un total válido
   */
  validateCart(): boolean {
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace('$', '') || '0');
    
    if (valor === 0 || !this.cartService.posCartItems.length) {
      this.showAlert('Productos!', 'Debes adicionar productos para la venta');
      this.lastError$.next('Carrito vacío');
      return false;
    }
    
    return true;
  }

  /**
   * Valida que exista una bodega seleccionada
   */
  validateWarehouse(): boolean {
    try {
      console.log('Validando bodega...');
      
      // Verificar si hay una bodega guardada en localStorage
      const warehousePOS = localStorage.getItem('warehousePOS');
      console.log('warehousePOS en localStorage:', warehousePOS);
      
      // Si hay bodega en localStorage, pero no en el servicio, intentar cargarla
      if (warehousePOS) {
        try {
          const warehouseObj = JSON.parse(warehousePOS);
          console.log('Bodega parseada desde localStorage:', warehouseObj);
          
          if (warehouseObj && warehouseObj.idBodega) {
            console.log('Bodega válida encontrada en localStorage:', warehouseObj.idBodega);
            
            // Obtenemos el servicio de checkout
            const checkoutService = this.getCheckoutService();
            
            // Actualizamos el valor en el servicio si es necesario
            if (!checkoutService.warehouse$.getValue() || 
                !checkoutService.warehouse$.getValue().idBodega) {
              console.log('Estableciendo bodega en el servicio desde localStorage');
              checkoutService.warehouse$.next(warehouseObj);
              return true; // La bodega es válida desde localStorage
            }
          }
        } catch (e) {
          console.error('Error al procesar bodega desde localStorage:', e);
        }
      }
      
      // Verificación normal usando el servicio
      const checkoutService = this.getCheckoutService();
      const warehouse = checkoutService.warehouse$.getValue();
      console.log('Bodega obtenida del servicio:', warehouse);
      
      if (!warehouse) {
        console.log('No hay bodega en el servicio');
        this.showAlert('Bodega!', 'Debes seleccionar una bodega');
        this.lastError$.next('Bodega no seleccionada');
        return false;
      }
      
      if (!warehouse.idBodega) {
        console.log('La bodega no tiene idBodega');
        this.showAlert('Bodega!', 'La bodega seleccionada no es válida');
        this.lastError$.next('Bodega no válida');
        return false;
      }
      
      console.log('Bodega válida, idBodega:', warehouse.idBodega);
      return true;
    } catch (error) {
      console.error('Error al validar bodega:', error);
      this.showAlert('Error', 'Ocurrió un error al validar la bodega');
      return false;
    }
  }

  /**
   * Valida que se haya seleccionado un método de pago
   */
  validatePaymentMethod(method: string): boolean {
    if (!method) {
      this.showAlert('Método de pago!', 'Debes seleccionar un método de pago');
      this.lastError$.next('Método de pago no seleccionado');
      return false;
    }
    
    return true;
  }

  /**
   * Muestra una alerta con SweetAlert2
   */
  private showAlert(title: string, text: string, icon: any = 'warning'): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'Ok'
    });
  }
} 