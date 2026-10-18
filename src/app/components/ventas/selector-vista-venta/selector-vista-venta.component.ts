import { ChangeDetectionStrategy, Component, Injectable, Input } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from "@angular/router";

/**
 * Ticket 1168: las dos vistas de la venta asistida en una sola entrada del menú.
 * «Rápida» es la pantalla única (`venta-asistida`) y «Por pasos» el asistente
 * (`crear-ventas`). Las dos comparten la misma lógica y el carrito vive en el
 * navegador, así que cambiar de vista no pierde el pedido. La elección queda
 * guardada por navegador y es la que abre el menú la próxima vez.
 */
export type VistaVenta = "rapida" | "pasos";

const CLAVE = "kq_vista_venta_asistida";
const RUTAS: Record<VistaVenta, string> = { rapida: "/ventas/venta-asistida", pasos: "/ventas/crear-ventas" };

export function vistaVentaPreferida(): VistaVenta {
  try {
    return localStorage.getItem(CLAVE) === "pasos" ? "pasos" : "rapida";
  } catch {
    return "rapida";
  }
}

function recordarVista(vista: VistaVenta): void {
  try {
    localStorage.setItem(CLAVE, vista);
  } catch {
    /* sin almacenamiento: la vista vale solo para esta visita */
  }
}

/**
 * Al entrar a la venta asistida desde el menú (sin parámetros), abre la vista
 * que el vendedor eligió la última vez. Con parámetros (un borrador, un pedido)
 * no redirige: ese enlace ya sabe a dónde va.
 */
@Injectable({ providedIn: "root" })
export class VistaVentaGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(ruta: ActivatedRouteSnapshot): boolean | UrlTree {
    const conParametros = Object.keys(ruta.queryParams || {}).length > 0;
    if (!conParametros && vistaVentaPreferida() === "pasos") return this.router.parseUrl(RUTAS.pasos);
    return true;
  }
}

@Component({
  selector: "app-selector-vista-venta",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vista-venta" role="group" aria-label="Vista de la venta asistida">
      <button type="button" class="vista-venta__op" [class.is-activa]="actual === 'rapida'" [attr.aria-pressed]="actual === 'rapida'"
              (click)="cambiar('rapida')" title="Todo en una sola pantalla">Rápida</button>
      <button type="button" class="vista-venta__op" [class.is-activa]="actual === 'pasos'" [attr.aria-pressed]="actual === 'pasos'"
              (click)="cambiar('pasos')" title="Paso a paso: cliente, productos, entrega y pago">Por pasos</button>
    </div>
  `,
  styles: [
    `
      .vista-venta { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid #e4defa; border-radius: 11px; background: #f6f3ff; }
      .vista-venta__op {
        padding: 6px 12px; border: 0; border-radius: 9px; background: transparent; color: #211f3a;
        font: inherit; font-size: 13px; font-weight: 700; letter-spacing: normal; line-height: 1.2; cursor: pointer; white-space: nowrap;
      }
      .vista-venta__op:hover { color: #5f3fe0; }
      .vista-venta__op.is-activa { background: #5f3fe0; color: #fff; }
      .vista-venta__op:focus-visible { outline: 3px solid #7c5cff !important; outline-offset: 2px; }
    `,
  ],
})
export class SelectorVistaVentaComponent {
  /** La vista en la que está el vendedor. */
  @Input() actual: VistaVenta = "rapida";

  constructor(private router: Router, private route: ActivatedRoute) {}

  cambiar(vista: VistaVenta): void {
    recordarVista(vista);
    if (vista === this.actual) return;
    // Se conservan los parámetros (un borrador abierto, por ejemplo).
    this.router.navigate([RUTAS[vista]], { queryParams: this.route.snapshot.queryParams });
  }
}
