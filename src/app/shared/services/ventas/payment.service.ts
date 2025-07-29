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
        primary: '#2563eb',
        primaryLight: '#3b82f6',
        secondary: '#7c3aed',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4',
        white: '#ffffff',
        black: '#000000',
        gray50: '#f9fafb',
        gray100: '#f3f4f6',
        gray200: '#e5e7eb',
        gray300: '#d1d5db',
        gray400: '#9ca3af',
        gray500: '#6b7280',
        gray600: '#4b5563',
        gray700: '#374151',
        gray800: '#1f2937',
        gray900: '#111827',
        text: '#1f2937',
        textMuted: '#6b7280',
        border: '#e5e7eb',
        borderLight: '#f3f4f6',
        background: '#f9fafb'
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        heading1: '16px',
        heading2: '14px',
        heading3: '13px',
        heading4: '12px',
        heading5: '11px',
        body: '11px',
        bodySmall: '10px',
        caption: '9px',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700'
      },
      spacing: {
        xs: '2px',
        sm: '3px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        xxl: '10px',
        xxxl: '12px'
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
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
    // Cargar sistema de estilos moderno
    const styles = this.getEmailStyles();

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
    (pedido.notasPedido?.notasDespachos ?? []).forEach((nota) => {
      notasDespachosHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${nota.nota ?? ""}</td>
        </tr>
      `;
    });
    (pedido.notasPedido?.notasEntregas ?? []).forEach((nota) => {
      notasEntregasHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${nota.nota ?? ""}</td>
        </tr>
      `;
    });
    (pedido.notasPedido?.notasFacturacionPagos ?? []).forEach((nota) => {
      notasFacturacionPagosHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">${this.customFormatDateHour(nota.fecha)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; width: 100%;">${nota.nota ?? ""}</td>
        </tr>
      `;
    });

    // --- Generación HTML Carrito ---
    (pedido.carrito ?? []).forEach((item) => {
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
      // Asegurar valores numéricos
      const precioUnitarioSinIva =
        Number(producto?.precio?.precioUnitarioSinIva) || 0;
      const porcentajeIva = producto?.precio?.precioUnitarioIva ?? "0";
      const valorIva = Number(producto?.precio?.valorIva) || 0;
      const precioUnitarioConIva =
        Number(producto?.precio?.precioUnitarioConIva) || 0;

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
        ${isComanda && producto?.crearProducto?.descripcion ? `
          <tr>
            <td colspan="8" style="border: 1px solid #ddd; padding: 8px; color: #555; font-style: italic;">
              <strong>Descripción:</strong> ${producto.crearProducto.descripcion}
            </td>
          </tr>
        ` : ""}
      `;

      // Preferencias
      if (
        configuracion?.preferencias &&
        configuracion.preferencias.length > 0
      ) {
        carritoHtml += `<tr style="background-color: #f9f9f9;"><td colspan="8" style="padding: 5px 8px; font-weight: bold; color: #333;">Preferencias:</td></tr>`;
        configuracion.preferencias.forEach((pref: Preferencia) => {
          // Asegurar valores numéricos
          const valorUnitarioSinIvaPref = Number(pref.valorUnitarioSinIva) || 0;
          const valorIvaPref = Number(pref.valorIva) || 0;
          const precioTotalConIvaPref = Number(pref.precioTotalConIva) || 0;
          carritoHtml += `
            <tr style="background-color: #f9f9f9;">
              <td></td> <!-- Indentación -->
              <td style="border: 1px solid #ddd; padding: 8px;"><img src="${pref.imagen ?? ""}" alt="Preferencia" style="width: 40px; height: auto;"></td>
              <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">${pref.titulo ?? ""}: ${pref.subtitulo ?? ""}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorUnitarioSinIvaPref)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${pref.porcentajeIva ?? "0"}%</td>
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
              <td style="border: 1px solid #ddd; padding: 8px;"><img src="${adic.imagen ?? ""}" alt="Adición" style="width: 40px; height: auto;"></td>
              <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">${adic.titulo ?? ""}: ${adic.subtitulo ?? ""}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatCurrency(valorUnitarioSinIvaAdic)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${adic.porcentajeIva ?? "0"}%</td>
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

        // Solo mostrar la sección si hay ocasión, género u observaciones
        if (ocasionName || generoName || observaciones) {
          carritoHtml += `
            <tr><td colspan="8" style="padding-top: 10px; padding-bottom: 5px; font-weight: bold; color: #333;">Observaciones y Detalles de Entrega:</td></tr>
            <tr>
              <td colspan="8" style="border: 1px solid #ddd; padding: 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #e9e9e9;">
                      ${ocasionName ? '<th style="border: 1px solid #ddd; padding: 8px; width: 25%;">Ocasión</th>' : ""}
                      ${generoName ? '<th style="border: 1px solid #ddd; padding: 8px; width: 25%;">Género</th>' : ""}
                      <th style="border: 1px solid #ddd; padding: 8px;">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="background-color: #f9f9f9;">
                      ${ocasionName ? `<td style="border: 1px solid #ddd; padding: 8px;">${ocasionName}</td>` : ""}
                      ${generoName ? `<td style="border: 1px solid #ddd; padding: 8px;">${generoName}</td>` : ""}
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
          if (tarjeta.mensaje) {
            // Solo mostrar si hay mensaje
            tarjetaIndex++;
            carritoHtml += `
              <tr style="background-color: #fefefe;"><td colspan="8" style="padding: 5px 8px; font-weight: bold; color: #333;">Tarjeta ${tarjetaIndex}:</td></tr>
              <tr style="background-color: #fefefe;">
                <td></td> <!-- Indentación -->
                <td style="border: 1px solid #ddd; padding: 8px;">Para: ${tarjeta.para ?? ""}</td>
                <td colspan="5" style="border: 1px solid #ddd; padding: 8px;">Mensaje: ${tarjeta.mensaje}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">De: ${tarjeta.de ?? ""}</td>
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
    const totalSinIvaGeneral =
      (isNaN(subtotal) ? 0 : subtotal) +
      (isNaN(envioSinIva) ? 0 : envioSinIva) -
      (isNaN(descuentos) ? 0 : descuentos);
    const totalPagar =
      (isNaN(totalSinIvaGeneral) ? 0 : totalSinIvaGeneral) +
      (isNaN(totalIVA) ? 0 : totalIVA);

    const excluidos = ivaInfo.totalExcluidos; // Ya validado en checkIVAPrice
    const totalIva5 = ivaInfo.totalIva5; // Ya validado
    const totalImpo = ivaInfo.totalImpo; // Ya validado
    const totalIva19 = ivaInfo.totalIva19; // Ya validado

    // --- Log para depuración ---
    console.log("Valores para Totales HTML:", {
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
      ivaInfo, // Objeto completo de checkIVAPrice
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

    // Reconstruir secciones con validaciones internas y usando las variables HTML generadas
    // Cards individuales modernizadas para el layout de dos columnas - Compatible con impresión sin estilos
    const htmlDatosClienteModerno = !isComanda
      ? `
                  <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="vertical-align: middle; padding: 0;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">👤</span>
                            <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Datos del Cliente</h2>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <div style="padding: 4px 0;">
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Tipo Documento:</strong> ${pedido?.cliente?.tipo_documento_comprador ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Documento:</strong> ${pedido?.cliente?.documento ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Nombres:</strong> ${pedido?.cliente?.nombres_completos ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Apellidos:</strong> ${pedido?.cliente?.apellidos_completos ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Celular:</strong> (${pedido?.cliente?.indicativo_celular_comprador ?? ""}) ${pedido?.cliente?.numero_celular_comprador ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">WhatsApp:</strong> (${pedido?.cliente?.indicativo_celular_whatsapp ?? ""}) ${pedido?.cliente?.numero_celular_whatsapp ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Estado:</strong> ${pedido?.cliente?.estado ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Correo:</strong> ${pedido?.cliente?.correo_electronico_comprador ?? "N/A"}</p>
                    </div>
                  </div>`
      : "";

    const htmlFacturacionModerno =
      !isComanda && pedido?.facturacion
        ? `
                  <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="vertical-align: middle; padding: 0;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">🧾</span>
                            <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Datos de Facturación Electrónica</h2>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <div style="padding: 4px 0;">
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Nombres:</strong> ${pedido.facturacion.nombres ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Tipo Documento:</strong> ${pedido.facturacion.tipoDocumento ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Documento:</strong> ${pedido.facturacion.documento ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">País:</strong> ${pedido.facturacion.pais ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Departamento:</strong> ${pedido.facturacion.departamento ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Ciudad:</strong> ${pedido.facturacion.ciudad ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Código Postal:</strong> ${pedido.facturacion.codigoPostal ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Celular:</strong> (${pedido.facturacion.indicativoCel ?? ""}) ${pedido.facturacion.celular ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Dirección:</strong> ${pedido.facturacion.direccion ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Alias:</strong> ${pedido.facturacion.alias ?? "N/A"}</p>
                    </div>
                  </div>`
        : "";

    const htmlEnvioModerno =
      !isComanda &&
      (!pedido?.formaEntrega ||
        pedido.formaEntrega.trim().toLowerCase() !== "recoge") &&
      pedido?.envio
        ? `
          <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);">
            <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; position: relative;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle; padding: 0;">
                    <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">📦</span>
                    <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Datos de Envío</h2>
                  </td>
                </tr>
              </table>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 8px;">
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Nombres:</strong> ${pedido.envio.nombres ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Apellidos:</strong> ${pedido.envio.apellidos ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Alias:</strong> ${pedido.envio.alias ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Dirección:</strong> ${pedido.envio.direccionEntrega ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Unidad/Apto:</strong> ${pedido.envio.nombreUnidad ?? ""}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Especificaciones:</strong> ${pedido.envio.especificacionesInternas ?? ""}</p>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 8px;">
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Departamento:</strong> ${pedido.envio.departamento ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Ciudad:</strong> ${pedido.envio.ciudad ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Barrio:</strong> ${pedido.envio.barrio ?? ""}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Código Postal:</strong> ${pedido.envio.codigoPV ?? ""}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Celular:</strong> (${pedido.envio.indicativoCel ?? ""}) ${pedido.envio.celular ?? "N/A"}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Otro Número:</strong> (${pedido.envio.indicativoOtroNumero ?? ""}) ${pedido.envio.otroNumero ?? ""}</p>
                  <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Zona Cobro:</strong> ${pedido.envio.zonaCobro ?? "N/A"}</p>
                </td>
              </tr>
            </table>
          </div>`
        : "";

    const htmlNotasProduccion = notasProduccionHtml
      ? `
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
     </div>`
      : "";

    const htmlNotasDespachos =
      !isComanda && notasDespachosHtml
        ? `
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
      </div>`
        : "";

    const htmlNotasEntregas =
      !isComanda && notasEntregasHtml
        ? `
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
      </div>`
        : "";

    const htmlNotasFacturacionPagos =
      !isComanda && notasFacturacionPagosHtml
        ? `
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
      </div>`
        : "";

    // Sección Totales (reconstruida con valores recalculados y formateados)
    // Las bases gravables aproximadas también necesitan validación
    const baseIva5 = totalIva5 > 0 && !isNaN(totalIva5) ? totalIva5 / 0.05 : 0;
    const baseImpo8 = totalImpo > 0 && !isNaN(totalImpo) ? totalImpo / 0.08 : 0;
    const baseIva19 =
      totalIva19 > 0 && !isNaN(totalIva19) ? totalIva19 / 0.19 : 0;

    const htmlTotales = !isComanda
      ? `
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
    </div>`
      : "";

    // Layout de dos columnas: si isComanda es true, solo mostrar datos del cliente ocupando todo el ancho
    const twoColumnSection = !isComanda ? `
      <div class="two-column-container">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 48%; vertical-align: top; padding-right: ${styles.spacing.lg};">
              <!-- Datos del Cliente -->
${htmlDatosClienteModerno}
            </td>
            <td style="width: 48%; vertical-align: top; padding-left: ${styles.spacing.lg};">
              <!-- Datos de Facturación -->
              ${htmlFacturacionModerno || `
                  <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; opacity: 0.6;">
                    <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="vertical-align: middle; padding: 0;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">🧾</span>
                            <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Datos de Facturación</h2>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <div style="padding: 4px 0;">
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px; font-style: italic;">No se requiere facturación electrónica para este pedido</p>
                    </div>
                  </div>`}
            </td>
          </tr>
        </table>
      </div>
    ` : `
      <div class="two-column-container">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 100%; vertical-align: top;">
              <!-- Solo datos del cliente para comanda -->
${htmlDatosClienteModerno}
            </td>
          </tr>
        </table>
      </div>
    `;

    const htmlString = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Detalle Pedido ${pedido.nroPedido ?? ""}</title>
      <style>
        body { 
          font-family: ${styles.typography.fontFamily}; 
          margin: 0; 
          padding: 0; 
          background-color: ${styles.colors.background}; 
          line-height: 1.6;
          color: ${styles.colors.text};
        }
        .container { 
          width: 90%; 
          max-width: 900px; 
          margin: ${styles.spacing.xl} auto; 
          background-color: ${styles.colors.white}; 
          border-radius: ${styles.borderRadius.lg};
          box-shadow: ${styles.shadows.lg}; 
          overflow: hidden;
        }
        .header, .footer, .ad { 
          text-align: center; 
          padding: ${styles.spacing.lg} 0; 
        }
        .header img, .footer img, .ad img { 
          max-width: 100%; 
          height: auto; 
          border-radius: ${styles.borderRadius.md};
        }
        .content { 
          padding: ${styles.spacing.lg}; 
        }
        .hero-section {
          background: linear-gradient(135deg, ${styles.colors.primary} 0%, ${styles.colors.primaryLight} 50%, ${styles.colors.secondary} 100%);
          color: ${styles.colors.white};
          padding: ${styles.spacing.xl};
          text-align: center;
          margin-bottom: ${styles.spacing.lg};
          box-shadow: 0 8px 32px rgba(37, 99, 235, 0.2), 0 4px 16px rgba(124, 58, 237, 0.15);
          position: relative;
          overflow: hidden;
        }
        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
          pointer-events: none;
        }
        .hero-title {
          font-size: ${styles.typography.heading1}; 
          font-weight: ${styles.typography.bold};
          margin: 0 0 ${styles.spacing.sm} 0;
        }
        .hero-subtitle {
          font-size: ${styles.typography.bodySmall};
          margin: 0;
          opacity: 0.9;
        }
        h1 { 
          font-size: ${styles.typography.heading1}; 
          color: ${styles.colors.text}; 
          text-align: center; 
          font-weight: ${styles.typography.bold};
          margin: 0 0 ${styles.spacing.xl} 0;
        }
        h2 { 
          color: ${styles.colors.text}; 
          margin-bottom: ${styles.spacing.md}; 
          border-bottom: 1px solid ${styles.colors.border}; 
          padding-bottom: ${styles.spacing.xs}; 
          font-size: ${styles.typography.heading3};
          font-weight: ${styles.typography.semibold};
        }
        .section-divider {
          border: none;
          height: 1px;
          background: ${styles.colors.border};
          margin: ${styles.spacing.lg} 0;
        }
        p { 
          font-size: ${styles.typography.body}; 
          margin: ${styles.spacing.sm} 0 ${styles.spacing.md} 0; 
          line-height: 1.6; 
          color: ${styles.colors.text};
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: ${styles.spacing.xl}; 
          font-size: ${styles.typography.bodySmall}; 
          border-radius: ${styles.borderRadius.md};
          overflow: hidden;
          box-shadow: ${styles.shadows.sm};
        }
        th, td { 
          border: 1px solid ${styles.colors.border}; 
          padding: ${styles.spacing.md}; 
          text-align: left; 
          vertical-align: top; 
        }
        th { 
          background: linear-gradient(135deg, ${styles.colors.gray100} 0%, ${styles.colors.gray200} 100%); 
          font-weight: ${styles.typography.semibold}; 
          color: ${styles.colors.text};
          font-size: ${styles.typography.bodySmall};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-left: 3px solid transparent;
          position: relative;
        }
        th:first-child {
          border-left: 3px solid ${styles.colors.primary};
        }
        .total-row th, .total-row td { 
          font-size: ${styles.typography.body}; 
          font-weight: ${styles.typography.bold}; 
          background-color: ${styles.colors.gray50};
        }
        .button-link { 
          display: inline-block; 
          background: ${styles.colors.white};
          color: ${styles.colors.text}; 
          padding: ${styles.spacing.sm} ${styles.spacing.md}; 
          margin: ${styles.spacing.xs}; 
          border: 1px solid ${styles.colors.border};
          border-radius: ${styles.borderRadius.sm}; 
          text-decoration: none; 
          font-size: ${styles.typography.bodySmall}; 
          text-align: center; 
          font-weight: ${styles.typography.normal};
        }
        .button-table td { 
          border: none; 
          padding: ${styles.spacing.sm}; 
        }
        .button-table { 
          margin-top: ${styles.spacing.xl}; 
        }
        .info-card {
          background: linear-gradient(145deg, ${styles.colors.white} 0%, ${styles.colors.gray50} 100%);
          border-radius: ${styles.borderRadius.lg};
          padding: ${styles.spacing.lg};
          margin-bottom: ${styles.spacing.lg};
          border: 1px solid ${styles.colors.borderLight};
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .modern-card {
          background: linear-gradient(145deg, ${styles.colors.white} 0%, ${styles.colors.gray50} 100%);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.08), 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.5);
          position: relative;
          overflow: hidden;
        }
        .modern-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, ${styles.colors.primary} 0%, ${styles.colors.secondary} 50%, ${styles.colors.primaryLight} 100%);
        }
        .card-header {
          margin-bottom: ${styles.spacing.md};
          padding-bottom: ${styles.spacing.sm};
          border-bottom: 1px solid ${styles.colors.borderLight};
          position: relative;
        }
        .card-header::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, ${styles.colors.primary} 0%, ${styles.colors.secondary} 100%);
          border-radius: 1px;
        }
        .modern-header {
          display: flex;
          align-items: center;
          padding: ${styles.spacing.xs} 0;
        }
        .modern-header h2 {
          margin: 0;
          background: linear-gradient(135deg, ${styles.colors.text} 0%, ${styles.colors.gray600} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: ${styles.typography.semibold};
        }
        .card-icon {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, ${styles.colors.primary} 0%, ${styles.colors.primaryLight} 100%);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: ${styles.spacing.sm};
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .modern-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, ${styles.colors.primary} 0%, ${styles.colors.secondary} 100%);
          color: ${styles.colors.white};
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3), 0 2px 6px rgba(124, 58, 237, 0.2);
          position: relative;
        }
        .modern-icon::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          bottom: 2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%);
          border-radius: 50%;
          pointer-events: none;
        }
        .two-column-container {
          margin-bottom: ${styles.spacing.lg};
        }
        @media (max-width: 600px) {
          .container { 
            width: 95%; 
            margin: ${styles.spacing.md} auto; 
            border-radius: ${styles.borderRadius.md};
          }
          .content { 
            padding: ${styles.spacing.lg}; 
          }
          .hero-section {
            padding: ${styles.spacing.xl};
            margin: -${styles.spacing.lg} -${styles.spacing.lg} ${styles.spacing.xl} -${styles.spacing.lg};
          }
          .hero-title { 
            font-size: ${styles.typography.heading3}; 
          }
          h1 { 
            font-size: ${styles.typography.heading3}; 
          }
          h2 { 
            font-size: ${styles.typography.heading4}; 
          }
          p, table, th, td { 
            font-size: ${styles.typography.caption}; 
          }
          .button-link { 
            display: block; 
            width: calc(100% - ${styles.spacing.xl}); 
            margin: ${styles.spacing.sm} 0;
          }
          .button-table td { 
            display: block; 
            width: 100%; 
            box-sizing: border-box; 
          }
          .info-card {
            padding: ${styles.spacing.md};
            margin-bottom: ${styles.spacing.md};
          }
          .two-column-container table {
            display: block !important;
          }
          .two-column-container td {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin-bottom: ${styles.spacing.md};
          }
          /* Mantener layout de tabla para envío en móvil */
          .info-card table {
            display: table !important;
            width: 100% !important;
          }
          .info-card table td {
            display: table-cell !important;
            width: 50% !important;
            vertical-align: top !important;
            padding: 0 4px !important;
          }
          /* Solo en pantallas muy pequeñas convertir a bloque */
          @media (max-width: 400px) {
            .info-card table,
            .info-card table td {
              display: block !important;
              width: 100% !important;
              padding: 0 !important;
            }
          }
        }
        
        /* Media query específica para impresión */
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .content {
            padding: 8px !important;
          }
          .hero-section {
            background: white !important;
            color: black !important;
            padding: 4px !important;
            margin-bottom: 8px !important;
            box-shadow: none !important;
          }
          .info-card, .modern-card {
            background: white !important;
            padding: 4px !important;
            margin-bottom: 6px !important;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
          .card-icon, .modern-icon {
            background: #ddd !important;
            color: black !important;
            box-shadow: none !important;
          }
          .modern-card::before {
            display: none !important;
          }
          .modern-icon::after {
            display: none !important;
          }
          .hero-section::before {
            display: none !important;
          }
          .card-header::after {
            display: none !important;
          }
          /* Mantener layout de dos columnas en impresión para mejor aprovechamiento del papel */
          .two-column-container table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .two-column-container td {
            display: table-cell !important;
            width: 48% !important;
            vertical-align: top !important;
            padding: 0 4px !important;
          }
          .modern-header h2 {
            -webkit-text-fill-color: black !important;
            color: black !important;
          }
          /* Asegurar que los grids internos se mantengan como tabla en impresión */
          .info-card table {
            display: table !important;
            width: 100% !important;
          }
          .info-card table td {
            display: table-cell !important;
            vertical-align: top !important;
          }
          .card-header {
            margin-bottom: 4px !important;
            padding-bottom: 2px !important;
          }
          h1, h2, h3 {
            font-size: 12px !important;
            margin: 2px 0 4px 0 !important;
          }
          p {
            font-size: 9px !important;
            margin: 1px 0 !important;
            line-height: 1.2 !important;
          }
          table th, table td {
            padding: 2px 4px !important;
            font-size: 8px !important;
          }
          .section-divider {
            margin: 4px 0 !important;
          }
          .button-link {
            font-size: 8px !important;
            padding: 2px 4px !important;
            margin: 1px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${!isComanda && encabezadoUrl ? `<div class="header"><img src="${encabezadoUrl}" alt="Encabezado"></div>` : ""}

        <div class="content">
          <!-- Hero Section -->
          <div class="hero-section">
            <h1 class="hero-title">${textoEncabezado}</h1>
            ${!isComanda ? `<p class="hero-subtitle">Referencia: ${pedido.nroPedido ?? "N/A"}</p>` : ""}
            <p class="hero-subtitle">Gracias por elegirnos. Estamos procesando tu pedido.</p>
          </div>

          <!-- Cliente y Facturación - Layout de Dos Columnas -->
          ${twoColumnSection}

          ${htmlEnvioModerno}
          
          <!-- Datos Extras - Layout de Dos Columnas -->
          <div class="two-column-container">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 48%; vertical-align: top; padding-right: 8px;">
                  <!-- Datos Extras Entrega -->
                  <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="vertical-align: middle; padding: 0;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">📅</span>
                            <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Datos Extras de Entrega</h2>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <div style="padding: 4px 0;">
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Fecha Entrega:</strong> ${this.customFormatDate(pedido.fechaEntrega)}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Forma Entrega:</strong> ${pedido.formaEntrega ?? pedido.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Horario Entrega:</strong> ${pedido.horarioEntrega ?? pedido.carrito?.[0]?.configuracion?.datosEntrega?.horarioEntrega ?? "N/A"}</p>
                    </div>
                  </div>
                </td>
                <td style="width: 48%; vertical-align: top; padding-left: 8px;">
                  <!-- Datos Extras Orden -->
                  <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="vertical-align: middle; padding: 0;">
                            <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">📋</span>
                            <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Datos Extras de la Orden</h2>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <div style="padding: 4px 0;">
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Asesor Asignado:</strong> ${pedido?.asesorAsignado?.name ?? "N/A"}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Fecha Compra:</strong> ${this.customFormatDateHour(pedido?.fechaCreacion)}</p>
                      <p style="margin: 2px 0; color: #6b7280; font-size: 11px;"><strong style="color: #1f2937;">Fuente:</strong> <strong style="color: #2563eb;">SELLERCENTER</strong></p>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <hr class="section-divider">
          <!-- Productos del Pedido -->
          <div style="background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);">
            <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle; padding: 0;">
                    <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; font-size: 12px; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 6px;">🛍️</span>
                    <h2 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600; display: inline-block;">Productos del pedido</h2>
                  </td>
                </tr>
              </table>
            </div>
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
          ${
            !isComanda
              ? `
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
          </div> -->`
              : ""
          }

          ${htmlTotales}

        </div> <!-- Fin .content -->

        ${!isComanda && pieDePaginaUrl ? `<div class="footer"><img src="${pieDePaginaUrl}" alt="Pie de página"></div>` : ""}
        ${!isComanda && imgPublicidad ? `<div class="ad"><img src="${imgPublicidad}" alt="Publicidad"></div>` : ""}

      </div> <!-- Fin .container -->
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
