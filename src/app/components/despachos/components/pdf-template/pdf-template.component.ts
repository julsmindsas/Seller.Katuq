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
    const nombres =
      pedido.cliente?.nombres_completos ||
      `${pedido.envio?.nombres || ""} ${pedido.envio?.apellidos || ""}`.trim();
    return nombres || "N/A";
  }

  getDireccionCompleta(pedido: Pedido): string {
    const direccionParts = [
      pedido.envio?.direccionEntrega,
      pedido.envio?.barrio,
      pedido.envio?.ciudad,
      pedido.envio?.departamento,
      pedido.envio?.pais,
    ].filter(Boolean);

    return direccionParts.length > 0 ? direccionParts.join(", ") : "N/A";
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
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  getPedidosCount(): number {
    return this.pedidos.length;
  }

  getTotalProductos(): number {
    return this.pedidos.reduce((total, pedido) => {
      return (
        total +
        (pedido.carrito?.reduce(
          (subtotal, item) => subtotal + (item.cantidad || 0),
          0,
        ) || 0)
      );
    }, 0);
  }

  // Métodos específicos por tipo de template
  getOrderTitle(): string {
    switch (this.templateType) {
      case "orden":
        return "Orden de Envío";
      case "entrega":
        return "Guía de Entrega";
      case "factura":
        return "Factura de Despacho";
      default:
        return "Documento";
    }
  }

  shouldShowField(field: string): boolean {
    // Configurar qué campos mostrar según el tipo de template
    const fieldsByType = {
      orden: [
        "nroPedido",
        "cliente",
        "direccion",
        "telefono",
        "total",
        "horario",
        "ciudad",
        "departamento",
      ],
      entrega: [
        "nroPedido",
        "cliente",
        "direccion",
        "telefono",
        "productos",
        "observaciones",
      ],
      factura: [
        "nroPedido",
        "cliente",
        "direccion",
        "total",
        "impuestos",
        "subtotal",
      ],
    };

    return fieldsByType[this.templateType]?.includes(field) || false;
  }

  // Validación de datos
  isValidForGeneration(): boolean {
    console.log("Validando datos para generación PDF:", {
      pedidos: this.pedidos?.length || 0,
      nroShippingOrder: this.nroShippingOrder,
      transportadorSeleccionado: !!this.transportadorSeleccionado,
      userName: this.userName
    });

    // Validación más flexible - transportador no es obligatorio si hay userName
    const hasBasicData = !!(this.pedidos.length > 0 && this.nroShippingOrder);
    const hasResponsible = !!(this.transportadorSeleccionado || this.userName);
    
    const isValid = hasBasicData && hasResponsible;
    
    console.log("Resultado de validación:", isValid, {
      hasBasicData,
      hasResponsible
    });
    
    return isValid;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.pedidos || this.pedidos.length === 0) {
      errors.push("No hay pedidos para generar el PDF");
    }

    if (!this.nroShippingOrder) {
      errors.push("Número de orden de envío requerido");
    }

    if (!this.transportadorSeleccionado && !this.userName) {
      errors.push("Se requiere transportador o usuario responsable");
    }

    console.log("Errores de validación:", errors);
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
