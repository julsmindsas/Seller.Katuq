import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
import { DatePipe } from '@angular/common'
import { PedidosUtilService } from 'src/app/components/ventas/service/pedidos.util.service';
import { MaestroService } from "src/app/shared/services/maestros/maestro.service";
import { POSPedido } from 'src/app/components/pos/pos-modelo/pedido';
import { Pedido, Fecha } from '../../../components/ventas/modelo/pedido';

declare var WidgetCheckout: any;

@Injectable({
  providedIn: 'root'
})
export class PaymentService extends BaseService {
  generos: any;
  ocasiones: any;
  allBillingZone: any;

  constructor(private service: MaestroService, private pedidoUtilService: PedidosUtilService, httpClient: HttpClient, private sanitizer: DomSanitizer) {
    super(httpClient);
    const context = this;
    this.service.getBillingZone().subscribe({
      next(value: any) {
        context.allBillingZone = value;
        sessionStorage.setItem('allBillingZone', JSON.stringify(context.allBillingZone))

      },
      error(err) {
        console.log(err);
      },
    })
  }


  public getPaymentMethods() {
    return this.get('payment-methods');
  }

  private loginEpayco() {
    return this.get('login-epayco');
  }



  public async pauymentWompi(pedido: Pedido) {
    if (!pedido) return;

    const totalCalculado1 = this.checkPriceScale(pedido) * 100;
    const publicKey = environment.wompi.public_key;
    const redirectURL = environment.wompi.redirectURL;
    var checkout = new WidgetCheckout({
      currency: 'COP',
      amountInCents: totalCalculado1,
      reference: pedido.referencia.toString(),
      publicKey: publicKey,
      signature: {
        integrity: pedido?.pagoInformation?.integridad
      },
      redirectUrl: redirectURL // Opcional
    });

    var _this = this;

    // checkout.open(function (result: any) {
    //   var transaction = result.transaction

    //   _this.isLoading = false;

    //   setTimeout(function () {
    //     if (transaction.status === 'APPROVED') {
    //       _this.cartService.removeAllCartItems();
    //       _this.service.deleteVariable('pedido');

    //       _this.service.publishSomeData({
    //         ev: 'add'
    //       });

    //       _this.submitted = false;
    //       _this.limpiarDatos();
    //     }
    //     _this.router.navigateByUrl('/pago?id=' + transaction.id, { replaceUrl: true });

    //     // _this.todoForm.patchValue({
    //     //     recap2: ''
    //     // });

    //     _this.cartService.removeAllCartItems();

    //   }, 100);

    // });
  }

  // se debe pasar esto al lado del backend
  private async wompiHasKey(cadenaConcatenada: string) {
    // var cadenaConcatenada = "sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6"
    //Ejemplo
    const encondedText = new TextEncoder().encode(cadenaConcatenada);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encondedText);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5"
    return hashHex;


  }

  formatCurrency(value: number): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
    return formatter.format(value);
  }
  formatearFecha(fecha: string): string {

    const date = new Date(fecha); // Cambiar 'es-ES' al locale que necesites
    const datePipe = new DatePipe('es-ES');
    const isoDateString = date.toISOString();
    return datePipe.transform(isoDateString, 'YYYY/MM/dd'); // Ajustar el formato de fecha
  }
  checkPriceScale(pedido) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0
    pedido.carrito.forEach(itemCarrito => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.forEach(x => {
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

    return totalPrecioSinIVADef;
  }
  checkIVAPrice(pedido) {
    this.allBillingZone = JSON.parse(sessionStorage.getItem('allBillingZone'))
    let totalPrecioIVA = 0;
    let totalPrecioIVADef = 0;
    let totalExcluidosDef = 0
    let totalIva5Def = 0
    let totalImpoDef = 0
    let totalIva19Def = 0
    let totalExcluidos = 0
    let totalIva5 = 0
    let totalImpo = 0
    let totalIva19 = 0
    pedido.carrito.forEach(itemCarrito => {
      //sumar precios productos
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.forEach(x => {
          totalExcluidos = 0
          totalIva5 = 0
          totalImpo = 0
          totalIva19 = 0

          if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
            totalPrecioIVA = x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
            switch (x.valorIVAPorVolumen.toString()) {
              case "0":
                totalExcluidos = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
                break
              case "5":
                totalIva5 = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
                break
              case "8":
                totalImpo = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
                break
              case "19":
                totalIva19 = (x.valorUnitarioPorVolumenIva * itemCarrito.cantidad - ((x.valorUnitarioPorVolumenIva * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
                break
              default:
                break
            }
          } else {
            totalPrecioIVA = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
            switch (x.valorIVAPorVolumen.toString()) {
              case "0":
                totalExcluidos = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
                break
              case "5":
                totalIva5 = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
                break
              case "8":
                totalImpo = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
                break
              case "19":
                totalIva19 = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
                break
              default:
                break
            }
          }
        });
      } else {
        totalPrecioIVA = ((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
        switch (itemCarrito.producto?.precio?.precioUnitarioIva) {
          case "0":
            totalExcluidos = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
            break
          case "5":
            totalIva5 = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
            break
          case "8":
            totalImpo = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
            break
          case "19":
            totalIva19 = (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) - (((itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100)));
            break
          default:
            break
        }
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach(adicion => {
          totalPrecioIVA += ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
          switch (adicion.porcentajeIva.toString()) {
            case "0":
              totalExcluidos = totalExcluidos + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            case "5":
              totalIva5 = totalIva5 + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            case "8":
              totalImpo = totalImpo + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            case "19":
              totalIva19 = totalIva19 + ((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) - (((adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            default:
              break
          }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(preferencia => {
          totalPrecioIVA += (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
          switch (preferencia.porcentajeIva) {
            case "0":
              totalExcluidos = totalExcluidos + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            case "5":
              totalIva5 = totalIva5 + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            case "8":
              totalImpo = totalImpo + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            case "19":
              totalIva19 = totalIva19 + (preferencia['valorIva'] * itemCarrito.cantidad) - ((preferencia['valorIva'] * itemCarrito.cantidad) * (pedido.porceDescuento ?? 0 / 100));
              break
            default:
              break
          }
        });
      }
      // sumarprecio impuesto domicilio


      totalPrecioIVADef += totalPrecioIVA
      totalExcluidosDef += totalExcluidos
      totalIva5Def += totalIva5
      totalImpoDef += totalImpo
      totalIva19Def += totalIva19
    });
    switch (this.pedidoUtilService.getShippingTaxValueInvoice(this.allBillingZone, pedido)) {
      case "0":
        totalExcluidosDef = totalExcluidosDef + this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido);
        break
      case "5":
        totalIva5Def = totalIva5Def + this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido);
        break
      case "8":
        totalImpoDef = totalImpoDef + this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido);
        break
      case "19":
        totalIva19Def = totalIva19Def + this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido);
        break
      default:
        break
    }
    return {
      totalPrecioIVADef: totalPrecioIVADef,
      totalExcluidos: totalExcluidosDef,
      totalIva5: totalIva5Def,
      totalImpo: totalImpoDef,
      totalIva19: totalIva19Def
    };
  }


  obtenerFechaHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1; // getMonth() devuelve un índice basado en cero, por lo que +1
    const dia = hoy.getDate();

    const hours = hoy.getHours();
    const minutes = hoy.getMinutes();

    // Añade un cero delante si el mes, día, horas o minutos son menores a 10
    const formattedMonth = mes < 10 ? `0${mes}` : mes;
    const formattedDay = dia < 10 ? `0${dia}` : dia;
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${anio}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}`;
  }
  getHtmlContent(pedido: Pedido, isComanda: boolean = false): any {
    pedido.carrito.forEach(x => {
      this.pedidoUtilService.getAllMaestro$().subscribe((r: any) => {
        if (x.configuracion?.datosEntrega) {
          this.generos = r.generos?.find((p) => x.configuracion?.datosEntrega.genero == p.id);
          console.log(this.generos)
          this.ocasiones = r.ocasiones?.find((p) => x.configuracion?.datosEntrega.ocasion == p.id);
        }
      })

    })
    let carritoHtml = '';
    let notasProduccion = ''
    let notasDespachos = ''
    let notasEntregas = ''
    let notasFacturacionPagos = ''
    let tarjetaNo = 0
    let index = 0;

    pedido.totalImpuesto = 0;

    for (const item6 of pedido.carrito) {
      notasProduccion += `
        <tr>
        <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">Producto ${item6?.producto?.crearProducto?.titulo}</td>
        <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.obtenerFechaHoy()}</td>
          <td style="border: 1px solid #ddd; padding: 8px;width: 100%">${item6.notaProduccion}</td>
          
          
        </tr>
      `;
      index++;
    }

    for (const item1 of pedido?.notasPedido?.notasDespachos) {
      notasDespachos += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(item1.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%">${item1.nota}</td>
          
        </tr>
      `;
    }
    for (const item2 of pedido?.notasPedido?.notasEntregas) {
      notasEntregas += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(item2.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%">${item2.nota}</td>
          
        </tr>
      `;
    }
    for (const item3 of pedido?.notasPedido?.notasFacturacionPagos) {
      notasFacturacionPagos += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(item3.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${item3.nota}</td>
          
        </tr>
      `;
    }


    for (const item of pedido.carrito) {
      // Sección principal del Carrito
      carritoHtml += `
      <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Imagen</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Producto</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Referencia</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Cantidad</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Precio Unitario Sin IVA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Porcentaje IVA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Valor IVA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Precio Unitario Total (Con IVA)</th>
                <!-- Más cabeceras si es necesario -->
            </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${item.producto.crearProducto.imagenesPrincipales[0].urls}"
                   alt="${item.producto.crearProducto.titulo}" style="width: 100px; height: auto;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.producto.crearProducto.titulo}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.producto.identificacion.referencia}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.cantidad}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(item.producto.precio.precioUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.producto.precio.precioUnitarioIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(item.producto.precio.valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(item.producto.precio.precioUnitarioConIva)}</td>
        </tr>
      `;
      pedido.totalImpuesto += item.producto.precio.valorIva;
      // Preferencias como subitems
      if (item.configuracion && item.configuracion.preferencias && item.configuracion.preferencias.length > 0) {
        carritoHtml += `<tr style="background-color: #f9f9f9;">
        <td><span style="color:black;">Preferencias</span></td>
        </tr> `
        for (const pref of item.configuracion.preferencias) {
          carritoHtml += `
        
        <tr style="background-color: #f9f9f9;">
          <td></td> <!-- Celda vacía para la indentación -->
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${pref.imagen}" alt="Preferencia" style="width: 50px; height: auto;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">Preferencia: ${pref.titulo}:${pref.subtitulo} </td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(pref.valorUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${pref.porcentajeIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(pref.valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(pref.precioTotalConIva)}</td>
        </tr>
      `;
          pedido.totalImpuesto += pref.valorIva;
        }
      }

      // Adiciones como subitems
      if (item.configuracion && item.configuracion.adiciones && item.configuracion.adiciones.length > 0) {
        carritoHtml += `<tr style="background-color: #f9f9f9;">
        <td><span style="color:black;">Adiciones</span></td>
      </tr>`
        for (const adic of item.configuracion.adiciones) {
          carritoHtml += `
        
        <tr style="background-color: #f9f9f9;">
          <td></td> <!-- Celda vacía para la indentación -->
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${adic.imagen}" alt="Adición" style="width: 50px; height: auto;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">Adición: ${adic.titulo}: ${adic.subtitulo}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(adic.valorUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${adic.porcentajeIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(adic.valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(adic.precioTotalConIva)}</td>
        </tr>
      `;
          pedido.totalImpuesto += adic.valorIva;
        }
      }

      // Detalles de Entrega (Ocasión y Género) como un item
      if (item.configuracion && item.configuracion.datosEntrega) {
        const generos = this.generos?.name;
        const ocasion = this.ocasiones?.name;
        const observaciones = item.configuracion.datosEntrega.observaciones;
        carritoHtml += `
       
        <tr><td><h6><span style="color:black;">Observaciones</span></h6></td></tr>
        <tr>
        <td colspan="7" style="border: 1px solid #ddd; padding: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
        
        
          <thead>
        
        <tr style="background-color: #f9f9f9;">
          <th  style="border: 1px solid #ddd; padding: 8px;width:25%;">Ocasion</th>
          <th style="border: 1px solid #ddd; padding: 8px;width:25%;">Genero</th>
          <th  colspan="5" style="border: 1px solid #ddd; padding: 8px;width: 50%;">Observaciones</th>
        </tr>
        </thead>
        <tbody>
      <tr style="background-color: #f9f9f9;">
        <td style="border: 1px solid #ddd; padding: 8px;width:25%;">${ocasion}</td>
        <td style="border: 1px solid #ddd; padding: 8px;width:25%;">${generos}</td>
        <td colspan="5" style="border: 1px solid #ddd; padding: 8px;width: 50%;">${observaciones}</td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
    `;


      }

      // Tarjetas como items
      if (item.configuracion && item.configuracion.tarjetas && item.configuracion) {
        for (const tarjeta of item.configuracion.tarjetas) {
          if (tarjeta.mensaje) {
            tarjetaNo++
            carritoHtml += `
            <tr style="background-color: #f9f9f9;">
            <td><span style="color:black;">Tarjeta ${tarjetaNo}</span></td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td></td> <!-- Celda vacía para la indentación -->
            <td  style="border: 1px solid #ddd; padding: 8px;">Para: ${tarjeta.para}</td>
            <td colspan="5" style="border: 1px solid #ddd; padding: 8px;">Mensaje: ${tarjeta.mensaje}</td>
            <td  style="border: 1px solid #ddd; padding: 8px;">De: ${tarjeta.de}</td>
  
          </tr>
        `;
          }

        }
      }
    }

    //secciones segun la comanda
    const cuerpodelcorreo = `
    <div style="width: 80%; margin: auto; overflow: hidden;">
        
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #444; margin-bottom: 10px;">Datos del Cliente</h2>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Tipo de Documento: ${pedido?.cliente.tipo_documento_comprador}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Documento: ${pedido?.cliente?.documento}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres Completos: ${pedido?.cliente?.nombres_completos}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres Completos: ${pedido?.cliente?.apellidos_completos}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Número de Celular: ${'(' + pedido?.cliente.indicativo_celular_comprador + ') ' + pedido.cliente.numero_celular_comprador}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Número de Whatsapp: ${'(' + pedido?.cliente.indicativo_celular_whatsapp + ') ' + pedido.cliente.numero_celular_whatsapp}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Estado Cliente: ${pedido?.cliente.estado}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Correo Electrónico: ${pedido?.cliente.correo_electronico_comprador}</p>

    </div>
    `

    const seccionFacturacionElectronica = `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos de Facturación Electrónica</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres: ${pedido?.facturacion?.nombres}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Tipo de Documento: ${pedido.facturacion.tipoDocumento}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Documento: ${pedido?.facturacion?.documento}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">País: ${pedido?.facturacion?.pais}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Departamento: ${pedido?.facturacion?.departamento}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Ciudad: ${pedido?.facturacion?.ciudad}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Código Postal: ${pedido.facturacion.codigoPostal}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Celular: ${'(' + pedido?.facturacion?.indicativoCel + ') ' + pedido?.facturacion?.celular}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Dirección: ${pedido?.facturacion.direccion}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Referencia de Datos: ${pedido?.facturacion?.alias}</p>
    </div>
    `
    const seccionDatosCliente = `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #444; margin-bottom: 10px;">Datos de Envío</h2>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres: ${pedido?.envio?.nombres}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Apellidos: ${pedido?.envio?.apellidos}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Referencia de Datos: ${pedido?.envio?.alias}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Dirección de Entrega: ${pedido?.envio?.direccionEntrega}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombre de Unidad: ${pedido?.envio?.nombreUnidad}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Especificaciones Internas: ${pedido?.envio?.especificacionesInternas}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Departamento: ${pedido?.envio?.departamento}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Ciudad: ${pedido?.envio?.ciudad}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Barrio: ${pedido?.envio?.barrio}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Código Postal:: ${pedido?.envio?.codigoPV}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Celular: ${'(' + pedido?.envio?.indicativoCel + ') ' + pedido?.envio?.celular}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Otro Numero: ${'(' + pedido?.envio?.indicativoOtroNumero + ') ' + pedido?.envio?.otroNumero}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 50px;">Zona: ${pedido?.envio?.zonaCobro}</p>
      <!-- Más campos de datos de entrega si son necesarios -->
    </div>
    `

    const seccionNotasDespachos = `
      <div style="width: 80%; margin: auto; overflow: hidden;">
      <h2>Notas Despachos</h2>
          <table style="width: 100%; border-collapse: collapse;">
              <thead>
                  <tr>
                      <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                      <th style="border: 1px solid #ddd; padding: 8px;">Nota</th>
              
                      <!-- Más cabeceras si es necesario -->
                  </tr>
              </thead>
              <tbody>
                  ${notasDespachos} <!-- Asegúrate de que carritoHtml también use estilos en línea -->
              </tbody>
          </table>
      </div>
      `
    const seccionNotasEntregas = `
    <div style="width: 80%; margin: auto; overflow: hidden;">
<h2>Notas Entregas</h2>
<table style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Nota</th>
        
                <!-- Más cabeceras si es necesario -->
            </tr>
        </thead>
        <tbody>
            ${notasEntregas} <!-- Asegúrate de que carritoHtml también use estilos en línea -->
        </tbody>
    </table>
</div>
    `

    const seccionNotasFacturacionPagos = `
    <div style="width: 80%; margin: auto; overflow: hidden;">
<h2>Notas Facturación y Pagos</h2>
<table style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Nota</th>
        
                <!-- Más cabeceras si es necesario -->
            </tr>
        </thead>
        <tbody>
            ${notasFacturacionPagos} <!-- Asegúrate de que carritoHtml también use estilos en línea -->
        </tbody>
    </table>
</div>
    `

    const seccionGestionPedido = `

    <div style="width: 80%; margin: auto; overflow: hidden;">
    <br><br>
    <h2>Gestión</h2>
    <table style="width: 100%; border-collapse: collapse;">
    <tbody>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Aprobar la compra
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Pagar
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Rastrear mi compra
                </a>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Cambios a mi pedido
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Quiero Felicitarlos
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Presentar una PQRS
                </a>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Hablar con un asesor
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Observaciones de tu Compra
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Terminos y Condiciones 
                </a>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Cargar comprobante
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Descargar factura
                </a>
            </td>
        </tr>
    </tbody>




    </table>
      </tr>
            </table>
          </td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            

    </div>
    `

    const textoEncabezado = !isComanda ? `¡Tu pedido ha sido registrado con éxito!` : `Orden Pedido Nro: ${pedido.nroPedido}`;
    const linkReferenciaPedido = `<a href="${window.location.origin}/ventas/pedidos?nroPedido=${pedido.nroPedido}"><p>Referencia del Pedido: ${pedido.nroPedido}</p></a>`

    const subtotal = this.checkPriceScale(pedido);
    const totalIVA = this.checkIVAPrice(pedido).totalPrecioIVADef + this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido);
    const descuentos = pedido.totalDescuento;
    const envio = pedido.totalEnvio;
    const excluidos = this.checkIVAPrice(pedido).totalExcluidos
    const totalIva5 = this.checkIVAPrice(pedido).totalIva5
    const totalImpo = this.checkIVAPrice(pedido).totalImpo
    const totalIva19 = this.checkIVAPrice(pedido).totalIva19
    const totalPagar = envio - descuentos + subtotal + totalIVA;
    const empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');
    const encabezadoUrl = empresaActual.imageEmail?.encabezado || '';
    const pieDePaginaUrl = empresaActual.imageEmail?.piepagina || '';
    const imgPublicidad = "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Empresas%2FJulsmind%2Fimagenes%2FEmail%2FPublicidad%2FContactanos.png?alt=media&token=5df01a71-6869-40cb-a4c4-d2a2675c1a0f"; // 'https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/assets%2Fimages%2Fecommerce%2Fpublicidad-pedido.png?alt=media&token=3b9b8b9a-9b9a-4b9e-9b9a-9b9a9b9a9b9a';


    const seccionTotales = `
    <!-- Sección de Totales Generales del Pedido -->
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #444; margin-bottom: 10px;">Totales del Pedido</h2>
    <table style="width: 100%; border-collapse: collapse;">
        <tfoot>
          
            
              <tr>
              <th style="border: 1px solid #ddd; padding: 8px;">Costo de Productos:</th>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(subtotal)}</td>
          </tr>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Domicilio:</th>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(envio)}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Descuentos:</th>
                <td style="border: 1px solid #ddd; padding: 8px;">-${this.formatCurrency(descuentos)}</td>
            </tr>
            <tr>
            <th style="border: 1px solid #ddd; padding: 8px;">Total sin IVA:</th>
            <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(envio - descuentos + subtotal)}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Total IVA:</th>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(totalIVA)}</td>
            </tr>
              <tr>
              
                    <th class="title">Excluidos 0%:</th>
                    <td class="value">${this.formatCurrency(excluidos)}</td>
                  </tr>
                  <tr>
                    <th class="title">Iva 5%:</th>
                    <td class="value">${this.formatCurrency(totalIva5)}</td>
                  </tr>
                  <tr>
                    <th class="title">Impoconsumo 8%:</th>
                    <td class="value">${this.formatCurrency(totalImpo)}</td>
                  </tr>
                  <tr>
                    <th class="title">Iva 19%:</th>
                    <td class="value">${this.formatCurrency(totalIva19)}</td>
                  </tr>
                
           
           
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Total a Pagar:</th>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>${this.formatCurrency(totalPagar)}</strong></td>
            </tr>
        </tfoot>
    </table>
</div>
    ` ;

    const htmlString = `
    <div style="text-align: center;">
        <img src="${encabezadoUrl}" alt="Encabezado" id="Encabezado" style="width: 85%; height: auto;">
    </div>
    <div style="text-align: center; font-size: 3rem; /* Puedes añadir más estilos aquí */">
    <h1>${textoEncabezado}</h1>
    ${!isComanda ? linkReferenciaPedido : ''}
    <p>Gracias por elegirnos.</p>
    <p>Estamos trabajando en tu pedido y te mantendremos informado sobre cualquier novedad</p>
    <!-- <img src="https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/assets%2Fimages%2Fecommerce%2Fsuccess-svgrepo-com.svg?alt=media&token=21bfe103-b0e3-49a8-b758-ce6245ee43e0" style="width: 10%; height: 10%;" alt="confirm"> -->
    </div>


    <!-- Contenido del cuerpo del correo -->
    ${!isComanda ? cuerpodelcorreo : ''}
    <!-- Más campos del cliente -->


    <!-- Sección de Datos de Facturación Electrónica -->
    ${!isComanda ? seccionFacturacionElectronica : ''}      
    <!-- Más detalles de facturación -->

    <!-- Sección de Datos del Cliente -->
    ${!isComanda ? seccionDatosCliente : ''}

    <!-- Sección de Datos Extras de Entrega -->
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos Extras de Entrega</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Fecha de Entrega: ${this.customFormatDate(pedido.fechaEntrega)}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Forma de Entrega: ${pedido.carrito[0]?.configuracion?.datosEntrega?.formaEntrega}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Horario de Entrega: ${pedido.carrito[0]?.configuracion?.datosEntrega?.horarioEntrega}</p>
    </div>

    <!-- Sección de Datos Extras de la Orden de Pedido -->
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos Extras de la Orden de Pedido</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Asesor Asignado: ${pedido?.asesorAsignado?.name}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Fecha y Hora de Compra: ${this.customFormatDateHour(pedido?.fechaCreacion)}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Fuente: <strong>SELLERCENTER</strong></p>
    </div>


    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #444; margin-bottom: 10px;">Productos del pedido</h2>
    <table style="width: 100%; border-collapse: collapse;">
        
        <tbody>
            ${carritoHtml} <!-- Asegúrate de que carritoHtml también use estilos en línea -->
        </tbody>
    </table>
</div>
<div style="width: 80%; margin: auto; overflow: hidden;">
<h2>Notas Producción</h2>
<table style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
            <th style="border: 1px solid #ddd; padding: 8px;">#</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Fecha </th>
                <th style="border: 1px solid #ddd; padding: 8px;">Nota</th>
        
                <!-- Más cabeceras si es necesario -->
            </tr>
        </thead>
        <tbody>
            ${notasProduccion} <!-- Asegúrate de que carritoHtml también use estilos en línea -->
        </tbody>
    </table>
</div>

<!-- Notas Despachos -->
${!isComanda ? seccionNotasDespachos : ''}

<!-- Notas Entregas -->
${!isComanda ? seccionNotasEntregas : ''}

<!-- Notas Facturación y Pagos -->
${!isComanda ? notasFacturacionPagos : ''}

<!-- seccion gestionpedido -->
${!isComanda ? seccionGestionPedido : ''}



    
<!-- Sección de Totales Generales del Pedido -->
${!isComanda ? seccionTotales : ''}



  <div style="text-align: center;">
          <img src="${pieDePaginaUrl}" alt="Pie de página" id="piepagina" style="width: 100%; height: auto;">
    </div>
  <div style="text-align: center;">
      <img src="${imgPublicidad}" alt="Pie de página"  id="publicidad" style="width: 100%; height: auto;">
  </div>
    `;


    const htmlSanizado = this.sanitizer.bypassSecurityTrustHtml(htmlString);

    return htmlSanizado;
  }

  getHtmlPOSContent(pedido: POSPedido, isComanda: boolean = false): any {
    pedido.carrito.forEach(x => {
      this.pedidoUtilService.getAllMaestro$().subscribe((r: any) => {
        this.generos = r.generos?.find((p) => x.configuracion.datosEntrega.genero == p.id);
        console.log(this.generos)
        this.ocasiones = r.ocasiones?.find((p) => x.configuracion.datosEntrega.ocasion == p.id);
      })

    })
    let carritoHtml = '';
    let notasProduccion = ''
    let notasDespachos = ''
    let notasEntregas = ''
    let notasFacturacionPagos = ''
    let tarjetaNo = 0
    let index = 0;

    pedido.totalImpuesto = 0;


    for (const item of pedido.carrito) {
      // Sección principal del Carrito
      carritoHtml += `
      <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Imagen</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Producto</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Referencia</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Cantidad</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Precio Unitario Sin IVA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Porcentaje IVA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Valor IVA</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Precio Unitario Total (Con IVA)</th>
                <!-- Más cabeceras si es necesario -->
            </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${item.producto.crearProducto.imagenesPrincipales[0].urls}"
                   alt="${item.producto.crearProducto.titulo}" style="width: 100px; height: auto;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.producto.crearProducto.titulo}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.producto.identificacion.referencia}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.cantidad}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(item.producto.precio.precioUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.producto.precio.precioUnitarioIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(item.producto.precio.valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(item.producto.precio.precioUnitarioConIva)}</td>
        </tr>
      `;
      pedido.totalImpuesto += item.producto.precio.valorIva;
      // Preferencias como subitems
      if (item.configuracion && item.configuracion.preferencias && item.configuracion.preferencias.length > 0) {
        carritoHtml += `<tr style="background-color: #f9f9f9;">
        <td><span style="color:black;">Preferencias</span></td>
        </tr> `
        for (const pref of item.configuracion.preferencias) {
          carritoHtml += `
        
        <tr style="background-color: #f9f9f9;">
          <td></td> <!-- Celda vacía para la indentación -->
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${pref.imagen}" alt="Preferencia" style="width: 50px; height: auto;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">Preferencia: ${pref.titulo}:${pref.subtitulo} </td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(pref.valorUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${pref.porcentajeIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(pref.valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(pref.precioTotalConIva)}</td>
        </tr>
      `;
          pedido.totalImpuesto += pref.valorIva;
        }
      }

      // Adiciones como subitems
      if (item.configuracion && item.configuracion.adiciones && item.configuracion.adiciones.length > 0) {
        carritoHtml += `<tr style="background-color: #f9f9f9;">
        <td><span style="color:black;">Adiciones</span></td>
      </tr>`
        for (const adic of item.configuracion.adiciones) {
          carritoHtml += `
        
        <tr style="background-color: #f9f9f9;">
          <td></td> <!-- Celda vacía para la indentación -->
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${adic.imagen}" alt="Adición" style="width: 50px; height: auto;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">Adición: ${adic.titulo}: ${adic.subtitulo}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(adic.valorUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${adic.porcentajeIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(adic.valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(adic.precioTotalConIva)}</td>
        </tr>
      `;
          pedido.totalImpuesto += adic.valorIva;
        }
      }

      // Detalles de Entrega (Ocasión y Género) como un item
      if (item.configuracion && item.configuracion.datosEntrega) {
        const generos = this.generos?.name;
        const ocasion = this.ocasiones?.name;
        const observaciones = item.configuracion.datosEntrega.observaciones;
        carritoHtml += `
       
        <tr><td><h6><span style="color:black;">Observaciones</span></h6></td></tr>
        <tr>
        <td colspan="7" style="border: 1px solid #ddd; padding: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
        
        
          <thead>
        
        <tr style="background-color: #f9f9f9;">
          <th  style="border: 1px solid #ddd; padding: 8px;width:25%;">Ocasion</th>
          <th style="border: 1px solid #ddd; padding: 8px;width:25%;">Genero</th>
          <th  colspan="5" style="border: 1px solid #ddd; padding: 8px;width: 50%;">Observaciones</th>
        </tr>
        </thead>
        <tbody>
      <tr style="background-color: #f9f9f9;">
        <td style="border: 1px solid #ddd; padding: 8px;width:25%;">${ocasion}</td>
        <td style="border: 1px solid #ddd; padding: 8px;width:25%;">${generos}</td>
        <td colspan="5" style="border: 1px solid #ddd; padding: 8px;width: 50%;">${observaciones}</td>
      </tr>
      </tbody>
      </table>
      </td>
      </tr>
    `;


      }

      // Tarjetas como items
      if (item.configuracion && item.configuracion.tarjetas && item.configuracion) {
        for (const tarjeta of item.configuracion.tarjetas) {
          if (tarjeta.mensaje) {
            tarjetaNo++
            carritoHtml += `
            <tr style="background-color: #f9f9f9;">
            <td><span style="color:black;">Tarjeta ${tarjetaNo}</span></td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td></td> <!-- Celda vacía para la indentación -->
            <td  style="border: 1px solid #ddd; padding: 8px;">Para: ${tarjeta.para}</td>
            <td colspan="5" style="border: 1px solid #ddd; padding: 8px;">Mensaje: ${tarjeta.mensaje}</td>
            <td  style="border: 1px solid #ddd; padding: 8px;">De: ${tarjeta.de}</td>
  
          </tr>
        `;
          }

        }
      }
    }

    //secciones segun la comanda
    const cuerpodelcorreo = `
    <div style="width: 80%; margin: auto; overflow: hidden;">
        
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #444; margin-bottom: 10px;">Datos del Cliente</h2>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Tipo de Documento: ${pedido?.cliente.tipo_documento_comprador}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Documento: ${pedido?.cliente?.documento}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres Completos: ${pedido?.cliente?.nombres_completos}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres Completos: ${pedido?.cliente?.apellidos_completos}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Número de Celular: ${'(' + pedido?.cliente.indicativo_celular_comprador + ') ' + pedido.cliente.numero_celular_comprador}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Número de Whatsapp: ${'(' + pedido?.cliente.indicativo_celular_whatsapp + ') ' + pedido.cliente.numero_celular_whatsapp}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Estado Cliente: ${pedido?.cliente.estado}</p>
    <p style="font-size: 14px; margin: 5px 0 5px 50px;">Correo Electrónico: ${pedido?.cliente.correo_electronico_comprador}</p>

    </div>
    `

    const seccionFacturacionElectronica = `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos de Facturación Electrónica</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Nombres: ${pedido?.facturacion?.nombres}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Tipo de Documento: ${pedido.facturacion?.tipoDocumento ?? 'CC'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Documento: ${pedido?.facturacion?.documento}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">País: ${pedido?.facturacion?.pais}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Departamento: ${pedido?.facturacion?.departamento}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Ciudad: ${pedido?.facturacion?.ciudad}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Código Postal: ${pedido.facturacion?.codigoPostal}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Celular: ${'(' + pedido?.facturacion?.indicativoCel + ') ' + pedido?.facturacion?.celular}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Dirección: ${pedido?.facturacion?.direccion}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Referencia de Datos: ${pedido?.facturacion?.alias}</p>
    </div>
    `



    const seccionGestionPedido = `

    <div style="width: 80%; margin: auto; overflow: hidden;">
    <br><br>
    <h2>Gestión</h2>
    <table style="width: 100%; border-collapse: collapse;">
    <tbody>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Aprobar la compra
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Pagar
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Rastrear mi compra
                </a>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Cambios a mi pedido
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Quiero Felicitarlos
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Presentar una PQRS
                </a>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Hablar con un asesor
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Observaciones de tu Compra
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Terminos y Condiciones 
                </a>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Cargar comprobante
                </a>
            </td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 33.33%;">
                <a href="LINK_AQUI" target="_blank" style="display: block; background-color: #007bff; border-radius: 0.25rem; width: 100%; height: 50px; font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; font-weight: bold; text-align: center; line-height: 50px;">
                    Descargar factura
                </a>
            </td>
        </tr>
    </tbody>




    </table>
      </tr>
            </table>
          </td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            

    </div>
    `

    const textoEncabezado = !isComanda ? `¡Tu pedido ha sido registrado con éxito!` : `Orden Pedido Nro: ${pedido.nroPedido}`;
    const linkReferenciaPedido = `<a href="${window.location.origin}/ventas/pedidos?nroPedido=${pedido.nroPedido}"><p>Referencia del Pedido: ${pedido.nroPedido}</p></a>`

    const subtotal = this.checkPriceScale(pedido);
    const totalIVA = this.checkIVAPrice(pedido).totalPrecioIVADef + this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido);
    const descuentos = pedido.totalDescuento;
    const envio = 0;
    const excluidos = this.checkIVAPrice(pedido).totalExcluidos
    const totalIva5 = this.checkIVAPrice(pedido).totalIva5
    const totalImpo = this.checkIVAPrice(pedido).totalImpo
    const totalIva19 = this.checkIVAPrice(pedido).totalIva19
    const totalPagar = envio - descuentos + subtotal + totalIVA;
    const empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") || "{}");
    const encabezadoUrl = empresaActual.imageEmail?.encabezado || '';
    const pieDePaginaUrl = empresaActual.imageEmail?.piepagina || '';
    const imgPublicidad = "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Empresas%2FJulsmind%2Fimagenes%2FEmail%2FPublicidad%2FContactanos.png?alt=media&token=5df01a71-6869-40cb-a4c4-d2a2675c1a0f"; // 'https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/assets%2Fimages%2Fecommerce%2Fpublicidad-pedido.png?alt=media&token=3b9b8b9a-9b9a-4b9e-9b9a-9b9a9b9a9b9a';


    const seccionTotales = `
    <!-- Sección de Totales Generales del Pedido -->
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #444; margin-bottom: 10px;">Totales del Pedido</h2>
    <table style="width: 100%; border-collapse: collapse;">
        <tfoot>
          
            
              <tr>
              <th style="border: 1px solid #ddd; padding: 8px;">Costo de Productos:</th>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(subtotal)}</td>
          </tr>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Domicilio:</th>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(envio)}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Descuentos:</th>
                <td style="border: 1px solid #ddd; padding: 8px;">-${this.formatCurrency(descuentos)}</td>
            </tr>
            <tr>
            <th style="border: 1px solid #ddd; padding: 8px;">Total sin IVA:</th>
            <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(envio - descuentos + subtotal)}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Total IVA:</th>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(totalIVA)}</td>
            </tr>
              <tr>
              
                    <th class="title">Excluidos 0%:</th>
                    <td class="value">${this.formatCurrency(excluidos)}</td>
                  </tr>
                  <tr>
                    <th class="title">Iva 5%:</th>
                    <td class="value">${this.formatCurrency(totalIva5)}</td>
                  </tr>
                  <tr>
                    <th class="title">Impoconsumo 8%:</th>
                    <td class="value">${this.formatCurrency(totalImpo)}</td>
                  </tr>
                  <tr>
                    <th class="title">Iva 19%:</th>
                    <td class="value">${this.formatCurrency(totalIva19)}</td>
                  </tr>
                
           
           
            <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Total a Pagar:</th>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>${this.formatCurrency(totalPagar)}</strong></td>
            </tr>
        </tfoot>
    </table>
</div>
    ` ;

    const htmlString = `
    <div style="text-align: center;">
        <img src="${encabezadoUrl}" alt="Encabezado" id="Encabezado" style="width: 85%; height: auto;">
    </div>
    <div style="text-align: center; font-size: 3rem; /* Puedes añadir más estilos aquí */">
    <h3>${textoEncabezado}</h3>
    ${!isComanda ? linkReferenciaPedido : ''}
    <p>Gracias por elegirnos.</p>
    <p>Estamos trabajando en tu pedido y te mantendremos informado sobre cualquier novedad</p>
    <!-- <img src="https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/assets%2Fimages%2Fecommerce%2Fsuccess-svgrepo-com.svg?alt=media&token=21bfe103-b0e3-49a8-b758-ce6245ee43e0" style="width: 10%; height: 10%;" alt="confirm"> -->
    </div>


    <!-- Contenido del cuerpo del correo -->
    ${!isComanda ? cuerpodelcorreo : ''}
    <!-- Más campos del cliente -->


    <!-- Sección de Datos de Facturación Electrónica -->
    ${!isComanda ? seccionFacturacionElectronica : ''}      
    <!-- Más detalles de facturación -->


    <!-- Sección de Datos Extras de Entrega -->
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos Extras de Entrega</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Fecha de Entrega: ${this.customFormatDate(pedido.fechaEntrega)}</p>
    </div>

    <!-- Sección de Datos Extras de la Orden de Pedido -->
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos Extras de la Orden de Pedido</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Asesor Asignado: ${pedido?.asesorAsignado.name}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Fecha y Hora de Compra: ${this.customFormatDateHour(pedido?.fechaCreacion)}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 50px;">Fuente: <strong>SELLERCENTER</strong></p>
    </div>


    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #444; margin-bottom: 10px;">Productos del pedido</h2>
    <table style="width: 100%; border-collapse: collapse;">
        
        <tbody>
            ${carritoHtml} <!-- Asegúrate de que carritoHtml también use estilos en línea -->
        </tbody>
    </table>
</div>
<div style="width: 80%; margin: auto; overflow: hidden;">




<!-- Notas Facturación y Pagos -->
${!isComanda ? notasFacturacionPagos : ''}

<!-- seccion gestionpedido -->
${!isComanda ? seccionGestionPedido : ''}



    
<!-- Sección de Totales Generales del Pedido -->
${!isComanda ? seccionTotales : ''}



  <div style="text-align: center;">
          <img src="${pieDePaginaUrl}" alt="Pie de página" id="piepagina" style="width: 100%; height: auto;">
    </div>
  <div style="text-align: center;">
      <img src="${imgPublicidad}" alt="Pie de página"  id="publicidad" style="width: 100%; height: auto;">
  </div>
    `;


    const htmlSanizado = this.sanitizer.bypassSecurityTrustHtml(htmlString);

    return htmlSanizado;
  }


  formatDate(dateObj: Fecha): string {

    if (!dateObj) return '';
    const { year, month, day } = dateObj;

    // Añade un cero delante de los meses y días menores a 10 para formatear correctamente
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDay = day < 10 ? `0${day}` : day;

    // Formato de fecha en formato 'YYYY-MM-DD'
    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  customFormatDate(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() devuelve un valor de 0-11
    const day = date.getDate();

    // Añade un cero delante si el mes o el día son menores a 10
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDay = day < 10 ? `0${day}` : day;

    return `${year}-${formattedMonth}-${formattedDay}`;
  }
  customFormatDateHour(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() devuelve un valor de 0-11
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Añade un cero delante si el mes, día, horas o minutos son menores a 10
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${year}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}`;
  }
}
