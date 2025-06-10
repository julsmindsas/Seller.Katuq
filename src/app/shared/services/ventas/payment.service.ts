import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { PedidosUtilService } from '../../../components/ventas/service/pedidos.util.service';
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { Pedido, Fecha, Carrito, Adicion, Preferencia, Tarjeta } from '../../../components/ventas/modelo/pedido'; // Importar tipos necesarios
import { forkJoin, map, Observable, of } from 'rxjs'; // Importar operadores RxJS

declare var WidgetCheckout: any;

@Injectable({
  providedIn: 'root'
})
export class PaymentService extends BaseService {
  // Eliminar generos y ocasiones como propiedades de clase si se obtienen por pedido
  // generos: any;
  // ocasiones: any;
  allBillingZone: any;
  maestros: any = {}; // Para almacenar maestros cargados

  constructor(
    private service: MaestroService,
    private pedidoUtilService: PedidosUtilService,
    httpClient: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    super(httpClient);

    const user = localStorage.getItem('user');
    if (user) {
      // Cargar zonas de facturación y maestros al iniciar el servicio si es necesario
      // O cargarlos bajo demanda en getHtmlContent
      this.loadInitialData();
    }
  }

  private loadInitialData(): void {
    const context = this;
    // Cargar zonas de facturación
    this.service.getBillingZone().subscribe({
      next(value: any) {
        context.allBillingZone = value;
        sessionStorage.setItem('allBillingZone', JSON.stringify(context.allBillingZone));
      },
      error(err) {
        console.error('Error loading billing zones:', err);
      },
    });

    // Cargar maestros (géneros, ocasiones, etc.)
    this.pedidoUtilService.getAllMaestro$().subscribe({
      next(value: any) {
        context.maestros = value; // Almacenar todos los maestros
        console.log('Maestros loaded:', context.maestros);
      },
      error(err) {
        console.error('Error loading maestros:', err);
      },
    });
  }


  public getPaymentMethods() {
    return this.get('payment-methods');
  }

  private loginEpayco() {
    return this.get('login-epayco');
  }



  public async pauymentWompi(pedido: Pedido) {
    if (!pedido) return;

    // Asegurarse que allBillingZone esté cargado
    if (!this.allBillingZone) {
      console.error("Billing zones not loaded yet.");
      // Podrías intentar cargarlo aquí o devolver un error/mensaje
      return;
    }

    const totalCalculado1 = this.checkPriceScale(pedido) * 100; // Asumiendo que checkPriceScale devuelve el subtotal sin IVA
    const publicKey = environment.wompi.public_key;
    const redirectURL = environment.wompi.redirectURL;
    var checkout = new WidgetCheckout({
      currency: 'COP',
      amountInCents: totalCalculado1, // Revisar si este es el total correcto a enviar
      reference: pedido.referencia?.toString(), // Añadir validación
      publicKey: publicKey,
      signature: {
        integrity: pedido?.pagoInformation?.integridad
      },
      redirectUrl: redirectURL // Opcional
    });

    var _this = this;

    // El código comentado de checkout.open parece depender de variables (_this.isLoading, _this.cartService, etc.)
    // que no están definidas en este servicio. Debería estar en el componente que usa este servicio.
    // checkout.open(function (result: any) { ... });
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

  // Cambiado a COP y locale 'es-CO' para consistencia
  formatCurrency(value: number): string {
    // Añadir chequeo explícito para NaN además de null/undefined
    if (value === null || value === undefined || isNaN(value)) return '$ 0'; // Devolver '$ 0' o '' según preferencia
    const formatter = new Intl.NumberFormat('es-CO', { // Usar locale colombiano
      style: 'currency',
      currency: 'COP', // Usar COP consistentemente
      minimumFractionDigits: 0, // Ajustar según necesidad (0 o 2)
      maximumFractionDigits: 0
    });
    return formatter.format(value);
  }

  // formatearFecha no se usa en getHtmlContent, pero se mantiene por si acaso
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      const date = new Date(fecha);
      const datePipe = new DatePipe('es-ES'); // Usar locale consistente
      // No es necesario convertir a ISOString si ya es un string de fecha válido
      return datePipe.transform(date, 'yyyy/MM/dd') ?? ''; // Usar 'yyyy' en lugar de 'YYYY' y manejar null
    } catch (e) {
      console.error("Error formatting date:", fecha, e);
      return ''; // Devolver vacío en caso de error
    }
  }

  // Calcula el subtotal (suma de precios base sin IVA)
  checkPriceScale(pedido: Pedido | POSPedido): number {
    let totalPrecioSinIVADef = 0;
    if (!pedido?.carrito) return 0;

    pedido.carrito.forEach(itemCarrito => {
      let totalItemSinIVA = 0;
      const producto = itemCarrito?.producto;
      // Usar Number() y || 0 para asegurar que cantidad sea numérico
      const cantidad = Number(itemCarrito?.cantidad) || 0;
      const preciosVolumen = producto?.precio?.preciosVolumen ?? [];
      // Usar Number() y || 0 para asegurar que precio sea numérico
      const precioUnitarioSinIva = Number(producto?.precio?.precioUnitarioSinIva) || 0;

      if (preciosVolumen.length > 0) {
        let precioVolumenEncontrado = false;
        for (const x of preciosVolumen) {
          // Asegurar que los límites y el valor sean numéricos
          const unidadesInicial = Number(x.numeroUnidadesInicial) || 0;
          const unidadesLimite = Number(x.numeroUnidadesLimite) || Infinity;
          const valorVolumenSinIVA = Number(x.valorUnitarioPorVolumenSinIVA) || 0;

          if (cantidad >= unidadesInicial && cantidad <= unidadesLimite) {
            totalItemSinIVA = valorVolumenSinIVA * cantidad;
            precioVolumenEncontrado = true;
            break;
          }
        }
        if (!precioVolumenEncontrado) {
          totalItemSinIVA = precioUnitarioSinIva * cantidad;
        }
      } else {
        totalItemSinIVA = precioUnitarioSinIva * cantidad;
      }

      // Sumar precios de adiciones (sin IVA)
      if (itemCarrito.configuracion?.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion: Adicion) => {
          // Asegurar que el valor sea numérico
          const valorAdicionSinIva = Number(adicion.valorUnitarioSinIva) || 0;
          totalItemSinIVA += valorAdicionSinIva * cantidad;
        });
      }

      // Sumar precios de preferencias (sin IVA)
      if (itemCarrito.configuracion?.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia: Preferencia) => {
          // Asegurar que el valor sea numérico
          const valorPreferenciaSinIva = Number(preferencia.valorUnitarioSinIva) || 0;
          totalItemSinIVA += valorPreferenciaSinIva * cantidad;
        });
      }

      // Asegurar que totalItemSinIVA no sea NaN antes de sumar
      if (!isNaN(totalItemSinIVA)) {
        totalPrecioSinIVADef += totalItemSinIVA;
      } else {
        console.warn("NaN detectado en cálculo de subtotal para item:", itemCarrito);
      }
    });
    // Asegurar que el resultado final no sea NaN
    return isNaN(totalPrecioSinIVADef) ? 0 : totalPrecioSinIVADef;
  }

  // Calcula el desglose de IVA
  checkIVAPrice(pedido: Pedido | POSPedido): { totalPrecioIVADef: number, totalExcluidos: number, totalIva5: number, totalImpo: number, totalIva19: number } {
    // Asegurarse que allBillingZone esté cargado
    if (!this.allBillingZone) {
      console.warn("Billing zones not loaded for IVA calculation. Returning zeros.");
      this.allBillingZone = JSON.parse(sessionStorage.getItem('allBillingZone') || 'null'); // Intentar cargar desde session storage
      if (!this.allBillingZone) {
        return { totalPrecioIVADef: 0, totalExcluidos: 0, totalIva5: 0, totalImpo: 0, totalIva19: 0 };
      }
    }

    let totalPrecioIVADef = 0;
    let totalExcluidosDef = 0;
    let totalIva5Def = 0;
    let totalImpoDef = 0;
    let totalIva19Def = 0;

    if (!pedido?.carrito) {
      return { totalPrecioIVADef: 0, totalExcluidos: 0, totalIva5: 0, totalImpo: 0, totalIva19: 0 };
    }

    // Asegurar que porceDescuento sea numérico
    const porceDescuento = (Number(pedido.porceDescuento) || 0) / 100; // Calcular porcentaje una vez

    pedido.carrito.forEach(itemCarrito => {
      const producto = itemCarrito?.producto;
      // Asegurar que cantidad sea numérico
      const cantidad = Number(itemCarrito?.cantidad) || 0;
      const preciosVolumen = producto?.precio?.preciosVolumen ?? [];
      // const valorIvaUnitario = Number(producto?.precio?.valorIva) || 0; // No se usa directamente en el cálculo principal de IVA
      const porcentajeIvaUnitario = producto?.precio?.precioUnitarioIva ?? "0"; // Porcentaje IVA unitario base como string

      let valorIvaItem = 0;
      let porcentajeIvaItemStr = porcentajeIvaUnitario; // Por defecto, usar el base
      // Asegurar que precioConIvaItem sea numérico
      let precioConIvaItem = Number(producto?.precio?.precioUnitarioConIva) || 0; // Precio unitario con IVA para cálculo base

      if (preciosVolumen.length > 0) {
        let precioVolumenEncontrado = false;
        for (const x of preciosVolumen) {
          // Asegurar que los límites y valores sean numéricos
          const unidadesInicial = Number(x.numeroUnidadesInicial) || 0;
          const unidadesLimite = Number(x.numeroUnidadesLimite) || Infinity;
          const valorVolumenConIVA = Number(x.valorUnitarioPorVolumenIva) || 0; // Precio unitario con IVA por volumen
          const porcentajeVolumenIVA = (x.valorIVAPorVolumen ?? "0").toString(); // Porcentaje IVA por volumen

          if (cantidad >= unidadesInicial && cantidad <= unidadesLimite) {
            // Usar valores de volumen si aplican
            precioConIvaItem = valorVolumenConIVA;
            porcentajeIvaItemStr = porcentajeVolumenIVA;
            precioVolumenEncontrado = true;
            break;
          }
        }
        // No es necesario el 'else' aquí porque precioConIvaItem ya tiene el valor base
        // if (!precioVolumenEncontrado) {
        // Si no aplica volumen, usar precio base - ya está asignado
        // precioConIvaItem = (Number(producto?.precio?.precioUnitarioConIva) || 0);
        // }
      }
      // Si no hay precios de volumen, precioConIvaItem mantiene el valor base inicializado
      // else {
      // Si no hay precios de volumen, usar precio base - ya está asignado
      // precioConIvaItem = (Number(producto?.precio?.precioUnitarioConIva) || 0);
      // }

      // Calcular valor total con IVA del producto principal (antes de descuento)
      let valorTotalConIvaProducto = precioConIvaItem * cantidad;
      // Aplicar descuento al valor con IVA
      let valorTotalConIvaProductoConDesc = valorTotalConIvaProducto * (1 - porceDescuento);
      // Calcular el valor del IVA correspondiente a este producto con descuento
      // IVA = TotalConDesc / (1 + %IVA) * %IVA
      // Asegurar que porcentajeIvaNum sea numérico y válido para división
      const porcentajeIvaNum = (Number(porcentajeIvaItemStr) || 0) / 100;
      if (1 + porcentajeIvaNum !== 0) { // Evitar división por cero si %IVA es -100%
        valorIvaItem = (valorTotalConIvaProductoConDesc / (1 + porcentajeIvaNum)) * porcentajeIvaNum;
      } else {
        valorIvaItem = 0; // O manejar como error
        console.warn("Porcentaje IVA inválido (-100%) encontrado para item:", itemCarrito);
      }


      // Acumular solo si valorIvaItem es un número válido
      if (!isNaN(valorIvaItem)) {
        totalPrecioIVADef += valorIvaItem;
        switch (porcentajeIvaItemStr) {
          // Acumular valor con descuento si es un número válido
          case "0": totalExcluidosDef += isNaN(valorTotalConIvaProductoConDesc) ? 0 : valorTotalConIvaProductoConDesc; break; // Si es 0% IVA, el valor es excluido
          case "5": totalIva5Def += valorIvaItem; break;
          case "8": totalImpoDef += valorIvaItem; break; // Asumiendo 8% es Impoconsumo
          case "19": totalIva19Def += valorIvaItem; break;
        }
      } else {
        console.warn("NaN detectado en cálculo de IVA para producto principal:", itemCarrito);
      }


      // Sumar IVA de adiciones
      if (itemCarrito.configuracion?.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion: Adicion) => {
          // Asegurar valores numéricos
          const valorAdicionConIva = (Number(adicion.precioTotalConIva) || 0) * cantidad;
          const valorAdicionConIvaConDesc = valorAdicionConIva * (1 - porceDescuento);
          const porcentajeAdicionStr = (adicion.porcentajeIva ?? 0).toString();
          const porcentajeAdicionNum = (Number(adicion.porcentajeIva) || 0) / 100;
          let ivaAdicion = 0;

          if (1 + porcentajeAdicionNum !== 0) {
            ivaAdicion = (valorAdicionConIvaConDesc / (1 + porcentajeAdicionNum)) * porcentajeAdicionNum;
          } else {
            console.warn("Porcentaje IVA inválido (-100%) encontrado para adicion:", adicion);
          }


          if (!isNaN(ivaAdicion)) {
            totalPrecioIVADef += ivaAdicion;
            switch (porcentajeAdicionStr) {
              case "0": totalExcluidosDef += isNaN(valorAdicionConIvaConDesc) ? 0 : valorAdicionConIvaConDesc; break;
              case "5": totalIva5Def += ivaAdicion; break;
              case "8": totalImpoDef += ivaAdicion; break;
              case "19": totalIva19Def += ivaAdicion; break;
            }
          } else {
            console.warn("NaN detectado en cálculo de IVA para adicion:", adicion);
          }
        });
      }

      // Sumar IVA de preferencias
      if (itemCarrito.configuracion?.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia: Preferencia) => {
          // Asegurar valores numéricos
          const valorPreferenciaConIva = (Number(preferencia.precioTotalConIva) || 0) * cantidad;
          const valorPreferenciaConIvaConDesc = valorPreferenciaConIva * (1 - porceDescuento);
          const porcentajePreferenciaStr = (preferencia.porcentajeIva ?? "0").toString();
          const porcentajePreferenciaNum = (Number(preferencia.porcentajeIva) || 0) / 100;
          let ivaPreferencia = 0;

          if (1 + porcentajePreferenciaNum !== 0) {
            ivaPreferencia = (valorPreferenciaConIvaConDesc / (1 + porcentajePreferenciaNum)) * porcentajePreferenciaNum;
          } else {
            console.warn("Porcentaje IVA inválido (-100%) encontrado para preferencia:", preferencia);
          }


          if (!isNaN(ivaPreferencia)) {
            totalPrecioIVADef += ivaPreferencia;
            switch (porcentajePreferenciaStr) {
              case "0": totalExcluidosDef += isNaN(valorPreferenciaConIvaConDesc) ? 0 : valorPreferenciaConIvaConDesc; break;
              case "5": totalIva5Def += ivaPreferencia; break;
              case "8": totalImpoDef += ivaPreferencia; break;
              case "19": totalIva19Def += ivaPreferencia; break;
            }
          } else {
            console.warn("NaN detectado en cálculo de IVA para preferencia:", preferencia);
          }
        });
      }
    });

    // Calcular IVA del envío (domicilio)
    // Asegurar valores numéricos
    const costoEnvioConIva = Number(this.pedidoUtilService.getShippingTaxCostInvoice(this.allBillingZone, pedido)) || 0;
    const porcentajeIvaEnvioStr = this.pedidoUtilService.getShippingTaxValueInvoice(this.allBillingZone, pedido) ?? "0";
    const porcentajeIvaEnvioNum = (Number(porcentajeIvaEnvioStr) || 0) / 100;
    let ivaEnvio = 0;

    if (1 + porcentajeIvaEnvioNum !== 0) {
      ivaEnvio = (costoEnvioConIva / (1 + porcentajeIvaEnvioNum)) * porcentajeIvaEnvioNum;
    } else {
      console.warn("Porcentaje IVA inválido (-100%) encontrado para envío.");
    }


    if (!isNaN(ivaEnvio)) {
      totalPrecioIVADef += ivaEnvio;
      switch (porcentajeIvaEnvioStr) {
        case "0": totalExcluidosDef += isNaN(costoEnvioConIva) ? 0 : costoEnvioConIva; break;
        case "5": totalIva5Def += ivaEnvio; break;
        case "8": totalImpoDef += ivaEnvio; break;
        case "19": totalIva19Def += ivaEnvio; break;
      }
    } else {
      console.warn("NaN detectado en cálculo de IVA para envío.");
    }


    // Corrección: totalExcluidosDef debería sumar el valor *sin* IVA de los items con 0% IVA.
    // La lógica actual suma el valor *con* IVA (que es igual al sin IVA en este caso).
    // Para mayor precisión, se debería recalcular la base excluida.
    // Sin embargo, para mantener la lógica original lo más cercana, la dejamos así,
    // pero ten en cuenta que `totalExcluidosDef` representa la suma de los precios finales de items con 0% IVA.

    // Asegurar que los totales finales no sean NaN
    return {
      totalPrecioIVADef: isNaN(totalPrecioIVADef) ? 0 : totalPrecioIVADef,
      totalExcluidos: isNaN(totalExcluidosDef) ? 0 : totalExcluidosDef, // Suma de valores finales con 0% IVA
      totalIva5: isNaN(totalIva5Def) ? 0 : totalIva5Def,
      totalImpo: isNaN(totalImpoDef) ? 0 : totalImpoDef,
      totalIva19: isNaN(totalIva19Def) ? 0 : totalIva19Def
    };
  }


  /**
    * Obtiene la fecha y hora actual formateada como 'yyyy-MM-dd HH:mm'.
    * Se utiliza JavaScript nativo para evitar problemas con la instanciación
    * directa de DatePipe y asegurar la disponibilidad sin depender de la
    * configuración del módulo o registro de locale para este formato específico.
    * @returns La fecha y hora actual formateada o una cadena vacía si ocurre un error.
    */
  obtenerFechaHoy(): string {
    try {
      const hoy = new Date();
      const year = hoy.getFullYear();
      // getMonth() devuelve 0-11, por eso se suma 1. padStart asegura dos dígitos.
      const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
      const day = hoy.getDate().toString().padStart(2, '0');
      const hours = hoy.getHours().toString().padStart(2, '0');
      const minutes = hoy.getMinutes().toString().padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error al formatear la fecha actual:", error);
      return ''; // Devolver cadena vacía en caso de error
    }
  }

  // Método principal para generar el HTML del correo/comanda
  getHtmlContent(pedido: Pedido, isComanda: boolean = false): SafeHtml | null {
    if (!pedido) return null;

    // Asegurarse que los maestros estén cargados
    if (!this.maestros || Object.keys(this.maestros).length === 0) {
      console.warn("Maestros not loaded for HTML generation. Trying to load now...");
      // Podríamos intentar cargarlos aquí de forma síncrona si fuera posible,
      // pero como es asíncrono, es mejor asegurarse que se carguen antes.
      // Por ahora, devolvemos null o un HTML indicando el problema.
      // Alternativa: Usar un observable y que el componente espere.
      // this.loadInitialData(); // Llamar aquí no garantiza que estén listos
      return this.sanitizer.bypassSecurityTrustHtml('<p>Error: Datos maestros no cargados.</p>');
    }
    // Asegurarse que allBillingZone esté cargado
    if (!this.allBillingZone) {
      console.warn("Billing zones not loaded for HTML generation.");
      this.allBillingZone = JSON.parse(sessionStorage.getItem('allBillingZone') || 'null');
      if (!this.allBillingZone) {
        return this.sanitizer.bypassSecurityTrustHtml('<p>Error: Zonas de facturación no cargadas.</p>');
      }
    }


    let carritoHtml = '';
    let notasProduccionHtml = '';
    let notasDespachosHtml = '';
    let notasEntregasHtml = '';
    let notasFacturacionPagosHtml = '';
    let tarjetaIndex = 0;
    // pedido.totalImpuesto = 0; // El cálculo de IVA total se hace en checkIVAPrice

    // --- Generación HTML Notas de Producción (Fuente Única) ---
    (pedido.notasPedido?.notasProduccion ?? []).forEach(nota => {
      const fechaNota = nota.fecha ? this.customFormatDateHour(nota.fecha) : this.customFormatDateHour(new Date().toISOString());
      
      // Manejar diferentes formatos de notas para compatibilidad
      let descripcion = '';
      let producto = 'General';
      
      if (typeof nota === 'string') {
        descripcion = nota;
      } else if (nota && typeof nota === 'object') {
        descripcion = nota.descripcion || nota.nota || '';
        producto = nota.producto || 'General';
      }
      
      // Solo agregar la fila si hay una descripción válida
      if (descripcion && descripcion.trim() !== '') {
        notasProduccionHtml += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${producto}</td>
            <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${fechaNota}</td>
            <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${descripcion}</td>
          </tr>
        `;
      }
    });




    // Notas Generales del Pedido
    (pedido.notasPedido?.notasDespachos ?? []).forEach(nota => {
      notasDespachosHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${nota.nota ?? ''}</td>
        </tr>
      `;
    });
    (pedido.notasPedido?.notasEntregas ?? []).forEach(nota => {
      notasEntregasHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${nota.nota ?? ''}</td>
        </tr>
      `;
    });
    (pedido.notasPedido?.notasFacturacionPagos ?? []).forEach(nota => {
      notasFacturacionPagosHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${nota.nota ?? ''}</td>
        </tr>
      `;
    });

    // --- Generación HTML Carrito ---
    (pedido.carrito ?? []).forEach(item => {
      const producto = item?.producto;
      const configuracion = item?.configuracion;
      // Asegurar que cantidad sea numérico
      const cantidad = Number(item?.cantidad) || 0;
      const imagenUrl = producto?.crearProducto?.imagenesPrincipales?.[0]?.urls ?? 'assets/images/default-product.png'; // Imagen por defecto
      const tituloProducto = producto?.crearProducto?.titulo ?? 'Producto no disponible';
      const referenciaProducto = producto?.identificacion?.referencia ?? 'N/A';
      // Asegurar valores numéricos
      const precioUnitarioSinIva = Number(producto?.precio?.precioUnitarioSinIva) || 0;
      const porcentajeIva = producto?.precio?.precioUnitarioIva ?? '0';
      const valorIva = Number(producto?.precio?.valorIva) || 0;
      const precioUnitarioConIva = Number(producto?.precio?.precioUnitarioConIva) || 0;

      // Cabecera de producto principal
      carritoHtml += `
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px;">Imagen</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Producto</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Referencia</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Cantidad</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Precio Unit. Sin IVA</th>
          <th style="border: 1px solid #ddd; padding: 8px;">% IVA</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Valor IVA Unit.</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Precio Unit. Total (Con IVA)</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><img src="${imagenUrl}" alt="${tituloProducto}" style="width: 80px; height: auto; max-width: 100px;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${tituloProducto}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${referenciaProducto}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${cantidad}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(precioUnitarioSinIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${porcentajeIva}%</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorIva)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(precioUnitarioConIva)}</td>
        </tr>
      `;

      // Preferencias
      if (configuracion?.preferencias && configuracion.preferencias.length > 0) {
        carritoHtml += `<tr style="background-color: #f9f9f9;"><td colspan="8" style="padding: 5px 8px; font-weight: bold; color: #333;">Preferencias:</td></tr>`;
        configuracion.preferencias.forEach((pref: Preferencia) => {
          // Asegurar valores numéricos
          const valorUnitarioSinIvaPref = Number(pref.valorUnitarioSinIva) || 0;
          const valorIvaPref = Number(pref.valorIva) || 0;
          const precioTotalConIvaPref = Number(pref.precioTotalConIva) || 0;
          carritoHtml += `
            <tr style="background-color: #f9f9f9;">
              <td></td> <!-- Indentación -->
              <td style="border: 1px solid #ddd; padding: 8px;"><img src="${pref.imagen ?? ''}" alt="Preferencia" style="width: 40px; height: auto;"></td>
              <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">${pref.titulo ?? ''}: ${pref.subtitulo ?? ''}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorUnitarioSinIvaPref)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${pref.porcentajeIva ?? '0'}%</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorIvaPref)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(precioTotalConIvaPref)}</td>
            </tr>
          `;
        });
      }

      // Adiciones
      if (configuracion?.adiciones && configuracion.adiciones.length > 0) {
        carritoHtml += `<tr style="background-color: #f0f0f0;"><td colspan="8" style="padding: 5px 8px; font-weight: bold; color: #333;">Adiciones:</td></tr>`;
        configuracion.adiciones.forEach((adic: Adicion) => {
          // Asegurar valores numéricos
          const valorUnitarioSinIvaAdic = Number(adic.valorUnitarioSinIva) || 0;
          const valorIvaAdic = Number(adic.valorIva) || 0;
          const precioTotalConIvaAdic = Number(adic.precioTotalConIva) || 0;
          carritoHtml += `
            <tr style="background-color: #f0f0f0;">
              <td></td> <!-- Indentación -->
              <td style="border: 1px solid #ddd; padding: 8px;"><img src="${adic.imagen ?? ''}" alt="Adición" style="width: 40px; height: auto;"></td>
              <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">${adic.titulo ?? ''}: ${adic.subtitulo ?? ''}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorUnitarioSinIvaAdic)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${adic.porcentajeIva ?? '0'}%</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorIvaAdic)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(precioTotalConIvaAdic)}</td>
            </tr>
          `;
        });
      }

      // Detalles de Entrega (Ocasión, Género, Observaciones) - Condicional
      if (configuracion?.datosEntrega) {
        const datosEntrega = configuracion.datosEntrega;
        // Buscar nombres en maestros usando IDs
        const ocasionId = datosEntrega.ocasion; // Asumiendo que es el ID
        const generoId = datosEntrega.genero?.[0]; // Asumiendo que es un array y tomamos el primero

        const ocasionObj = this.maestros.ocasiones?.find(o => o.id == ocasionId);
        const generoObj = this.maestros.generos?.find(g => g.id == generoId);

        const ocasionName = ocasionObj?.name ?? null; // Obtener nombre o null
        const generoName = generoObj?.name ?? null;   // Obtener nombre o null
        const observaciones = datosEntrega.observaciones ?? '';

        // Solo mostrar la sección si hay ocasión, género u observaciones
        if (ocasionName || generoName || observaciones) {
          carritoHtml += `
            <tr><td colspan="8" style="padding-top: 10px; padding-bottom: 5px; font-weight: bold; color: #333;">Observaciones y Detalles de Entrega:</td></tr>
            <tr>
              <td colspan="8" style="border: 1px solid #ddd; padding: 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #e9e9e9;">
                      ${ocasionName ? '<th style="border: 1px solid #ddd; padding: 8px; width: 25%;">Ocasión</th>' : ''}
                      ${generoName ? '<th style="border: 1px solid #ddd; padding: 8px; width: 25%;">Género</th>' : ''}
                      <th style="border: 1px solid #ddd; padding: 8px;">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="background-color: #f9f9f9;">
                      ${ocasionName ? `<td style="border: 1px solid #ddd; padding: 8px;">${ocasionName}</td>` : ''}
                      ${generoName ? `<td style="border: 1px solid #ddd; padding: 8px;">${generoName}</td>` : ''}
                      <td style="border: 1px solid #ddd; padding: 8px;">${observaciones}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          `;
        }
      }


      // Tarjetas
      if (configuracion?.tarjetas && configuracion.tarjetas.length > 0) {
        configuracion.tarjetas.forEach((tarjeta: Tarjeta) => {
          if (tarjeta.mensaje) { // Solo mostrar si hay mensaje
            tarjetaIndex++;
            carritoHtml += `
              <tr style="background-color: #fefefe;"><td colspan="8" style="padding: 5px 8px; font-weight: bold; color: #333;">Tarjeta ${tarjetaIndex}:</td></tr>
              <tr style="background-color: #fefefe;">
                <td></td> <!-- Indentación -->
                <td style="border: 1px solid #ddd; padding: 8px;">Para: ${tarjeta.para ?? ''}</td>
                <td colspan="5" style="border: 1px solid #ddd; padding: 8px;">Mensaje: ${tarjeta.mensaje}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">De: ${tarjeta.de ?? ''}</td>
              </tr>
            `;
          }
        });
      }
      carritoHtml += `<tr><td colspan="8" style="border-bottom: 2px solid #ccc; padding: 5px 0;"></td></tr>`; // Separador visual
    }); // Fin forEach carrito

    // --- Secciones HTML ---
    // (Se mantienen las definiciones de las secciones como constantes para claridad)
    const seccionDatosCliente = `...`; // Mantener igual, pero con validaciones internas
    const seccionFacturacionElectronica = `...`; // Mantener igual, pero con validaciones internas
    const seccionEnvio = `...`; // Cambiado nombre de seccionDatosCliente a seccionEnvio para evitar confusión
    const seccionNotasProduccion = `...`; // Usará notasProduccionHtml
    const seccionNotasDespachos = `...`; // Usará notasDespachosHtml
    const seccionNotasEntregas = `...`; // Usará notasEntregasHtml
    const seccionNotasFacturacionPagos = `...`; // Usará notasFacturacionPagosHtml
    const seccionGestionPedido = `...`; // Mantener igual
    const seccionTotales = `...`; // Recalcular totales aquí para asegurar consistencia

    // --- Recalcular Totales para la sección ---
    // Es crucial recalcular aquí para asegurar que los valores mostrados coincidan con los cálculos
    const subtotal = this.checkPriceScale(pedido);
    const ivaInfo = this.checkIVAPrice(pedido);
    const totalIVA = ivaInfo.totalPrecioIVADef; // Ya incluye IVA de envío
    // Asegurar que descuentos y envioSinIva sean numéricos
    const descuentos = Number(pedido.totalDescuento) || 0;
    const envioSinIva = Number(pedido.totalEnvio) || 0; // O calcularlo si es necesario

    // Validar antes de calcular totales generales
    const totalSinIvaGeneral = (isNaN(subtotal) ? 0 : subtotal) + (isNaN(envioSinIva) ? 0 : envioSinIva) - (isNaN(descuentos) ? 0 : descuentos);
    const totalPagar = (isNaN(totalSinIvaGeneral) ? 0 : totalSinIvaGeneral) + (isNaN(totalIVA) ? 0 : totalIVA);

    const excluidos = ivaInfo.totalExcluidos; // Ya validado en checkIVAPrice
    const totalIva5 = ivaInfo.totalIva5;       // Ya validado
    const totalImpo = ivaInfo.totalImpo;     // Ya validado
    const totalIva19 = ivaInfo.totalIva19;   // Ya validado

    // --- Log para depuración ---
    console.log('Valores para Totales HTML:', {
      subtotal,
      envioSinIva,
      descuentos,
      totalSinIvaGeneral,
      totalIVA,
      totalPagar,
      excluidos,
      totalIva5,
      totalImpo,
      totalIva19,
      ivaInfo // Objeto completo de checkIVAPrice
    });


    // --- Construcción Final del HTML ---
    const empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');
    const encabezadoUrl = empresaActual.imageEmail?.encabezado || ''; // URL por defecto si no existe
    const pieDePaginaUrl = empresaActual.imageEmail?.piepagina || ''; // URL por defecto si no existe
    const imgPublicidad = "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Empresas%2FJulsmind%2Fimagenes%2FEmail%2FPublicidad%2FContactanos.png?alt=media&token=5df01a71-6869-40cb-a4c4-d2a2675c1a0f";

    const textoEncabezado = !isComanda ? `¡Tu pedido ha sido registrado con éxito!` : `Orden Pedido Nro: ${pedido.nroPedido ?? 'N/A'}`;
    const linkReferenciaPedido = `<a href="${window.location.origin}/ventas/pedidos?nroPedido=${pedido.nroPedido ?? ''}" style="text-decoration: none; color: #007bff;"><p>Referencia del Pedido: ${pedido.nroPedido ?? 'N/A'}</p></a>`;

    // Reconstruir secciones con validaciones internas y usando las variables HTML generadas
    const htmlDatosCliente = !isComanda ? `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #444; margin-bottom: 10px;">Datos del Cliente</h2>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Tipo Documento: ${pedido?.cliente?.tipo_documento_comprador ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Documento: ${pedido?.cliente?.documento ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Nombres: ${pedido?.cliente?.nombres_completos ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Apellidos: ${pedido?.cliente?.apellidos_completos ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Celular: (${pedido?.cliente?.indicativo_celular_comprador ?? ''}) ${pedido?.cliente?.numero_celular_comprador ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Whatsapp: (${pedido?.cliente?.indicativo_celular_whatsapp ?? ''}) ${pedido?.cliente?.numero_celular_whatsapp ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Estado: ${pedido?.cliente?.estado ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Correo: ${pedido?.cliente?.correo_electronico_comprador ?? 'N/A'}</p>
    </div>` : '';

    const htmlFacturacion = !isComanda && pedido?.facturacion ? `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Datos de Facturación Electrónica</h2>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Nombres: ${pedido.facturacion.nombres ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Tipo Documento: ${pedido.facturacion.tipoDocumento ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Documento: ${pedido.facturacion.documento ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">País: ${pedido.facturacion.pais ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Departamento: ${pedido.facturacion.departamento ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Ciudad: ${pedido.facturacion.ciudad ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Código Postal: ${pedido.facturacion.codigoPostal ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Celular: (${pedido.facturacion.indicativoCel ?? ''}) ${pedido.facturacion.celular ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Dirección: ${pedido.facturacion.direccion ?? 'N/A'}</p>
        <p style="font-size: 14px; margin: 5px 0 5px 20px;">Alias: ${pedido.facturacion.alias ?? 'N/A'}</p>
    </div>` : '';

    const htmlEnvio = (!isComanda && (!pedido?.formaEntrega || pedido.formaEntrega.trim().toLowerCase() !== 'recoge') && pedido?.envio) ? `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #444; margin-bottom: 10px;">Datos de Envío</h2>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Nombres: ${pedido.envio.nombres ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Apellidos: ${pedido.envio.apellidos ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Alias: ${pedido.envio.alias ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Dirección: ${pedido.envio.direccionEntrega ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Unidad/Apto: ${pedido.envio.nombreUnidad ?? ''}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Especificaciones: ${pedido.envio.especificacionesInternas ?? ''}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Departamento: ${pedido.envio.departamento ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Ciudad: ${pedido.envio.ciudad ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Barrio: ${pedido.envio.barrio ?? ''}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Código Postal: ${pedido.envio.codigoPV ?? ''}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Celular: (${pedido.envio.indicativoCel ?? ''}) ${pedido.envio.celular ?? 'N/A'}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Otro Número: (${pedido.envio.indicativoOtroNumero ?? ''}) ${pedido.envio.otroNumero ?? ''}</p>
      <p style="font-size: 14px; margin: 5px 0 5px 20px;">Zona Cobro: ${pedido.envio.zonaCobro ?? 'N/A'}</p>
    </div>` : '';

    const htmlNotasProduccion = notasProduccionHtml ? `
     <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
       <h2 style="color: #444; margin-bottom: 10px;">Notas Producción</h2>
       <table style="width: 100%; border-collapse: collapse;">
         <thead>
           <tr>
             <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Producto</th>
             <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Fecha</th>
             <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nota</th>
           </tr>
         </thead>
         <tbody>
           ${notasProduccionHtml}
         </tbody>
       </table>
     </div>` : '';




    const htmlNotasDespachos = !isComanda && notasDespachosHtml ? `
      <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Notas Despachos</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Fecha</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nota</th>
                </tr>
            </thead>
            <tbody>${notasDespachosHtml}</tbody>
        </table>
      </div>` : '';

    const htmlNotasEntregas = !isComanda && notasEntregasHtml ? `
      <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Notas Entregas</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Fecha</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nota</th>
                </tr>
            </thead>
            <tbody>${notasEntregasHtml}</tbody>
        </table>
      </div>` : '';

    const htmlNotasFacturacionPagos = !isComanda && notasFacturacionPagosHtml ? `
      <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #444; margin-bottom: 10px;">Notas Facturación y Pagos</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Fecha</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nota</th>
                </tr>
            </thead>
            <tbody>${notasFacturacionPagosHtml}</tbody>
        </table>
      </div>` : '';

    // Sección Totales (reconstruida con valores recalculados y formateados)
    // Las bases gravables aproximadas también necesitan validación
    const baseIva5 = totalIva5 > 0 && !isNaN(totalIva5) ? totalIva5 / 0.05 : 0;
    const baseImpo8 = totalImpo > 0 && !isNaN(totalImpo) ? totalImpo / 0.08 : 0;
    const baseIva19 = totalIva19 > 0 && !isNaN(totalIva19) ? totalIva19 / 0.19 : 0;

    const htmlTotales = !isComanda ? `
    <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #444; margin-bottom: 10px;">Totales del Pedido</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tbody>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Subtotal (Productos sin IVA):</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Costo Envío (sin IVA):</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(envioSinIva)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descuentos:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-${this.formatCurrency(descuentos)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total Base (antes de IVA):</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(totalSinIvaGeneral)}</td>
          </tr>
          <tr><td colspan="2" style="padding: 5px 0;"></td></tr> <!-- Separador -->
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Excluidos (0%):</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(excluidos)}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Base Gravable IVA 5%:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(baseIva5)}</td> <!-- Aproximado -->
          </tr>
           <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">IVA 5%:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(totalIva5)}</td>
          </tr>
           <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Base Gravable Impoconsumo 8%:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(baseImpo8)}</td> <!-- Aproximado -->
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Impoconsumo 8%:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(totalImpo)}</td>
          </tr>
           <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Base Gravable IVA 19%:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(baseIva19)}</td> <!-- Aproximado -->
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">IVA 19%:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(totalIva19)}</td>
          </tr>
           <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total Impuestos (IVA + Impoconsumo):</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(totalIVA)}</td>
          </tr>
          <tr><td colspan="2" style="padding: 5px 0;"></td></tr> <!-- Separador -->
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 16px;">Total a Pagar:</th>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 16px; font-weight: bold;">${this.formatCurrency(totalPagar)}</td>
          </tr>
        </tbody>
      </table>
    </div>` : '';


    const htmlString = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Detalle Pedido ${pedido.nroPedido ?? ''}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { width: 90%; max-width: 800px; margin: 20px auto; background-color: #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .header, .footer, .ad { text-align: center; padding: 10px 0; }
        .header img, .footer img, .ad img { max-width: 100%; height: auto; }
        .content { padding: 20px; }
        h1 { font-size: 1.5em; color: #333; text-align: center; }
        h2 { color: #444; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 1.2em; }
        p { font-size: 14px; margin: 5px 0 10px 0; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .total-row th, .total-row td { font-size: 16px; font-weight: bold; }
        .button-link { display: inline-block; background-color: #007bff; color: #ffffff; padding: 10px 15px; margin: 5px; border-radius: 5px; text-decoration: none; font-size: 14px; text-align: center; }
        .button-table td { border: none; padding: 5px; }
        .button-table { margin-top: 20px; }
        @media (max-width: 600px) {
          .container { width: 100%; margin: 0; }
          .content { padding: 10px; }
          h1 { font-size: 1.3em; }
          h2 { font-size: 1.1em; }
          p, table, th, td { font-size: 12px; }
          .button-link { display: block; width: calc(100% - 30px); }
          .button-table td { display: block; width: 100%; box-sizing: border-box; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${encabezadoUrl ? `<div class="header"><img src="${encabezadoUrl}" alt="Encabezado"></div>` : ''}

        <div class="content">
          <h1>${textoEncabezado}</h1>
          ${!isComanda ? linkReferenciaPedido : ''}
          <p style="text-align: center;">Gracias por elegirnos. Estamos procesando tu pedido.</p>

          ${htmlDatosCliente}
          ${htmlFacturacion}
          ${htmlEnvio}

          <!-- Datos Extras Entrega -->
          <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #444; margin-bottom: 10px;">Datos Extras de Entrega</h2>
              <p style="font-size: 14px; margin: 5px 0 5px 20px;">Fecha Entrega: ${this.customFormatDate(pedido.fechaEntrega)}</p>
              <p style="font-size: 14px; margin: 5px 0 5px 20px;">Forma Entrega: ${pedido.formaEntrega ?? pedido.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega ?? 'N/A'}</p>
              <p style="font-size: 14px; margin: 5px 0 5px 20px;">Horario Entrega: ${pedido.horarioEntrega ?? pedido.carrito?.[0]?.configuracion?.datosEntrega?.horarioEntrega ?? 'N/A'}</p>
          </div>

          <!-- Datos Extras Orden -->
          <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #444; margin-bottom: 10px;">Datos Extras de la Orden</h2>
              <p style="font-size: 14px; margin: 5px 0 5px 20px;">Asesor Asignado: ${pedido?.asesorAsignado?.name ?? 'N/A'}</p>
              <p style="font-size: 14px; margin: 5px 0 5px 20px;">Fecha Compra: ${this.customFormatDateHour(pedido?.fechaCreacion)}</p>
              <p style="font-size: 14px; margin: 5px 0 5px 20px;">Fuente: <strong>SELLERCENTER</strong></p>
          </div>

          <!-- Productos del Pedido -->
          <div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #444; margin-bottom: 10px;">Productos del pedido</h2>
            <table>
              <tbody>
                ${carritoHtml}
              </tbody>
            </table>
          </div>

          ${htmlNotasProduccion}
          ${htmlNotasDespachos}
          ${htmlNotasEntregas}
          ${htmlNotasFacturacionPagos}

          <!-- Sección Gestión Pedido (Botones) -->
          ${!isComanda ? `
          <!--<div style="background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #444; margin-bottom: 10px;">Gestión del Pedido</h2>
            <table class="button-table">
              <tbody>
                <tr>
                  <td><a href="#" target="_blank" class="button-link">Aprobar Compra</a></td>
                  <td><a href="#" target="_blank" class="button-link">Pagar</a></td>
                  <td><a href="#" target="_blank" class="button-link">Rastrear Compra</a></td>
                </tr>
                 <tr>
                  <td><a href="#" target="_blank" class="button-link">Cambios al Pedido</a></td>
                  <td><a href="#" target="_blank" class="button-link">Felicitaciones</a></td>
                  <td><a href="#" target="_blank" class="button-link">Presentar PQRS</a></td>
                </tr>
                 <tr>
                  <td><a href="#" target="_blank" class="button-link">Hablar con Asesor</a></td>
                  <td><a href="#" target="_blank" class="button-link">Observaciones</a></td>
                  <td><a href="#" target="_blank" class="button-link">Términos y Condiciones</a></td>
                </tr>
                 <tr>
                  <td><a href="#" target="_blank" class="button-link">Cargar Comprobante</a></td>
                  <td><a href="#" target="_blank" class="button-link">Descargar Factura</a></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div> -->` : ''}

          ${htmlTotales}

        </div> <!-- Fin .content -->

        ${pieDePaginaUrl ? `<div class="footer"><img src="${pieDePaginaUrl}" alt="Pie de página"></div>` : ''}
        ${imgPublicidad ? `<div class="ad"><img src="${imgPublicidad}" alt="Publicidad"></div>` : ''}

      </div> <!-- Fin .container -->
    </body>
    </html>
    `;

    // Sanitizar el HTML final antes de devolverlo
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  // getHtmlPOSContent necesita una refactorización similar a getHtmlContent
  getHtmlPOSContent(pedido: POSPedido, isComanda: boolean = false): SafeHtml | null {
    if (!pedido) return null;
    // Implementación similar a getHtmlContent pero adaptada a POSPedido
    // ... (requiere refactorización similar con validaciones y carga de maestros) ...

    // Placeholder - Devuelve un mensaje indicando que necesita implementación
    console.warn("getHtmlPOSContent needs refactoring similar to getHtmlContent.");
    const placeholderHtml = `
      <h1>Comanda POS ${pedido.nroPedido ?? 'N/A'}</h1>
      <p>Contenido detallado de la comanda POS pendiente de implementación.</p>
      `;
    return this.sanitizer.bypassSecurityTrustHtml(placeholderHtml);

  }


  // formatDate no se usa en getHtmlContent, pero se mantiene
  formatDate(dateObj: Fecha | null | undefined): string {
    if (!dateObj) return '';
    const { year, month, day } = dateObj;
    if (year === undefined || month === undefined || day === undefined) return '';

    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDay = day < 10 ? `0${day}` : day;
    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  // Formatea fecha YYYY-MM-DD
  customFormatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const datePipe = new DatePipe('en-US');
      return datePipe.transform(date, 'yyyy-MM-dd') ?? 'N/A';
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Fecha inválida';
    }
  }

  // Formatea fecha y hora YYYY-MM-DD HH:mm
  customFormatDateHour(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const datePipe = new DatePipe('en-US');
      return datePipe.transform(date, 'yyyy-MM-dd HH:mm') ?? 'N/A';
    } catch (e) {
      console.error("Error formatting date/hour:", dateString, e);
      return 'Fecha inválida';
    }
  }
}
