import { Component, Input, AfterViewInit, OnInit } from '@angular/core';
import { POSPedido } from '../pos-modelo/pedido';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PosCheckoutService } from '../../../shared/services/ventas/pos-checkout.service';
import { CartService } from '../../../shared/services/cart.service';

@Component({
  selector: 'app-factura-tirilla',
  templateUrl: './factura-tirilla.component.html',
  styleUrls: ['./factura-tirilla.component.scss']
})
export class FacturaTirillaComponent implements OnInit, AfterViewInit {
  @Input() pedido: POSPedido;
  
  // Datos de la empresa
  empresaActual: any = {};
  
  // Información de pago calculada
  subtotalSinImpuestos: number = 0;
  totalImpuestos: number = 0;
  totalPagar: number = 0;
  montoPagado: number = 0;
  cambioDevolver: number = 0;
  
  // Fecha y hora actuales
  fechaEmision: Date = new Date();
  horaEmision: string = '';

  constructor(
    private modal: NgbModal,
    private checkoutService: PosCheckoutService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Cargar datos de la empresa actual
    this.cargarDatosEmpresa();
    
    // Calcular información de pago
    this.calcularInfoPago();
    
    // Establecer hora de emisión
    this.horaEmision = this.fechaEmision.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  ngAfterViewInit(): void {
    // Imprimir automáticamente después de 500ms
    setTimeout(() => window.print(), 500);
  }

  /**
   * Carga los datos de la empresa desde sessionStorage
   */
  private cargarDatosEmpresa(): void {
    const empresaStr = sessionStorage.getItem('currentCompany');
    if (empresaStr) {
      try {
        this.empresaActual = JSON.parse(empresaStr);
      } catch (error) {
        console.error('Error al parsear datos de empresa:', error);
        this.empresaActual = {};
      }
    }
  }

  /**
   * Calcula la información de pago detallada
   */
  private calcularInfoPago(): void {
    if (!this.pedido) return;

    // Calcular subtotal sin impuestos
    this.subtotalSinImpuestos = this.pedido.subtotal || 0;
    
    // Total de impuestos
    this.totalImpuestos = this.pedido.totalImpuesto || 0;
    
    // Total a pagar
    this.totalPagar = this.pedido.totalPedididoConDescuento || 0;
    
    // Monto pagado por el cliente
    this.montoPagado = this.pedido.pagoRecibido || this.totalPagar;
    
    // Cambio a devolver
    this.cambioDevolver = this.pedido.cambioEntregado || 0;
  }

  /**
   * Obtiene el NIT formateado de la empresa
   */
  get nitEmpresaFormateado(): string {
    return this.empresaActual?.nit || 'No disponible';
  }

  /**
   * Obtiene la dirección completa de la empresa
   */
  get direccionCompleta(): string {
    const direccion = this.empresaActual?.direccion || '';
    const ciudad = this.empresaActual?.ciudad || '';
    const departamento = this.empresaActual?.departamento || '';
    
    return [direccion, ciudad, departamento].filter(Boolean).join(', ') || 'No disponible';
  }

  /**
   * Obtiene el teléfono de la empresa
   */
  get telefonoEmpresa(): string {
    return this.empresaActual?.telefono || this.empresaActual?.celular || 'No disponible';
  }

  /**
   * Obtiene el email de la empresa
   */
  get emailEmpresa(): string {
    return this.empresaActual?.email || this.empresaActual?.correo || 'No disponible';
  }

  /**
   * Método para imprimir la factura
   */
  print(): void {
    window.print();
  }

  /**
   * Método para regresar y cerrar el modal limpiando todos los datos
   */
  goBack(): void {
    // Limpiar todos los datos del POS para una nueva venta
    this.limpiarDatosPOS();
    
    // Cerrar el modal
    this.modal.dismissAll();
  }

  /**
   * Limpia todos los datos del POS para iniciar una nueva venta
   */
  private limpiarDatosPOS(): void {
    // Limpiar carrito
    this.cartService.clearCart();
    
    // Limpiar datos del cliente
    this.checkoutService.clearCustomer();
    
    // Resetear método de pago
    this.checkoutService.setPaymentMethod('');
    
    // Limpiar pedido actual
    this.checkoutService.pedido$.next(null);
    
    // Limpiar datos temporales del localStorage
    localStorage.removeItem('selectedCustomerPOS');
    localStorage.removeItem('tempOrderData');
    
    console.log('POS limpiado - listo para nueva venta');
  }

  /**
   * Calcula el total de un producto en el carrito
   */
  calcularTotalProducto(item: any): number {
    return (item.cantidad || 0) * (item.producto?.precio?.precioUnitarioConIva || 0);
  }

  /**
   * Obtiene el nombre del asesor que realizó la venta
   */
  get nombreAsesor(): string {
    return this.pedido?.asesorAsignado?.name || 'N/A';
  }

  /**
   * Verifica si hay información de pago disponible
   */
  get tieneInfoPago(): boolean {
    return !!(this.pedido?.pagoRecibido || this.pedido?.cambioEntregado || this.pedido?.formaDePago);
  }

  /**
   * Obtiene el texto del estado de pago en formato legible
   */
  get estadoPagoTexto(): string {
    const estado = this.pedido?.estadoPago;
    switch (estado) {
      case 'Aprobado':
        return 'PAGADO';
      case 'Pendiente':
        return 'PENDIENTE';
      case 'Rechazado':
        return 'RECHAZADO';
      case 'PreAprobado':
        return 'PRE-APROBADO';
      default:
        return estado || 'NO DEFINIDO';
    }
  }

  /**
   * Verifica si la venta tiene descuentos
   */
  get tieneDescuentos(): boolean {
    return !!(this.pedido?.totalDescuento && this.pedido.totalDescuento > 0);
  }

  /**
   * Verifica si la venta tiene impuestos
   */
  get tieneImpuestos(): boolean {
    return !!(this.totalImpuestos && this.totalImpuestos > 0);
  }

  /**
   * Obtiene un resumen corto de la venta para el pie de página
   */
  get resumenVenta(): string {
    const cantidad = this.pedido?.carrito?.length || 0;
    const items = cantidad === 1 ? 'artículo' : 'artículos';
    return `${cantidad} ${items} - Total: ${this.totalPagar.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`;
  }

  /**
   * Obtiene el número de factura/referencia prioritario
   */
  get numeroFacturaPrincipal(): string {
    // Si hay factura electrónica generada, mostrar ese número
    if (this.pedido?.nroFactura && 
        this.pedido.nroFactura !== this.pedido?.referencia && 
        this.pedido.nroFactura !== this.pedido?.nroPedido) {
      return this.pedido.nroFactura;
    }
    
    // Si hay referencia del servicio, usar esa
    if (this.pedido?.referencia) {
      return this.pedido.referencia;
    }
    
    // Como última opción, usar el número de pedido
    return this.pedido?.nroPedido || 'N/A';
  }
}
