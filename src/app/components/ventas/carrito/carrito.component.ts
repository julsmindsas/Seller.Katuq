import { Component, Input, OnInit } from "@angular/core";
import { CartSingletonService } from "../../../shared/services/ventas/cart.singleton.service";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import Swal from "sweetalert2";
import { Pedido } from "../modelo/pedido";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "app-carrito",
  templateUrl: "./carrito.component.html",
  styleUrls: ["./carrito.component.scss"],
})
export class CarritoComponent implements OnInit {
  productos: any[] = [];
  cupon: string = '';
  valorDescuento: number = 0;
  porcentajeDescuento: number = 0;
  rangoPreciosActual1: any = null;
  precioproducto: number = 0;
  preciosAdiciones: number = 0;
  preciosPreferencias: number = 0;

  @Input()
  public pedido: Pedido;

  constructor(
    private carsingleton: CartSingletonService,
    private service: VentasService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.refreshCartWithProducts();
  }

  refreshCartWithProducts(): void {
    this.carsingleton.productInCartChanges$.subscribe((data) => {
      this.productos = Array.isArray(data) ? [...data] : [];
    });
  }

  removeThisProduct(producto: any): void {
    if (!producto) return;
    this.carsingleton.removeProduct(producto);
  }

  private calculateAdicionesPrice(adiciones: any[]): number {
    if (!adiciones || !Array.isArray(adiciones)) return 0;
    return adiciones.reduce((total, adicion) => {
      const precio = adicion?.referencia?.precioTotal || 0;
      const cantidad = adicion?.cantidad || 0;
      return total + (precio * cantidad);
    }, 0);
  }

  private calculatePreferenciasPrice(preferencias: any[]): number {
    if (!preferencias || !Array.isArray(preferencias)) return 0;
    return preferencias.reduce((total, preferencia) => {
      const precio = preferencia?.precioTotalConIva || 0;
      return total + precio;
    }, 0);
  }

  private getProductPriceWithScale(producto: any): number {
    if (!producto?.producto?.precio) return 0;
    
    const preciosVolumen = producto.producto.precio.preciosVolumen;
    if (!preciosVolumen || preciosVolumen.length === 0) {
      return producto.producto.precio.precioUnitarioConIva || 0;
    }

    const cantidad = parseInt(producto.cantidad);
    const rangoActual = preciosVolumen.find(x =>
      cantidad >= x.numeroUnidadesInicial && cantidad <= x.numeroUnidadesLimite
    );

    return rangoActual?.valorUnitarioPorVolumenConIVA || producto.producto.precio.precioUnitarioConIva || 0;
  }

  getTotalProductPriceInCart(): number {
    if (!this.productos || this.productos.length === 0) return 0;

    return this.productos.reduce((total, producto) => {
      const precioBase = this.getProductPriceWithScale(producto);
      const precioAdiciones = this.calculateAdicionesPrice(producto.configuracion?.adiciones);
      const precioPreferencias = this.calculatePreferenciasPrice(producto.configuracion?.preferencias);
      const cantidad = parseInt(producto.cantidad) || 0;

      return total + ((precioBase + precioAdiciones + precioPreferencias) * cantidad);
    }, 0);
  }

  checkPriceScale(itemCarrito: any): number {
    if (!itemCarrito?.producto?.precio) return 0;
    return this.getProductPriceWithScale(itemCarrito);
  }

  checkAditionPrice(item: any): boolean {
    if (!item?.configuracion?.adiciones) return false;
    return item.configuracion.adiciones.some(adicion => 
      adicion?.referencia?.precioTotal > 0
    );
  }

  checkPreferencePrice(item: any): boolean {
    if (!item?.configuracion?.preferencias) return false;
    return item.configuracion.preferencias.some(preferencia => 
      preferencia?.precioTotalConIva > 0
    );
  }

  getTotalProductPriceWithDescountInCart(): number {
    const total = this.getTotalProductPriceInCart();
    return total - this.valorDescuento;
  }

  menosCantidad(itemCarrito: any): void {
    if (!itemCarrito || !itemCarrito.producto?.disponibilidad) return;

    const cantidadMinima = itemCarrito.producto.disponibilidad.cantidadMinVenta || 1;
    if (itemCarrito.cantidad > cantidadMinima) {
      itemCarrito.cantidad--;
      this.updateCartAndCheckPriceScale(itemCarrito);
    }
  }

  masCantidad(itemCarrito: any): void {
    if (!itemCarrito) return;
    itemCarrito.cantidad++;
    this.updateCartAndCheckPriceScale(itemCarrito);
  }

  private updateCartAndCheckPriceScale(itemCarrito: any): void {
    localStorage.setItem("carrito", JSON.stringify(this.productos));
    this.refreshCartWithProducts();

    const rangoActual = this.getCurrentPriceRange(itemCarrito);
    if (rangoActual?.numeroUnidadesInicial && 
        this.rangoPreciosActual1?.numeroUnidadesInicial !== rangoActual.numeroUnidadesInicial) {
      this.toastrService.show(
        '<p class="mb-0 mt-1">Cambio de rango de precio!</p>',
        '',
        { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 }
      );
      this.rangoPreciosActual1 = rangoActual;
    }
  }

  private getCurrentPriceRange(itemCarrito: any): any {
    if (!itemCarrito?.producto?.precio?.preciosVolumen) return null;
    return itemCarrito.producto.precio.preciosVolumen.find(x =>
      parseInt(itemCarrito.cantidad) >= x.numeroUnidadesInicial && 
      parseInt(itemCarrito.cantidad) <= x.numeroUnidadesLimite
    );
  }

  async validarCuponYAplica(): Promise<void> {
    if (!this.cupon) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor ingrese un código de cupón',
      });
      return;
    }

    this.service.validateCupon({ code: this.cupon }).subscribe({
      next: (value) => {
        if (!value || value.length === 0) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Cupón no válido',
          });
          return;
        }

        this.valorDescuento = 0;
        this.porcentajeDescuento = parseInt(value[0]?.valor) || 0;
        this.pedido.porceDescuento = this.porcentajeDescuento;
        this.valorDescuento = (this.getTotalProductPriceInCart() * this.porcentajeDescuento) / 100;
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al validar el cupón',
        });
      },
    });
  }
}
