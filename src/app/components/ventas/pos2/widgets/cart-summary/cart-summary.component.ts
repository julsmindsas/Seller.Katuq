import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { CartService } from '../../../../../shared/services/cart.service';
import { imagenDeProducto } from '../../../../../shared/utils/imagen-producto';
import { lineaDesdeItemPos, precioUnitarioPos, tieneCambios } from '../../../../../shared/utils/pos-linea-precio';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent {
  couponCode: string = '';
  public defaultImage: string = 'assets/images/placeholders/product-not-found.svg';

  // D-540 (ticket 1340): estado de pantalla del ticket en escritorio.
  /**
   * Línea con «Editar precio» abierto: el OBJETO del ítem, que el carrito
   * conserva mientras la línea exista. Solo una a la vez (decisión 4 de Daniel).
   */
  lineaAbierta: any = null;
  /** Campo de cupón visible («Agregar cupón»). */
  cuponAbierto = false;
  @ViewChild('cuponInput') private cuponInput?: ElementRef<HTMLInputElement>;

  constructor(public cartService: CartService, private cdr: ChangeDetectorRef) { }

  /**
   * Total del ticket como NÚMERO, solo para mostrarlo con separadores de miles.
   * OJO: no se toca getPOSSubTotal(); pos-order-creator hace
   * parseFloat(getPOSSubTotal().replace('$','')) al crear el pedido, así que
   * cambiar el formato del servicio rompería el monto de la orden.
   */
  get totalNumerico(): number {
    const raw = this.cartService.getPOSSubTotal();
    return parseFloat(String(raw ?? '0').replace(/[^0-9.-]/g, '')) || 0;
  }

  /** D-540: unidades del ticket (suma de cantidades), leídas de getPOSCantidad(). */
  get textoUnidades(): string {
    const unidades = Number(this.cartService.getPOSCantidad()) || 0;
    return unidades === 1 ? '1 unidad' : `${unidades} unidades`;
  }

  /**
   * D-540: valores del pie sin lógica nueva. Hoy el descuento y el cupón no
   * suman nada (el cupón solo escribe en consola); cuando el cambio del cupón
   * los llene, sus filas aparecerán solas.
   */
  get descuentoTicket(): number {
    return 0;
  }

  get cuponTicket(): number {
    return 0;
  }

  get subtotalTicket(): number {
    return this.totalNumerico;
  }

  /** D-536: precio unitario con IVA que se cobra (con los cambios de la línea, si hay). */
  precioUnitario(item: any): number {
    return precioUnitarioPos(item);
  }

  /** D-540: subtotal de la línea con el mismo cálculo que suma getPOSSubTotal(). */
  subtotalLinea(item: any): number {
    return precioUnitarioPos(item) * (item?.cantidad || 0);
  }

  lineaEditada(item: any): boolean {
    return tieneCambios(lineaDesdeItemPos(item));
  }

  /**
   * D-540: abre o cierra el editor de D-536 de una línea y cierra el de las
   * demás. Cerrar no deshace nada: los cambios viven en el ítem. El editor se
   * esconde con CSS, así que el componente no se destruye.
   */
  alternarEditor(item: any, ev: Event): void {
    this.lineaAbierta = this.lineaAbierta === item ? null : item;
    if (!this.lineaAbierta) return;
    this.cdr.detectChanges();
    (ev.currentTarget as HTMLElement | null)?.closest('.ticket-linea')?.scrollIntoView({ block: 'nearest' });
  }

  /** D-540: muestra u oculta el campo de cupón; al abrir, le pone el foco. */
  alternarCupon(): void {
    this.cuponAbierto = !this.cuponAbierto;
    if (!this.cuponAbierto) return;
    this.cdr.detectChanges();
    this.cuponInput?.nativeElement.focus();
  }

  /**
   * Aplica un cupón de descuento (funcionalidad pendiente)
   */
  applyCoupon(): void {
    if (!this.couponCode) return;
    
    // Aquí iría la lógica para aplicar el cupón
    console.log('Aplicando cupón:', this.couponCode);
    
    // Reiniciar el código del cupón
    this.couponCode = '';
  }

  /**
   * Obtiene la URL de la imagen del item del carrito de forma segura
   * @param item El item del carrito del cual obtener la imagen
   * @returns URL de la imagen o imagen por defecto si no existe
   */
  getCartItemImageUrl(item: any): string {
    // La ruta que guarda Osmosis es relativa y no carga servida tal cual:
    // `imagenDeProducto` la resuelve contra el CDN. Ver shared/utils.
    return imagenDeProducto(item, this.defaultImage);
  }
} 
