import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import Swal from "sweetalert2";
import { TranslateService } from "@ngx-translate/core";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import {
  BorradorVenta,
  CLAVE_CONTEXTO_BORRADOR,
  SalesDraftsService,
  refrescarLineas,
} from "../../../shared/services/ventas/sales-drafts.service";

/**
 * Botones "Guardar borrador" y "Borradores (N)" de la venta asistida, y el
 * modal con la lista (ticket 1169, D-466). Guardar lo hace la pantalla de venta,
 * que tiene la venta en curso; aquí se lista, se retoma y se elimina.
 *
 * Retomar usa el mismo camino que "Convertir a pedido" de una cotización: deja
 * el contexto en sessionStorage y vuelve a abrir la pantalla con el documento del
 * cliente; la venta asistida carga el carrito cuando encuentra al cliente.
 */
@Component({
  selector: "app-borradores-venta",
  templateUrl: "./borradores-venta.component.html",
  styleUrls: ["./borradores-venta.component.scss"],
})
export class BorradoresVentaComponent implements OnInit {
  @Input() puedeGuardar = false;
  @Input() guardando = false;
  /** Nombre del borrador que se está editando, para el texto del botón. */
  @Input() borradorActivo: string | null = null;
  @Output() guardar = new EventEmitter<void>();

  borradores: BorradorVenta[] = [];
  cargando = false;
  error = false;
  abierto = false;
  ocupadoId: string | null = null;

  constructor(private drafts: SalesDraftsService, private maestro: MaestroService, private translate: TranslateService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.drafts.listar().subscribe({
      next: (lista) => {
        this.borradores = lista;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.error = true;
      },
    });
  }

  abrir(): void {
    this.abierto = true;
    this.cargar();
  }

  nombreDe(b: BorradorVenta): string {
    return b.nombre || b.resumen?.clienteNombre || this.translate.instant('ventas.borradoresVenta.sinCliente');
  }

  async retomar(b: BorradorVenta): Promise<void> {
    if (this.ocupadoId) return;
    if (this.hayVentaEnCurso()) {
      const seguir = await Swal.fire({
        title: this.translate.instant('ventas.borradoresVenta.reemplazarTitulo'),
        text: this.translate.instant('ventas.borradoresVenta.reemplazarTexto'),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: this.translate.instant('ventas.borradoresVenta.siRetomar'),
        cancelButtonText: this.translate.instant('comun.cancelar'),
        confirmButtonColor: "#5F3FE0",
      });
      if (!seguir.isConfirmed) return;
    }

    this.ocupadoId = b.id;
    try {
      const completo = await this.drafts.obtener(b.id).toPromise();
      const estado = completo?.estado;
      if (!estado) throw new Error("sin estado");

      const items = Array.isArray(estado.items) ? estado.items : [];
      const ids = items.map((i: any) => i?.producto?.cd).filter(Boolean);
      let vigentes: any[] = [];
      if (ids.length) {
        const res: any = await this.maestro.getProductsByIds(ids).toPromise();
        vigentes = res?.products || [];
      }
      const { items: lineas, avisos } = refrescarLineas(items, vigentes, {
        tipoClienteId: estado.cliente?.categoria?.id || null,
        idBodega: estado.bodega?.idBodega || null,
      });

      if (avisos.length) {
        const lista = avisos.map((a) => `<li>${this.escape(a)}</li>`).join("");
        const ok = await Swal.fire({
          title: this.translate.instant('ventas.borradoresVenta.cambiosTitulo'),
          html: `<ul style="text-align:left;margin:0;padding-left:18px;font-size:14px;line-height:1.5">${lista}</ul>`,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: this.translate.instant('ventas.borradoresVenta.retomarAsi'),
          cancelButtonText: this.translate.instant('comun.cancelar'),
          confirmButtonColor: "#5F3FE0",
        });
        if (!ok.isConfirmed) {
          this.ocupadoId = null;
          return;
        }
      }

      const documento = estado.cliente?.documento ? String(estado.cliente.documento) : "";
      sessionStorage.setItem(
        CLAVE_CONTEXTO_BORRADOR,
        JSON.stringify({
          id: b.id,
          nombre: b.nombre || "",
          documento,
          // Ticket 1434: con varias fichas del mismo documento, esta desempata.
          cd: estado.cliente?.cd ? String(estado.cliente.cd) : "",
          bodega: estado.bodega || null,
          ciudad: estado.ciudad || "",
          items: lineas,
          envio: estado.envio || null,
          facturacion: estado.facturacion || null,
          notasPedido: estado.notasPedido || null,
        }),
      );
      // La pantalla se abre de nuevo: así arranca limpia y aplica el borrador.
      const ruta = window.location.pathname;
      window.location.assign(documento ? `${ruta}?documento=${encodeURIComponent(documento)}` : ruta);
    } catch (err: any) {
      this.ocupadoId = null;
      const status = err?.status;
      Swal.fire({
        icon: "error",
        title: status === 404 ? this.translate.instant('ventas.borradoresVenta.noExiste') : this.translate.instant('ventas.borradoresVenta.errorRetomar'),
        text: status === 404
          ? this.translate.instant('ventas.borradoresVenta.noExisteTexto')
          : this.translate.instant('ventas.borradoresVenta.errorRetomarTexto'),
        confirmButtonColor: "#5F3FE0",
      });
      if (status === 404) this.cargar();
    }
  }

  async eliminar(b: BorradorVenta): Promise<void> {
    const ok = await Swal.fire({
      title: this.translate.instant('ventas.borradoresVenta.eliminarTitulo'),
      text: this.translate.instant('ventas.borradoresVenta.eliminarTexto', { nombre: this.nombreDe(b) }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: this.translate.instant('ventas.borradoresVenta.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: "#D64545",
    });
    if (!ok.isConfirmed) return;
    this.ocupadoId = b.id;
    this.drafts.eliminar(b.id).subscribe({
      next: () => {
        this.ocupadoId = null;
        this.borradores = this.borradores.filter((x) => x.id !== b.id);
      },
      error: (err) => {
        this.ocupadoId = null;
        if (err?.status === 404) {
          this.borradores = this.borradores.filter((x) => x.id !== b.id);
          return;
        }
        Swal.fire({ icon: "error", title: this.translate.instant('ventas.borradoresVenta.errorEliminar'), text: this.translate.instant('ventas.borradoresVenta.intenteDeNuevo'), confirmButtonColor: "#5F3FE0" });
      },
    });
  }

  private hayVentaEnCurso(): boolean {
    try {
      const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
      return Array.isArray(carrito) && carrito.length > 0;
    } catch {
      return false;
    }
  }

  private escape(s: any): string {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
