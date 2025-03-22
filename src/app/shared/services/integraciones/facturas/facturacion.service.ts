import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseService } from '../../base.service';
import { Order } from '../../../models/integraciones/facturacion/siigo/facturasiigo';
import { Carrito, Pedido } from '../../../../components/ventas/modelo/pedido';
import { Pos } from 'jspdf-autotable';
import { POSPedido } from 'src/app/components/pos/pos-modelo/pedido';
@Injectable({ providedIn: 'root' })
export class FacturacionIntegracionService extends BaseService {
    constructor(private httpClient: HttpClient) {
        super(httpClient)
    }

    //siigo
    getFacturasSiigo() {
        return this.get('/v1/invoice/siigo/invoice/list')
    }

    createFacturaSiigo(orderSiigo: Order) {
        return this.post('/v1/invoice/siigo/invoice/create', orderSiigo)
    }



    //private 

    // este metodo aun esta incompleto falta revisar algunos id's y datos sean correctos
    transformarPedidoCompletoParaCrearUsuarioDesdeLaVenta(pedido: Pedido | POSPedido): Order {
        const order: Order = {
            document: { id: 27391 }, // el numero 27391 es de siigo
            date: pedido.fechaCreacion.substring(0, 10),
            customer: {
                person_type: "Person",
                id_type: "13",
                identification: pedido.facturacion.documento,
                branch_office: 0,
                name: [pedido.facturacion.nombres, " prueba"],
                address: {
                    address: pedido.facturacion.direccion,
                    city: {
                        country_code: "Co",
                        country_name: pedido.facturacion.pais,
                        state_code: this.getSiigoCodeState(pedido.facturacion.departamento),
                        state_name: pedido.facturacion.departamento,
                        city_code: this.getSiigoCodeCity(pedido.facturacion.ciudad),
                        city_name: pedido.facturacion.ciudad,
                    },
                    postal_code: pedido.facturacion.codigoPostal,
                },
                phones: [
                    {
                        indicative: pedido.facturacion.indicativoCel,
                        number: pedido.facturacion.celular,
                        extension: '',
                    },
                ],
            },
            // cost_center: 0,
            // currency: { code: 'COP', exchange_rate: 0 },
            seller: 329,
            stamp: { send: false },
            mail: { send: false },
            observations: "Prueba pedido katuq",
            items: pedido.carrito.map((item) => {
                return {
                    code: item.producto.identificacion.referencia,
                    description: item.producto.crearProducto.descripcion,
                    quantity: item.cantidad,
                    price: Number(item.producto.precio.precioUnitarioSinIva),
                    discount: 0,
                    taxes: [{
                        id: this.getTaxeByProduct(item)
                    }]
                }
            }),
            payments: [{
                id: 2940,
                value: pedido.totalPedididoConDescuento
            }]
        };

        if (Number(pedido.totalEnvio) > 0) {
            order.items.push({
                code: "ALM-001",
                description: "Domicilio",
                quantity: 1,
                price: Number(pedido.totalEnvio),
                discount: 0,
                taxes: [{
                    id: 6856
                }]
            });
        }


        return order;
    }


    getSiigoCodeState(departamento: string): string {
        switch (departamento) {
            case "Antioquia":
                return '05'
                break;

            default:
                break;
        }
    }
    getSiigoCodeCity(ciudad: string): string {
        switch (ciudad) {
            case "Medellín":
                return '05001'
                break;

            default:
                break;
        }
    }

    //metodo que inicialmente se va usar para facturar en SIIGO
    transformarPedidoLite(pedido: POSPedido | Pedido): Order {
        const order: Order = {
            document: { id: 27391 }, // el numero 27391 es de siigo
            date: pedido.fechaCreacion.substring(0, 10),  // el formato de la fecha debe ser yyyy-MM-dd
            customer: {
                identification: pedido.cliente.documento
            },
            seller: 329, //id del vendedor 
            stamp: { send: false },
            mail: { send: false },
            observations: 'Prueba desde katuq',
            items: pedido.carrito.map((item) => {
                return {
                    code: item.producto.identificacion.referencia,
                    description: item.producto.crearProducto.descripcion,
                    quantity: item.cantidad,
                    price: Number(item.producto.precio.precioUnitarioSinIva),
                    discount: 0,
                    taxes: [{
                        id: this.getTaxeByProduct(item)
                    }]
                }
            }),
            payments: [{
                id: 2940,
                value: pedido.totalPedididoConDescuento + (pedido.totalImpuesto + (pedido.totalEnvio * 0.19))
            }],
            additional_fields: {
                katuqOrder: pedido.nroPedido
            }
        };

        order.items.push({
            code: "ALM-001",
            description: "Domicilio",
            quantity: 1,
            price: Number(pedido.totalEnvio),
            discount: 0,
            taxes: [{
                id: 6856
            }]
        });
        // order.payments[0].value = order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        return order;
    }

    getTaxeByProduct(item: Carrito): any {
        switch (item.producto.precio.precioUnitarioIva) {
            case "19":
                return 6856;
            case "8":
                return -1;
            default:
                return 0;
        }
    }


}

