import {   Component, Input, OnInit } from "@angular/core";
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

  productos: any;
  cupon: any;
  valorDescuento: any = 0;
  porcentajeDescuento: any = 0;

  @Input()
  public pedido: Pedido;
  rangoPreciosActual1: any;
  precioproducto: any;
  preciosAdiciones: any;
  preciosPreferencias: any;

  constructor(private carsingleton: CartSingletonService, private service: VentasService, private toastrService: ToastrService) { }
  
  ngOnInit(): void {
    this.refreshCartWithProducts();
  }

  refreshCartWithProducts(): void {
    // this.carsingleton.setProductInCart();
    this.carsingleton.productInCartChanges$.subscribe((data) => {
      this.productos = data;
      this.productos = [...this.productos];
    });
  }
  

  removeThisProduct(producto: any) {
    this.carsingleton.removeProduct(producto);
    // this.refreshCartWithProducts();
  }
  getTotalProductPriceInCart() {
    let total = 0;
    this.productos.forEach((producto: any) => {
      const preciosAdiciones = producto.configuracion.adiciones.reduce((acumulador1, producto) => {
        return acumulador1 + (producto.referencia.precioTotal * producto.cantidad);
      }, 0);
      const preciosPreferencias = producto.configuracion.preferencias.reduce((acumulador2, producto) => {
        return acumulador2 + producto.precioTotalConIva;
      }, 0);
      let precioproducto = producto.producto?.precio?.precioUnitarioConIva;
      if (producto.producto.precio.preciosVolumen.length > 0 ) {
        const rangoActual = producto.producto.precio.preciosVolumen.find(x =>
          parseInt(producto.cantidad) >= x.numeroUnidadesInicial && parseInt(producto.cantidad) <= x.numeroUnidadesLimite
        );
        if (rangoActual) {
          precioproducto = rangoActual.valorUnitarioPorVolumenConIVA;
        }
      }
      total += (precioproducto + preciosAdiciones + preciosPreferencias) * producto.cantidad;
    });

    return total;
  }

  // Método para calcular el subtotal del carrito
  calcularSubtotal(): number {
    return this.getTotalProductPriceInCart();
  }

  // Método para calcular el IVA (19%)
  calcularIVA(): number {
    const subtotal = this.calcularSubtotal();
    return subtotal * 0.19;
  }

  // Método para calcular el costo de envío
  calcularEnvio(): number {
    // Por defecto el valor de envío es 0, se puede modificar según la lógica del negocio
    return 0;
  }

  // Método para calcular el total (subtotal + IVA + envío - descuento)
  calcularTotal(): number {
    const subtotal = this.calcularSubtotal();
    const iva = this.calcularIVA();
    const envio = this.calcularEnvio();
    return subtotal + iva + envio - this.valorDescuento;
  }

  checkPriceScale(itemCarrito: any) {
    if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
      const rangoActual = itemCarrito.producto.precio.preciosVolumen.find(x =>
        parseInt(itemCarrito.cantidad) >= x.numeroUnidadesInicial && parseInt(itemCarrito.cantidad) <= x.numeroUnidadesLimite
      );
      if (rangoActual) {
        return rangoActual.valorUnitarioPorVolumenConIVA;
      }
    }
    return itemCarrito.producto?.precio?.precioUnitarioConIva;
  }

  checkAditionPrice(item){
    return item.configuracion?.adiciones.some(adicion => adicion.precioTotalConIva !== 0)
  }
  checkPreferencePrice(item){
    return item.configuracion?.preferencias.some(adicion => adicion.precioTotalConIva !== 0)
  }
  getTotalProductPriceWithDescountInCart() {
    let total = 0;
    this.productos.forEach((producto: any) => {
      this.preciosAdiciones = producto.configuracion.adiciones.reduce((acumulador1, producto) => {
        return acumulador1 + (producto.referencia.precioTotal * producto.cantidad);
      }, 0);
      this.preciosPreferencias = producto.configuracion.preferencias.reduce((acumulador2, producto) => {
        return acumulador2 + producto.precioTotalConIva;
      }, 0);
      if (producto.producto.precio.preciosVolumen.length > 0) {
        producto.producto.precio.preciosVolumen.map(x => {
          if (parseInt(producto.cantidad) >= x.numeroUnidadesInicial && parseInt(producto.cantidad) <= x.numeroUnidadesLimite) {
            this.precioproducto = x.valorUnitarioPorVolumenConIVA

          }else{
            this.precioproducto = producto.producto?.precio?.precioUnitarioConIva
          }
        })
      } else {
        this.precioproducto = producto.producto?.precio?.precioUnitarioConIva
      }
      total += (this.precioproducto + this.preciosAdiciones + this.preciosPreferencias) * producto.cantidad;
    });

    return total - this.valorDescuento;
  }

  menosCantidad(itemCarrito: any) {
    if (itemCarrito.cantidad > itemCarrito?.producto?.disponibilidad?.cantidadMinVenta) {
      itemCarrito.cantidad--;
      localStorage.setItem("carrito", JSON.stringify(this.productos));
      // this.carsingleton.setProductInCart();

      this.refreshCartWithProducts();
      const rangoActual = itemCarrito.producto.precio.preciosVolumen.find(x =>
        itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite
      );
      if (rangoActual.numeroUnidadesInicial && this.rangoPreciosActual1?.numeroUnidadesInicial != rangoActual.numeroUnidadesInicial) {
        this.toastrService.show('<p class="mb-0 mt-1">Cambio Rango de precio!</p>', '', { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 });

        // Actualizar el rango de precios actual
        this.rangoPreciosActual1 = rangoActual;
      }

     


    }
  }
  
  masCantidad(producto: any) {
    producto.cantidad++;
    localStorage.setItem("carrito", JSON.stringify(this.productos));
    // this.carsingleton.setProductInCart();
    this.refreshCartWithProducts();
    const rangoActual = producto.producto.precio.preciosVolumen.find(x =>
      producto.cantidad >= x.numeroUnidadesInicial && producto.cantidad <= x.numeroUnidadesLimite
    );
    if (rangoActual.numeroUnidadesInicial && this.rangoPreciosActual1?.numeroUnidadesInicial !== rangoActual.numeroUnidadesInicial) {
      this.toastrService.show('<p class="mb-0 mt-1">Cambio rango de precio!</p>', '', { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 });

      // Actualizar el rango de precios actual
      this.rangoPreciosActual1 = rangoActual;
    }
  }

  async validarCuponYAplica() {
    const context = this
    this.service.validateCupon({ code: this.cupon }).subscribe({
      next(value) {
        if (value.lenght == 0) {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Cupon no valido',
          })
          return;
        }

        context.valorDescuento = 0;
        context.porcentajeDescuento = parseInt(value[0]?.valor);
        context.pedido.porceDescuento = context.porcentajeDescuento;
        context.valorDescuento = context.getTotalProductPriceInCart() * context.porcentajeDescuento / 100;
      },
      error(err) {
        Swal.fire({

        })
      },
    })
  }

  getAdiciones(item: any): string {
    if (!item?.configuracion?.adiciones) return '';
    return item.configuracion.adiciones
      .map((a: any) => a.referencia?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  getPreferencias(item: any): string {
    if (!item?.configuracion?.preferencias) return '';
    return item.configuracion.preferencias
      .map((p: any) => p.nombre)
      .filter(Boolean)
      .join(', ');
  }

  editarNota(item: any) {
    const nuevaNota = prompt('Edita la nota del producto:', item.notas);
    if (nuevaNota !== null) {
      item.notas = nuevaNota;
      // Aquí podrías agregar lógica adicional como guardar en localStorage o actualizar en el backend
    }
  }

  // Método para agregar nota de producción
  agregarNotaProduccion(itemCarrito: any) {
    // Preparar las notas existentes
    const notasExistentes = itemCarrito.notaProduccion || [];

    // Crear el contenido HTML para las notas existentes
    const notasHtml = notasExistentes.length > 0 
      ? notasExistentes.map((nota, index) => 
          `<div class="nota-existente">
            <strong>Nota ${index + 1}:</strong> 
            <span>${nota.nota}</span>
            <small class="text-muted ml-2">(${new Date(nota.fecha).toLocaleString()})</small>
          </div>`
        ).join('')
      : '<p class="text-muted">No hay notas de producción existentes.</p>';

    Swal.fire({
      title: 'Notas de Producción',
      html: `
        <div class="notas-existentes mb-3">
          <h5>Notas Existentes:</h5>
          ${notasHtml}
        </div>
        <div class="nueva-nota">
          <h5>Agregar Nueva Nota:</h5>
          <textarea id="nuevaNota" class="form-control" placeholder="Escriba su nota de producción aquí..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Nota',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const nuevaNota = (document.getElementById('nuevaNota') as HTMLTextAreaElement).value;
        return nuevaNota ? nuevaNota : null;
      },
      didOpen: () => {
        const textarea = document.getElementById('nuevaNota') as HTMLTextAreaElement;
        textarea.focus();
      },
      inputValidator: (value) => {
        return !value ? 'Necesitas escribir una nota' : null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        // Verificar si el producto tiene un array de notas de producción
        if (!itemCarrito.notaProduccion) {
          itemCarrito.notaProduccion = [];
        }

        // Agregar la nueva nota
        itemCarrito.notaProduccion.push({
          nota: result.value,
          fecha: new Date().toISOString()
        });

        // Actualizar el carrito en localStorage
        localStorage.setItem('carrito', JSON.stringify(this.productos));
        
        // Refrescar el carrito
        this.refreshCartWithProducts();

        // Mostrar mensaje de éxito
        this.toastrService.success('Nota de producción agregada', 'Éxito');
      }
    });
  }

}
