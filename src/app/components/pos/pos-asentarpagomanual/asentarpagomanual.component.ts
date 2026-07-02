import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';
import { EstadoPago, Pago, Pedido } from '../../ventas/modelo/pedido';
import { User } from '../../../shared/services/firebase/auth.service';
import { UserLite } from '../../../shared/models/User/UserLite';
import { TreasuryService } from '../../../shared/services/treasury/treasury.service';
import { SubmitPaymentPayload } from '../../../shared/services/treasury/treasury.models';

@Component({
  selector: 'app-asentarpagomanual',
  templateUrl: './asentarpagomanual.component.html',
  styleUrls: ['./asentarpagomanual.component.scss']
})
export class POSAsentarpagomanualComponent implements OnInit {

  transaccionForm: FormGroup;
  formasPago: any;
  selectedFile: File;
  @Input() pedido: Pedido;

  permiteAsentarPago: boolean = true;
  valorExcedido: boolean;

  /** Spec 013 — flag por empresa: con tesorería activa el pago va a verificación server-side. */
  treasuryEnabled: boolean = false;
  readonly tooltipPagoTesoreria =
    'Con tesorería activa, la gestión de pagos se hace desde el módulo Tesorería';

  constructor(private formasPagoService: MaestroService, private storage: AngularFireStorage, private modalService: NgbModal, private treasuryService: TreasuryService) { }

  ngOnInit(): void {
    // Spec 013 — consulta el flag de tesorería (cacheado en el servicio, un solo GET por sesión).
    // En error se asume OFF: comportamiento legacy, nunca se bloquea el registro de pagos.
    this.treasuryService.getConfig().subscribe({
      next: (cfg) => (this.treasuryEnabled = cfg?.treasuryEnabled === true),
      error: () => (this.treasuryEnabled = false),
    });

    if (this.pedido.estadoPago === EstadoPago.Aprobado && this.pedido.faltaPorPagar <= 0) {
      this.permiteAsentarPago = false
      Swal.fire({
        title: '¡Alerta!',
        text: "Este pedido ya se encuentra pagado.",
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    this.transaccionForm = new FormGroup({
      fecha: new FormControl('', Validators.required),
      formaPago: new FormControl('', Validators.required),
      valor: new FormControl('', [Validators.required]),
      numeroComprobante: new FormControl('', Validators.required),
      archivo: new FormControl(''),
      notas: new FormControl('', Validators.required),
    });
    this.transaccionForm.get('valor').valueChanges.subscribe(value => {
      this.validateMaxValue(value);
    });
    // inicializar campo fecha con la actual
    this.transaccionForm.get('fecha').setValue(new Date().toISOString().split('T')[0]);

    this.formasPagoService.consultarFormaPago().subscribe(
      {
        next: (formasPago) => {
          this.formasPago = formasPago;
        },
        error: (error: any) => {
          console.error(error);
        }
      }

    );
  }


  validateMaxValue(value: number) {
    this.valorExcedido = value > this.pedido.faltaPorPagar;
  }

  onFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
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
      this.treasuryEnabled = this.treasuryService.treasuryEnabledCached === true;
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

      if ((this.pedido.faltaPorPagar - this.transaccionForm.value.valor) <= 0) {
        this.pedido.estadoPago = EstadoPago.Aprobado
      } else if ((this.pedido.faltaPorPagar - this.transaccionForm.value.valor) > 0 && (this.pedido.faltaPorPagar - this.transaccionForm.value.valor) < this.pedido.totalPedididoConDescuento) {
        this.pedido.estadoPago = EstadoPago.PreAprobado
      }
      if (this.selectedFile) {
        // Muestra una alerta con una barra de carga

        Swal.fire({
          title: 'Subiendo archivo...',
          text: 'Por favor espere...',
          allowOutsideClick: false,
          showConfirmButton: false,
          willOpen: () => {
            Swal.showLoading();
          }
        });

        // Genera un nombre único para el archivo
        const filePath = `comprobatensPago/${this.pedido.nroPedido}/${new Date().getTime()}_${this.selectedFile.name}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, this.selectedFile);

        // Obtiene la URL de descarga una vez que la subida se ha completado
        task.snapshotChanges().pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe(url => {
              this.transaccionForm.get('archivo').setValue(url);

              const transacionPago: Pago = {
                fecha: this.transaccionForm.get('fecha').value,
                formaPago: this.transaccionForm.get('formaPago').value,
                valor: this.transaccionForm.get('valor').value,
                numeroPedido: this.pedido.nroPedido,
                numeroComprobante: this.transaccionForm.get('numeroComprobante').value,
                archivo: this.transaccionForm.get('archivo').value,
                notas: this.transaccionForm.get('notas').value,
                fechaTransaccion: new Date().toISOString(),
                valorTotalVenta: this.pedido.totalPedididoConDescuento,
                valorRegistrado: this.transaccionForm.get('valor').value,
                valorRestante: this.pedido.totalPedididoConDescuento - ((this.pedido?.PagosAsentados != undefined ? this.pedido?.PagosAsentados?.reduce((a, b) => a + b.valor, 0) : 0) + this.transaccionForm.get('valor').value),
                archivoEvidencia: '',
                usuarioRegistro: (JSON.parse(localStorage.getItem('user')) as UserLite).name,
                estadoVerificacion: 'Pendiente',
                fechaHoraSistema: new Date().toISOString(),
                fechaHoraCarga: new Date().toISOString(),
                fechaHoraAprobacionRechazo: '',
              };

              const order = this.pedido;

              if (!order.PagosAsentados) {
                order.PagosAsentados = [];
              }

              order.PagosAsentados.push(transacionPago);
              order.faltaPorPagar = order.totalPedididoConDescuento - order.PagosAsentados.reduce((acc, pago) => acc + pago.valor, 0);
              order.anticipo = order.PagosAsentados.reduce((acc, pago) => acc + pago.valor, 0);
              order.estadoPago = order.faltaPorPagar <= 0 ? EstadoPago.Aprobado : EstadoPago.PreAprobado;



              this.modalService.dismissAll(order);

              // Cierra la alerta cuando la subida se ha completado
              Swal.close();
            });
          })
        ).subscribe();
      }
      else {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Por favor seleccione un archivo',
        });
      }
    }
    else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor complete los campos requeridos',
      });
    }
  }


  /**
   * Spec 013 — Camino con tesorería activa (espejo del modal de ventas):
   * calcula el hash SHA-256 del comprobante ANTES de subirlo, sube el archivo
   * y delega el registro a POST /v1/treasury/payments/submit. El estadoPago que
   * refresca la vista es el que responde el SERVIDOR (aquí no se recalcula nada).
   * Se mantiene la regla POS de archivo obligatorio.
   */
  private registrarTransaccionTesoreria(): void {
    if (!this.selectedFile) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor seleccione un archivo',
      });
      return;
    }

    const valorNuevoPago = parseFloat(String(this.transaccionForm.get('valor')?.value)) || 0;
    const formaPagoSeleccionada = this.transaccionForm.get('formaPago')?.value;
    const formaPagoObj = Array.isArray(this.formasPago)
      ? this.formasPago.find((f: any) => f?.id == formaPagoSeleccionada)
      : null;
    const formaPagoNombre: string = (formaPagoObj?.nombre || formaPagoSeleccionada || '').toString();

    const enviarATesoreria = (archivoUrl: string, archivoHash: string) => {
      const payload: SubmitPaymentPayload = {
        orderId: this.pedido._id || (this.pedido as any).id || '',
        // Spec 013 fix m-2 — el clon POS declara su origen real; el backend
        // whitelistea ["vendedor","tesorero","pos","webhook"] y sin este campo
        // registraría "vendedor" por defecto.
        origen: 'pos',
        pago: {
          valor: valorNuevoPago,
          formaPago: formaPagoNombre,
          numeroComprobante: this.transaccionForm.get('numeroComprobante')?.value,
          fechaTransaccion: new Date().toISOString(),
          archivo: archivoUrl || '',
          archivoEvidencia: '',
          archivoHash: archivoHash || '',
          notas: this.transaccionForm.get('notas')?.value || '',
          fecha: this.transaccionForm.get('fecha')?.value,
          usuarioRegistro: (JSON.parse(localStorage.getItem('user')) as UserLite).name,
        },
      };

      Swal.fire({
        title: 'Registrando pago...',
        text: 'Enviando a verificación de tesorería...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
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
            estadoVerificacion: 'Pendiente',
            fechaHoraSistema: new Date().toISOString(),
            fechaHoraCarga: new Date().toISOString(),
            fechaHoraAprobacionRechazo: '',
            paymentId: resp?.paymentId || '',
          };
          order.PagosAsentados.push(pagoRegistrado);
          if (resp?.estadoPago) {
            order.estadoPago = resp.estadoPago as EstadoPago;
          }
          if (typeof resp?.valorRestante === 'number') {
            order.faltaPorPagar = Math.max(0, resp.valorRestante);
            order.anticipo = Math.max(0, (order.totalPedididoConDescuento || 0) - resp.valorRestante);
          }

          Swal.fire({
            icon: 'success',
            title: 'Pago registrado',
            text: 'El pago quedó en revisión de tesorería.',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Aceptar',
          }).then(() => {
            this.modalService.dismissAll(order);
          });
        },
        error: (error) => {
          console.error('Error registrando pago en tesorería:', error);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo registrar el pago',
            text: error?.error?.message || 'Intenta de nuevo o contacta a soporte.',
          });
        }
      });
    };

    Swal.fire({
      title: 'Subiendo archivo...',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    // Hash SHA-256 ANTES del upload (capa anti-fraude de duplicados, spec 013)
    this.computeFileHash(this.selectedFile).then((hash) => {
      const filePath = `comprobatensPago/${this.pedido.nroPedido}/${new Date().getTime()}_${this.selectedFile.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, this.selectedFile);

      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => enviarATesoreria(url, hash));
        })
      ).subscribe();
    });
  }

  /**
   * Spec 013 — SHA-256 (hex) del archivo con WebCrypto. Best-effort: si el
   * navegador no soporta crypto.subtle o falla la lectura, retorna '' y el
   * pago se registra igual (la capa de referencia es 100% server-side).
   */
  private async computeFileHash(file: File): Promise<string> {
    try {
      if (!crypto?.subtle?.digest) {
        return '';
      }
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return '';
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
        icon: 'info',
        title: 'Tesorería activa',
        text: this.tooltipPagoTesoreria,
      });
      return;
    }

    this.transaccionForm.get('fecha').setValue(pago.fecha);
    this.transaccionForm.get('formaPago').setValue(pago.formaPago);
    this.transaccionForm.get('valor').setValue(pago.valor);
    this.transaccionForm.get('numeroComprobante').setValue(pago.numeroComprobante);
    this.transaccionForm.get('archivo').setValue(pago.archivo);
    this.transaccionForm.get('notas').setValue(pago.notas);

    const transacionPago: Pago = this.pedido.PagosAsentados.find(x => x.fecha == pago.fecha && x.valor == pago.valor && x.numeroComprobante == pago.numeroComprobante);

    transacionPago.fecha = this.transaccionForm.get('fecha').value;
    transacionPago.formaPago = this.transaccionForm.get('formaPago').value;
    transacionPago.valor = this.transaccionForm.get('valor').value;
    transacionPago.numeroComprobante = this.transaccionForm.get('numeroComprobante').value;
    transacionPago.archivo = this.transaccionForm.get('archivo').value;
    transacionPago.notas = this.transaccionForm.get('notas').value;
    transacionPago.fechaTransaccion = new Date().toISOString();
    transacionPago.valorRegistrado = this.transaccionForm.get('valor').value;
    transacionPago.valorRestante = this.pedido.totalPedididoConDescuento - ((this.pedido?.PagosAsentados != undefined ? this.pedido?.PagosAsentados?.reduce((a, b) => a + b.valor, 0) : 0) + this.transaccionForm.get('valor').value);
    transacionPago.usuarioRegistro = (JSON.parse(localStorage.getItem('user')) as UserLite).name;
    transacionPago.fechaHoraSistema = new Date().toISOString();
    transacionPago.fechaHoraCarga = new Date().toISOString();
    transacionPago.estadoVerificacion = 'Pendiente';
    transacionPago.fechaHoraAprobacionRechazo = '';

    // this.modalService.dismissAll(transacionPago);

  }

  eliminarPago(pago: Pago) {
    // Spec 013 fix C-2 — con tesorería activa ningún pago se elimina desde aquí
    if (this.isPagoBloqueadoPorTesoreria(pago)) {
      Swal.fire({
        icon: 'info',
        title: 'Tesorería activa',
        text: this.tooltipPagoTesoreria,
      });
      return;
    }
    Swal.fire({
      title: '¿Está seguro?',
      text: `Está seguro de eliminar el pago con fecha ${pago.fecha} y valor ${pago.valor} y número de comprobante ${pago.numeroComprobante} del pedido ${this.pedido.nroPedido}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Elimina el archivo de Firebase Storage
        this.storage.refFromURL(pago.archivo).delete().subscribe(() => {
          // Actualiza los PagosAsentados una vez que el archivo se ha eliminado
          this.pedido.PagosAsentados = this.pedido.PagosAsentados.filter(x => x.fechaHoraCarga != pago.fechaHoraCarga && x.valor != pago.valor && x.numeroComprobante != pago.numeroComprobante);
          this.pedido.faltaPorPagar = this.pedido.totalPedididoConDescuento - this.pedido.PagosAsentados.reduce((acc, pago) => acc + pago.valor, 0);
          this.pedido.anticipo = this.pedido.PagosAsentados.reduce((acc, pago) => acc + pago.valor, 0);
          this.modalService.dismissAll(this.pedido);
        });
      }
    });
  }
}
