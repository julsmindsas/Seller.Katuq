import { Component, inject } from "@angular/core";
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from "@angular/animations";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import { CrearVentasComponent } from "../crear-ventas/crear-ventas.component";
import { LoaderService } from "../../../shared/services/loader.service";

@Component({
  selector: "app-venta-asistida-unica",
  templateUrl: "./venta-asistida-unica.component.html",
  styleUrls: ["./venta-asistida-unica.component.scss"],
  animations: [
    trigger("slideInOut", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(-20px)" }),
        animate(
          "300ms ease-in",
          style({ opacity: 1, transform: "translateY(0)" }),
        ),
      ]),
      transition(":leave", [
        animate(
          "300ms ease-out",
          style({ opacity: 0, transform: "translateY(-20px)" }),
        ),
      ]),
    ]),
  ],
})
export class VentaAsistidaUnicaComponent extends CrearVentasComponent {
  /**
   * Guarda si ya se disparó la carga de envío/facturación para el cliente actual.
   * En la pantalla plana no hay stepEnter, así que la carga se hace una sola vez
   * por cliente; el flag evita pisar una dirección elegida a mano en cada cambio
   * de carrito (riesgo #1 de la orquestación).
   */
  envioFacturacionInit = false;

  /** Suscripción propia al carrito para orquestar el "paso 4" en la pantalla plana. */
  private ventaUnicaCartSub?: Subscription;

  /** Evita repetir el scroll a la confirmación en cada ciclo de detección. */
  private confirmacionMostrada = false;

  /**
   * Esta pantalla NO usa el overlay global: cada sección tiene su propio
   * indicador (buscador de cliente, catálogo, etc.), así se siente más rápida
   * y no molesta el loader de pantalla completa al buscar un cliente.
   * Se inyecta con inject() para no re-declarar el constructor de la base.
   */
  private readonly loaderService = inject(LoaderService);

  override ngOnInit(): void {
    // Silencia el overlay global mientras esta pantalla esté montada.
    this.loaderService.suppressGlobalLoader();
    super.ngOnInit();

    // El wizard cargaba entrega/facturación en el stepEnter(4). Aquí lo replicamos
    // reaccionando al carrito: cuando ya hay cliente + carrito no vacío, invocamos
    // enterStep(_, 4) UNA sola vez por cliente (envioFacturacionInit).
    // NOTA: cartService es privado en la clase base; se accede por índice para no
    // re-declarar el constructor ni tocar crear-ventas.
    this.ventaUnicaCartSub = this[
      "cartService"
    ].productInCartChanges$.subscribe(() => {
      if (
        this.pedidoGral?.cliente &&
        this.tieneProductosEnCarrito &&
        !this.envioFacturacionInit
      ) {
        this.envioFacturacionInit = true;
        // El carrito notifica ANTES de escribir en localStorage y la detección de
        // "recoge en tienda" lee de ahí: se difiere para leer el carrito ya escrito.
        setTimeout(() => this.enterStep(null as any, 4), 0);
      }
    });
  }

  /**
   * En el wizard la confirmación era el último paso, así que el usuario llegaba
   * a ella por navegación. En la pantalla plana el pedido se crea sin moverse:
   * cuando showPedidoConfirm se enciende, el formulario se oculta (template) y
   * hay que llevar la vista al bloque de confirmación, o parece que "no pasó nada".
   */
  override ngAfterViewChecked(): void {
    super.ngAfterViewChecked();
    if (this.showPedidoConfirm && !this.confirmacionMostrada) {
      this.confirmacionMostrada = true;
      setTimeout(() => {
        const el = document.getElementById("va-confirmacion");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 60);
    }
    // Si se descarta o se arranca otro pedido, permitir el scroll de nuevo.
    if (!this.showPedidoConfirm && this.confirmacionMostrada) {
      this.confirmacionMostrada = false;
    }
  }

  override ngOnDestroy(): void {
    // Devuelve el overlay global al resto de la app.
    this.loaderService.releaseGlobalLoader();
    super.ngOnDestroy();
    if (this.ventaUnicaCartSub) {
      this.ventaUnicaCartSub.unsubscribe();
    }
  }

  /**
   * El catálogo (app-ecomerce-products) arranca en grid; en la pantalla única lo
   * queremos como TABLA/lista (estilo lista de cotizaciones). Cuando el @ViewChild
   * #products aparece (tras elegir bodega+ciudad), forzamos listView=true una sola
   * vez, diferido a microtask para no romper la detección de cambios.
   */
  /**
   * Botón "Vaciar" del encabezado del card Carrito (marco del mockup).
   * Solo presentación: delega en el mismo clearCart() que ya usa la clase base
   * (cartService es privado allí → acceso por índice, igual que en ngOnInit).
   */
  vaciarCarrito(): void {
    Swal.fire({
      title: "¿Vaciar el carrito?",
      text: "Se quitarán todos los productos agregados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, vaciar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#6c4ce0",
    }).then((res) => {
      if (res.isConfirmed) {
        this["cartService"].clearCart();
      }
    });
  }

  /**
   * Intercepta la selección de cliente del autocompletado. El binding del template
   * apunta a onClienteAutocompleteSelect, así que la subclase se encarga sola.
   * Reutiliza la lógica heredada y luego carga los datos de entrega según la ciudad
   * (equivale al stepEnter(3) del wizard).
   */
  override onClienteAutocompleteSelect(event: any): void {
    super.onClienteAutocompleteSelect(event);
    // Nuevo cliente → permitir de nuevo la carga automática de envío/facturación.
    this.envioFacturacionInit = false;
    // reviewStepAndExecute es privado en la clase base; acceso por índice.
    this["reviewStepAndExecute"](3);
    // En la pantalla plana las tarjetas de Envío y Facturación están visibles
    // desde el principio, así que sus datos deben cargarse al elegir el cliente
    // (antes solo ocurría al tener carrito y quedaban vacías).
    this.cargarEnvioYFacturacion();
  }

  /**
   * Carga las direcciones de entrega y los datos de facturación del cliente.
   * Reutiliza enterStep(_, 4) de la clase base (que ya hace ambas cosas y
   * detecta recoge-en-tienda); se difiere para que el cliente ya esté asignado.
   */
  private cargarEnvioYFacturacion(intento: number = 0): void {
    setTimeout(() => {
      if (this.pedidoGral?.cliente) {
        this.enterStep(null as any, 4);
        // OJO: NO se marca envioFacturacionInit aquí. Esta carga ocurre al elegir
        // cliente (carrito aún vacío), y la detección de "recoge en tienda" lee el
        // carrito; debe volver a evaluarse cuando entren productos.
      } else if (intento < 4) {
        // La búsqueda/creación del cliente es asíncrona: reintenta un par de veces.
        this.cargarEnvioYFacturacion(intento + 1);
      }
    }, intento === 0 ? 0 : 500);
  }

  /** Búsqueda por documento: al encontrar el cliente, cargar envío y facturación. */
  override buscar(): void {
    super.buscar();
    this.envioFacturacionInit = false;
    this.cargarEnvioYFacturacion();
  }

  /** Alta rápida de cliente: igual, sus direcciones deben quedar disponibles. */
  override crearClienteRapido(): void {
    super.crearClienteRapido();
    this.envioFacturacionInit = false;
    this.cargarEnvioYFacturacion();
  }

  /**
   * Envoltorio del botón "Pagar" de la pantalla plana. Reproduce EXACTAMENTE los
   * gates que el wizard aplicaba vía reviewStepAndExecute(1/4/5) antes de delegar
   * en la ruta de creación heredada (canal/typeOrder/dropshipping/SIIGO intactos).
   */
  onComprarYPagar(event: any): void {
    // Gate del "paso 1": debe existir un cliente.
    if (!this.pedidoGral?.cliente) {
      Swal.fire({
        title: "Advertencia",
        text: "Debe seleccionar o crear un cliente para continuar",
        icon: "warning",
      });
      return;
    }

    // Si no hay envío ni recoge detectado, re-evaluar con la lógica de la base
    // (enterStep(_,4) detecta recoge en tienda y sintetiza el envío que aplica).
    // Sin esto, un carrito de recoge podía quedar bloqueado por el gate.
    if (!this.esRecogeEnTienda && !this.pedidoGral?.envio) {
      this.enterStep(null as any, 4);
    }

    // Gate del "paso 4": datos de envío salvo recoge en tienda.
    if (!this.esRecogeEnTienda && !this.pedidoGral?.envio) {
      Swal.fire({
        title: "Advertencia",
        text: "Debe seleccionar o crear datos de envío antes de continuar",
        icon: "warning",
      });
      return;
    }

    // Gate del "paso 5": datos de facturación.
    if (!this.pedidoGral?.facturacion) {
      Swal.fire({
        title: "Advertencia",
        text: "Debe seleccionar o crear datos de facturación antes de continuar",
        icon: "warning",
      });
      return;
    }

    // Normaliza carrito1 / recoge (parte no-Swal del stepEnter(5)).
    this["reviewStepAndExecute"](5);

    // Ruta de creación heredada SIN modificar.
    this.comprarYPagar(event);
  }
}
