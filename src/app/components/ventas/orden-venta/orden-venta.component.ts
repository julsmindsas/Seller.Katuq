import { Component, Input, OnInit, OnDestroy, Optional, ViewChild, ElementRef } from "@angular/core";
import { Pedido } from "../modelo/pedido";
import { Empresa } from "../../../shared/models/empresa/empresa";
import { CompanyInformation } from "../../../shared/models/User/CompanyInformation";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SecurityService } from "../../../shared/services/security/security.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

@Component({
  selector: "app-orden-venta",
  templateUrl: "./orden-venta.component.html",
  styleUrls: ["./orden-venta.component.scss"],
})
export class OrdenVentaComponent implements OnInit, OnDestroy {
  @Input() pedido: Pedido;
  @ViewChild('ordenVentaContentRef') ordenVentaContentRef: ElementRef;

  private destroy$ = new Subject<void>();

  // Datos de la empresa
  empresaActual: Empresa | null = null;
  companyInformation: CompanyInformation | null = null;

  // Control de errores de logo
  private logoError = false;
  private readonly DEFAULT_LOGO = "assets/images/logo/Katuq/faviconkatuq.png";
  private readonly FALLBACK_LOGO = "assets/images/logo/Katuq/katuq_light.svg";

  // Información calculada — getters reactivos al @Input() pedido para evitar
  // valores stale cuando se reusa la instancia con otra orden (caso PDF desde
  // list.component que actualiza pedidoParaOrdenVenta sin re-instanciar).
  get subtotalSinImpuestos(): number { return Number(this.pedido?.subtotal) || 0; }
  get totalImpuestos(): number { return Number(this.pedido?.totalImpuesto) || 0; }
  get totalDescuentos(): number { return Number(this.pedido?.totalDescuento) || 0; }
  get totalEnvio(): number { return Number(this.pedido?.totalEnvio) || 0; }
  get totalFinal(): number { return Number(this.pedido?.totalPedididoConDescuento) || 0; }

  // Fecha de emisión
  fechaEmision: Date = new Date();

  // Logo de Katuq
  logoKatuq: string = "assets/images/logo/Katuq/katuq_completo.svg";

  // Estado de generación de PDF
  generandoPDF: boolean = false;
  pdfProgress: number = 0;
  currentProgressMessage: string = "";

  constructor(
    @Optional() public activeModal: NgbActiveModal,
    private securityService: SecurityService,
  ) {}

  ngOnInit(): void {
    this.cargarDatosEmpresa();
    this.cargarCompanyInformation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los datos de la empresa desde sessionStorage
   */
  private cargarDatosEmpresa(): void {
    const empresaStr = localStorage.getItem("currentCompany");
    if (empresaStr) {
      try {
        this.empresaActual = JSON.parse(empresaStr);
        console.log(
          "✅ Datos de empresa cargados desde sessionStorage:",
          this.empresaActual,
        );
      } catch (error) {
        console.error("❌ Error al parsear datos de empresa:", error);
        this.empresaActual = null;
      }
    } else {
      console.warn("⚠️ No se encontró currentCompany en sessionStorage");
    }
  }

  /**
   * Carga la información de la empresa desde SecurityService (logo y nombre comercial)
   */
  private cargarCompanyInformation(): void {
    this.securityService
      .getCompanyInformationLogged$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyInfo: CompanyInformation | null) => {
        if (!companyInfo) {
          companyInfo = this.securityService.getCompanyInformationLogged();
        }
        this.companyInformation = companyInfo;
        this.logoError = false; // Reset error state when company info changes
        console.log("✅ Company information cargada:", this.companyInformation);
      });
  }

  /**
   * @deprecated Los totales son getters reactivos al @Input() pedido.
   * Mantenido como noop por si algún caller externo lo invoca.
   */
  private calcularTotales(): void {
    // noop — totales son getters
  }

  /**
   * Calcula el total de un producto individual
   */
  calcularTotalProducto(item: any): number {
    const cantidad = item.cantidad || 0;
    return cantidad * this.getPrecioUnitario(item);
  }

  /**
   * Obtiene el nombre del producto
   */
  getNombreProducto(item: any): string {
    return (
      item.producto?.crearProducto?.titulo ||
      item.producto?.titulo ||
      "Producto sin nombre"
    );
  }

  /**
   * Obtiene el precio unitario del producto, YA NETO del descuento de línea
   * (`item.descuentoLinea`, 0-100) — mismo patrón que
   * `carrito.component.ts::checkPriceScale`: el bruto se resuelve por la
   * jerarquía de precio (manual → categoría → volumen → base) y el descuento
   * se aplica multiplicando el resultado final, sin importar la fuente.
   */
  getPrecioUnitario(item: any): number {
    const precioBruto = this.getPrecioUnitarioBruto(item);
    const descLineaFrac = this.descLineaPct(item) / 100;
    return precioBruto * (1 - descLineaFrac);
  }

  /** % de descuento de línea (0-100), saneado. */
  descLineaPct(item: any): number {
    const d = Number(item?.descuentoLinea) || 0;
    return Math.min(100, Math.max(0, d));
  }

  /**
   * Precio unitario del producto SIN descuento de línea, respetando la jerarquía:
   * 1. Precio manual override
   * 2. Precio por categoría de cliente
   * 3. Precio por volumen
   * 4. Precio base
   */
  private getPrecioUnitarioBruto(item: any): number {
    if (!item || !item.producto) return 0;

    const producto = item.producto;
    const cantidad = Number(item.cantidad) || 0;

    // PRIORIDAD 0: Precio manual
    // _precioManualOverride es el precio BASE (sin IVA), se calcula el precio con IVA sumando el porcentaje
    if (item._precioManualOverride !== undefined && item._precioManualOverride !== null
        && producto?.procesoComercial?.permitePrecioManual === true) {
      const precioBase = Number(item._precioManualOverride) || 0;
      const porcentajeIva = (item._ivaManualOverride !== undefined && item._ivaManualOverride !== null)
        ? Number(item._ivaManualOverride)
        : Number(producto?.precio?.precioUnitarioIva) || 0;
      return precioBase * (1 + porcentajeIva / 100);
    }

    // PRIORIDAD 1: Precio por categoría de cliente (desactiva volumen)
    const categoriaClienteId = this.pedido?.cliente?.categoria?.id;
    const preciosPorTipoCliente = producto?.preciosPorTipoCliente ?? [];
    if (categoriaClienteId && preciosPorTipoCliente.length > 0) {
      const precioCategoria = preciosPorTipoCliente.find(
        (p: any) => p.tipoClienteId === categoriaClienteId && p.activo === true
      );
      if (precioCategoria) {
        return Number(precioCategoria.precioConIva) || 0;
      }
    }

    // Si el producto ya tiene marca de precio por categoría aplicado
    if (producto?._precioAplicadoPorCategoria) {
      return Number(producto?.precio?.precioUnitarioConIva) || 0;
    }

    // PRIORIDAD 2: Precio por volumen
    const preciosVolumen = producto?.precio?.preciosVolumen || [];
    if (preciosVolumen.length > 0 && cantidad > 0) {
      const rangosValidos = preciosVolumen.filter((x: any) => {
        const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
        const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
        return tieneMinimo && tieneMaximo;
      });

      const precioVolumen = rangosValidos.find((x: any) => {
        const min = Number(x.numeroUnidadesInicial) || 0;
        const max = Number(x.numeroUnidadesLimite) || Infinity;
        return cantidad >= min && cantidad <= max;
      });

      if (precioVolumen) {
        return Number(precioVolumen.valorUnitarioPorVolumenConIVA)
            || Number(precioVolumen.valorUnitarioPorVolumenIva)
            || 0;
      }
    }

    // PRIORIDAD 3: Precio base
    return Number(producto?.precio?.precioUnitarioConIva) || 0;
  }

  /**
   * Obtiene la referencia del producto
   */
  getReferencia(item: any): string {
    if (!item || !item.producto) return "-";

    return (
      item.producto?.identificacion?.referencia ||
      item.producto?.referencia ||
      item.producto?.sku ||
      item.producto?.codigo ||
      "-"
    );
  }

  /**
   * Obtiene la URL del logo con validación y fallback (igual que en header)
   */
  getLogoUrl(): string {
    if (this.logoError) {
      return this.FALLBACK_LOGO;
    }

    if (this.companyInformation?.imgUrlLogo) {
      // Validar que la URL tenga un formato válido
      try {
        const url = new URL(
          this.companyInformation.imgUrlLogo,
          window.location.origin,
        );
        return url.toString();
      } catch (error) {
        console.warn(
          "⚠️ URL de logo inválida:",
          this.companyInformation.imgUrlLogo,
        );
        return this.DEFAULT_LOGO;
      }
    }

    return this.DEFAULT_LOGO;
  }

  /**
   * Maneja errores de carga de imagen (igual que en header)
   */
  onLogoError(event: any): void {
    console.warn("❌ Error cargando logo:", event);
    this.logoError = true;

    // Intentar cargar el logo por defecto si no es el que falló
    if (event.target.src !== this.FALLBACK_LOGO) {
      event.target.src = this.FALLBACK_LOGO;
    }
  }

  /**
   * Obtiene el nombre comercial de la empresa (prioriza CompanyInformation)
   */
  get nombreEmpresa(): string {
    // Primero intenta obtener de CompanyInformation
    if (this.companyInformation?.nombreComercio) {
      return this.companyInformation.nombreComercio;
    }

    if (this.companyInformation?.razonSocial) {
      return this.companyInformation.razonSocial;
    }

    // Fallback a empresaActual
    if (this.empresaActual?.nomComercial) {
      return this.empresaActual.nomComercial;
    }

    if (this.empresaActual?.nombre) {
      return this.empresaActual.nombre;
    }

    return "EMPRESA";
  }

  /**
   * Obtiene el NIT formateado de la empresa
   */
  get nitEmpresaFormateado(): string {
    if (!this.empresaActual) return "No disponible";

    const nit = this.empresaActual.nit || "";
    const dv = this.empresaActual.digitoVerificacion || "";

    return dv ? `${nit}-${dv}` : nit;
  }

  /**
   * Obtiene la dirección completa de la empresa
   */
  get direccionEmpresa(): string {
    if (!this.empresaActual) return "No disponible";

    const direccion = this.empresaActual.direccion || "";
    const ciudad = this.empresaActual.ciudad || "";
    const departamento = this.empresaActual.departamento || "";

    return (
      [direccion, ciudad, departamento].filter(Boolean).join(", ") ||
      "No disponible"
    );
  }

  /**
   * Obtiene el teléfono de la empresa
   */
  get telefonoEmpresa(): string {
    if (!this.empresaActual) return "No disponible";

    return (
      this.empresaActual.cel?.toString() ||
      this.empresaActual.fijo?.toString() ||
      "No disponible"
    );
  }

  /**
   * Obtiene el email de la empresa
   */
  get emailEmpresa(): string {
    if (!this.empresaActual) return "No disponible";

    return (
      this.empresaActual.emailContactoGeneral ||
      this.empresaActual.emailFactuElec ||
      "No disponible"
    );
  }

  /**
   * Obtiene el nombre completo del cliente
   */
  get nombreCliente(): string {
    if (!this.pedido?.cliente) return "Cliente General";

    const nombres = this.pedido.cliente.nombres_completos || "";
    const apellidos = this.pedido.cliente.apellidos_completos || "";

    return nombres || apellidos
      ? `${nombres} ${apellidos}`.trim()
      : "Cliente General";
  }

  /**
   * Obtiene la dirección de facturación del cliente
   */
  get direccionFacturacion(): string {
    if (!this.pedido?.facturacion) return "No especificada";

    const facturacion = this.pedido.facturacion;
    const direccion = facturacion.direccion || "";
    const ciudad = facturacion.ciudad || "";
    const departamento = facturacion.departamento || "";

    return (
      [direccion, ciudad, departamento].filter(Boolean).join(", ") ||
      "No especificada"
    );
  }

  /**
   * Obtiene la dirección de envío
   */
  get direccionEnvio(): string {
    if (!this.pedido?.envio) return "No especificada";

    const envio = this.pedido.envio;
    const direccion = envio.direccionEntrega || "";
    const ciudad = envio.ciudad || "";
    const departamento = envio.departamento || "";

    return (
      [direccion, ciudad, departamento].filter(Boolean).join(", ") ||
      "No especificada"
    );
  }

  /**
   * Obtiene el nombre del asesor asignado
   */
  get nombreAsesor(): string {
    if (!this.pedido?.asesorAsignado) return "No asignado";

    return (
      this.pedido.asesorAsignado.name ||
      this.pedido.asesorAsignado.email ||
      "No asignado"
    );
  }

  /**
   * Obtiene la configuración optimizada para generación de PDF VERTICAL
   */
  private getOptimizedPDFOptions(): any {
    return {
      margin: [5, 5, 5, 5], // Márgenes pequeños para aprovechar espacio
      filename: `orden-venta-${this.pedido.nroPedido || "sin-numero"}-${this.formatearFechaParaNombre(this.fechaEmision)}.pdf`,
      image: {
        type: "jpeg",
        quality: 0.95,
      },
      html2canvas: {
        scale: 2, // Escala reducida para PDF vertical
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        letterRendering: true,
        windowWidth: 800, // Ancho ajustado para vertical
        windowHeight: 1130, // Alto para A4 vertical
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait", // VERTICAL/PORTRAIT como solicitó el usuario
        compress: true,
        precision: 16,
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: ['tr', '.cliente-section', '.totales-section', '.pdf-footer']
      },
    };
  }

  /**
   * Actualiza el progreso de la generación del PDF
   */
  private updatePDFProgress(progress: number, message: string): void {
    this.pdfProgress = progress;
    this.currentProgressMessage = message;
  }

  /**
   * Método para descargar como PDF usando html2pdf.js
   */
  async descargarPDF(): Promise<void> {
    if (this.generandoPDF) {
      return;
    }

    this.generandoPDF = true;
    this.pdfProgress = 0;
    this.currentProgressMessage = "Iniciando...";

    try {
      this.updatePDFProgress(10, "Iniciando generación...");

      // Importar dinámicamente html2pdf
      const html2pdf = (await import("html2pdf.js")).default;

      this.updatePDFProgress(30, "Preparando contenido...");

      // USAR VIEWCHILD EN LUGAR DE getElementById
      const element = this.ordenVentaContentRef?.nativeElement;
      if (!element) {
        throw new Error("Elemento no encontrado");
      }

      this.updatePDFProgress(50, "Configurando opciones de PDF...");

      const options = this.getOptimizedPDFOptions();

      this.updatePDFProgress(70, "Generando PDF...");

      // HACER VISIBLE TEMPORALMENTE PARA CAPTURA
      const originalVisibility = element.style.visibility;
      const originalPosition = element.style.position;
      element.style.visibility = 'visible';
      element.style.position = 'static';

      // Dar tiempo para que se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generar PDF usando html2pdf
      await html2pdf()
        .from(element)
        .set(options)
        .toPdf()
        .get("pdf")
        .then((pdf: any) => {
          this.updatePDFProgress(90, "Finalizando...");

          // RESTAURAR VISIBILIDAD ORIGINAL
          element.style.visibility = originalVisibility;
          element.style.position = originalPosition;

          // Abrir en nueva pestaña
          const blob = pdf.output("blob");
          const blobUrl = URL.createObjectURL(blob);

          // Programar limpieza del blob URL
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 30000);

          window.open(blobUrl, "_blank");

          this.updatePDFProgress(100, "¡PDF generado exitosamente!");
        })
        .catch((err: any) => {
          // RESTAURAR VISIBILIDAD EN CASO DE ERROR
          element.style.visibility = originalVisibility;
          element.style.position = originalPosition;
          throw err;
        });
    } catch (error) {
      alert("Error al generar el PDF. Por favor, intente nuevamente.");
    } finally {
      // Dar tiempo para que se vea el mensaje de completado
      setTimeout(() => {
        this.generandoPDF = false;
        this.pdfProgress = 0;
        this.currentProgressMessage = "";
      }, 1000);
    }
  }

  /**
   * Formatea una fecha para usar en nombres de archivo
   */
  private formatearFechaParaNombre(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  /**
   * Cierra el modal (si existe)
   */
  cerrar(): void {
    if (this.activeModal) {
      this.activeModal.dismiss();
    }
  }
}
