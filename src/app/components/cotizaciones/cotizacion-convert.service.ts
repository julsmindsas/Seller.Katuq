import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import Swal from "sweetalert2";
import { CartSingletonService } from "src/app/shared/services/ventas/cart.singleton.service";
import { BodegaService } from "src/app/shared/services/bodegas/bodega.service";
import { Cotizacion } from "./modelo/cotizacion";

/**
 * Conversión de una cotización a pedido (spec 008.2).
 *
 * NO crea el pedido: hidrata el carrito de la venta asistida con el cliente y las
 * líneas de la cotización (preservando configuración y overrides de precio/IVA),
 * pide bodega + ciudad en un mini-modal y navega a `crear-ventas`. Allí, al cargar
 * el cliente, `crear-ventas` setea bodega/ciudad y salta directo al paso del
 * carrito (ver `aplicarContextoConversionSiAplica`). El pedido se crea por el flujo
 * normal; el sellado de "convertida" ocurre después (→ marcarConvertida).
 */
@Injectable({ providedIn: "root" })
export class CotizacionConvertService {
  constructor(
    private cartService: CartSingletonService,
    private bodegaService: BodegaService,
    private router: Router
  ) {}

  /** True si la cotización puede convertirse (aceptada y no convertida aún). */
  puedeConvertir(cot: Cotizacion | null | undefined): boolean {
    if (!cot) return false;
    return cot.estadoCotizacion === "aceptada" && !cot.convertidaAPedido;
  }

  /**
   * Inicia la conversión: valida, pide bodega+ciudad, carga cliente + líneas y
   * navega a la venta asistida. Resuelve true si navegó, false si se canceló.
   */
  async iniciar(cot: Cotizacion): Promise<boolean> {
    if (!this.puedeConvertir(cot)) {
      Swal.fire("No disponible", "Solo se pueden convertir cotizaciones aceptadas.", "info");
      return false;
    }
    if (!cot.cliente) {
      Swal.fire("Falta cliente", "La cotización no tiene cliente asignado.", "warning");
      return false;
    }
    const items = Array.isArray(cot.items) ? cot.items : [];
    if (items.length === 0) {
      Swal.fire("Sin productos", "La cotización no tiene productos.", "warning");
      return false;
    }

    // Cargar bodegas (canal Venta Asistida) y ciudades de la empresa.
    let bodegas: any[] = [];
    try {
      bodegas = (await this.bodegaService.getBodegasByChannelName("Venta Asistida").toPromise()) || [];
    } catch {
      bodegas = [];
    }
    if (!bodegas.length) {
      Swal.fire("Sin bodegas", "No hay bodegas asociadas al canal Venta Asistida.", "warning");
      return false;
    }

    let ciudades: Array<{ value: string; label: string }> = [];
    try {
      const cc = JSON.parse(localStorage.getItem("currentCompany") || "{}");
      ciudades = (cc?.ciudadess?.ciudadesEntrega as any[]) || [];
    } catch {
      ciudades = [];
    }

    // Pre-seleccionar la ciudad del cliente si coincide con alguna de entrega.
    const ciudadCliente = (cot.cliente as any)?.ciudad || "";
    const ciudadPre = ciudades.find(
      (c) => c.value === ciudadCliente || c.label === ciudadCliente
    )?.value || "";

    const carritoActivo = this.cartService.productInCart.value || [];
    const avisoCarrito = carritoActivo.length > 0
      ? `<div style="margin-bottom:10px;color:#b54708;font-size:13px">⚠️ Hay ${carritoActivo.length} producto(s) en un carrito en curso; se reemplazarán.</div>`
      : "";

    const optsBodega = bodegas
      .map((b) => `<option value="${b.idBodega}">${this.escape(b.nombre)}</option>`)
      .join("");
    const optsCiudad = ciudades.length
      ? ciudades
          .map((c) => `<option value="${this.escape(c.value)}" ${c.value === ciudadPre ? "selected" : ""}>${this.escape(c.label)}</option>`)
          .join("")
      : `<option value="">(sin ciudades configuradas)</option>`;

    const result = await Swal.fire({
      title: "Convertir a pedido",
      html:
        avisoCarrito +
        `<div style="text-align:left;font-size:14px">
           <label style="font-weight:600;display:block;margin:6px 0 2px">Bodega</label>
           <select id="conv-bodega" class="swal2-input" style="width:100%;margin:0 0 10px">
             <option value="">Seleccionar…</option>${optsBodega}
           </select>
           <label style="font-weight:600;display:block;margin:6px 0 2px">Ciudad de entrega</label>
           <select id="conv-ciudad" class="swal2-input" style="width:100%;margin:0">
             <option value="">Seleccionar…</option>${optsCiudad}
           </select>
         </div>`,
      showCancelButton: true,
      confirmButtonText: "Continuar",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      preConfirm: () => {
        const bodegaId = (document.getElementById("conv-bodega") as HTMLSelectElement)?.value || "";
        const ciudad = (document.getElementById("conv-ciudad") as HTMLSelectElement)?.value || "";
        if (!bodegaId) {
          Swal.showValidationMessage("Selecciona una bodega");
          return false;
        }
        if (!ciudad) {
          Swal.showValidationMessage("Selecciona una ciudad");
          return false;
        }
        return { bodegaId, ciudad };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    const { bodegaId, ciudad } = result.value as { bodegaId: string; ciudad: string };
    const bodega = bodegas.find((b) => b.idBodega === bodegaId);
    if (!bodega) {
      Swal.fire("Error", "Bodega no válida.", "error");
      return false;
    }

    // Líneas listas para el carrito (config/overrides intactos). NO se cargan al
    // CartSingletonService aquí: `crear-ventas.newPedido()` limpia el carrito al
    // iniciar (localStorage 'carrito' + clearCart), así que las llevamos en el
    // contexto y `crear-ventas` las carga DESPUÉS de esa limpieza.
    const itemsCtx = items.map((item) => {
      const cfg: any = item.configuracion || {};
      return {
        producto: item.producto,
        // El template del carrito lee configuracion.adiciones/preferencias.length sin
        // safe-navigation → garantizar que sean arrays (algunos ítems no los traen).
        configuracion: {
          ...cfg,
          producto: cfg.producto || item.producto,
          adiciones: Array.isArray(cfg.adiciones) ? cfg.adiciones : [],
          preferencias: Array.isArray(cfg.preferencias) ? cfg.preferencias : [],
          tarjetas: Array.isArray(cfg.tarjetas) ? cfg.tarjetas : [],
        },
        cantidad: item.cantidad || cfg.cantidad || 1,
        _precioManualOverride: item._precioManualOverride,
        _ivaManualOverride: item._ivaManualOverride,
      };
    });

    // Cliente para la venta asistida (el checkout lo lee de sessionStorage).
    try {
      sessionStorage.setItem("cliente", JSON.stringify(cot.cliente));
    } catch { /* noop */ }

    // Contexto para que crear-ventas cargue el carrito, setee bodega/ciudad y salte
    // al paso del carrito. (newPedido NO borra estas claves de sessionStorage.)
    try {
      sessionStorage.setItem("cotizacionVentaCtx", JSON.stringify({ bodega, ciudad, items: itemsCtx }));
    } catch { /* noop */ }

    // Marcador para sellar la cotización cuando el pedido se cree.
    try {
      sessionStorage.setItem("cotizacionOrigen", JSON.stringify({ id: cot.id, nro: cot.nroCotizacion }));
    } catch { /* noop */ }

    const documento = (cot.cliente as any)?.documento || "";
    this.router.navigate(["/ventas/crear-ventas"], { queryParams: { documento } });
    return true;
  }

  /** Escapa texto para insertar en el HTML del modal. */
  private escape(s: any): string {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
