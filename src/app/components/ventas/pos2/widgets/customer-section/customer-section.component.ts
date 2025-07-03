import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { PosCheckoutService } from "../../../../../shared/services/ventas/pos-checkout.service";
import { MaestroService } from "../../../../../shared/services/maestros/maestro.service";
import { CrearClienteModalComponent } from "../../../clientes/crear-cliente-modal/crear-cliente-modal.component";
import Swal from "sweetalert2";

@Component({
  selector: "app-customer-section",
  templateUrl: "./customer-section.component.html",
  styleUrls: ["./customer-section.component.scss"],
})
export class CustomerSectionComponent implements OnInit {
  @ViewChild("clienteBuscar") clienteBuscar: ElementRef;

  datosCliente: any = "";
  documentoCliente: string = "";

  constructor(
    private modal: NgbModal,
    private service: MaestroService,
    private checkoutService: PosCheckoutService,
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios en el cliente
    this.checkoutService.customer$.subscribe((customer) => {
      if (customer) {
        this.datosCliente = customer;
      } else {
        this.datosCliente = "";
      }
    });
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
        if (result && result.cliente) {
          // Asociar automáticamente el cliente creado/editado a la venta
          this.checkoutService.setCustomer(result.cliente);

          // Actualizar el campo de búsqueda con el documento del cliente
          if (result.cliente.documento) {
            this.documentoCliente = result.cliente.documento;
            if (this.clienteBuscar && this.clienteBuscar.nativeElement) {
              this.clienteBuscar.nativeElement.value = result.cliente.documento;
            }
          }

          // Mostrar mensaje de confirmación
          const mensaje = this.datosCliente
            ? "Cliente asociado a la venta"
            : "Cliente creado y asociado a la venta";
          Swal.fire({
            title: "Éxito",
            text: mensaje,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
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
        if (result && result.cliente) {
          // Actualizar el cliente en el servicio de checkout
          this.checkoutService.setCustomer(result.cliente);

          // Mostrar mensaje de éxito
          Swal.fire({
            title: "Cliente actualizado",
            text: "Los datos del cliente han sido actualizados correctamente",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      },
      () => {},
    );
  }

  /**
   * Limpia los datos del cliente
   */
  limpiar(): void {
    this.checkoutService.clearCustomer();
    this.documentoCliente = "";
    if (this.clienteBuscar) {
      this.clienteBuscar.nativeElement.value = "";
    }
  }

  /**
   * Busca un cliente por su documento
   */
  buscar(): void {
    // Obtener el valor actual del input
    const documento =
      this.clienteBuscar?.nativeElement?.value?.trim() ||
      this.documentoCliente?.trim();

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
            this.checkoutService.setCustomer(res);
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
  private showAlert(title: string, text: string, icon: any = "warning"): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: "Ok",
    });
  }
}
