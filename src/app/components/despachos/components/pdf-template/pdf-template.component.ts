import { Component, Input, OnInit } from "@angular/core";
import { Pedido } from "../../../ventas/modelo/pedido";

@Component({
  selector: "app-pdf-template",
  templateUrl: "./pdf-template.component.html",
  styleUrls: ["./pdf-template.component.scss"],
})
export class PdfTemplateComponent implements OnInit {
  @Input() pedidos: Pedido[] = [];
  @Input() nroShippingOrder: string = "";
  @Input() transportadorSeleccionado: any = null;
  @Input() totalPendiente: number = 0;
  @Input() userName: string = "";
  @Input() templateType: "orden" | "entrega" | "factura" = "orden";

  constructor() {}

  ngOnInit(): void {
    // Validar inputs requeridos
    if (!this.pedidos || this.pedidos.length === 0) {
      console.warn("PDF Template: No se proporcionaron pedidos");
    }
  }

  getTransportadorNombre(): string {
    if (!this.transportadorSeleccionado) {
      return "N/A";
    }

    // Si es un objeto con la propiedad 'nombre'
    if (typeof this.transportadorSeleccionado === 'object' && this.transportadorSeleccionado.nombre) {
      return this.transportadorSeleccionado.nombre;
    }
    
    // Si es un string, intentar extraer el nombre antes del guion
    if (typeof this.transportadorSeleccionado === 'string') {
      return this.transportadorSeleccionado.split('-')[0].trim();
    }
    
    // Fallback para otros casos
    return "N/A";
  }

  // Métodos de utilidad para el template
  getValorSeguro(value: any): string {
    return value ?? "N/A";
  }

  getClienteNombre(pedido: Pedido): string {
    // Priorizar información del envío sobre la del cliente
    const nombresEnvio = `${pedido.envio?.nombres || ""} ${pedido.envio?.apellidos || ""}`.trim();
    const nombresCliente = pedido.cliente?.nombres_completos || 
                          `${pedido.cliente?.nombres_completos || ""} ${pedido.cliente?.apellidos_completos || ""}`.trim();
    
    // Usar información del envío si está disponible, sino usar información del cliente
    return nombresEnvio || nombresCliente || "N/A";
  }

  /**
   * Obtiene el teléfono priorizando información del envío sobre la del cliente
   */
  getTelefonoDestinatario(pedido: Pedido): string {
    return pedido.envio?.celular || 
           pedido.cliente?.numero_celular_comprador || 
           "N/A";
  }

  getDireccionCompleta(pedido: Pedido): string {
    const direccionParts = [
      pedido.envio?.direccionEntrega,
      pedido.envio?.nombreUnidad,
      pedido.envio?.especificacionesInternas,
      pedido.envio?.barrio,
      pedido.envio?.ciudad,
      pedido.envio?.departamento,
      pedido.envio?.pais,
    ].filter(Boolean);

    return direccionParts.length > 0 ? direccionParts.join(", ") : "N/A";
  }

  /**
   * Obtiene información detallada de la dirección para impresión
   */
  getInformacionDetalladaDireccion(pedido: Pedido): {
    direccionPrincipal: string;
    nombreUnidad: string;
    especificacionesInternas: string;
    barrio: string;
    observaciones: string;
    notasDespacho: string;
    notasEntrega: string;
  } {
    return {
      direccionPrincipal: pedido.envio?.direccionEntrega || "N/A",
      nombreUnidad: pedido.envio?.nombreUnidad || "N/A",
      especificacionesInternas: pedido.envio?.especificacionesInternas || "N/A",
      barrio: pedido.envio?.barrio || "N/A",
      observaciones: pedido.envio?.observaciones || "N/A",
      notasDespacho: this.getNotasDespacho(pedido),
      notasEntrega: this.getNotasEntrega(pedido)
    };
  }

  /**
   * Obtiene las notas de despacho del pedido
   */
  getNotasDespacho(pedido: Pedido): string {
    if (!pedido.notasPedido?.notasDespachos || pedido.notasPedido.notasDespachos.length === 0) {
      return "N/A";
    }

    return pedido.notasPedido.notasDespachos
      .map(nota => `${nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-CO') : 'Sin fecha'}: ${nota.nota || nota.descripcion || 'Sin descripción'}`)
      .join(" | ");
  }

  /**
   * Obtiene las notas de entrega del pedido
   */
  getNotasEntrega(pedido: Pedido): string {
    if (!pedido.notasPedido?.notasEntregas || pedido.notasPedido.notasEntregas.length === 0) {
      return "N/A";
    }

    return pedido.notasPedido.notasEntregas
      .map(nota => `${nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-CO') : 'Sin fecha'}: ${nota.nota || nota.descripcion || 'Sin descripción'}`)
      .join(" | ");
  }

  /**
   * Obtiene toda la información adicional combinada en un formato compacto
   * @param pedido - El pedido del cual obtener la información
   * @returns Toda la información adicional combinada
   */
  getObservacionesCompletas(pedido: Pedido): string {
    const informacionAdicional: string[] = [];

    // Agregar información de dirección
    if (pedido.envio?.direccionEntrega && pedido.envio.direccionEntrega.trim() !== '') {
      informacionAdicional.push(pedido.envio.direccionEntrega.trim());
    }

    // Agregar nombre de unidad/edificio
    if (pedido.envio?.nombreUnidad && pedido.envio.nombreUnidad.trim() !== '') {
      informacionAdicional.push(pedido.envio.nombreUnidad.trim());
    }

    // Agregar especificaciones internas
    if (pedido.envio?.especificacionesInternas && pedido.envio.especificacionesInternas.trim() !== '') {
      informacionAdicional.push(pedido.envio.especificacionesInternas.trim());
    }

    // Agregar barrio/sector
    if (pedido.envio?.barrio && pedido.envio.barrio.trim() !== '') {
      informacionAdicional.push(pedido.envio.barrio.trim());
    }

    // Agregar observaciones del envío
    if (pedido.envio?.observaciones && pedido.envio.observaciones.trim() !== '') {
      informacionAdicional.push(pedido.envio.observaciones.trim());
    }

    // Agregar notas de despacho
    const notasDespacho = this.getNotasDespacho(pedido);
    if (notasDespacho !== 'N/A') {
      informacionAdicional.push(notasDespacho);
    }

    // Agregar notas de entrega
    const notasEntrega = this.getNotasEntrega(pedido);
    if (notasEntrega !== 'N/A') {
      informacionAdicional.push(notasEntrega);
    }

    // Si no hay información adicional, retornar N/A
    if (informacionAdicional.length === 0) {
      return 'N/A';
    }

    // Combinar toda la información separada por comas
    return informacionAdicional.join(', ');
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatCurrency(amount: number): string {
    if (isNaN(amount)) {
      return "N/A";
    }
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  getPedidosCount(): number {
    return this.pedidos?.length || 0;
  }

  getTotalProductos(): number {
    if (!this.pedidos) return 0;
    return this.pedidos.reduce((acc, pedido) => {
      return acc + (pedido.carrito?.length || 0);
    }, 0);
  }

  // Métodos específicos por tipo de template
  getOrderTitle(): string {
    switch (this.templateType) {
      case "orden":
        return `Orden de Envío #${this.nroShippingOrder}`;
      case "entrega":
        return `Comprobante de Entrega - Pedido #${this.pedidos[0]?.nroPedido}`;
      case "factura":
        return `Factura de Venta - Pedido #${this.pedidos[0]?.nroPedido}`;
      default:
        return "Documento";
    }
  }

  shouldShowField(field: string): boolean {
    const config = {
      orden: {
        header: true,
        summary: true,
        details: true,
        footer: true,
        transportador: true,
        user: true,
        total: true,
      },
      entrega: {
        header: true,
        summary: false,
        details: true,
        footer: true,
        transportador: false,
        user: false,
        total: false,
      },
      factura: {
        header: true,
        summary: true,
        details: true,
        footer: false,
        transportador: false,
        user: true,
        total: true,
      },
    };
    return config[this.templateType]?.[field] ?? false;
  }

  // Validación de datos
  isValidForGeneration(): boolean {
    // Validación más flexible - transportador no es obligatorio si hay userName
    const hasBasicData = !!(this.pedidos.length > 0 && this.nroShippingOrder);
    const hasResponsible = !!(this.transportadorSeleccionado || this.userName);
    
    const isValid = hasBasicData && hasResponsible;
    
    
    
    return isValid;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.pedidos || this.pedidos.length === 0) {
      errors.push("No hay pedidos para generar la orden.");
    }
    if (!this.nroShippingOrder) {
      errors.push("Falta el número de orden de envío.");
    }
    if (!this.transportadorSeleccionado && !this.userName) {
      errors.push("Se requiere transportador o usuario responsable");
    }

    return errors;
  }

  // Método para obtener estilos CSS optimizados
  getOptimizedStyles(): string {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .pdf-container {
          width: 100%;
          max-width: 11in;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: white;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #007bff;
        }

        .company-info {
          flex: 1;
        }

        .order-info {
          flex: 1;
          text-align: right;
        }

        .order-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .order-table th,
        .order-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }

        .order-table th {
          background-color: #f8f9fa;
          font-weight: bold;
        }

        .summary {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }

        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #666;
        }

        @media print {
          .pdf-container {
            max-width: none;
            margin: 0;
            padding: 10px;
          }

          .order-table {
            page-break-inside: avoid;
          }
        }
      </style>
    `;
  }

  // TrackBy function for better performance with *ngFor
  trackByPedido(index: number, pedido: Pedido): any {
    return pedido.nroPedido || pedido._id || index;
  }
}
