import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, forkJoin } from "rxjs";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import Swal from "sweetalert2";
import { parse } from "flatted";
import { Pedido } from "../modelo/pedido";
@Injectable({
    providedIn: "root",
})
export class PedidosUtilService {

    public maestrosPedidos: BehaviorSubject<any> = new BehaviorSubject([]);
    private productInCart: any;
    private empresaActual: any;
    private formaEntrega: any;
    private tiempoEntrega: any;
    private tipoEntrega: any;
    private ocasiones: any;
    private generos: any;
    private formasPago: any;
    private categorias: any;
    adiciones: any;

    constructor(private maestroService: MaestroService) {

        const user = localStorage.getItem('user');
        if(user){
            this.getAllMaestros();
        }

    }

    convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }) {
        if (!fechaEntrega) {
            return '';
        }
        return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
    }

    getAllMaestro$() {
        // Meter todas las variables privadas en un array
        let arrayPrivadas = {
            empresaActual: this.empresaActual,
            formaEntrega: this.formaEntrega,
            tiempoEntrega: this.tiempoEntrega,
            tipoEntrega: this.tipoEntrega,
            ocasiones: this.ocasiones,
            generos: this.generos,
            formasPago: this.formasPago,
            categorias: this.categorias,
            adiciones: this.adiciones
        };
        let hayUndefined = false;
        Object.values(arrayPrivadas).forEach(value => {
            if (value === undefined) {
                hayUndefined = true;
            }
        })

        if (hayUndefined) {
            this.getAllMaestros();
        }
        else {
            this.maestrosPedidos.next(arrayPrivadas);
        }

        return this.maestrosPedidos.asObservable();
    }
    //agregar producto al carrito
    addToCart(ProductoCompra: any) {
        let carrito: any = [];

        if (localStorage.getItem('carrito') == null) {
            let carrito: any = [];
            carrito.push(ProductoCompra);
            localStorage.setItem('carrito', JSON.stringify(carrito));
        }
        else {
            let carrito: any = JSON.parse(localStorage.getItem('carrito'));
            carrito.push(ProductoCompra);
            localStorage.setItem('carrito', JSON.stringify(carrito));
        }
        this.setProductInCart();
    }

    // setear productos en el carrito
    setProductInCart() {
        let products = JSON.parse(localStorage.getItem("carrito") || "[]");
        this.productInCart.next(products);
    }
    //remover producto
    removeProduct(producto: any) {
        let products = JSON.parse(localStorage.getItem("carrito") || "[]");
        const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
        if (index !== -1) {
            products.splice(index, 1);
            localStorage.setItem("carrito", JSON.stringify(products));
        }
        this.productInCart.next(products);
    }

    //limpiar carrito
    clearCart() {
        localStorage.removeItem("carrito");
        this.productInCart.next([]);
    }

    getAllMaestros() {

        this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany")!);

        forkJoin([
            this.maestroService.getFormaEntrega(),
            this.maestroService.getTiempoEntrega(),
            this.maestroService.getTipoEntrega(),
            this.maestroService.consultarOcasion(),
            this.maestroService.consultarGenero(),
            this.maestroService.consultarFormaPago(),
            this.maestroService.getCategorias(),
            this.maestroService.getAdiciones()
        ]).subscribe({
            next: (results: any[]) => {
                this.formaEntrega = results[0];
                this.tiempoEntrega = results[1];
                this.tipoEntrega = results[2];
                this.ocasiones = results[3];
                this.generos = results[4];
                this.formasPago = results[5];
                this.adiciones = results[7];
                this.categorias = parse((results[6] as any[])[0].categoria).map(p => {
                    return {
                        label: p.data.nombre,
                        data: p.data,
                        children: p.children.map(sub => {
                            return {
                                label: sub.data.nombre,
                                data: sub.data,
                                children: sub.children ? sub.children.map(sub2 => {
                                    return {
                                        label: sub2.data.nombre,
                                        data: sub2.data,
                                        children: sub2.children ? sub2.children.map(sub2 => {
                                            return {

                                            }
                                        }) : null
                                    }
                                }) : null
                            }
                        })
                    }
                });

                this.getAllMaestro$();

            },
            error: (error) => {
                Swal.fire({
                    title: 'Error!',
                    text: 'Error al cargar los datos' + error,
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            }
        });
    }


    //calcular valores del pedido
    pedido: Pedido;

    getSubtotal(): number {
        let totalPrecioSinIVA = 0;
        let totalPrecioSinIVADef = 0;
        if (this.pedido && this.pedido.carrito) {


            this.pedido.carrito.forEach((itemCarrito: any) => {
                if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
                    itemCarrito.producto.precio.preciosVolumen.map((x: any) => {
                        if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
                            totalPrecioSinIVA = x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
                        } else {
                            totalPrecioSinIVA = (itemCarrito.producto?.precio?.precioUnitarioSinIva) * itemCarrito.cantidad;
                        }

                    });
                } else {
                    totalPrecioSinIVA = (itemCarrito.producto?.precio?.precioUnitarioSinIva) * itemCarrito.cantidad;
                }
                // Sumar precios de adiciones
                if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
                    itemCarrito.configuracion.adiciones.forEach(adicion => {
                        totalPrecioSinIVA += (adicion['cantidad'] * adicion['referencia']['precioUnitario']) * itemCarrito.cantidad;
                    });
                }

                // Sumar precios de preferencias
                if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
                    itemCarrito.configuracion.preferencias.forEach(preferencia => {
                        totalPrecioSinIVA += (preferencia['valorUnitarioSinIva']) * itemCarrito.cantidad;
                    });
                }
                totalPrecioSinIVADef += totalPrecioSinIVA
            });


        }
        return totalPrecioSinIVADef;
    }
    checkIVAPrice() {
        let totalPrecioIVA = 0;

        this.pedido.carrito?.forEach((itemCarrito: any) => {
            if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
                itemCarrito.producto.precio.preciosVolumen.forEach(x => {
                    if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
                        totalPrecioIVA += x.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
                    }
                });
            } else {
                totalPrecioIVA += (itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad;
            }
            // Sumar precios de adiciones
            if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
                itemCarrito.configuracion.adiciones.forEach(adicion => {
                    totalPrecioIVA += (adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad;
                });
            }

            // Sumar precios de preferencias
            if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
                itemCarrito.configuracion.preferencias.forEach(preferencia => {
                    totalPrecioIVA += preferencia['valorIva'] * itemCarrito.cantidad;;
                });
            }
        });

        return totalPrecioIVA;
    }

    getTotalToPay(shipinCost: number): number {
        return (this.getSubtotal() + shipinCost) - this.getDiscount();
    }

    getShippingCost(allBillingZone): number {
        if (this.pedido && this.pedido.envio?.zonaCobro && this.pedido.envio?.ciudad) {

            const valorFlete = allBillingZone.filter((item => item.ciudad === this.pedido.envio?.ciudad && item.nombreZonaCobro === this.pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].valorZonaCobro;
            else
                return 0;
        }
        return 0;
    }
    getShippingTaxCost(allBillingZone): number {
        if (this.pedido && this.pedido.envio?.zonaCobro && this.pedido.envio?.ciudad) {

            const valorFlete = allBillingZone.filter((item => item.ciudad === this.pedido.envio?.ciudad && item.nombreZonaCobro === this.pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuesto;
            else
                return 0;
        }
        return 0;
    }
    getShippingTaxCostInvoice(allBillingZone, pedido): number {
        if (pedido && pedido.envio?.zonaCobro && pedido.envio?.ciudad) {

            const valorFlete = allBillingZone.filter((item => item.ciudad === pedido.envio?.ciudad && item.nombreZonaCobro === pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuesto;
            else
                return 0;
        }
        return 0;
    }
    getShippingTaxValue(allBillingZone): string {
        if (this.pedido && this.pedido.envio?.zonaCobro && this.pedido.envio?.ciudad) {

            const valorFlete = allBillingZone.filter((item => item.ciudad === this.pedido.envio?.ciudad && item.nombreZonaCobro === this.pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuestoZonaCobro;
            else
                return "";
        }
        return "";
    }

    getShippingTaxValueInvoice(allBillingZone, pedido): string {
        if (pedido && pedido.envio?.zonaCobro && pedido.envio?.ciudad) {

            const valorFlete = allBillingZone.filter((item => item.ciudad === pedido.envio?.ciudad && item.nombreZonaCobro === pedido.envio?.zonaCobro))
            if (valorFlete.length > 0)
                return valorFlete[0].impuestoZonaCobro;
            else
                return "";
        }
        return "";
    }



    getDiscount(): number {
        if (this.pedido && this.pedido.porceDescuento) {
            return this.getSubtotal() * ((this.pedido.porceDescuento) / 100);
        }
        return 0;
    }


}
