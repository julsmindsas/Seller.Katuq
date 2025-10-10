import { Injectable } from "@angular/core";
import { BaseService } from "../base.service";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { DatePipe } from "@angular/common";
import { PedidosUtilService } from "../../../components/ventas/service/pedidos.util.service";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { POSPedido } from "../../../components/pos/pos-modelo/pedido";
import {
  Pedido,
  Fecha,
  Carrito,
  Adicion,
  Preferencia,
  Tarjeta,
} from "../../../components/ventas/modelo/pedido"; // Importar tipos necesarios
import { forkJoin, map, Observable, of, switchMap, catchError } from "rxjs"; // Importar operadores RxJS

declare var WidgetCheckout: any;

@Injectable({
  providedIn: "root",
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
    private sanitizer: DomSanitizer,
  ) {
    super(httpClient);

    const user = localStorage.getItem("user");
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
        sessionStorage.setItem(
          "allBillingZone",
          JSON.stringify(context.allBillingZone),
        );
      },
      error(err) {
        console.error("Error loading billing zones:", err);
      },
    });

    // Cargar maestros (géneros, ocasiones, etc.)
    this.pedidoUtilService.getAllMaestro$().subscribe({
      next(value: any) {
        context.maestros = value; // Almacenar todos los maestros
        console.log("Maestros loaded:", context.maestros);
      },
      error(err) {
        console.error("Error loading maestros:", err);
      },
    });
  }

  public getPaymentMethods() {
    return this.get("payment-methods");
  }

  private loginEpayco() {
    return this.get("login-epayco");
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
      currency: "COP",
      amountInCents: totalCalculado1, // Revisar si este es el total correcto a enviar
      reference: pedido.referencia?.toString(), // Añadir validación
      publicKey: publicKey,
      signature: {
        integrity: pedido?.pagoInformation?.integridad,
      },
      redirectUrl: redirectURL, // Opcional
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
    const hashBuffer = await crypto.subtle.digest("SHA-256", encondedText);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""); // "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5"
    return hashHex;
  }

  // Cambiado a COP y locale 'es-CO' para consistencia
  formatCurrency(value: number): string {
    // Añadir chequeo explícito para NaN además de null/undefined
    if (value === null || value === undefined || isNaN(value)) return "$ 0"; // Devolver '$ 0' o '' según preferencia
    const formatter = new Intl.NumberFormat("es-CO", {
      // Usar locale colombiano
      style: "currency",
      currency: "COP", // Usar COP consistentemente
      minimumFractionDigits: 0, // Ajustar según necesidad (0 o 2)
      maximumFractionDigits: 0,
    });
    return formatter.format(value);
  }

  /**
   * Valida y normaliza URLs de imágenes para que funcionen en PDFs.
   * Convierte rutas relativas a absolutas usando el origin del navegador.
   * @param imageUrl - URL de la imagen (puede ser relativa, absoluta, null o undefined)
   * @returns URL absoluta válida o null si no hay imagen
   */
  private getValidImageUrl(imageUrl: string | undefined | null): string | null {
    if (!imageUrl || imageUrl.trim() === '') return null;

    // Si es una URL completa (http:// o https://), usarla directamente
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Si es una ruta relativa, convertirla a absoluta usando el origin actual
    // Esto es crítico para PDFs, que necesitan URLs completas
    if (imageUrl.startsWith('assets/') || imageUrl.startsWith('/assets/')) {
      const baseUrl = window.location.origin;
      const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${baseUrl}${cleanPath}`;
    }

    // Si empieza con '/' pero no es assets, también convertir a absoluta
    if (imageUrl.startsWith('/')) {
      return `${window.location.origin}${imageUrl}`;
    }

    // Si no es ninguno de los casos anteriores, asumir que es relativa al root
    return `${window.location.origin}/${imageUrl}`;
  }

  /**
   * Retorna una imagen placeholder por defecto como data URI SVG.
   * Esta imagen está embebida directamente y funciona en cualquier contexto (HTML, PDF).
   * @returns Data URI de una imagen SVG placeholder
   */
  private getDefaultImageUrl(): string {
    // Data URI con SVG embebido - funciona en PDFs sin necesidad de servidor
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect fill="%23ddd" width="32" height="32"/%3E%3Ctext x="16" y="16" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="10"%3ENo img%3C/text%3E%3C/svg%3E';
  }

  // formatearFecha no se usa en getHtmlContent, pero se mantiene por si acaso
  formatearFecha(fecha: string): string {
    if (!fecha) return "";
    try {
      const date = new Date(fecha);
      const datePipe = new DatePipe("es-ES"); // Usar locale consistente
      // No es necesario convertir a ISOString si ya es un string de fecha válido
      return datePipe.transform(date, "yyyy/MM/dd") ?? ""; // Usar 'yyyy' en lugar de 'YYYY' y manejar null
    } catch (e) {
      console.error("Error formatting date:", fecha, e);
      return ""; // Devolver vacío en caso de error
    }
  }

  // Calcula el subtotal (suma de precios base sin IVA)
  checkPriceScale(pedido: Pedido | POSPedido): number {
    let totalPrecioSinIVADef = 0;
    if (!pedido?.carrito) return 0;

    pedido.carrito.forEach((itemCarrito) => {
      let totalItemSinIVA = 0;
      const producto = itemCarrito?.producto;
      // Usar Number() y || 0 para asegurar que cantidad sea numérico
      const cantidad = Number(itemCarrito?.cantidad) || 0;
      const preciosVolumen = producto?.precio?.preciosVolumen ?? [];
      // Usar Number() y || 0 para asegurar que precio sea numérico
      const precioUnitarioSinIva =
        Number(producto?.precio?.precioUnitarioSinIva) || 0;

      if (preciosVolumen.length > 0) {
        let precioVolumenEncontrado = false;
        for (const x of preciosVolumen) {
          // Asegurar que los límites y el valor sean numéricos
          const unidadesInicial = Number(x.numeroUnidadesInicial) || 0;
          const unidadesLimite = Number(x.numeroUnidadesLimite) || Infinity;
          const valorVolumenSinIVA =
            Number(x.valorUnitarioPorVolumenSinIVA) || 0;

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
        itemCarrito.configuracion.preferencias.forEach(
          (preferencia: Preferencia) => {
            // Asegurar que el valor sea numérico
            const valorPreferenciaSinIva =
              Number(preferencia.valorUnitarioSinIva) || 0;
            totalItemSinIVA += valorPreferenciaSinIva * cantidad;
          },
        );
      }

      // Asegurar que totalItemSinIVA no sea NaN antes de sumar
      if (!isNaN(totalItemSinIVA)) {
        totalPrecioSinIVADef += totalItemSinIVA;
      } else {
        console.warn(
          "NaN detectado en cálculo de subtotal para item:",
          itemCarrito,
        );
      }
    });
    // Asegurar que el resultado final no sea NaN
    return isNaN(totalPrecioSinIVADef) ? 0 : totalPrecioSinIVADef;
  }

  // Calcula el desglose de IVA
  checkIVAPrice(pedido: Pedido | POSPedido): {
    totalPrecioIVADef: number;
    totalExcluidos: number;
    totalIva5: number;
    totalImpo: number;
    totalIva19: number;
  } {
    // Asegurarse que allBillingZone esté cargado
    if (!this.allBillingZone) {
      console.warn(
        "Billing zones not loaded for IVA calculation. Returning zeros.",
      );
      this.allBillingZone = JSON.parse(
        sessionStorage.getItem("allBillingZone") || "null",
      ); // Intentar cargar desde session storage
      if (!this.allBillingZone) {
        return {
          totalPrecioIVADef: 0,
          totalExcluidos: 0,
          totalIva5: 0,
          totalImpo: 0,
          totalIva19: 0,
        };
      }
    }

    let totalPrecioIVADef = 0;
    let totalExcluidosDef = 0;
    let totalIva5Def = 0;
    let totalImpoDef = 0;
    let totalIva19Def = 0;

    if (!pedido?.carrito) {
      return {
        totalPrecioIVADef: 0,
        totalExcluidos: 0,
        totalIva5: 0,
        totalImpo: 0,
        totalIva19: 0,
      };
    }

    // Asegurar que porceDescuento sea numérico
    const porceDescuento = (Number(pedido.porceDescuento) || 0) / 100; // Calcular porcentaje una vez

    pedido.carrito.forEach((itemCarrito) => {
      const producto = itemCarrito?.producto;
      // Asegurar que cantidad sea numérico
      const cantidad = Number(itemCarrito?.cantidad) || 0;
      const preciosVolumen = producto?.precio?.preciosVolumen ?? [];
      // const valorIvaUnitario = Number(producto?.precio?.valorIva) || 0; // No se usa directamente en el cálculo principal de IVA
      const porcentajeIvaUnitario = producto?.precio?.precioUnitarioIva ?? "0"; // Porcentaje IVA unitario base como string

      let valorIvaItem = 0;
      let porcentajeIvaItemStr = porcentajeIvaUnitario; // Por defecto, usar el base
      // Asegurar que precioConIvaItem sea numérico
      let precioConIvaItem =
        Number(producto?.precio?.precioUnitarioConIva) || 0; // Precio unitario con IVA para cálculo base

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
      let valorTotalConIvaProductoConDesc =
        valorTotalConIvaProducto * (1 - porceDescuento);
      // Calcular el valor del IVA correspondiente a este producto con descuento
      // IVA = TotalConDesc / (1 + %IVA) * %IVA
      // Asegurar que porcentajeIvaNum sea numérico y válido para división
      const porcentajeIvaNum = (Number(porcentajeIvaItemStr) || 0) / 100;
      if (1 + porcentajeIvaNum !== 0) {
        // Evitar división por cero si %IVA es -100%
        valorIvaItem =
          (valorTotalConIvaProductoConDesc / (1 + porcentajeIvaNum)) *
          porcentajeIvaNum;
      } else {
        valorIvaItem = 0; // O manejar como error
        console.warn(
          "Porcentaje IVA inválido (-100%) encontrado para item:",
          itemCarrito,
        );
      }

      // Acumular solo si valorIvaItem es un número válido
      if (!isNaN(valorIvaItem)) {
        totalPrecioIVADef += valorIvaItem;
        switch (porcentajeIvaItemStr) {
          // Acumular valor con descuento si es un número válido
          case "0":
            totalExcluidosDef += isNaN(valorTotalConIvaProductoConDesc)
              ? 0
              : valorTotalConIvaProductoConDesc;
            break; // Si es 0% IVA, el valor es excluido
          case "5":
            totalIva5Def += valorIvaItem;
            break;
          case "8":
            totalImpoDef += valorIvaItem;
            break; // Asumiendo 8% es Impoconsumo
          case "19":
            totalIva19Def += valorIvaItem;
            break;
        }
      } else {
        console.warn(
          "NaN detectado en cálculo de IVA para producto principal:",
          itemCarrito,
        );
      }

      // Sumar IVA de adiciones
      if (itemCarrito.configuracion?.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion: Adicion) => {
          // Asegurar valores numéricos
          const valorAdicionConIva =
            (Number(adicion.precioTotalConIva) || 0) * cantidad;
          const valorAdicionConIvaConDesc =
            valorAdicionConIva * (1 - porceDescuento);
          const porcentajeAdicionStr = (adicion.porcentajeIva ?? 0).toString();
          const porcentajeAdicionNum =
            (Number(adicion.porcentajeIva) || 0) / 100;
          let ivaAdicion = 0;

          if (1 + porcentajeAdicionNum !== 0) {
            ivaAdicion =
              (valorAdicionConIvaConDesc / (1 + porcentajeAdicionNum)) *
              porcentajeAdicionNum;
          } else {
            console.warn(
              "Porcentaje IVA inválido (-100%) encontrado para adicion:",
              adicion,
            );
          }

          if (!isNaN(ivaAdicion)) {
            totalPrecioIVADef += ivaAdicion;
            switch (porcentajeAdicionStr) {
              case "0":
                totalExcluidosDef += isNaN(valorAdicionConIvaConDesc)
                  ? 0
                  : valorAdicionConIvaConDesc;
                break;
              case "5":
                totalIva5Def += ivaAdicion;
                break;
              case "8":
                totalImpoDef += ivaAdicion;
                break;
              case "19":
                totalIva19Def += ivaAdicion;
                break;
            }
          } else {
            console.warn(
              "NaN detectado en cálculo de IVA para adicion:",
              adicion,
            );
          }
        });
      }

      // Sumar IVA de preferencias
      if (itemCarrito.configuracion?.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(
          (preferencia: Preferencia) => {
            // Asegurar valores numéricos
            const valorPreferenciaConIva =
              (Number(preferencia.precioTotalConIva) || 0) * cantidad;
            const valorPreferenciaConIvaConDesc =
              valorPreferenciaConIva * (1 - porceDescuento);
            const porcentajePreferenciaStr = (
              preferencia.porcentajeIva ?? "0"
            ).toString();
            const porcentajePreferenciaNum =
              (Number(preferencia.porcentajeIva) || 0) / 100;
            let ivaPreferencia = 0;

            if (1 + porcentajePreferenciaNum !== 0) {
              ivaPreferencia =
                (valorPreferenciaConIvaConDesc /
                  (1 + porcentajePreferenciaNum)) *
                porcentajePreferenciaNum;
            } else {
              console.warn(
                "Porcentaje IVA inválido (-100%) encontrado para preferencia:",
                preferencia,
              );
            }

            if (!isNaN(ivaPreferencia)) {
              totalPrecioIVADef += ivaPreferencia;
              switch (porcentajePreferenciaStr) {
                case "0":
                  totalExcluidosDef += isNaN(valorPreferenciaConIvaConDesc)
                    ? 0
                    : valorPreferenciaConIvaConDesc;
                  break;
                case "5":
                  totalIva5Def += ivaPreferencia;
                  break;
                case "8":
                  totalImpoDef += ivaPreferencia;
                  break;
                case "19":
                  totalIva19Def += ivaPreferencia;
                  break;
              }
            } else {
              console.warn(
                "NaN detectado en cálculo de IVA para preferencia:",
                preferencia,
              );
            }
          },
        );
      }
    });

    // Calcular IVA del envío (domicilio)
    // Asegurar valores numéricos
    const costoEnvioConIva =
      Number(
        this.pedidoUtilService.getShippingTaxCostInvoice(
          this.allBillingZone,
          pedido,
        ),
      ) || 0;
    const porcentajeIvaEnvioStr =
      this.pedidoUtilService.getShippingTaxValueInvoice(
        this.allBillingZone,
        pedido,
      ) ?? "0";
    const porcentajeIvaEnvioNum = (Number(porcentajeIvaEnvioStr) || 0) / 100;
    let ivaEnvio = 0;

    if (1 + porcentajeIvaEnvioNum !== 0) {
      ivaEnvio =
        (costoEnvioConIva / (1 + porcentajeIvaEnvioNum)) *
        porcentajeIvaEnvioNum;
    } else {
      console.warn("Porcentaje IVA inválido (-100%) encontrado para envío.");
    }

    if (!isNaN(ivaEnvio)) {
      totalPrecioIVADef += ivaEnvio;
      switch (porcentajeIvaEnvioStr) {
        case "0":
          totalExcluidosDef += isNaN(costoEnvioConIva) ? 0 : costoEnvioConIva;
          break;
        case "5":
          totalIva5Def += ivaEnvio;
          break;
        case "8":
          totalImpoDef += ivaEnvio;
          break;
        case "19":
          totalIva19Def += ivaEnvio;
          break;
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
      totalIva19: isNaN(totalIva19Def) ? 0 : totalIva19Def,
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
      const month = (hoy.getMonth() + 1).toString().padStart(2, "0");
      const day = hoy.getDate().toString().padStart(2, "0");
      const hours = hoy.getHours().toString().padStart(2, "0");
      const minutes = hoy.getMinutes().toString().padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error al formatear la fecha actual:", error);
      return ""; // Devolver cadena vacía en caso de error
    }
  }

  // Sistema de estilos moderno para emails
  private getEmailStyles() {
    return {
      colors: {
        // Púrpura Nubank vibrante
        primary: '#8B05D9',
        primaryGradient: '#A855F7',

        // Azul Uber para enlaces
        linkBlue: '#00C6FF',
        uberBlue: '#4285F4',

        // Rosa acento
        accent: '#EC4899',
        warning: '#fbbc04',  // Amarillo alerta (compatibilidad)
        secondary: '#5f6368',  // Gris neutro (compatibilidad)

        // Backgrounds
        background: '#FDFAFF',  // Púrpura ultra claro
        backgroundCard: '#FFFFFF',

        // Textos
        black: '#000000',
        white: '#FFFFFF',
        gray: '#5F6368',
        grayLight: '#F8F8F8',
        gray50: '#F5F5F5',  // Alias para grayLight (compatibilidad)
        gray100: '#F5F5F5',  // Alias para grayLight (compatibilidad)
        text: '#000000',  // Alias para black (compatibilidad)
        textMuted: '#5F6368',  // Alias para gray (compatibilidad)

        // Divisores
        divider: '#F0F0F0',
        border: '#E8E8E8',
        borderLight: '#E8E8E8'  // Alias para border (compatibilidad)
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        // Mobile-first (grande y legible)
        heading1: '28px',  // Saludo principal
        heading2: '22px',  // Secciones
        heading3: '18px',  // Subsecciones
        body: '16px',      // Texto base (legible móvil)
        bodySmall: '14px',
        large: '32px',     // Total destacado
        bold: '700',
        semibold: '600',
        normal: '400',
        medium: '500'  // Peso medio (compatibilidad)
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '40px',
        xxxl: '48px'
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px'
      }
    };
  }

  /**
   * Estilos compactos para comanda de producción (modo impresión)
   * Diseño optimizado para uso interno: fuentes pequeñas, espaciados mínimos, sin decoración
   */
  private getComandaStyles() {
    return {
      colors: {
        // Colores simples para impresión (blanco y negro)
        primary: '#000000',
        primaryGradient: '#000000',

        // Sin colores decorativos
        linkBlue: '#000000',
        uberBlue: '#000000',
        accent: '#000000',
        warning: '#666666',
        secondary: '#666666',

        // Backgrounds minimalistas
        background: '#FFFFFF',
        backgroundCard: '#FFFFFF',

        // Textos
        black: '#000000',
        white: '#FFFFFF',
        gray: '#666666',
        grayLight: '#F5F5F5',
        gray50: '#F5F5F5',
        gray100: '#F5F5F5',
        text: '#000000',
        textMuted: '#666666',

        // Divisores simples
        divider: '#CCCCCC',
        border: '#333333',
        borderLight: '#CCCCCC'
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        // Fuentes compactas para ahorrar espacio
        heading1: '18px',  // Encabezados principales
        heading2: '14px',  // Secciones
        heading3: '12px',  // Subsecciones
        body: '11px',      // Texto base compacto
        bodySmall: '10px', // Texto pequeño
        large: '16px',     // Total destacado (más pequeño que email)
        bold: '700',
        semibold: '600',
        normal: '400',
        medium: '500'
      },
      spacing: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        xxl: '16px',
        xxxl: '20px'
      },
      borderRadius: {
        sm: '0px',  // Sin bordes redondeados para impresión
        md: '0px',
        lg: '0px'
      }
    };
  }

  // Método principal reactivo para generar el HTML del correo/comanda
  getHtmlContentObservable(pedido: Pedido, isComanda: boolean = false): Observable<SafeHtml | null> {
    if (!pedido) {
      return of(null);
    }

    return this.pedidoUtilService.waitUntilLoaded().pipe(
      switchMap(() => {
        // Asegurarse que allBillingZone esté cargado
        if (!this.allBillingZone) {
          this.allBillingZone = JSON.parse(
            sessionStorage.getItem("allBillingZone") || "null",
          );
        }

        // Todo está listo, generar HTML
        return of(this.generateHtmlContentInternal(pedido, isComanda));
      }),
      catchError(error => {
        console.error('Error generando HTML content:', error);
        return of(this.sanitizer.bypassSecurityTrustHtml(
          `<div class="alert alert-warning text-center p-3">
            <h6>⚠️ Error cargando datos</h6>
            <p>Los datos maestros no están disponibles. Por favor, intente nuevamente.</p>
            <small>Error: ${error.message}</small>
          </div>`
        ));
      })
    );
  }

  // Método principal para generar el HTML del correo/comanda (sincrónico, mejorado)
  getHtmlContent(pedido: Pedido, isComanda: boolean = false): SafeHtml | null {
    if (!pedido) return null;

    // Verificar si los maestros están listos
    if (!this.pedidoUtilService.isMaestrosReady()) {
      console.warn("Maestros not ready for synchronous HTML generation");
      return this.sanitizer.bypassSecurityTrustHtml(
        `<div class="alert alert-info text-center p-3">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          <span>Cargando datos maestros...</span>
        </div>`
      );
    }

    // Asegurarse que los maestros estén en this.maestros
    if (!this.maestros || Object.keys(this.maestros).length === 0) {
      console.warn("Maestros not loaded in PaymentService, refreshing...");
      // Intentar refrescar maestros desde el servicio
      this.pedidoUtilService.getAllMaestro$().subscribe({
        next: (value: any) => {
          this.maestros = value;
        }
      });

      return this.sanitizer.bypassSecurityTrustHtml(
        `<div class="alert alert-warning text-center p-3">
          <h6>⚠️ Recargando datos maestros</h6>
          <p>Use getHtmlContentObservable() para mejor manejo asíncrono.</p>
        </div>`
      );
    }

    // Asegurarse que allBillingZone esté cargado
    if (!this.allBillingZone) {
      console.warn("Billing zones not loaded for HTML generation.");
      this.allBillingZone = JSON.parse(
        sessionStorage.getItem("allBillingZone") || "null",
      );
      if (!this.allBillingZone) {
        return this.sanitizer.bypassSecurityTrustHtml(
          `<div class="alert alert-warning text-center p-3">
            <h6>⚠️ Zonas de facturación no disponibles</h6>
            <p>Los datos de facturación no están cargados.</p>
          </div>`
        );
      }
    }

    return this.generateHtmlContentInternal(pedido, isComanda);
  }

  private generateHtmlContentInternal(pedido: Pedido, isComanda: boolean = false): SafeHtml {
    // Cargar sistema de estilos según el tipo de documento
    // isComanda: estilos compactos para producción | !isComanda: estilos bonitos para email
    const styles = isComanda ? this.getComandaStyles() : this.getEmailStyles();

    let carritoHtml = "";
    let notasProduccionHtml = "";
    let notasDespachosHtml = "";
    let notasEntregasHtml = "";
    let notasFacturacionPagosHtml = "";
    let tarjetaIndex = 0;
    // pedido.totalImpuesto = 0; // El cálculo de IVA total se hace en checkIVAPrice

    // --- Generación HTML Notas de Producción (Fuente Única) ---
    (pedido.notasPedido?.notasProduccion ?? []).forEach((nota) => {
      const fechaNota = nota.fecha
        ? this.customFormatDateHour(nota.fecha)
        : this.customFormatDateHour(new Date().toISOString());

      // Manejar diferentes formatos de notas para compatibilidad
      let descripcion = "";
      let producto = "General";

      if (typeof nota === "string") {
        descripcion = nota;
      } else if (nota && typeof nota === "object") {
        descripcion = nota.descripcion || nota.nota || "";
        producto = nota.producto || "General";
      }

      // Solo agregar la fila si hay una descripción válida
      if (descripcion && descripcion.trim() !== "") {
        // Generar HTML para archivos adjuntos si existen
        let archivosHtml = "";
        if (nota.archivos && nota.archivos.length > 0) {
          // Mostrar imágenes y archivos completos (tanto en comanda como en email)
          archivosHtml = `
            <div style="margin-top: 8px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
              <div style="font-size: 11px; color: #6c757d; margin-bottom: 6px;">
                <i class="fa fa-paperclip" style="margin-right: 4px;"></i>
                Archivos adjuntos (${nota.archivos.length}):
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          `;

          nota.archivos.forEach((archivo) => {
            if (archivo.tipo === 'imagen') {
              archivosHtml += `
                <div style="position: relative; display: inline-block;">
                  <img src="${archivo.url}" onerror="this.src='assets/images/default-product.png'" alt="${archivo.nombre}"
                       style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;">
                  <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                    ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                  </div>
                </div>
              `;
            } else if (archivo.tipo === 'video') {
              archivosHtml += `
                <div style="position: relative; display: inline-block;">
                  <video src="${archivo.url}" controls style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;"></video>
                  <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                    ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                  </div>
                </div>
              `;
            } else {
              archivosHtml += `
                <div style="display: inline-block; text-align: center; width: 60px; height: 60px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; padding: 8px;">
                  <div style="font-size: 24px; color: #6c757d; margin-bottom: 4px;">📄</div>
                  <div style="font-size: 9px; color: #6c757d; word-break: break-word;">
                    ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                  </div>
                </div>
              `;
            }
          });

          archivosHtml += `
              </div>
            </div>
          `;
        }

        notasProduccionHtml += `
          <tr>
            <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; white-space: nowrap;">${producto}</td>
            <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; white-space: nowrap;">${fechaNota}</td>
            <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 100%;">
              ${descripcion}
            </td>
            <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 200px;">
              ${archivosHtml}
            </td>
          </tr>
        `;
      }
    });

    // Notas Generales del Pedido
    (pedido.notasPedido?.notasDespachos ?? []).forEach((nota) => {
      // Generar HTML para archivos adjuntos si existen
      let archivosHtml = "";
      if (nota.archivos && nota.archivos.length > 0) {
        archivosHtml = `
          <div style="margin-top: 8px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
            <div style="font-size: 11px; color: #6c757d; margin-bottom: 6px;">
              <i class="fa fa-paperclip" style="margin-right: 4px;"></i>
              Archivos adjuntos (${nota.archivos.length}):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        `;
        
        nota.archivos.forEach((archivo) => {
          if (archivo.tipo === 'imagen') {
            archivosHtml += `
              <div style="position: relative; display: inline-block;">
                <img src="${archivo.url}" alt="${archivo.nombre}" 
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          } else if (archivo.tipo === 'video') {
            archivosHtml += `
              <div style="position: relative; display: inline-block;">
                <video src="${archivo.url}" controls style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;"></video>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          } else {
            archivosHtml += `
              <div style="display: inline-block; text-align: center; width: 60px; height: 60px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; padding: 8px;">
                <div style="font-size: 24px; color: #6c757d; margin-bottom: 4px;">📄</div>
                <div style="font-size: 9px; color: #6c757d; word-break: break-word;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          }
        });
        
        archivosHtml += `
            </div>
          </div>
        `;
      }

      notasDespachosHtml += `
        <tr>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 100%;">
            ${nota.nota ?? ""}
          </td>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 200px;">
            ${archivosHtml}
          </td>
        </tr>
      `;
    });
    (pedido.notasPedido?.notasEntregas ?? []).forEach((nota) => {
      // Generar HTML para archivos adjuntos si existen
      let archivosHtml = "";
      if (nota.archivos && nota.archivos.length > 0) {
        archivosHtml = `
          <div style="margin-top: 8px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
            <div style="font-size: 11px; color: #6c757d; margin-bottom: 6px;">
              <i class="fa fa-paperclip" style="margin-right: 4px;"></i>
              Archivos adjuntos (${nota.archivos.length}):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        `;
        
        nota.archivos.forEach((archivo) => {
          if (archivo.tipo === 'imagen') {
            archivosHtml += `
              <div style="position: relative; display: inline-block;">
                <img src="${archivo.url}" alt="${archivo.nombre}" 
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          } else if (archivo.tipo === 'video') {
            archivosHtml += `
              <div style="position: relative; display: inline-block;">
                <video src="${archivo.url}" controls style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;"></video>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          } else {
            archivosHtml += `
              <div style="display: inline-block; text-align: center; width: 60px; height: 60px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; padding: 8px;">
                <div style="font-size: 24px; color: #6c757d; margin-bottom: 4px;">📄</div>
                <div style="font-size: 9px; color: #6c757d; word-break: break-word;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          }
        });
        
        archivosHtml += `
            </div>
          </div>
        `;
      }

      notasEntregasHtml += `
        <tr>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 100%;">
            ${nota.nota ?? ""}
          </td>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 200px;">
            ${archivosHtml}
          </td>
        </tr>
      `;
    });
    (pedido.notasPedido?.notasFacturacionPagos ?? []).forEach((nota) => {
      // Generar HTML para archivos adjuntos si existen
      let archivosHtml = "";
      if (nota.archivos && nota.archivos.length > 0) {
        archivosHtml = `
          <div style="margin-top: 8px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
            <div style="font-size: 11px; color: #6c757d; margin-bottom: 6px;">
              <i class="fa fa-paperclip" style="margin-right: 4px;"></i>
              Archivos adjuntos (${nota.archivos.length}):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        `;
        
        nota.archivos.forEach((archivo) => {
          if (archivo.tipo === 'imagen') {
            archivosHtml += `
              <div style="position: relative; display: inline-block;">
                <img src="${archivo.url}" alt="${archivo.nombre}" 
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          } else if (archivo.tipo === 'video') {
            archivosHtml += `
              <div style="position: relative; display: inline-block;">
                <video src="${archivo.url}" controls style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;"></video>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 9px; padding: 2px 4px; text-align: center; border-radius: 0 0 4px 4px;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          } else {
            archivosHtml += `
              <div style="display: inline-block; text-align: center; width: 60px; height: 60px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; padding: 8px;">
                <div style="font-size: 24px; color: #6c757d; margin-bottom: 4px;">📄</div>
                <div style="font-size: 9px; color: #6c757d; word-break: break-word;">
                  ${archivo.nombre.length > 15 ? archivo.nombre.substring(0, 15) + '...' : archivo.nombre}
                </div>
              </div>
            `;
          }
        });
        
        archivosHtml += `
            </div>
          </div>
        `;
      }

      notasFacturacionPagosHtml += `
        <tr>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 100%;">
            ${nota.nota ?? ""}
          </td>
          <td style="border: 1px solid #E0E0E0; padding: 16px; font-size: 14px; color: #000000; width: 200px;">
            ${archivosHtml}
          </td>
        </tr>
      `;
    });

    // --- Generación HTML Carrito ---

    // Inicializar tabla para modo comanda (sin encabezado global, cada producto tendrá el suyo)
    if (isComanda) {
      carritoHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 12px; font-family: Arial, sans-serif;">
          <tbody>
      `;
    }

    let productoIndex = 0; // Contador de productos para encabezados

    (pedido.carrito ?? []).forEach((item) => {
      productoIndex++;
      const producto = item?.producto;
      const configuracion = item?.configuracion;
      // Asegurar que cantidad sea numérico
      const cantidad = Number(item?.cantidad) || 0;
      const imagenUrl =
        producto?.crearProducto?.imagenesPrincipales?.[0]?.urls ??
        "assets/images/default-product.png"; // Imagen por defecto
      const tituloProducto =
        producto?.crearProducto?.titulo ?? "Producto no disponible";
      const referenciaProducto = producto?.identificacion?.referencia ?? "N/A";

      // 🔄 NUEVO: Calcular precios considerando escalas de volumen
      const preciosVolumen = producto?.precio?.preciosVolumen ?? [];

      // Precio unitario sin IVA con escalas de volumen
      let precioUnitarioSinIva = Number(producto?.precio?.precioUnitarioSinIva) || 0;
      if (preciosVolumen.length > 0) {
        const precioVolumen = preciosVolumen.find((x: any) => {
          const min = Number(x.numeroUnidadesInicial) || 0;
          const max = Number(x.numeroUnidadesLimite) || Infinity;
          return cantidad >= min && cantidad <= max;
        });
        if (precioVolumen) {
          precioUnitarioSinIva = Number(precioVolumen.valorUnitarioPorVolumenSinIVA) || 0;
        }
      }

      // Precio unitario con IVA con escalas de volumen
      let precioUnitarioConIva = Number(producto?.precio?.precioUnitarioConIva) || 0;
      if (preciosVolumen.length > 0) {
        const precioVolumen = preciosVolumen.find((x: any) => {
          const min = Number(x.numeroUnidadesInicial) || 0;
          const max = Number(x.numeroUnidadesLimite) || Infinity;
          return cantidad >= min && cantidad <= max;
        });
        if (precioVolumen) {
          precioUnitarioConIva = Number(precioVolumen.valorUnitarioPorVolumenConIVA) || 0;
        }
      }

      // IVA unitario con escalas de volumen
      let valorIva = Number(producto?.precio?.valorIva) || 0;
      if (preciosVolumen.length > 0) {
        const precioVolumen = preciosVolumen.find((x: any) => {
          const min = Number(x.numeroUnidadesInicial) || 0;
          const max = Number(x.numeroUnidadesLimite) || Infinity;
          return cantidad >= min && cantidad <= max;
        });
        if (precioVolumen) {
          valorIva = Number(precioVolumen.valorUnitarioPorVolumenIva) || 0;
        }
      }

      const porcentajeIva = producto?.precio?.precioUnitarioIva ?? "0";

      // Totales por cantidad (respetando precio unitario en las columnas unitarias)
      const valorIvaTotalProducto = valorIva * cantidad;
      const totalConIvaProducto = precioUnitarioConIva * cantidad;

      // ========== MODO COMANDA: Tabla compacta tradicional ==========
      if (isComanda) {
        // Encabezado del producto
        carritoHtml += `
          <tr style="background-color: #000; color: #FFF;">
            <td colspan="4" style="padding: 8px 4px; font-size: 11px; font-weight: bold;">
              🛍️ PRODUCTO #${productoIndex}: ${tituloProducto}
            </td>
          </tr>
          <tr style="background-color: #F5F5F5; border-bottom: 1px solid #000;">
            <th style="padding: 4px; font-size: 9px; text-align: left; width: 50px;">Img</th>
            <th style="padding: 4px; font-size: 9px; text-align: left;">Detalles</th>
            <th style="padding: 4px; font-size: 9px; text-align: center; width: 50px;">Cant</th>
            <th style="padding: 4px; font-size: 9px; text-align: right; width: 80px;">Total</th>
          </tr>
        `;

        // Fila del producto principal
        carritoHtml += `
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px; vertical-align: top;">
              <img src="${imagenUrl}" onerror="this.src='assets/images/default-product.png'" width="40" height="40" style="display: block;">
            </td>
            <td style="padding: 4px; font-size: 10px; vertical-align: top;">
              <div style="font-weight: bold; color: #000; margin-bottom: 2px;">${tituloProducto}</div>
              <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Ref: ${referenciaProducto}</div>
              <div style="font-size: 8px; color: #888;">Precio Unit: ${this.formatCurrency(precioUnitarioConIva)}</div>
              ${producto?.crearProducto?.descripcion ? `<div style="font-size: 9px; font-style: italic; color: #666; line-height: 1.3; margin-top: 2px;">${producto.crearProducto.descripcion}</div>` : ''}
            </td>
            <td style="padding: 4px; font-size: 10px; vertical-align: top; text-align: center; font-weight: bold;">
              ${cantidad}
            </td>
            <td style="padding: 4px; font-size: 10px; vertical-align: top; text-align: right; font-weight: bold; color: #000;">
              ${this.formatCurrency(totalConIvaProducto)}
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 0;">
        `;

        // Preferencias compactas con precios
        if (configuracion?.preferencias && configuracion.preferencias.length > 0) {
          carritoHtml += `<div style="margin-top: 4px; padding: 3px 0; border-top: 1px dotted #999;">`;
          carritoHtml += `<div style="font-size: 8px; color: #000; font-weight: bold; margin-bottom: 2px;">Preferencias:</div>`;

          configuracion.preferencias.forEach((pref: Preferencia) => {
            // Calcular precios de preferencias
            const valorUnitarioSinIvaPref = Number(pref.valorUnitarioSinIva) || 0;
            const valorIvaPref = Number(pref.valorIva) || 0;
            const precioTotalConIvaPref = Number(pref.precioTotalConIva) || 0;
            const valorIvaPrefTotal = valorIvaPref * cantidad;
            const precioTotalConIvaPrefTotal = precioTotalConIvaPref * cantidad;

            // ✅ FIX: Validar y normalizar URL de imagen para PDFs
            const imagenUrl = this.getValidImageUrl(pref.imagen);
            const imagenFinal = imagenUrl || this.getDefaultImageUrl();

            carritoHtml += `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 2px;">
                <tr>
                  <td style="font-size: 9px; color: #333; padding: 1px 0 1px 4px; width: 40px;">
                    ${imagenUrl ? `<img src="${imagenFinal}" alt="${pref.titulo || 'Pref'}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 3px; vertical-align: middle;">` : '•'}
                  </td>
                  <td style="font-size: 9px; color: #333; padding: 1px 0;">
                    ${pref.titulo || ''}: ${pref.subtitulo || ''}
                  </td>
                  <td style="font-size: 9px; color: #000; font-weight: bold; text-align: right; padding: 1px 4px 1px 0; white-space: nowrap;">
                    ${this.formatCurrency(precioTotalConIvaPrefTotal)}
                  </td>
                </tr>
              </table>`;
          });
          carritoHtml += `</div>`;
        }

        // Adiciones compactas con precios
        if (configuracion?.adiciones && configuracion.adiciones.length > 0) {
          carritoHtml += `<div style="margin-top: 4px; padding: 3px 0; border-top: 1px dotted #999;">`;
          carritoHtml += `<div style="font-size: 8px; color: #000; font-weight: bold; margin-bottom: 2px;">Adiciones:</div>`;

          configuracion.adiciones.forEach((adic: Adicion) => {
            // Calcular precios de adiciones
            const valorUnitarioSinIvaAdic = Number(adic.valorUnitarioSinIva) || 0;
            const valorIvaAdic = Number(adic.valorIva) || 0;
            const precioTotalConIvaAdic = Number(adic.precioTotalConIva) || 0;
            const cantidadAdicion = (adic as any).cantidad || 1;
            const cantidadTotalAdicion = cantidadAdicion * cantidad;
            const valorIvaAdicTotal = valorIvaAdic * cantidadTotalAdicion;
            const precioTotalConIvaAdicTotal = precioTotalConIvaAdic * cantidadTotalAdicion;

            // ✅ FIX: Validar y normalizar URL de imagen para PDFs
            const imagenUrl = this.getValidImageUrl(adic.imagen);
            const imagenFinal = imagenUrl || this.getDefaultImageUrl();

            carritoHtml += `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 2px;">
                <tr>
                  <td style="font-size: 9px; color: #333; padding: 1px 0 1px 4px; width: 40px;">
                    ${imagenUrl ? `<img src="${imagenFinal}" alt="${adic.titulo || 'Adic'}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 3px; vertical-align: middle;">` : '•'}
                  </td>
                  <td style="font-size: 9px; color: #333; padding: 1px 0;">
                    ${adic.titulo || ''}: ${adic.subtitulo || ''} ${cantidadTotalAdicion > 1 ? `(x${cantidadTotalAdicion})` : ''}
                  </td>
                  <td style="font-size: 9px; color: #000; font-weight: bold; text-align: right; padding: 1px 4px 1px 0; white-space: nowrap;">
                    ${this.formatCurrency(precioTotalConIvaAdicTotal)}
                  </td>
                </tr>
              </table>`;
          });
          carritoHtml += `</div>`;
        }

        // Datos de Entrega compactos
        if (configuracion?.datosEntrega) {
          const datosEntrega = configuracion.datosEntrega;
          const ocasionId = datosEntrega.ocasion;
          let generoId: any = datosEntrega.genero;
          if (Array.isArray(datosEntrega.genero)) {
            generoId = datosEntrega.genero[0];
          }

          const ocasionObj = this.maestros.ocasiones?.find((o) => o.id == ocasionId);
          const generoObj = this.maestros.generos?.find((g) => g.id == generoId);
          const ocasionName = ocasionObj?.name ?? null;
          const generoName = generoObj?.name ?? null;
          const observaciones = datosEntrega.observaciones ?? "";

          if (ocasionName || generoName || observaciones) {
            carritoHtml += `<div style="margin-top: 4px; padding: 3px 0; border-top: 1px dotted #999;">`;
            carritoHtml += `<div style="font-size: 8px; color: #000; font-weight: bold; margin-bottom: 2px;">Detalles de Entrega:</div>`;
            if (ocasionName) carritoHtml += `<div style="font-size: 9px; color: #333; margin-left: 4px;">• Ocasión: ${ocasionName}</div>`;
            if (generoName) carritoHtml += `<div style="font-size: 9px; color: #333; margin-left: 4px;">• Género: ${generoName}</div>`;
            if (observaciones) carritoHtml += `<div style="font-size: 9px; color: #333; margin-left: 4px;">• Obs: ${observaciones}</div>`;
            carritoHtml += `</div>`;
          }
        }

        // Tarjetas de regalo compactas
        if (configuracion?.tarjetas && configuracion.tarjetas.length > 0) {
          configuracion.tarjetas.forEach((tarjeta: Tarjeta) => {
            if (tarjeta.mensaje) {
              tarjetaIndex++;
              carritoHtml += `<div style="margin-top: 4px; padding: 3px 0; border-top: 1px dotted #999;">`;
              carritoHtml += `<div style="font-size: 8px; color: #000; font-weight: bold; margin-bottom: 2px;">Tarjeta #${tarjetaIndex}:</div>`;
              carritoHtml += `<div style="font-size: 9px; color: #333; margin-left: 4px;">${tarjeta.mensaje}</div>`;
              if (tarjeta.de) carritoHtml += `<div style="font-size: 8px; color: #666; margin-left: 4px; margin-top: 1px;">De: ${tarjeta.de}</div>`;
              if (tarjeta.para) carritoHtml += `<div style="font-size: 8px; color: #666; margin-left: 4px;">Para: ${tarjeta.para}</div>`;
              carritoHtml += `</div>`;
            }
          });
        }

        // Notas de Producción para este producto específico
        const notasProducto = (pedido.notasPedido?.notasProduccion ?? []).filter((nota) => {
          const productoNota = nota?.producto || "General";
          return productoNota === tituloProducto || productoNota.includes(tituloProducto) || tituloProducto.includes(productoNota);
        });

        if (notasProducto.length > 0) {
          carritoHtml += `<div style="margin-top: 4px; padding: 3px 0; border-top: 1px dotted #999;">`;
          carritoHtml += `<div style="font-size: 8px; color: #000; font-weight: bold; margin-bottom: 2px;">Notas de Producción:</div>`;

          notasProducto.forEach((nota) => {
            const fechaNota = nota.fecha ? this.customFormatDateHour(nota.fecha) : this.customFormatDateHour(new Date().toISOString());
            const descripcion = nota.descripcion || nota.nota || "";

            if (descripcion && descripcion.trim() !== "") {
              carritoHtml += `<div style="font-size: 9px; color: #333; margin-left: 4px; margin-top: 2px; padding: 2px 0;">`;
              carritoHtml += `<div style="font-weight: bold; color: #000; margin-bottom: 1px;">${fechaNota}</div>`;
              carritoHtml += `<div>${descripcion}</div>`;

              // Archivos adjuntos en notas
              if (nota.archivos && nota.archivos.length > 0) {
                carritoHtml += `<div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">`;
                nota.archivos.forEach((archivo) => {
                  if (archivo.tipo === 'imagen') {
                    carritoHtml += `<img src="${archivo.url}" onerror="this.src='assets/images/default-product.png'" alt="${archivo.nombre}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px; border: 1px solid #dee2e6;">`;
                  } else if (archivo.tipo === 'video') {
                    carritoHtml += `<video src="${archivo.url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px; border: 1px solid #dee2e6;"></video>`;
                  } else {
                    carritoHtml += `<div style="width: 40px; height: 40px; background: #e9ecef; border-radius: 3px; border: 1px solid #dee2e6; display: inline-flex; align-items: center; justify-content: center; font-size: 16px;">📄</div>`;
                  }
                });
                carritoHtml += `</div>`;
              }

              carritoHtml += `</div>`;
            }
          });

          carritoHtml += `</div>`;
        }

        carritoHtml += `
            </td> <!-- Close colspan="4" nested details -->
          </tr>
          <tr>
            <td colspan="4" style="padding: 8px 0; border-bottom: 3px solid #000;"></td>
          </tr>
        `;

      } else {
        // ========== MODO EMAIL: Diseño Uber/Nubank (SIN CAMBIOS) ==========
        carritoHtml += `
          <tr style="background-color: ${styles.colors.grayLight};">
            <th style="padding: ${styles.spacing.md}; text-align: left; font-size: ${styles.typography.bodySmall}; font-weight: ${styles.typography.semibold}; color: ${styles.colors.gray};">Producto</th>
            <th style="padding: ${styles.spacing.md}; text-align: right; font-size: ${styles.typography.bodySmall}; font-weight: ${styles.typography.semibold}; color: ${styles.colors.gray};">Total</th>
          </tr>
          <tr style="border-bottom: 1px solid ${styles.colors.divider};">
            <td style="padding: ${styles.spacing.lg} ${styles.spacing.md};">
              <img src="${imagenUrl}" onerror="this.src='assets/images/default-product.png'" width="60" height="60" style="border-radius: ${styles.borderRadius.md}; vertical-align: middle; margin-right: ${styles.spacing.md};">
              <div style="display: inline-block; vertical-align: middle;">
                <div style="font-size: ${styles.typography.body}; color: ${styles.colors.black}; font-weight: ${styles.typography.semibold}; line-height: 1.4;">
                  ${tituloProducto}
                </div>
                <div style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray}; margin-top: ${styles.spacing.xs}; line-height: 1.4;">
                  Ref: ${referenciaProducto} • Cantidad: ${cantidad}
                </div>
              </div>
            </td>
            <td style="padding: ${styles.spacing.lg} ${styles.spacing.md}; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.black};">
              ${this.formatCurrency(totalConIvaProducto)} COP
            </td>
          </tr>
          ${isComanda && producto?.crearProducto?.descripcion ? `
            <tr>
              <td colspan="8" style="border: 1px solid #E0E0E0; padding: 12px; font-size: 13px; color: #000000; color: #555; font-style: italic;">
                <strong>Descripción:</strong> ${producto.crearProducto.descripcion}
              </td>
            </tr>
          ` : ""}
        `;

        // Preferencias estilo Nubank/Uber
        if (
          configuracion?.preferencias &&
          configuracion.preferencias.length > 0
        ) {
          carritoHtml += `
            <tr>
              <td colspan="2" style="padding: ${styles.spacing.md} ${styles.spacing.md} ${styles.spacing.sm} ${styles.spacing.md};">
                <div style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray}; font-weight: ${styles.typography.semibold};">
                  ✨ Preferencias seleccionadas
                </div>
              </td>
            </tr>`;

          configuracion.preferencias.forEach((pref: Preferencia) => {
            // Asegurar valores numéricos
            const valorUnitarioSinIvaPref = Number(pref.valorUnitarioSinIva) || 0;
            const valorIvaPref = Number(pref.valorIva) || 0;
            const precioTotalConIvaPref = Number(pref.precioTotalConIva) || 0;
            const valorIvaPrefTotal = valorIvaPref * cantidad;
            const precioTotalConIvaPrefTotal = precioTotalConIvaPref * cantidad;

            // ✅ FIX: Validar y normalizar URL de imagen para PDFs
            const imagenUrl = this.getValidImageUrl(pref.imagen);
            const imagenFinal = imagenUrl || this.getDefaultImageUrl();

            carritoHtml += `
              <tr style="border-bottom: 1px solid ${styles.colors.divider};">
                <td style="padding: ${styles.spacing.md} ${styles.spacing.md} ${styles.spacing.md} 40px;">
                  ${imagenUrl ? `<img src="${imagenFinal}" alt="${pref.titulo || 'Preferencia'}" width="32" height="32" style="border-radius: ${styles.borderRadius.sm}; vertical-align: middle; margin-right: ${styles.spacing.md};">` : ''}
                  <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; vertical-align: middle;">
                    ${pref.titulo || ''}: ${pref.subtitulo || ''}
                  </span>
                </td>
                <td style="padding: ${styles.spacing.md}; text-align: right; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black};">
                  ${this.formatCurrency(precioTotalConIvaPrefTotal)} COP
                </td>
              </tr>`;
          });
        }

        // Adiciones estilo Nubank/Uber
        if (configuracion?.adiciones && configuracion.adiciones.length > 0) {
          carritoHtml += `
            <tr>
              <td colspan="2" style="padding: ${styles.spacing.md} ${styles.spacing.md} ${styles.spacing.sm} ${styles.spacing.md};">
                <div style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray}; font-weight: ${styles.typography.semibold};">
                  ➕ Adiciones extras
                </div>
              </td>
            </tr>`;

          configuracion.adiciones.forEach((adic: Adicion) => {
            // Asegurar valores numéricos
            const valorUnitarioSinIvaAdic = Number(adic.valorUnitarioSinIva) || 0;
            const valorIvaAdic = Number(adic.valorIva) || 0;
            const precioTotalConIvaAdic = Number(adic.precioTotalConIva) || 0;
            // Obtener la cantidad de la adición (si existe) o usar 1 por defecto
            const cantidadAdicion = (adic as any).cantidad || 1;
            const cantidadTotalAdicion = cantidadAdicion * cantidad;
            const valorIvaAdicTotal = valorIvaAdic * cantidadTotalAdicion;
            const precioTotalConIvaAdicTotal = precioTotalConIvaAdic * cantidadTotalAdicion;

            // ✅ FIX: Validar y normalizar URL de imagen para PDFs
            const imagenUrl = this.getValidImageUrl(adic.imagen);
            const imagenFinal = imagenUrl || this.getDefaultImageUrl();

            carritoHtml += `
              <tr style="border-bottom: 1px solid ${styles.colors.divider};">
                <td style="padding: ${styles.spacing.md} ${styles.spacing.md} ${styles.spacing.md} 40px;">
                  ${imagenUrl ? `<img src="${imagenFinal}" alt="${adic.titulo || 'Adición'}" width="32" height="32" style="border-radius: ${styles.borderRadius.sm}; vertical-align: middle; margin-right: ${styles.spacing.md};">` : ''}
                  <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; vertical-align: middle;">
                    ${adic.titulo || ''}: ${adic.subtitulo || ''} ${cantidadTotalAdicion > 1 ? `(x${cantidadTotalAdicion})` : ''}
                  </span>
                </td>
                <td style="padding: ${styles.spacing.md}; text-align: right; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black};">
                  ${this.formatCurrency(precioTotalConIvaAdicTotal)} COP
                </td>
              </tr>`;
          });
        }

        // Detalles de Entrega (Ocasión, Género, Observaciones) - Condicional
        if (configuracion?.datosEntrega) {
          const datosEntrega = configuracion.datosEntrega;
          // Buscar nombres en maestros usando IDs
          const ocasionId = datosEntrega.ocasion; // Es el ID directo

          // El género puede ser un ID directo o un array, verificamos ambos casos
          let generoId: any = datosEntrega.genero;
          if (Array.isArray(datosEntrega.genero)) {
            generoId = datosEntrega.genero[0]; // Si es array, tomamos el primero
          }

          const ocasionObj = this.maestros.ocasiones?.find(
            (o) => o.id == ocasionId,
          );
          const generoObj = this.maestros.generos?.find((g) => g.id == generoId);

          const ocasionName = ocasionObj?.name ?? null; // Obtener nombre o null
          const generoName = generoObj?.name ?? null; // Obtener nombre o null
          const observaciones = datosEntrega.observaciones ?? "";

          // Log para depuración del género
          console.log('🔍 Debug género en payment.service:', {
            datosEntrega: datosEntrega,
            generoId: generoId,
            generoObj: generoObj,
            generoName: generoName,
            maestrosGeneros: this.maestros.generos
          });

          // Detalles de Entrega simplificados
          if (ocasionName || generoName || observaciones) {
            carritoHtml += `
              <tr>
                <td colspan="2" style="padding: ${styles.spacing.md};">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: ${styles.borderRadius.md}; border-left: 4px solid ${styles.colors.primary}; overflow: hidden;">
                    <tr>
                      <td style="padding: ${styles.spacing.md};">
                        <div style="font-size: ${styles.typography.bodySmall}; font-weight: ${styles.typography.semibold}; color: ${styles.colors.black}; margin-bottom: ${styles.spacing.sm};">
                          📝 Detalles de Entrega
                        </div>
                        ${ocasionName ? `
                        <div style="margin: ${styles.spacing.xs} 0;">
                          <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray};">Ocasión: </span>
                          <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; font-weight: ${styles.typography.semibold};">${ocasionName}</span>
                        </div>` : ''}
                        ${generoName ? `
                        <div style="margin: ${styles.spacing.xs} 0;">
                          <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray};">Género: </span>
                          <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; font-weight: ${styles.typography.semibold};">${generoName}</span>
                        </div>` : ''}
                        ${observaciones ? `
                        <div style="margin: ${styles.spacing.sm} 0 0 0;">
                          <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray};">Observaciones: </span>
                          <div style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; margin-top: ${styles.spacing.xs}; line-height: 1.6;">
                            ${observaciones}
                          </div>
                        </div>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
          }
        }

        // Tarjetas de regalo modernas
        if (configuracion?.tarjetas && configuracion.tarjetas.length > 0) {
          configuracion.tarjetas.forEach((tarjeta: Tarjeta) => {
            if (tarjeta.mensaje) {
              // Solo mostrar si hay mensaje
              tarjetaIndex++;
              carritoHtml += `
                <tr>
                  <td colspan="2" style="padding: ${styles.spacing.lg} ${styles.spacing.md};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFEBF5 100%); border-left: 4px solid #EC4899; border-radius: ${styles.borderRadius.md}; overflow: hidden;">
                      <tr>
                        <td style="padding: ${styles.spacing.md};">
                          <!-- Header -->
                          <div style="margin-bottom: ${styles.spacing.md};">
                            <span style="font-size: 20px; margin-right: ${styles.spacing.sm};">💌</span>
                            <span style="font-size: ${styles.typography.body}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
                              Tarjeta de Regalo ${tarjetaIndex}
                            </span>
                          </div>

                          <!-- De/Para -->
                          <div style="margin-bottom: ${styles.spacing.md};">
                            <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray};">De: </span>
                            <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; font-weight: ${styles.typography.semibold};">
                              ${tarjeta.de || 'Anónimo'}
                            </span>
                            <span style="margin: 0 ${styles.spacing.sm}; color: #E0E0E0;">•</span>
                            <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.gray};">Para: </span>
                            <span style="font-size: ${styles.typography.bodySmall}; color: ${styles.colors.black}; font-weight: ${styles.typography.semibold};">
                              ${tarjeta.para || 'Destinatario'}
                            </span>
                          </div>

                          <!-- Mensaje -->
                          <div style="background-color: ${styles.colors.white}; padding: ${styles.spacing.md}; border-radius: ${styles.borderRadius.sm}; border-left: 3px solid #EC4899;">
                            <p style="margin: 0; font-size: ${styles.typography.body}; color: ${styles.colors.black}; line-height: 1.6; font-style: italic;">
                              "${tarjeta.mensaje}"
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
            }
          });
        }
      }
      // carritoHtml += `<tr><td colspan="8" style="border-bottom: 2px solid #ccc; padding: 5px 0;"></td></tr>`; // Separador visual - ELIMINADO para diseño más limpio
    }); // Fin forEach carrito

    // Cerrar tabla para modo comanda (DESPUÉS del forEach)
    if (isComanda) {
      carritoHtml += `
          </tbody>
        </table>
      `;
    }

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

    // ✅ OPTIMIZADO: Usar valores DIRECTOS del pedido (ya actualizados)
    // Esto evita recalcular y asegura consistencia con los valores mostrados en la UI
    // Para el PDF, usar solo el subtotal de productos sin envío
    this.pedidoUtilService.pedido = pedido;
    const subtotal = this.pedidoUtilService.getSubtotalSinEnvio();
    const totalIVA = Number(pedido.totalImpuesto) || 0;
    const descuentos = Number(pedido.totalDescuento) || 0;
    const envioSinIva = Number(pedido.totalEnvio) || 0;
    
    // ✅ Calcular total final usando valores del pedido
    const totalSinIvaGeneral = subtotal - descuentos;
    const totalBase = totalSinIvaGeneral + envioSinIva; // Total base debe incluir envío
    const totalPagar = totalSinIvaGeneral + totalIVA + envioSinIva;
    
    // 🔍 Log para verificar que los valores coincidan
    console.log('📊 PDF - Valores del pedido actualizado:', {
      subtotal,
      envioSinIva,
      descuentos,
      totalSinIvaGeneral,
      totalBase,
      totalIVA,
      totalPagar,
      pedidoOriginal: {
        totalPedidoSinDescuento: pedido.totalPedidoSinDescuento,
        totalEnvio: pedido.totalEnvio,
        totalDescuento: pedido.totalDescuento,
        totalImpuesto: pedido.totalImpuesto
      }
    });

    // ✅ Usar valores por defecto para desglose de IVA
    // Estas propiedades no existen en el modelo Pedido, se mantienen por compatibilidad
    const excluidos = 0;
    const totalIva5 = 0;
    const totalImpo = 0;
    const totalIva19 = totalIVA; // Usar el total de IVA del pedido

    // --- Log para depuración ---
    console.log("Valores para Totales HTML:", {
      subtotal,
      envioSinIva,
      descuentos,
      totalSinIvaGeneral,
      totalBase,
      totalIVA,
      totalPagar,
      excluidos,
      totalIva5,
      totalImpo,
      totalIva19,
      pedido: {
        totalPedidoSinDescuento: pedido.totalPedidoSinDescuento,
        totalEnvio: pedido.totalEnvio,
        totalDescuento: pedido.totalDescuento,
        totalImpuesto: pedido.totalImpuesto
      }
    });

    // --- Construcción Final del HTML ---
    const empresaActual = JSON.parse(
      localStorage.getItem("currentCompany") || "{}",
    );
    const encabezadoUrl = empresaActual.imageEmail?.encabezado || ""; // URL por defecto si no existe
    const pieDePaginaUrl = empresaActual.imageEmail?.piepagina || ""; // URL por defecto si no existe
    const imgPublicidad =
      "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Empresas%2FJulsmind%2Fimagenes%2FEmail%2FPublicidad%2FContactanos.png?alt=media&token=5df01a71-6869-40cb-a4c4-d2a2675c1a0f";

    const textoEncabezado = !isComanda
      ? `¡Tu pedido ha sido registrado con éxito!`
      : `Orden Pedido Nro: ${pedido.nroPedido ?? "N/A"}`;
    const linkReferenciaPedido = `<a href="${window.location.origin}/ventas/pedidos?nroPedido=${pedido.nroPedido ?? ""}" style="text-decoration: none; color: #007bff;"><p>Referencia del Pedido: ${pedido.nroPedido ?? "N/A"}</p></a>`;

    // Encabezado ultra minimalista para comanda (solo modo producción)
    const htmlEncabezadoComanda = isComanda ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid #000; padding: ${styles.spacing.sm} 0; margin-bottom: ${styles.spacing.md};">
        <tr>
          <td style="vertical-align: top;">
            <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: #000;">
              ORDEN #${pedido.nroPedido ?? "N/A"}
            </h1>
          </td>
          <td style="vertical-align: top; text-align: right;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding: 2px 0; font-size: ${styles.typography.bodySmall}; text-align: right;"><strong>Estado:</strong> ${pedido?.estadoProceso ?? "N/A"}</td></tr>
              <tr><td style="padding: 2px 0; font-size: ${styles.typography.bodySmall}; text-align: right;"><strong>Entrega:</strong> ${this.customFormatDate(pedido.fechaEntrega)}</td></tr>
              <tr><td style="padding: 2px 0; font-size: ${styles.typography.bodySmall}; text-align: right;"><strong>Creado:</strong> ${this.customFormatDate(pedido.fechaCreacion)}</td></tr>
              <tr><td style="padding: 2px 0; font-size: ${styles.typography.bodySmall}; text-align: right;"><strong>Impreso:</strong> ${this.customFormatDate(new Date().toISOString())}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    ` : '';

    // Reconstruir secciones con validaciones internas y usando las variables HTML generadas
    // Cards individuales modernizadas con INLINE STYLES para compatibilidad con emails
    const htmlDatosClienteModerno = !isComanda
      ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 3px solid ${styles.colors.primary}; padding-top: ${styles.spacing.lg}; margin-bottom: ${styles.spacing.xl};">
                    <tr>
                      <td>
                        <h2 style="margin: 0 0 ${styles.spacing.md} 0; font-size: ${styles.typography.heading2}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
                          Datos del Cliente
                        </h2>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Tipo Documento:</strong> ${pedido?.cliente?.tipo_documento_comprador ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Documento:</strong> ${pedido?.cliente?.documento ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Nombres:</strong> ${pedido?.cliente?.nombres_completos ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Apellidos:</strong> ${pedido?.cliente?.apellidos_completos ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Celular:</strong> (${pedido?.cliente?.indicativo_celular_comprador ?? ""}) ${pedido?.cliente?.numero_celular_comprador ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">WhatsApp:</strong> (${pedido?.cliente?.indicativo_celular_whatsapp ?? ""}) ${pedido?.cliente?.numero_celular_whatsapp ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Estado:</strong> ${pedido?.cliente?.estado ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Correo:</strong> <span style="color: ${styles.colors.linkBlue};">${pedido?.cliente?.correo_electronico_comprador ?? "N/A"}</span></td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>`
      : "";

    const htmlFacturacionModerno =
      !isComanda && pedido?.facturacion
        ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 3px solid ${styles.colors.primary}; padding-top: ${styles.spacing.lg}; margin-bottom: ${styles.spacing.xl};">
                    <tr>
                      <td>
                        <h2 style="margin: 0 0 ${styles.spacing.md} 0; font-size: ${styles.typography.heading2}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
                          Datos de Facturación Electrónica
                        </h2>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Nombres:</strong> ${pedido.facturacion.nombres ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Tipo Documento:</strong> ${pedido.facturacion.tipoDocumento ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Documento:</strong> ${pedido.facturacion.documento ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">País:</strong> ${pedido.facturacion.pais ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Departamento:</strong> ${pedido.facturacion.departamento ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Ciudad:</strong> ${pedido.facturacion.ciudad ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Código Postal:</strong> ${pedido.facturacion.codigoPostal ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Celular:</strong> (${pedido.facturacion.indicativoCel ?? ""}) ${pedido.facturacion.celular ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Dirección:</strong> ${pedido.facturacion.direccion ?? "N/A"}</td></tr>
                          <tr><td style="padding: ${styles.spacing.xs} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.8;"><strong style="color: ${styles.colors.black};">Alias:</strong> ${pedido.facturacion.alias ?? "N/A"}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>`
        : "";

    const htmlEnvioModerno =
      !isComanda &&
      (!pedido?.formaEntrega ||
        pedido.formaEntrega.trim().toLowerCase() !== "recoge") &&
      pedido?.envio
        ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.md}; border: 1px solid ${styles.colors.border}; overflow: hidden;">
            <tr>
              <td style="background-color: ${styles.colors.primary}; padding: ${styles.spacing.sm} ${styles.spacing.md}; border-bottom: 1px solid ${styles.colors.primary};">
                <span style="display: inline-block; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.white}; vertical-align: middle; margin-right: ${styles.spacing.xs};">📦</span>
                <span style="color: ${styles.colors.white}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.bold}; vertical-align: middle;">Datos de Envío</span>
              </td>
            </tr>
            <tr>
              <td style="padding: ${styles.spacing.lg};">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="vertical-align: top; padding-right: ${styles.spacing.sm};">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Nombres:</strong> ${pedido.envio.nombres ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Apellidos:</strong> ${pedido.envio.apellidos ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Alias:</strong> ${pedido.envio.alias ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Dirección:</strong> ${pedido.envio.direccionEntrega ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Unidad/Apto:</strong> ${pedido.envio.nombreUnidad ?? ""}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Especificaciones:</strong> ${pedido.envio.especificacionesInternas ?? ""}</td></tr>
                      </table>
                    </td>
                    <td width="50%" style="vertical-align: top; padding-left: ${styles.spacing.sm};">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Departamento:</strong> ${pedido.envio.departamento ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Ciudad:</strong> ${pedido.envio.ciudad ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Barrio:</strong> ${pedido.envio.barrio ?? ""}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Código Postal:</strong> ${pedido.envio.codigoPV ?? ""}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Celular:</strong> (${pedido.envio.indicativoCel ?? ""}) ${pedido.envio.celular ?? "N/A"}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Otro Número:</strong> (${pedido.envio.indicativoOtroNumero ?? ""}) ${pedido.envio.otroNumero ?? ""}</td></tr>
                        <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Zona Cobro:</strong> ${pedido.envio.zonaCobro ?? "N/A"}</td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
                ${(pedido.envio.observaciones && pedido.envio.observaciones.trim() !== '') ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${styles.spacing.md};">
                  <tr>
                    <td style="padding: ${styles.spacing.sm}; background-color: #fef3c7; border-left: 3px solid ${styles.colors.warning}; border-radius: ${styles.borderRadius.sm};">
                      <span style="color: #92400e; font-size: ${styles.typography.body}; font-weight: ${styles.typography.medium};">
                        <strong>📝 Observaciones de Entrega:</strong> ${pedido.envio.observaciones}
                      </span>
                    </td>
                  </tr>
                </table>` : ''}
                ${pedido.envio.valorZonaCobro ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${styles.spacing.xs};">
                  <tr>
                    <td style="padding: ${styles.spacing.sm}; background-color: #d1fae5; border-left: 3px solid ${styles.colors.accent}; border-radius: ${styles.borderRadius.sm};">
                      <span style="color: #059669; font-size: ${styles.typography.body}; font-weight: ${styles.typography.medium};">
                        <strong>💵 Valor Zona de Cobro:</strong> ${this.formatCurrency(pedido.envio.valorZonaCobro)}
                      </span>
                    </td>
                  </tr>
                </table>` : ''}
              </td>
            </tr>
          </table>`
        : "";

    // En modo comanda, las notas de producción se muestran dentro de cada producto
    // En modo email, se muestran en sección separada
    const htmlNotasProduccion = (notasProduccionHtml && !isComanda)
      ? `
     <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.lg}; border: 1px solid ${styles.colors.borderLight};">
       <tr>
         <td style="padding: ${styles.spacing.md};">
           <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid ${styles.colors.primary}; padding-bottom: ${styles.spacing.sm}; margin-bottom: ${styles.spacing.md};">
             <tr>
               <td style="padding: 0;">
                 <span style="color: ${styles.colors.text}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.semibold};">Notas Producción</span>
               </td>
             </tr>
           </table>
           <table width="100%" cellpadding="${styles.spacing.sm}" cellspacing="0" style="border-collapse: collapse; border: 1px solid ${styles.colors.border};">
             <thead>
               <tr style="background-color: ${styles.colors.gray100};">
                 <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Producto</th>
                 <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Fecha</th>
                 <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Nota</th>
                 <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Archivos Adjuntos</th>
               </tr>
             </thead>
             <tbody>
               ${notasProduccionHtml}
             </tbody>
           </table>
         </td>
       </tr>
     </table>`
      : "";

    const htmlNotasDespachos =
      !isComanda && notasDespachosHtml
        ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.lg}; border: 1px solid ${styles.colors.borderLight};">
        <tr>
          <td style="padding: ${styles.spacing.md};">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid ${styles.colors.primary}; padding-bottom: ${styles.spacing.sm}; margin-bottom: ${styles.spacing.md};">
              <tr>
                <td style="padding: 0;">
                  <span style="color: ${styles.colors.text}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.semibold};">Notas Despachos</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="${styles.spacing.sm}" cellspacing="0" style="border-collapse: collapse; border: 1px solid ${styles.colors.border};">
              <thead>
                <tr style="background-color: ${styles.colors.gray100};">
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Fecha</th>
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Nota</th>
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Archivos Adjuntos</th>
                </tr>
              </thead>
              <tbody>${notasDespachosHtml}</tbody>
            </table>
          </td>
        </tr>
      </table>`
        : "";

    const htmlNotasEntregas =
      !isComanda && notasEntregasHtml
        ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.lg}; border: 1px solid ${styles.colors.borderLight};">
        <tr>
          <td style="padding: ${styles.spacing.md};">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid ${styles.colors.primary}; padding-bottom: ${styles.spacing.sm}; margin-bottom: ${styles.spacing.md};">
              <tr>
                <td style="padding: 0;">
                  <span style="color: ${styles.colors.text}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.semibold};">Notas Entregas</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="${styles.spacing.sm}" cellspacing="0" style="border-collapse: collapse; border: 1px solid ${styles.colors.border};">
              <thead>
                <tr style="background-color: ${styles.colors.gray100};">
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Fecha</th>
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Nota</th>
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Archivos Adjuntos</th>
                </tr>
              </thead>
              <tbody>${notasEntregasHtml}</tbody>
            </table>
          </td>
        </tr>
      </table>`
        : "";

    const htmlNotasFacturacionPagos =
      !isComanda && notasFacturacionPagosHtml
        ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.lg}; border: 1px solid ${styles.colors.borderLight};">
        <tr>
          <td style="padding: ${styles.spacing.md};">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid ${styles.colors.primary}; padding-bottom: ${styles.spacing.sm}; margin-bottom: ${styles.spacing.md};">
              <tr>
                <td style="padding: 0;">
                  <span style="color: ${styles.colors.text}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.semibold};">Notas Facturación y Pagos</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="${styles.spacing.sm}" cellspacing="0" style="border-collapse: collapse; border: 1px solid ${styles.colors.border};">
              <thead>
                <tr style="background-color: ${styles.colors.gray100};">
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Fecha</th>
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Nota</th>
                  <th style="border: 1px solid ${styles.colors.border}; padding: ${styles.spacing.sm}; text-align: left; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.text}; font-weight: ${styles.typography.semibold};">Archivos Adjuntos</th>
                </tr>
              </thead>
              <tbody>${notasFacturacionPagosHtml}</tbody>
            </table>
          </td>
        </tr>
      </table>`
        : "";

    // Sección Totales (reconstruida con valores recalculados y formateados)
    // Las bases gravables aproximadas también necesitan validación
    const baseIva5 = totalIva5 > 0 && !isNaN(totalIva5) ? totalIva5 / 0.05 : 0;
    const baseImpo8 = totalImpo > 0 && !isNaN(totalImpo) ? totalImpo / 0.08 : 0;
    const baseIva19 =
      totalIva19 > 0 && !isNaN(totalIva19) ? totalIva19 / 0.19 : 0;

    const htmlTotales = isComanda
      ? `
    <!-- Sección Totales Comanda (Compacta) -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #000; margin-top: ${styles.spacing.xl}; padding-top: ${styles.spacing.md}; margin-bottom: ${styles.spacing.md};">
      <tr>
        <td style="padding: ${styles.spacing.sm} 0; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          Subtotal productos:
        </td>
        <td style="padding: ${styles.spacing.sm} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          ${this.formatCurrency(subtotal)} COP
        </td>
      </tr>
      <tr>
        <td style="padding: ${styles.spacing.sm} 0; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          Envío:
        </td>
        <td style="padding: ${styles.spacing.sm} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          ${this.formatCurrency(envioSinIva)} COP
        </td>
      </tr>
      ${descuentos > 0 ? `
      <tr>
        <td style="padding: ${styles.spacing.sm} 0; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          Descuentos:
        </td>
        <td style="padding: ${styles.spacing.sm} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          -${this.formatCurrency(descuentos)} COP
        </td>
      </tr>` : ''}
      <tr>
        <td style="padding: ${styles.spacing.sm} 0; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          IVA:
        </td>
        <td style="padding: ${styles.spacing.sm} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          ${this.formatCurrency(totalIVA)} COP
        </td>
      </tr>
      <tr style="border-top: 1px solid #333;">
        <td style="padding: ${styles.spacing.md} 0; font-size: ${styles.typography.heading2}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
          TOTAL:
        </td>
        <td style="padding: ${styles.spacing.md} 0; text-align: right; font-size: ${styles.typography.heading2}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
          ${this.formatCurrency(totalPagar)} COP
        </td>
      </tr>
      ${pedido.formaDePago ? `
      <tr style="border-top: 1px solid #CCC;">
        <td style="padding: ${styles.spacing.sm} 0; font-size: ${styles.typography.body}; color: ${styles.colors.text};">
          Forma de pago:
        </td>
        <td style="padding: ${styles.spacing.sm} 0; text-align: right; font-size: ${styles.typography.body}; font-weight: ${styles.typography.semibold}; color: ${styles.colors.text};">
          ${pedido.formaDePago}
        </td>
      </tr>` : ''}
    </table>`
      : `
    <!-- Sección Totales Estilo Uber -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${styles.spacing.xl};">
      <tr>
        <td style="padding: 0 ${styles.spacing.md};">

          <!-- Total Grande -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: ${styles.spacing.lg} 0;">
                <span style="font-size: ${styles.typography.heading2}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
                  Total
                </span>
              </td>
              <td style="padding: ${styles.spacing.lg} 0; text-align: right;">
                <span style="font-size: ${styles.typography.large}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
                  ${this.formatCurrency(totalPagar)} COP
                </span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-bottom: 2px solid ${styles.colors.border};"></td>
            </tr>
          </table>

          <!-- Desglose Sin Bordes -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${styles.spacing.md};">
            <tr>
              <td style="padding: ${styles.spacing.md} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray};">
                Subtotal de productos
              </td>
              <td style="padding: ${styles.spacing.md} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.black};">
                ${this.formatCurrency(subtotal)} COP
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-bottom: 1px solid ${styles.colors.divider};"></td>
            </tr>
            <tr>
              <td style="padding: ${styles.spacing.md} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray};">
                Costo de envío
              </td>
              <td style="padding: ${styles.spacing.md} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.black};">
                ${this.formatCurrency(envioSinIva)} COP
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-bottom: 1px solid ${styles.colors.divider};"></td>
            </tr>
            ${descuentos > 0 ? `
            <tr>
              <td style="padding: ${styles.spacing.md} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray};">
                Descuentos y ajustes
              </td>
              <td style="padding: ${styles.spacing.md} 0; text-align: right; font-size: ${styles.typography.body}; color: #00A86B;">
                -${this.formatCurrency(descuentos)} COP
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-bottom: 1px solid ${styles.colors.divider};"></td>
            </tr>` : ''}
            <tr>
              <td style="padding: ${styles.spacing.md} 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray};">
                Total impuestos
              </td>
              <td style="padding: ${styles.spacing.md} 0; text-align: right; font-size: ${styles.typography.body}; color: ${styles.colors.black};">
                ${this.formatCurrency(totalIVA)} COP
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>`;

    // Layout de dos columnas usando tablas para compatibilidad con emails
    const twoColumnSection = !isComanda ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${styles.spacing.md};">
        <tr>
          <td width="48%" style="vertical-align: top; padding-right: ${styles.spacing.sm};">
            ${htmlDatosClienteModerno}
          </td>
          <td width="4%"></td>
          <td width="48%" style="vertical-align: top; padding-left: ${styles.spacing.sm};">
            ${htmlFacturacionModerno || `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.gray50}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.md}; border: 1px solid ${styles.colors.borderLight}; opacity: 0.7;">
                <tr>
                  <td style="padding: ${styles.spacing.md};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid ${styles.colors.border}; padding-bottom: ${styles.spacing.sm}; margin-bottom: ${styles.spacing.md};">
                      <tr>
                        <td style="padding: 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: ${styles.colors.secondary}; color: ${styles.colors.white}; font-size: ${styles.typography.body}; text-align: center; line-height: 24px; border-radius: 50%; margin-right: ${styles.spacing.sm}; vertical-align: middle;">🧾</span>
                          <span style="color: ${styles.colors.text}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.semibold}; vertical-align: middle;">Datos de Facturación</span>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; font-style: italic; text-align: center;">No se requiere facturación electrónica para este pedido</td></tr>
                    </table>
                  </td>
                </tr>
              </table>`}
          </td>
        </tr>
      </table>
    ` : `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${styles.spacing.md};">
        <tr>
          <td width="100%" style="vertical-align: top;">
            ${htmlDatosClienteModerno}
          </td>
        </tr>
      </table>
    `;

    const htmlString = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Detalle Pedido ${pedido.nroPedido ?? ""}</title>
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse: collapse;}
      </style>
      <![endif]-->
      <style type="text/css">
        /* Minimal CSS - Solo para progressive enhancement y responsive */
        body {
          font-family: ${styles.typography.fontFamily};
          margin: 0;
          padding: 0;
          background-color: ${styles.colors.background};
        }
        @media only screen and (max-width: 600px) {
          .two-column { width: 100% !important; display: block !important; }
        }
      </style>
    </head>
    <body style="font-family: ${styles.typography.fontFamily}; margin: 0; padding: 0; background-color: ${styles.colors.background};">
      ${isComanda ? `
      <!-- Contenedor Comanda (Full Width A4) -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${styles.colors.background};">
        <tr>
          <td style="padding: ${styles.spacing.md};">

            <!-- Encabezado Comanda -->
            ${htmlEncabezadoComanda}

            <!-- Content Area Comanda -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 0;">
      ` : `
      <!-- Contenedor principal con ancho máximo de 600px para emails -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${styles.colors.background};">
        <tr>
          <td align="center" style="padding: ${styles.spacing.lg} 0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md};" class="two-column">
              <tr>
                <td style="padding: 0;">

                  <!-- Header Image del Comercio (Separado) -->
                  ${!isComanda && encabezadoUrl && encabezadoUrl.trim() !== '' ? `
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; padding: 0;">
                        <img src="${encabezadoUrl}" alt="Encabezado" style="max-width: 100%; height: auto; display: block; border: 0;">
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  <!-- Content Area -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: ${styles.spacing.lg};">
      `}

                        ${!isComanda ? `
                        <!-- Banner Confirmación Gradiente Púrpura -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${styles.colors.primary} 0%, ${styles.colors.primaryGradient} 100%); margin-bottom: ${styles.spacing.xl}; border-radius: ${styles.borderRadius.md}; overflow: hidden;">
                          <tr>
                            <td style="padding: ${styles.spacing.lg};">
                              <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                  <td style="vertical-align: middle; width: 36px;">
                                    <!-- Badge Check Verde -->
                                    <div style="width: 32px; height: 32px; background-color: #10B981; color: ${styles.colors.white}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; font-weight: ${styles.typography.bold}; text-align: center; line-height: 32px;">
                                      ✓
                                    </div>
                                  </td>
                                  <td style="vertical-align: middle; padding-left: ${styles.spacing.md};">
                                    <!-- Título -->
                                    <h1 style="margin: 0; font-size: 20px; font-weight: ${styles.typography.bold}; color: ${styles.colors.white}; line-height: 1.3;">
                                      ¡Pedido Confirmado! #${pedido.nroPedido ?? 'N/A'}
                                    </h1>
                                    <!-- Métricas inline -->
                                    <p style="margin: ${styles.spacing.xs} 0 0 0; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.white}; opacity: 0.95; line-height: 1.4;">
                                      ${this.formatCurrency(totalPagar)} COP • ${pedido.carrito?.length || 0} Items${pedido.fechaEntrega ? ` • Entrega: ${this.customFormatDate(pedido.fechaEntrega)}` : ''}
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Saludo Personalizado Estilo Nubank -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${styles.spacing.xl};">
                          <tr>
                            <td style="padding: 0 ${styles.spacing.md};">
                              <h1 style="margin: 0 0 ${styles.spacing.md} 0; font-size: ${styles.typography.heading1}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black}; line-height: 1.3;">
                                Hola, ${pedido?.cliente?.nombres_completos || 'Cliente'}:
                              </h1>
                              <p style="margin: 0; font-size: ${styles.typography.body}; color: ${styles.colors.gray}; line-height: 1.6;">
                                Te escribimos porque tu pedido <strong style="color: ${styles.colors.black};">#${pedido.nroPedido ?? "N/A"}</strong> ha sido registrado exitosamente por un valor de <strong style="color: ${styles.colors.black};">${this.formatCurrency(totalPagar)} COP</strong>.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Alert Box Púrpura (Para fecha de entrega) -->
                        ${pedido.fechaEntrega ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${styles.spacing.xl};">
                          <tr>
                            <td style="padding: 0 ${styles.spacing.md};">
                              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.primary}; border-radius: ${styles.borderRadius.md}; overflow: hidden;">
                                <tr>
                                  <td style="padding: ${styles.spacing.lg}; text-align: center;">
                                    <p style="margin: 0; font-size: ${styles.typography.body}; color: ${styles.colors.white}; font-weight: ${styles.typography.semibold};">
                                      📦 Tu pedido será entregado el <strong>${this.customFormatDate(pedido.fechaEntrega)}</strong>
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>` : ''}
                        ` : ''}

                        <!-- Cliente y Facturación -->
                        ${twoColumnSection}

                        <!-- Envío -->
                        ${htmlEnvioModerno}

                        <!-- Datos Extras - Layout de Dos Columnas -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${styles.spacing.md};">
                          <tr>
                            <td width="48%" style="vertical-align: top; padding-right: ${styles.spacing.sm};" class="two-column">
                              <!-- Datos Extras Entrega -->
                              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.md}; border: 1px solid ${styles.colors.border}; overflow: hidden;">
                                <tr>
                                  <td style="background-color: ${styles.colors.primary}; padding: ${styles.spacing.sm} ${styles.spacing.md}; border-bottom: 1px solid ${styles.colors.primary};">
                                    <span style="display: inline-block; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.white}; vertical-align: middle; margin-right: ${styles.spacing.xs};">📅</span>
                                    <span style="color: ${styles.colors.white}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.bold}; vertical-align: middle;">Datos Extras de Entrega</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: ${styles.spacing.lg};">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Fecha Entrega:</strong> ${this.customFormatDate(pedido.fechaEntrega)}</td></tr>
                                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Forma Entrega:</strong> ${pedido.formaEntrega ?? pedido.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega ?? "N/A"}</td></tr>
                                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Horario Entrega:</strong> ${pedido.horarioEntrega ?? pedido.carrito?.[0]?.configuracion?.datosEntrega?.horarioEntrega ?? "N/A"}</td></tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                            <td width="4%"></td>
                            <td width="48%" style="vertical-align: top; padding-left: ${styles.spacing.sm};" class="two-column">
                              <!-- Datos Extras Orden -->
                              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${styles.colors.backgroundCard}; border-radius: ${styles.borderRadius.md}; margin-bottom: ${styles.spacing.md}; border: 1px solid ${styles.colors.border}; overflow: hidden;">
                                <tr>
                                  <td style="background-color: ${styles.colors.primary}; padding: ${styles.spacing.sm} ${styles.spacing.md}; border-bottom: 1px solid ${styles.colors.primary};">
                                    <span style="display: inline-block; font-size: ${styles.typography.bodySmall}; color: ${styles.colors.white}; vertical-align: middle; margin-right: ${styles.spacing.xs};">📋</span>
                                    <span style="color: ${styles.colors.white}; font-size: ${styles.typography.heading3}; font-weight: ${styles.typography.bold}; vertical-align: middle;">Datos Extras de la Orden</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: ${styles.spacing.lg};">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Asesor Asignado:</strong> ${pedido?.asesorAsignado?.name ?? "N/A"}</td></tr>
                                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Fecha Compra:</strong> ${this.customFormatDateHour(pedido?.fechaCreacion)}</td></tr>
                                      <tr><td style="padding: ${styles.spacing.xs} 0; color: ${styles.colors.textMuted}; font-size: ${styles.typography.body}; line-height: 1.5;"><strong style="color: ${styles.colors.text};">Fuente:</strong> <strong style="color: ${styles.colors.primary};">SELLERCENTER</strong></td></tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Separador -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: ${styles.spacing.lg} 0;">
                          <tr><td style="border-top: 1px solid ${styles.colors.border};"></td></tr>
                        </table>

                        <!-- Productos del Pedido estilo Uber/Nubank -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 3px solid ${styles.colors.primary}; padding-top: ${styles.spacing.lg}; margin-bottom: ${styles.spacing.xl};">
                          <tr>
                            <td style="padding: 0 ${styles.spacing.md};">
                              <h2 style="margin: 0 0 ${styles.spacing.lg} 0; font-size: ${styles.typography.heading2}; font-weight: ${styles.typography.bold}; color: ${styles.colors.black};">
                                Productos del pedido
                              </h2>
                              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                <tbody>
                                  ${carritoHtml}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Notas -->
                        ${htmlNotasProduccion}
                        ${htmlNotasDespachos}
                        ${htmlNotasEntregas}
                        ${htmlNotasFacturacionPagos}

                        <!-- Totales -->
                        ${htmlTotales}

                      </td>
                    </tr>
                  </table>

                  ${!isComanda ? `
                  <!-- Footer Image -->
                  ${pieDePaginaUrl ? `
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: ${styles.spacing.md} 0;">
                        <img src="${pieDePaginaUrl}" alt="Pie de página" style="max-width: 100%; height: auto; display: block;">
                      </td>
                    </tr>
                  </table>` : ""}

                  <!-- Publicidad -->
                  ${imgPublicidad ? `
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: ${styles.spacing.md} 0;">
                        <img src="${imgPublicidad}" alt="Publicidad" style="max-width: 100%; height: auto; display: block;">
                      </td>
                    </tr>
                  </table>` : ""}
                  ` : ''}

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Sanitizar el HTML final antes de devolverlo
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  // getHtmlPOSContent necesita una refactorización similar a getHtmlContent
  getHtmlPOSContent(
    pedido: POSPedido,
    isComanda: boolean = false,
  ): SafeHtml | null {
    if (!pedido) return null;
    // Implementación similar a getHtmlContent pero adaptada a POSPedido
    // ... (requiere refactorización similar con validaciones y carga de maestros) ...

    // Placeholder - Devuelve un mensaje indicando que necesita implementación
    console.warn(
      "getHtmlPOSContent needs refactoring similar to getHtmlContent.",
    );
    const placeholderHtml = `
      <h1>Comanda POS ${pedido.nroPedido ?? "N/A"}</h1>
      <p>Contenido detallado de la comanda POS pendiente de implementación.</p>
      `;
    return this.sanitizer.bypassSecurityTrustHtml(placeholderHtml);
  }

  // formatDate no se usa en getHtmlContent, pero se mantiene
  formatDate(dateObj: Fecha | null | undefined): string {
    if (!dateObj) return "";
    const { year, month, day } = dateObj;
    if (year === undefined || month === undefined || day === undefined)
      return "";

    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDay = day < 10 ? `0${day}` : day;
    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  // Formatea fecha YYYY-MM-DD
  customFormatDate(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const datePipe = new DatePipe("en-US");
      return datePipe.transform(date, "yyyy-MM-dd") ?? "N/A";
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Fecha inválida";
    }
  }

  // Formatea fecha y hora YYYY-MM-DD HH:mm
  customFormatDateHour(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const datePipe = new DatePipe("en-US");
      return datePipe.transform(date, "yyyy-MM-dd HH:mm") ?? "N/A";
    } catch (e) {
      console.error("Error formatting date/hour:", dateString, e);
      return "Fecha inválida";
    }
  }
}
