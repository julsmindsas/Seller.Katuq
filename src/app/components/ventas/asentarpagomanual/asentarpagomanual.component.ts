import { Component, Input, OnInit } from "@angular/core";
import {
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidatorFn,
} from "@angular/forms";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MaestroService } from "src/app/shared/services/maestros/maestro.service";
import Swal from "sweetalert2";
import { AngularFireStorage } from "@angular/fire/compat/storage";
import { finalize } from "rxjs/operators";
import { EstadoPago, Pago, Pedido } from "../modelo/pedido";
import { User } from "src/app/shared/services/firebase/auth.service";
import { UserLite } from "src/app/shared/models/User/UserLite";

@Component({
  selector: "app-asentarpagomanual",
  templateUrl: "./asentarpagomanual.component.html",
  styleUrls: ["./asentarpagomanual.component.scss"],
})
export class AsentarpagomanualComponent implements OnInit {
  transaccionForm: FormGroup;
  formasPago: any;
  selectedFile: File;
  @Input() pedido: Pedido;

  permiteAsentarPago: boolean = true;
  valorExcedido: boolean;
  isDragOver: boolean = false;

  constructor(
    private formasPagoService: MaestroService,
    private storage: AngularFireStorage,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    if (
      this.pedido.estadoPago === EstadoPago.Aprobado &&
      this.pedido.faltaPorPagar <= 0
    ) {
      this.permiteAsentarPago = false;
      Swal.fire({
        title: "¡Alerta!",
        text: "Este pedido ya se encuentra pagado.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    this.transaccionForm = new FormGroup({
      fecha: new FormControl("", Validators.required),
      formaPago: new FormControl("", Validators.required),
      valor: new FormControl("", [Validators.required]),
      numeroComprobante: new FormControl("", Validators.required),
      archivo: new FormControl(""),
      notas: new FormControl("", Validators.required),
    });
    this.transaccionForm.get("valor").valueChanges.subscribe((value) => {
      this.validateMaxValue(value);
    });
    // inicializar campo fecha con la actual
    this.transaccionForm
      .get("fecha")
      .setValue(new Date().toISOString().split("T")[0]);

    this.formasPagoService.consultarFormaPago().subscribe({
      next: (formasPago) => {
        this.formasPago = formasPago;
      },
      error: (error: any) => {
        console.error(error);
      },
    });
  }

  validateMaxValue(value: number) {
    const pagoIngresado = Number(value) || 0;
    const faltaPorPagar = Number(this.pedido?.faltaPorPagar) || 0;
    this.valorExcedido = faltaPorPagar > 0 && pagoIngresado > faltaPorPagar;
  }

  onFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  removeFile() {
    this.selectedFile = null;
    const fileInput = document.getElementById("archivo") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  verArchivo(url: string) {
    window.open(url, "_blank");
  }

  trackByPago(index: number, pago: Pago): string {
    return (
      pago?.fechaHoraCarga || pago?.numeroComprobante || index.toString()
    );
  }

  cancelar() {
    this.transaccionForm.reset();
    this.selectedFile = null;
    this.valorExcedido = false;
    // Reinicializar fecha con la actual
    this.transaccionForm
      .get("fecha")
      ?.setValue(new Date().toISOString().split("T")[0]);
  }

  registrarTransaccion(): void {
    if (this.transaccionForm.valid) {
      // DEBUG: Log inicial para debug
      console.log("🔍 ANTES DEL PAGO:");
      console.log("Total del pedido:", this.pedido.totalPedididoConDescuento);
      console.log("Falta por pagar antes:", this.pedido.faltaPorPagar);
      console.log("Anticipo antes:", this.pedido.anticipo);
      console.log("Pagos existentes:", this.pedido.PagosAsentados?.length || 0);
      console.log("Nuevo valor a registrar:", this.transaccionForm.value.valor);

      const valorNuevoPago = Number(this.transaccionForm.get("valor")?.value) || 0;
      const formaPagoSeleccionada = this.transaccionForm.get("formaPago")?.value;
      const formaPagoObj = Array.isArray(this.formasPago)
        ? this.formasPago.find((f: any) => f?.id == formaPagoSeleccionada)
        : null;
      const formaPagoNombre: string = (formaPagoObj?.nombre || formaPagoSeleccionada || '').toString();

      const crearYAplicarTransaccion = (archivoUrl?: string) => {
        const transacionPago: Pago = {
          fecha: this.transaccionForm.get("fecha")?.value,
          formaPago: formaPagoNombre,
          valor: valorNuevoPago,
          numeroPedido: this.pedido.nroPedido,
          numeroComprobante: this.transaccionForm.get("numeroComprobante")?.value,
          archivo: archivoUrl || "",
          notas: this.transaccionForm.get("notas")?.value,
          fechaTransaccion: new Date().toISOString(),
          valorTotalVenta: this.pedido.totalPedididoConDescuento,
          valorRegistrado: valorNuevoPago,
          archivoEvidencia: "",
          usuarioRegistro: (JSON.parse(localStorage.getItem("user")) as UserLite).name,
          estadoVerificacion: "Pendiente",
          fechaHoraSistema: new Date().toISOString(),
          fechaHoraCarga: new Date().toISOString(),
          fechaHoraAprobacionRechazo: "",
        };

        const order = this.pedido;
        if (!order.PagosAsentados) {
          order.PagosAsentados = [];
        }
        order.PagosAsentados.push(transacionPago);

        const totalPagosAsentados = order.PagosAsentados.reduce((acc, pago) => {
          // Para Wompi, no sumar si está pendiente
          if (
            pago.formaPago?.toLowerCase().includes("wompi") &&
            pago.estadoVerificacion === "Pendiente"
          ) {
            return acc;
          }
          const valorPago = Number(pago.valor || pago.valorRegistrado || 0) || 0;
          return acc + valorPago;
        }, 0);

        order.anticipo = Math.round((totalPagosAsentados + Number.EPSILON) * 100) / 100;
        order.faltaPorPagar = Math.max(
          0,
          Math.round(((order.totalPedididoConDescuento || 0) - totalPagosAsentados + Number.EPSILON) * 100) / 100,
        );

        if (order.faltaPorPagar <= 0) {
          order.estadoPago = EstadoPago.Aprobado;
        } else if (order.faltaPorPagar > 0 && order.faltaPorPagar < (order.totalPedididoConDescuento || 0)) {
          order.estadoPago = EstadoPago.PreAprobado;
        } else {
          order.estadoPago = EstadoPago.Pendiente;
        }

        (order as any)._estadoCalculadoEnFrontend = true;
        (order as any)._timestamp = new Date().getTime();

        console.log("🔍 DESPUÉS DEL PAGO:");
        console.log("Total pagos asentados:", totalPagosAsentados);
        console.log("Nuevo anticipo:", order.anticipo);
        console.log("Nueva falta por pagar:", order.faltaPorPagar);
        console.log("Nuevo estado de pago:", order.estadoPago);
        console.log("✅ Pedido marcado como calculado en frontend");

        this.modalService.dismissAll(order);
        Swal.close();
        this.cancelar();
      };

      if (this.selectedFile) {
        Swal.fire({
          title: "Subiendo archivo...",
          text: "Por favor espere...",
          allowOutsideClick: false,
          showConfirmButton: false,
          willOpen: () => {
            Swal.showLoading();
          },
        });

        const filePath = `comprobatensPago/${this.pedido.nroPedido}/${new Date().getTime()}_${this.selectedFile.name}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, this.selectedFile);

        task
          .snapshotChanges()
          .pipe(
            finalize(() => {
              fileRef.getDownloadURL().subscribe((url) => crearYAplicarTransaccion(url));
            }),
          )
          .subscribe();
      } else {
        // Permitir registrar pago sin archivo
        crearYAplicarTransaccion("");
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Por favor complete los campos requeridos",
      });
    }
  }

  editarPago(pago: Pago) {
    this.transaccionForm.get("fecha")?.setValue(pago.fecha);
    this.transaccionForm.get("formaPago")?.setValue(pago.formaPago);
    this.transaccionForm.get("valor")?.setValue(pago.valor);
    this.transaccionForm
      .get("numeroComprobante")
      ?.setValue(pago.numeroComprobante);
    this.transaccionForm.get("archivo")?.setValue(pago.archivo);
    this.transaccionForm.get("notas")?.setValue(pago.notas);

    const transacionPago: Pago = this.pedido.PagosAsentados.find(
      (x) =>
        x.fecha == pago.fecha &&
        x.valor == pago.valor &&
        x.numeroComprobante == pago.numeroComprobante,
    );

    transacionPago.fecha = this.transaccionForm.get("fecha")?.value;
    transacionPago.formaPago = this.transaccionForm.get("formaPago")?.value;
    transacionPago.valor = this.transaccionForm.get("valor")?.value;
    transacionPago.numeroComprobante =
      this.transaccionForm.get("numeroComprobante")?.value;
    transacionPago.archivo = this.transaccionForm.get("archivo")?.value;
    transacionPago.notas = this.transaccionForm.get("notas")?.value;
    transacionPago.fechaTransaccion = new Date().toISOString();
    transacionPago.valorRegistrado = this.transaccionForm.get("valor")?.value;
    transacionPago.valorRestante =
      this.pedido.totalPedididoConDescuento -
      ((this.pedido?.PagosAsentados != undefined
        ? this.pedido?.PagosAsentados?.reduce(
            (a, b) => a + (b.valor || b.valorRegistrado || 0),
            0,
          )
        : 0) +
        this.transaccionForm.get("valor")?.value);
    transacionPago.usuarioRegistro = (
      JSON.parse(localStorage.getItem("user")) as UserLite
    ).name;
    transacionPago.fechaHoraSistema = new Date().toISOString();
    transacionPago.fechaHoraCarga = new Date().toISOString();
    transacionPago.estadoVerificacion = "Pendiente";
    transacionPago.fechaHoraAprobacionRechazo = "";

    // this.modalService.dismissAll(transacionPago);
  }

  eliminarPago(pago: Pago) {
    Swal.fire({
      title: "¿Está seguro?",
      text: `Está seguro de eliminar el pago con fecha ${pago.fecha} y valor ${pago.valor} y número de comprobante ${pago.numeroComprobante} del pedido ${this.pedido.nroPedido}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // DEBUG: Log antes de eliminar
        console.log("🗑️ ANTES DE ELIMINAR PAGO:");
        console.log("Valor del pago a eliminar:", pago.valor);
        console.log("Anticipo actual:", this.pedido.anticipo);
        console.log("Falta por pagar actual:", this.pedido.faltaPorPagar);

        const eliminarLocalYRecalcular = () => {
          // Actualiza los PagosAsentados corrigiendo la condición de filtrado
          this.pedido.PagosAsentados = (this.pedido.PagosAsentados || []).filter(
            (x) => x.fechaHoraCarga !== pago.fechaHoraCarga,
          );

          // Recalcular valores después de eliminar
          const totalPagosAsentados = (this.pedido.PagosAsentados || []).reduce(
            (acc, p) => {
              if (
                p.formaPago?.toLowerCase().includes("wompi") &&
                p.estadoVerificacion === "Pendiente"
              ) {
                return acc;
              }
              const valorPago = Number(p.valor || p.valorRegistrado || 0) || 0;
              return acc + valorPago;
            },
            0,
          );

          this.pedido.anticipo = Math.round((totalPagosAsentados + Number.EPSILON) * 100) / 100;
          this.pedido.faltaPorPagar = Math.max(
            0,
            Math.round(((this.pedido.totalPedididoConDescuento || 0) - totalPagosAsentados + Number.EPSILON) * 100) / 100,
          );

          if (this.pedido.faltaPorPagar <= 0) {
            this.pedido.estadoPago = EstadoPago.Aprobado;
          } else if (
            this.pedido.faltaPorPagar > 0 &&
            this.pedido.faltaPorPagar < (this.pedido.totalPedididoConDescuento || 0)
          ) {
            this.pedido.estadoPago = EstadoPago.PreAprobado;
          } else {
            this.pedido.estadoPago = EstadoPago.Pendiente;
          }

          (this.pedido as any)._estadoCalculadoEnFrontend = true;
          (this.pedido as any)._timestamp = new Date().getTime();

          // DEBUG: Log después de eliminar
          console.log("🗑️ DESPUÉS DE ELIMINAR PAGO:");
          console.log("Nuevo anticipo:", this.pedido.anticipo);
          console.log("Nueva falta por pagar:", this.pedido.faltaPorPagar);
          console.log("Nuevo estado:", this.pedido.estadoPago);
          console.log("✅ Pedido marcado como calculado en frontend");

          this.modalService.dismissAll(this.pedido);
        };

        // Elimina el archivo de Firebase Storage si existe, pero no bloquee el flujo si falla
        if (pago.archivo) {
          try {
            this.storage
              .refFromURL(pago.archivo)
              .delete()
              .subscribe({
                next: () => eliminarLocalYRecalcular(),
                error: () => eliminarLocalYRecalcular(),
              });
          } catch (e) {
            eliminarLocalYRecalcular();
          }
        } else {
          eliminarLocalYRecalcular();
        }
      }
    });
  }
}
