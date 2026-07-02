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
import { VentasService } from "src/app/shared/services/ventas/ventas.service";
import { TreasuryService } from "src/app/shared/services/treasury/treasury.service";
import { SubmitPaymentPayload } from "src/app/shared/services/treasury/treasury.models";

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

  /** Spec 013 — flag por empresa: con tesorería activa el pago va a verificación server-side. */
  treasuryEnabled: boolean = false;
  readonly tooltipPagoTesoreria =
    "Con tesorería activa, la gestión de pagos se hace desde el módulo Tesorería";

  constructor(
    private formasPagoService: MaestroService,
    private storage: AngularFireStorage,
    private modalService: NgbModal,
    private ventasService: VentasService,
    private treasuryService: TreasuryService,
  ) {}

  ngOnInit(): void {
    // Spec 013 — consulta el flag de tesorería (cacheado en el servicio, un solo GET por sesión).
    // En error se asume OFF: comportamiento legacy, nunca se bloquea el registro de pagos.
    this.treasuryService.getConfig().subscribe({
      next: (cfg) => (this.treasuryEnabled = cfg?.treasuryEnabled === true),
      error: () => (this.treasuryEnabled = false),
    });

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
      notas: new FormControl(""),
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
    // Spec 013 fix M-2 — race del flag: si /config aún no respondió (flag
    // cacheado null), esperar el GET antes de decidir el camino; así un fallo
    // transitorio no manda el pago por el camino legacy por accidente mientras
    // el server tiene tesorería activa. Si el GET falla → OFF (legacy), igual
    // que en ngOnInit: nunca se bloquea el registro de pagos.
    if (
      this.transaccionForm.valid &&
      this.treasuryService.treasuryEnabledCached === null
    ) {
      this.treasuryService
        .getConfig()
        .toPromise()
        .then((cfg) => {
          this.treasuryEnabled = cfg?.treasuryEnabled === true;
        })
        .catch(() => {
          this.treasuryEnabled = false;
        })
        .then(() => this.ejecutarRegistroTransaccion());
      return;
    }
    if (this.treasuryService.treasuryEnabledCached !== null) {
      this.treasuryEnabled =
        this.treasuryService.treasuryEnabledCached === true;
    }
    this.ejecutarRegistroTransaccion();
  }

  /** Spec 013 — continuación del registro una vez resuelto el flag de tesorería. */
  private ejecutarRegistroTransaccion(): void {
    if (this.transaccionForm.valid) {
      // Spec 013 — Tesorería activa: el registro y el estado del pedido los decide
      // el servidor vía /v1/treasury/payments/submit (nunca se auto-aprueba aquí).
      if (this.treasuryEnabled) {
        this.registrarTransaccionTesoreria();
        return;
      }

      // DEBUG: Log inicial para debug
      console.log("🔍 ANTES DEL PAGO:");
      console.log("Total del pedido:", this.pedido.totalPedididoConDescuento);
      console.log("Falta por pagar antes:", this.pedido.faltaPorPagar);
      console.log("Anticipo antes:", this.pedido.anticipo);
      console.log("Pagos existentes:", this.pedido.PagosAsentados?.length || 0);
      console.log("Nuevo valor a registrar:", this.transaccionForm.value.valor);

      // ✅ CORREGIDO: Preservar el valor exacto del formulario
      const valorNuevoPago = parseFloat(String(this.transaccionForm.get("valor")?.value)) || 0;
      
      console.log(`🔍 DEBUG ASENTAMIENTO PAGO - Pedido ${this.pedido.nroPedido}:`, {
        valorFormularioOriginal: this.transaccionForm.get("valor")?.value,
        valorFormularioParseado: valorNuevoPago,
        totalPedido: this.pedido.totalPedididoConDescuento,
        anticipoAnterior: this.pedido.anticipo,
        faltaPorPagarAnterior: this.pedido.faltaPorPagar
      });
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
          estadoVerificacion: "Aprobado",
          fechaHoraSistema: new Date().toISOString(),
          fechaHoraCarga: new Date().toISOString(),
          fechaHoraAprobacionRechazo: new Date().toISOString(),
        };

        const order = this.pedido;
        if (!order.PagosAsentados) {
          order.PagosAsentados = [];
        }
        order.PagosAsentados.push(transacionPago);

        const totalPagosAsentados = order.PagosAsentados.reduce((acc, pago) => {
          // ✅ CORREGIDO: Incluir TODOS los pagos, incluso los pendientes
          // Los pagos pendientes también representan dinero que el cliente ya pagó
          // Solo excluir pagos rechazados o cancelados
          
          // Verificar si el pago está en un estado válido para sumar
          const estadoValido = pago.estadoVerificacion !== "Rechazado" && 
                              pago.estadoVerificacion !== "Cancelado";
          
          if (estadoValido) {
            // ✅ CORREGIDO: Usar parseFloat para evitar pérdida de precisión
            const valorPago = parseFloat(String(pago.valor || pago.valorRegistrado || 0)) || 0;
            console.log(`💰 PAGO INCLUIDO EN CÁLCULO - Pedido ${order.nroPedido}:`, {
              formaPago: pago.formaPago,
              estadoVerificacion: pago.estadoVerificacion,
              valor: valorPago,
              numeroComprobante: pago.numeroComprobante
            });
            return acc + valorPago;
          } else {
            console.log(`❌ PAGO EXCLUIDO DEL CÁLCULO - Pedido ${order.nroPedido}:`, {
              formaPago: pago.formaPago,
              estadoVerificacion: pago.estadoVerificacion,
              valor: pago.valor || pago.valorRegistrado,
              numeroComprobante: pago.numeroComprobante,
              razon: "Estado inválido"
            });
            return acc;
          }
        }, 0);

        // ✅ CORREGIDO: Función de redondeo segura para evitar errores de precisión
        const safeRound = (value: number, decimals: number = 2): number => {
          return Math.round((value + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
        };

        order.anticipo = safeRound(totalPagosAsentados);
        order.faltaPorPagar = Math.max(
          0,
          safeRound((order.totalPedididoConDescuento || 0) - totalPagosAsentados),
        );

        console.log(`💰 RESULTADO FINAL ASENTAMIENTO - Pedido ${order.nroPedido}:`, {
          valorNuevoPago,
          totalPagosAsentados,
          anticipoFinal: order.anticipo,
          faltaPorPagarFinal: order.faltaPorPagar,
          totalPedido: order.totalPedididoConDescuento,
          diferencia: totalPagosAsentados - order.anticipo
        });

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

        // Actualizar el pedido en el backend para preservar el estado de pago
        this.ventasService.editOrder(order).subscribe({
          next: (response) => {
            console.log("✅ Pedido actualizado en backend:", response);
            this.modalService.dismissAll(order);
            Swal.close();
            this.cancelar();
          },
          error: (error) => {
            console.error("❌ Error al actualizar pedido en backend:", error);
            // Aún así cerrar el modal ya que el pago se registró localmente
            this.modalService.dismissAll(order);
            Swal.close();
            this.cancelar();
          }
        });
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

  /**
   * Spec 013 — Camino con tesorería activa: calcula el hash SHA-256 del
   * comprobante ANTES de subirlo, sube el archivo y delega el registro a
   * POST /v1/treasury/payments/submit. El estadoPago que refresca la vista
   * es el que responde el SERVIDOR (aquí no se recalcula nada).
   */
  private registrarTransaccionTesoreria(): void {
    const valorNuevoPago =
      parseFloat(String(this.transaccionForm.get("valor")?.value)) || 0;
    const formaPagoSeleccionada = this.transaccionForm.get("formaPago")?.value;
    const formaPagoObj = Array.isArray(this.formasPago)
      ? this.formasPago.find((f: any) => f?.id == formaPagoSeleccionada)
      : null;
    const formaPagoNombre: string = (
      formaPagoObj?.nombre || formaPagoSeleccionada || ""
    ).toString();

    const enviarATesoreria = (archivoUrl: string, archivoHash: string) => {
      const payload: SubmitPaymentPayload = {
        orderId: this.pedido._id || (this.pedido as any).id || "",
        pago: {
          valor: valorNuevoPago,
          formaPago: formaPagoNombre,
          numeroComprobante:
            this.transaccionForm.get("numeroComprobante")?.value,
          fechaTransaccion: new Date().toISOString(),
          archivo: archivoUrl || "",
          archivoEvidencia: "",
          archivoHash: archivoHash || "",
          notas: this.transaccionForm.get("notas")?.value || "",
          fecha: this.transaccionForm.get("fecha")?.value,
          usuarioRegistro: (
            JSON.parse(localStorage.getItem("user")) as UserLite
          ).name,
        },
      };

      Swal.fire({
        title: "Registrando pago...",
        text: "Enviando a verificación de tesorería...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });

      this.treasuryService.submitPayment(payload).subscribe({
        next: (resp) => {
          // Refrescar la vista con lo que decidió el servidor (sin recálculo client-side)
          const order = this.pedido;
          if (!order.PagosAsentados) {
            order.PagosAsentados = [];
          }
          const pagoRegistrado: Pago = {
            ...payload.pago,
            numeroPedido: order.nroPedido,
            valorTotalVenta: order.totalPedididoConDescuento,
            valorRegistrado: valorNuevoPago,
            estadoVerificacion: "Pendiente",
            fechaHoraSistema: new Date().toISOString(),
            fechaHoraCarga: new Date().toISOString(),
            fechaHoraAprobacionRechazo: "",
            paymentId: resp?.paymentId || "",
          };
          order.PagosAsentados.push(pagoRegistrado);
          if (resp?.estadoPago) {
            order.estadoPago = resp.estadoPago as EstadoPago;
          }
          if (typeof resp?.valorRestante === "number") {
            order.faltaPorPagar = Math.max(0, resp.valorRestante);
            order.anticipo = Math.max(
              0,
              (order.totalPedididoConDescuento || 0) - resp.valorRestante,
            );
          }

          Swal.fire({
            icon: "success",
            title: "Pago registrado",
            text: "El pago quedó en revisión de tesorería.",
            confirmButtonColor: "#3085d6",
            confirmButtonText: "Aceptar",
          }).then(() => {
            this.modalService.dismissAll(order);
            this.cancelar();
          });
        },
        error: (error) => {
          console.error("Error registrando pago en tesorería:", error);
          Swal.fire({
            icon: "error",
            title: "No se pudo registrar el pago",
            text:
              error?.error?.message ||
              "Intenta de nuevo o contacta a soporte.",
          });
        },
      });
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

      // Hash SHA-256 ANTES del upload (capa anti-fraude de duplicados, spec 013)
      this.computeFileHash(this.selectedFile).then((hash) => {
        const filePath = `comprobatensPago/${this.pedido.nroPedido}/${new Date().getTime()}_${this.selectedFile.name}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, this.selectedFile);

        task
          .snapshotChanges()
          .pipe(
            finalize(() => {
              fileRef
                .getDownloadURL()
                .subscribe((url) => enviarATesoreria(url, hash));
            }),
          )
          .subscribe();
      });
    } else {
      enviarATesoreria("", "");
    }
  }

  /**
   * Spec 013 — SHA-256 (hex) del archivo con WebCrypto. Best-effort: si el
   * navegador no soporta crypto.subtle o falla la lectura, retorna "" y el
   * pago se registra igual (la capa de referencia es 100% server-side).
   */
  private async computeFileHash(file: File): Promise<string> {
    try {
      if (!crypto?.subtle?.digest) {
        return "";
      }
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return "";
    }
  }

  /**
   * Spec 013 fix C-2 — Con tesorería activa TODOS los pagos del historial son
   * de SOLO LECTURA aquí (no solo los que tienen paymentId o verificación
   * Pendiente): editar/eliminar un pago legacy recalcularía estadoPago
   * client-side y permitiría a un vendedor auto-aprobarse el pedido.
   * Cualquier gestión de pagos se hace desde el módulo Tesorería.
   */
  isPagoBloqueadoPorTesoreria(_pago?: Pago): boolean {
    return this.treasuryEnabled === true;
  }

  editarPago(pago: Pago) {
    if (this.isPagoBloqueadoPorTesoreria(pago)) {
      Swal.fire({
        icon: "info",
        title: "Tesorería activa",
        text: this.tooltipPagoTesoreria,
      });
      return;
    }
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

    // Recalcular el estado de pago después de editar
    this.recalcularEstadoPago();
  }

  /**
   * Método helper para recalcular el estado de pago de manera consistente
   * Se usa tanto al registrar como al editar pagos
   */
  private recalcularEstadoPago(): void {
    // ✅ CORREGIDO: Calcular total de pagos asentados (incluyendo pendientes)
    const totalPagosAsentados = (this.pedido.PagosAsentados || []).reduce((acc, pago) => {
      // Solo excluir pagos rechazados o cancelados
      const estadoValido = pago.estadoVerificacion !== "Rechazado" && 
                          pago.estadoVerificacion !== "Cancelado";
      
      if (estadoValido) {
        const valorPago = Number(pago.valor || pago.valorRegistrado || 0) || 0;
        return acc + valorPago;
      }
      return acc;
    }, 0);

    // Actualizar anticipo y falta por pagar
    this.pedido.anticipo = Math.round((totalPagosAsentados + Number.EPSILON) * 100) / 100;
    this.pedido.faltaPorPagar = Math.max(
      0,
      Math.round(((this.pedido.totalPedididoConDescuento || 0) - totalPagosAsentados + Number.EPSILON) * 100) / 100,
    );

    // Determinar el nuevo estado de pago
    if (this.pedido.faltaPorPagar <= 0) {
      // Si no falta por pagar, el pedido está completamente pagado
      this.pedido.estadoPago = EstadoPago.Aprobado;
    } else if (
      this.pedido.faltaPorPagar > 0 &&
      this.pedido.faltaPorPagar < (this.pedido.totalPedididoConDescuento || 0)
    ) {
      // Si falta por pagar pero es menos que el total, hay pagos parciales
      this.pedido.estadoPago = EstadoPago.PreAprobado;
    } else {
      // Si no hay pagos o falta por pagar es igual al total
      this.pedido.estadoPago = EstadoPago.Pendiente;
    }

    // Marcar como calculado en frontend
    (this.pedido as any)._estadoCalculadoEnFrontend = true;
    (this.pedido as any)._timestamp = new Date().getTime();

    console.log("🔄 ESTADO DE PAGO RECALCULADO:");
    console.log("Total pagos asentados:", totalPagosAsentados);
    console.log("Nuevo anticipo:", this.pedido.anticipo);
    console.log("Nueva falta por pagar:", this.pedido.faltaPorPagar);
    console.log("Nuevo estado de pago:", this.pedido.estadoPago);
    console.log("✅ Pedido marcado como calculado en frontend");
  }

  eliminarPago(pago: Pago) {
    // Spec 013 fix C-2 — con tesorería activa ningún pago se elimina desde aquí
    if (this.isPagoBloqueadoPorTesoreria(pago)) {
      Swal.fire({
        icon: "info",
        title: "Tesorería activa",
        text: this.tooltipPagoTesoreria,
      });
      return;
    }
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
              // ✅ CORREGIDO: Incluir TODOS los pagos, incluso los pendientes
              // Solo excluir pagos rechazados o cancelados
              const estadoValido = p.estadoVerificacion !== "Rechazado" && 
                                  p.estadoVerificacion !== "Cancelado";
              
              if (estadoValido) {
                const valorPago = Number(p.valor || p.valorRegistrado || 0) || 0;
                return acc + valorPago;
              }
              return acc;
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

          // Actualizar el pedido en el backend para preservar el estado de pago
          this.ventasService.editOrder(this.pedido).subscribe({
            next: (response) => {
              console.log("✅ Pedido actualizado en backend después de eliminar pago:", response);
              this.modalService.dismissAll(this.pedido);
            },
            error: (error) => {
              console.error("❌ Error al actualizar pedido en backend después de eliminar pago:", error);
              // Aún así cerrar el modal ya que el pago se eliminó localmente
              this.modalService.dismissAll(this.pedido);
            }
          });
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
