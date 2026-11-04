import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
  ViewChild,
} from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AutoComplete } from "primeng/autocomplete";
import { PosCheckoutService } from "../../../../../shared/services/ventas/pos-checkout.service";
import { MaestroService } from "../../../../../shared/services/maestros/maestro.service";
import { CrearClienteModalComponent } from "../../../clientes/crear-cliente-modal/crear-cliente-modal.component";
import { PosFacturacionComponent } from "../pos-facturacion/pos-facturacion.component";
import { FacturacionPos, faltantesFacturacion, resumenFacturacion, SIN_FACTURA } from "../../../../../shared/utils/facturacion-pos";
import Swal from "sweetalert2";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap, catchError } from "rxjs/operators";
import { of } from "rxjs";

@Component({
  selector: "app-customer-section",
  templateUrl: "./customer-section.component.html",
  styleUrls: ["./customer-section.component.scss"],
})
export class CustomerSectionComponent implements OnInit, OnDestroy {
  datosCliente: any = "";
  /** Ticket 1328: ventana con las métricas del cliente asociado. */
  mostrarMetricas = false;
  // D-419 (ticket 1171): a quién se factura la venta en curso.
  facturacion: FacturacionPos = SIN_FACTURA;
  documentoCliente: string = "";

  // Autocompletado
  clienteSuggestions: any[] = [];
  isSearching: boolean = false;
  selectedCliente: any = null;
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription;

  // D-540 (ticket 1340): estado de pantalla del cliente en escritorio. No pasa
  // por ningún servicio: el cliente y la facturación siguen en PosCheckoutService.
  /** La línea del cliente muestra acciones, facturación y contacto. */
  desplegado = false;
  /** «Cambiar»: buscador visible, el cliente actual sigue asociado hasta escoger otro. */
  cambiando = false;
  @ViewChild(AutoComplete) private buscador?: AutoComplete;
  private cdClienteVisto: any = null;

  constructor(
    private modal: NgbModal,
    private service: MaestroService,
    private checkoutService: PosCheckoutService,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios en el cliente
    this.checkoutService.customer$.subscribe((customer) => {
      // D-540: escoger otro, crearlo o quitarlo cierra «Cambiar»; otro cliente
      // (o ninguno) llega plegado. Editar al mismo cliente no lo pliega.
      this.cambiando = false;
      const cd = customer?.cd ?? null;
      if (!customer || cd !== this.cdClienteVisto) {
        this.desplegado = false;
      }
      this.cdClienteVisto = cd;
      console.log("🔄 Customer observable cambió:", customer);
      if (customer) {
        this.datosCliente = customer;
        console.log("✅ Cliente asignado a datosCliente:", this.datosCliente);
      } else {
        this.datosCliente = "";
        console.log("❌ Cliente limpiado");
      }
    });

    this.checkoutService.facturacion$.subscribe((f) => {
      this.facturacion = f || SIN_FACTURA;
    });

    // Configurar búsqueda con debounce para autocompletado
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
        if (!term || term.length < 2) {
          return of([]);
        }
        this.isSearching = true;
        return this.service.searchClients(term, 10).pipe(
          catchError((error) => {
            console.error("Error en búsqueda de clientes:", error);
            return of([]);
          })
        );
      })
    ).subscribe((results: any[]) => {
      this.clienteSuggestions = results || [];
      this.isSearching = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  /**
   * Método para el autocompletado - se llama cuando el usuario escribe
   */
  searchClientes(event: any): void {
    const query = event.query || "";
    this.searchSubject.next(query);
  }

  /**
   * Método cuando se selecciona un cliente del autocompletado
   */
  onClienteSelect(event: any): void {
    const cliente = event;
    if (cliente && cliente.cd) {
      console.log("🎯 Cliente seleccionado del autocompletado:", cliente);
      this.checkoutService.setCustomer(cliente);
      this.datosCliente = cliente;
      this.documentoCliente = cliente.documento || "";

      // Forzar detección de cambios
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);

      Swal.fire({
        title: "¡Cliente encontrado!",
        text: `${cliente.nombres_completos || ""} ${cliente.apellidos_completos || ""} ha sido asociado a la venta`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
    }
  }

  /**
   * Limpia el autocompletado cuando se borra el input
   */
  onClienteClear(): void {
    this.selectedCliente = null;
    this.clienteSuggestions = [];
  }

  /**
   * Abre el modal de creación de cliente
   */
  openModal(documentoPrellenado?: string): void {
    const modalRef = this.modal.open(CrearClienteModalComponent, {
      centered: true,
      size: "xl",
      modalDialogClass: "create-customers custom-input",
    });

    // Pre-llenar el documento si se proporciona
    if (documentoPrellenado) {
      modalRef.componentInstance.documentoPrellenado = documentoPrellenado;
    }

    // Manejar el resultado del modal
    modalRef.result.then(
      (result) => {
        console.log("📦 Resultado del modal:", result);
        if (result && result.cliente) {
          console.log("👤 Cliente del modal:", result.cliente);

          // Asociar automáticamente el cliente creado/editado a la venta
          this.checkoutService.setCustomer(result.cliente);
          console.log("🔗 Cliente enviado al servicio checkout");

          // Forzar actualización inmediata
          this.datosCliente = result.cliente;
          console.log("⚡ Cliente asignado directamente:", this.datosCliente);

          // Forzar detección de cambios con un pequeño delay
          setTimeout(() => {
            this.cdr.detectChanges();
            console.log("🔄 Detección de cambios forzada después del timeout");
          }, 100);

          // Actualizar el campo de búsqueda con el cliente creado
          if (result.cliente.documento) {
            this.documentoCliente = result.cliente.documento;
            this.selectedCliente = result.cliente;
          }

          // Determinar el mensaje apropiado basado en la acción realizada
          const mensaje =
            result.action === "updated"
              ? "Cliente actualizado y asociado a la venta"
              : "Cliente creado y asociado automáticamente a la venta";

          Swal.fire({
            title: "¡Perfecto!",
            text: mensaje,
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
            position: "top-end",
            toast: true,
          });
        } else {
          console.log("❌ No hay cliente en el resultado del modal");
        }
      },
      () => {},
    );
  }

  /**
   * Edita un cliente existente
   */
  editarCliente(): void {
    // Verificar que tenemos datos de cliente válidos
    if (!this.datosCliente) {
      this.showAlert("Error", "No hay cliente seleccionado para editar");
      return;
    }

    const modalRef = this.modal.open(CrearClienteModalComponent, {
      centered: true,
      size: "xl",
      modalDialogClass: "create-customers custom-input",
    });

    // Pasar los datos del cliente al modal y establecer que es edición
    modalRef.componentInstance.clienteData = this.datosCliente;
    modalRef.componentInstance.isEdit = true;

    // Manejar el cierre del modal
    modalRef.result.then(
      (result) => {
        console.log("📝 Resultado de edición:", result);
        if (result && result.cliente) {
          console.log("👤 Cliente editado:", result.cliente);

          // Actualizar el cliente en el servicio de checkout
          this.checkoutService.setCustomer(result.cliente);

          // Forzar actualización inmediata
          this.datosCliente = result.cliente;
          console.log(
            "⚡ Cliente editado asignado directamente:",
            this.datosCliente,
          );

          // Forzar detección de cambios con un pequeño delay
          setTimeout(() => {
            this.cdr.detectChanges();
            console.log(
              "🔄 Detección de cambios forzada después del timeout (edición)",
            );
          }, 100);

          // Actualizar el campo de búsqueda con el cliente editado
          if (result.cliente.documento) {
            this.documentoCliente = result.cliente.documento;
            this.selectedCliente = result.cliente;
          }

          // Mostrar mensaje de éxito
          Swal.fire({
            title: "¡Cliente actualizado!",
            text: "Los datos del cliente han sido actualizados y permanece asociado a la venta",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
            position: "top-end",
            toast: true,
          });
        } else {
          console.log("❌ No hay cliente en el resultado de edición");
        }
      },
      () => {},
    );
  }

  /**
   * Limpia los datos del cliente
   */
  limpiar(): void {
    console.log("🧹 Limpiando cliente");
    this.checkoutService.clearCustomer();
    this.datosCliente = "";
    this.documentoCliente = "";
    this.selectedCliente = null;
    this.clienteSuggestions = [];
    console.log("✅ Cliente limpiado completamente");
  }

  /**
   * Busca un cliente por su documento (búsqueda exacta)
   * Se mantiene para búsqueda manual con el botón "Buscar"
   */
  buscar(): void {
    // Obtener el valor actual del input del autocompletado
    let documento = "";

    // Si selectedCliente es un string (el usuario escribió pero no seleccionó)
    if (typeof this.selectedCliente === "string") {
      documento = this.selectedCliente.trim();
    } else if (this.selectedCliente?.documento) {
      // Si ya tiene un cliente seleccionado, usar ese documento
      documento = this.selectedCliente.documento;
    } else if (this.documentoCliente) {
      documento = this.documentoCliente.trim();
    }

    if (!documento) {
      this.showAlert(
        "Campo requerido",
        "Por favor ingrese un documento para buscar",
      );
      return;
    }

    // Actualizar la variable del componente
    this.documentoCliente = documento;

    const data = { documento: documento };
    this.service.getClientByDocument(data).subscribe({
      next: (res: any) => {
        if (!res.company) {
          Swal.fire({
            title: "Cliente no encontrado",
            text: "No se encuentra el documento. ¿Desea crear un nuevo cliente con este documento?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, crear cliente",
            cancelButtonText: "Cancelar",
          }).then((result) => {
            if (result.isConfirmed) {
              // Abrir modal con documento pre-llenado
              this.openModal(documento);
            }
          });
        } else {
          try {
            console.log("🔍 Cliente encontrado en búsqueda:", res);
            this.checkoutService.setCustomer(res);
            // Forzar actualización inmediata
            this.datosCliente = res;
            this.selectedCliente = res;
            console.log(
              "⚡ Cliente de búsqueda asignado directamente:",
              this.datosCliente,
            );

            // Forzar detección de cambios con un pequeño delay
            setTimeout(() => {
              this.cdr.detectChanges();
              console.log(
                "🔄 Detección de cambios forzada después del timeout (búsqueda)",
              );
            }, 100);
          } catch (error) {
            console.log(error);
            this.showAlert(
              "Error",
              "Ocurrió un error al cargar los datos del cliente",
            );
          }
        }
      },
      error: (error) => {
        console.error("Error al buscar cliente:", error);
        this.showAlert(
          "Error",
          "Ocurrió un error al buscar el cliente. Intente nuevamente.",
        );
      },
    });
  }

  /**
   * Muestra una alerta con SweetAlert2
   */
  // ── D-419 (ticket 1171): facturación de la venta ─────────────────────
  get resumenFacturacion(): string {
    return resumenFacturacion(this.facturacion);
  }

  get facturacionIncompleta(): boolean {
    return faltantesFacturacion(this.facturacion).length > 0;
  }

  // ── D-540 (ticket 1340): cliente plegable en escritorio ──────────────
  /** Inicial del avatar: nombre, o apellido si falta; «?» si no hay ninguno. */
  get inicialCliente(): string {
    const fuente = String(this.datosCliente?.nombres_completos || "").trim()
      || String(this.datosCliente?.apellidos_completos || "").trim();
    return fuente ? fuente.charAt(0).toUpperCase() : "?";
  }

  /**
   * Muestra el buscador con el foco puesto SIN quitar al cliente: no llama a
   * setCustomer ni a clearCustomer, que reiniciarían la facturación (D-419).
   */
  cambiarCliente(): void {
    this.cambiando = true;
    this.desplegado = false;
    // Solo vacía la caja de búsqueda; customer$ no se toca.
    this.selectedCliente = null;
    this.clienteSuggestions = [];
    this.cdr.detectChanges();
    this.buscador?.inputEL?.nativeElement?.focus();
  }

  /** Esc o clic fuera: vuelve la línea del cliente actual, con la misma facturación. */
  cancelarCambio(devolverFoco = false): void {
    if (!this.cambiando) return;
    this.cambiando = false;
    if (!devolverFoco) return;
    this.cdr.detectChanges();
    this.host.nativeElement.querySelector<HTMLElement>(".cli-cambiar")?.focus();
  }

  /**
   * composedPath() y no contains(): para cuando el clic llega al documento,
   * Angular ya pudo esconder el botón «Cambiar» que se tocó. La lista de
   * sugerencias vive dentro del componente, así que escoger una no cuenta.
   */
  @HostListener("document:click", ["$event"])
  alHacerClicEnDocumento(event: Event): void {
    if (!this.cambiando) return;
    const ruta = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (!ruta.includes(this.host.nativeElement)) {
      this.cancelarCambio();
    }
  }

  /** Si el foco sale del componente con el teclado, también se cancela. */
  @HostListener("focusout", ["$event"])
  alSalirElFoco(event: FocusEvent): void {
    if (!this.cambiando) return;
    const destino = event.relatedTarget as Node | null;
    if (destino && !this.host.nativeElement.contains(destino)) {
      this.cancelarCambio();
    }
  }

  abrirFacturacion(): void {
    if (!this.datosCliente) return;
    const ref = this.modal.open(PosFacturacionComponent, {
      centered: true,
      size: "md",
      modalDialogClass: "katuq-modal",
    });
    ref.componentInstance.cliente = this.datosCliente;
    ref.componentInstance.actual = this.facturacion;
    ref.result.then(
      (r: any) => {
        if (!r) return;
        if (r.accion === "editarCliente") {
          this.editarCliente();
          return;
        }
        this.checkoutService.setFacturacion(r as FacturacionPos);
      },
      () => {},
    );
  }

  private showAlert(title: string, text: string, icon: any = "warning"): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: "Ok",
    });
  }
}
