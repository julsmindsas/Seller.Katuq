import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import {
  SubmitPaymentPayload,
  LecturaComprobanteResponse,
  ComprobanteConfigVista,
} from '../../../../shared/services/treasury/treasury.models';

import { TranslateService } from '@ngx-translate/core';
/**
 * Spec 013 — Tesorería MVP. Modal "Registrar Pago" del tesorero (T-17, CA-08).
 * Pago desde cero, aprobado directo (origen "tesorero"). Calcula SHA-256 del
 * archivo (WebCrypto) antes de subirlo → POST /payments/direct.
 *
 * Ticket 1449 (bandera `comprobantePrimero`, D-662 propuesta): con la bandera encendida el orden cambia. Primero se
 * sube el comprobante; el servidor lo lee con IA y SUGIERE banco, valor, fecha, hora, referencia y cuenta destino.
 * Todo es editable y la persona confirma; el servidor (no esta pantalla) decide qué quedó «editado a mano» y calcula
 * la huella del archivo. Sin comprobante: referencia digitada + casilla «Verificado en banco». Con la bandera
 * apagada el formulario es el de siempre.
 */
@Component({
  selector: 'app-registrar-pago',
  templateUrl: './registrar-pago.component.html',
  styleUrls: ['./registrar-pago.component.scss'],
})
export class RegistrarPagoComponent implements OnInit {
  @Input() pedido: any;

  form!: FormGroup;
  formasPago: any[] = [];
  selectedFile: File | null = null;
  isDragOver = false;
  submitting = false;
  valorExcedido = false;

  // ── Ticket 1449: comprobante primero ────────────────────────────────────────
  comprobantePrimero = false;
  cfgComprobante: ComprobanteConfigVista | null = null;
  /** Comprobante ya subido a Storage (se sube al elegirlo, no al registrar). */
  archivoUrlSubido = '';
  subiendoArchivo = false;
  leyendo = false;
  lectura: LecturaComprobanteResponse | null = null;
  mensajeLectura = '';
  verificadoEnBanco = false;
  /** Campos que dejó la lectura y que la persona no ha tocado: si cambia o quita el archivo, se limpian. */
  private autollenados = new Set<string>();
  /** Confianza por debajo de la cual el campo se marca «Revisar». */
  readonly confianzaMinima = 0.6;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private storage: AngularFireStorage,
    private maestro: MaestroService,
    private treasury: TreasuryService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      formaPago: ['', Validators.required],
      valor: ['', [Validators.required, Validators.min(1)]],
      numeroComprobante: ['', Validators.required],
      notas: [''],
      // Ticket 1449 (solo se muestran con la bandera `comprobantePrimero`)
      banco: [''],
      hora: [''],
      cuentaUltimos4: ['', Validators.pattern(/^\d{4}$/)],
    });

    this.form.get('valor')?.valueChanges.subscribe((v) => this.validarValor(v));
    this.form.get('formaPago')?.valueChanges.subscribe(() => this.ajustarReferenciaRequerida());

    this.maestro.consultarFormaPago().subscribe({
      next: (fp) => (this.formasPago = Array.isArray(fp) ? fp : []),
      error: () => (this.formasPago = []),
    });

    // Ticket 1449: ¿pide primero el comprobante? Si algo falla, el formulario queda como siempre.
    this.treasury.getConfig().subscribe({
      next: (cfg) => {
        this.comprobantePrimero = cfg?.comprobantePrimero === true;
        if (this.comprobantePrimero) this.cargarConfigComprobante();
      },
      error: () => (this.comprobantePrimero = false),
    });
  }

  private cargarConfigComprobante(): void {
    this.treasury.getComprobanteConfig().subscribe({
      next: (c) => {
        this.cfgComprobante = c;
        this.ajustarReferenciaRequerida();
      },
      error: () => (this.cfgComprobante = null),
    });
  }

  /** Una forma de pago declarada sin referencia (p. ej. Efectivo) no pide el número de comprobante; el servidor pone uno interno. */
  private ajustarReferenciaRequerida(): void {
    const ctrl = this.form?.get('numeroComprobante');
    if (!ctrl) return;
    if (this.comprobantePrimero && this.formaSinReferencia) ctrl.clearValidators();
    else ctrl.setValidators(Validators.required);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  get comprobanteObligatorio(): boolean {
    return this.comprobantePrimero && this.cfgComprobante?.obligatorio === true;
  }

  /** La forma de pago elegida es de las que el comercio declaró sin referencia (p. ej. Efectivo). */
  get formaSinReferencia(): boolean {
    const nombre = this.nombreFormaPago().trim().toLowerCase();
    return !!nombre && (this.cfgComprobante?.formasSinReferencia || []).some((f) => (f || '').trim().toLowerCase() === nombre);
  }

  private nombreFormaPago(): string {
    const sel = this.form?.get('formaPago')?.value;
    const obj = (this.formasPago || []).find((f: any) => f?.id == sel);
    return (obj?.nombre || sel || '').toString();
  }

  /** «Verificado en banco» solo tiene sentido sin comprobante y cuando el comercio no lo exige. */
  get mostrarVerificadoEnBanco(): boolean {
    return this.comprobantePrimero && !this.selectedFile && !this.comprobanteObligatorio;
  }

  /** Falta algo que el comercio exige para poder registrar. */
  get faltaComprobanteObligatorio(): boolean {
    return this.comprobanteObligatorio && !this.selectedFile && !this.formaSinReferencia;
  }

  /**
   * Insignia de un campo: 'ia' si lo dejó la lectura tal cual, 'editado' si la persona lo cambió, 'revisar' si la
   * lectura no estaba segura. Solo informa; quien marca «editado a mano» de verdad es el servidor.
   */
  origenCampo(campo: 'banco' | 'valor' | 'fecha' | 'hora' | 'referencia' | 'cuentaDestinoUltimos4'): '' | 'ia' | 'editado' | 'revisar' {
    const l = this.lectura;
    if (!this.comprobantePrimero || !l || l.modo !== 'ia' || !l.campos) return '';
    const leido = l.campos[campo];
    if (leido === null || leido === undefined) return '';
    const actual = this.valorActual(campo);
    const igual = campo === 'valor' ? Math.abs(Number(actual) - Number(leido)) < 0.5 : this.normalizar(actual) === this.normalizar(leido);
    if (!igual) return 'editado';
    return (l.confianza?.[campo] ?? 0) < this.confianzaMinima ? 'revisar' : 'ia';
  }

  private valorActual(campo: string): any {
    const f = this.form;
    switch (campo) {
      case 'banco': return f.get('banco')?.value;
      case 'valor': return f.get('valor')?.value;
      case 'fecha': return f.get('fecha')?.value;
      case 'hora': return f.get('hora')?.value;
      case 'referencia': return f.get('numeroComprobante')?.value;
      case 'cuentaDestinoUltimos4': return f.get('cuentaUltimos4')?.value;
      default: return '';
    }
  }

  private normalizar(v: any): string {
    return String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  get faltaPorPagar(): number {
    return Number(this.pedido?.faltaPorPagar) || 0;
  }

  private validarValor(v: any): void {
    const val = Number(v) || 0;
    this.valorExcedido = this.faltaPorPagar > 0 && val > this.faltaPorPagar;
  }

  // ── Archivo (drag & drop) ──────────────────────────────────────────────────
  onFileChange(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) this.elegirArchivo(file);
  }
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.elegirArchivo(file);
  }
  removeFile(): void {
    this.selectedFile = null;
    this.reiniciarLectura();
    const input = document.getElementById('tk-reg-archivo') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private reiniciarLectura(): void {
    this.limpiarAutollenados();
    this.archivoUrlSubido = '';
    this.lectura = null;
    this.mensajeLectura = '';
    this.leyendo = false;
    this.subiendoArchivo = false;
  }

  /**
   * Sin la bandera, solo guarda el archivo (se sube al registrar, como siempre). Con la bandera lo sube enseguida y
   * pide la lectura: si algo falla, el formulario sigue a mano y el pago se puede registrar igual.
   */
  private elegirArchivo(file: File): void {
    this.selectedFile = file;
    this.reiniciarLectura();
    if (!this.comprobantePrimero) return;
    this.verificadoEnBanco = false;
    this.subiendoArchivo = true;
    this.subirArchivo(file)
      .then((url) => {
        if (this.selectedFile !== file) return; // la persona eligió otro archivo mientras tanto
        this.archivoUrlSubido = url;
        this.subiendoArchivo = false;
        this.leerComprobante(file, url);
      })
      .catch(() => {
        if (this.selectedFile !== file) return;
        this.subiendoArchivo = false;
        this.mensajeLectura = this.translate.instant('tesoreria.registrarPago.noSePudoSubirElComprobante');
      });
  }

  private leerComprobante(file: File, url: string): void {
    const esImagen = /^image\/(jpeg|png|webp)$/.test(file.type);
    if (!esImagen) {
      this.mensajeLectura = this.translate.instant('tesoreria.registrarPago.lecturaSoloImagenes');
      return;
    }
    this.leyendo = true;
    this.treasury.readReceipt(this.pedido?._id, url).subscribe({
      next: (r) => {
        if (this.selectedFile !== file) return;
        this.leyendo = false;
        this.lectura = r;
        if (r?.modo === 'ia' && r.campos) {
          this.aplicarLectura(r);
          this.mensajeLectura = this.translate.instant('tesoreria.registrarPago.lecturaLista');
        } else {
          this.mensajeLectura = r?.message || this.translate.instant('tesoreria.registrarPago.lecturaManual');
        }
      },
      error: () => {
        if (this.selectedFile !== file) return;
        this.leyendo = false;
        this.lectura = null;
        this.mensajeLectura = this.translate.instant('tesoreria.registrarPago.lecturaManual');
      },
    });
  }

  /**
   * Pone lo leído como SUGERENCIA en el formulario; la persona lo revisa y puede cambiarlo todo. No pisa un campo que
   * la persona ya escribió mientras la lectura tardaba.
   */
  private aplicarLectura(r: LecturaComprobanteResponse): void {
    const c = r.campos!;
    const patch: Record<string, any> = {};
    if (c.valor != null) patch['valor'] = c.valor;
    if (c.fecha) patch['fecha'] = c.fecha;
    if (c.hora) patch['hora'] = c.hora;
    if (c.banco) patch['banco'] = c.banco;
    if (c.referencia) patch['numeroComprobante'] = c.referencia;
    if (c.cuentaDestinoUltimos4) patch['cuentaUltimos4'] = c.cuentaDestinoUltimos4;
    for (const nombre of Object.keys(patch)) {
      const ctrl = this.form.get(nombre);
      if (!ctrl || ctrl.dirty) continue;
      ctrl.setValue(patch[nombre]);
      this.autollenados.add(nombre);
    }
  }

  /** Al quitar o cambiar el archivo, lo que dejó su lectura y nadie tocó se borra: no queda un dato de otro comprobante. */
  private limpiarAutollenados(): void {
    if (!this.form) return;
    for (const nombre of this.autollenados) {
      const ctrl = this.form.get(nombre);
      if (!ctrl || ctrl.dirty) continue;
      ctrl.setValue(nombre === 'fecha' ? new Date().toISOString().split('T')[0] : '');
    }
    this.autollenados.clear();
  }

  // ── Registro ───────────────────────────────────────────────────────────────
  async registrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.comprobantePrimero && (this.subiendoArchivo || this.leyendo)) return;
    if (this.comprobantePrimero && this.selectedFile && !this.archivoUrlSubido) {
      // El comprobante no alcanzó a subirse: no se registra el pago sin él en silencio.
      this.toastr.warning(this.translate.instant('tesoreria.registrarPago.noSePudoSubirElComprobante'));
      return;
    }
    if (this.faltaComprobanteObligatorio) {
      this.toastr.warning(this.translate.instant('tesoreria.registrarPago.comprobanteObligatorio'));
      return;
    }
    this.submitting = true;
    try {
      let archivoUrl = '';
      let archivoHash = '';
      if (this.comprobantePrimero) {
        // Ya se subió al elegirlo; la huella la calcula el servidor del archivo guardado.
        archivoUrl = this.selectedFile ? this.archivoUrlSubido : '';
      } else if (this.selectedFile) {
        archivoHash = await this.calcularHash(this.selectedFile);
        archivoUrl = await this.subirArchivo(this.selectedFile);
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const formaSeleccionada = this.form.get('formaPago')?.value;
      const formaObj = (this.formasPago || []).find((f: any) => f?.id == formaSeleccionada);
      const formaPagoNombre = (formaObj?.nombre || formaSeleccionada || '').toString();

      const payload: SubmitPaymentPayload = {
        orderId: this.pedido?._id,
        pago: {
          valor: Number(this.form.get('valor')?.value) || 0,
          formaPago: formaPagoNombre,
          numeroComprobante: this.referenciaFinal(),
          fechaTransaccion: this.fechaTransaccion(),
          archivo: archivoUrl,
          archivoEvidencia: '',
          archivoHash,
          notas: this.form.get('notas')?.value || '',
          fecha: this.form.get('fecha')?.value,
          usuarioRegistro: user?.name || user?.email || '',
          ...(this.comprobantePrimero ? this.datosDelComprobante() : {}),
        },
        ...(this.comprobantePrimero
          ? { comprobante: { lecturaToken: this.lectura?.lecturaToken || '', verificadoEnBanco: this.mostrarVerificadoEnBanco && this.verificadoEnBanco } }
          : {}),
      };

      this.treasury.directPayment(payload).subscribe({
        next: (resp) => {
          this.submitting = false;
          this.toastr.success(this.translate.instant('tesoreria.registrarPago.pagoRegistradoYAprobado'));
          // Ticket 1449: el pago se registró; si el comprobante tiene algo raro, se le dice a quien lo registró.
          const avisos = (resp?.comprobanteAvisos || []).map((a) => a.motivo).filter(Boolean);
          if (avisos.length) {
            this.toastr.warning(avisos.join(' '), this.translate.instant('tesoreria.registrarPago.avisosDelComprobante'), { timeOut: 15000 });
          }
          this.activeModal.close({ changed: true });
        },
        error: (err) => {
          this.submitting = false;
          const detalle = this.comprobantePrimero && err?.error?.message ? String(err.error.message) : '';
          Swal.fire({ icon: 'error', title: this.translate.instant('tesoreria.registrarPago.noSePudoRegistrar'), text: detalle || this.translate.instant('tesoreria.registrarPago.ocurrioUnErrorAlRegistrar') });
        },
      });
    } catch (e) {
      this.submitting = false;
      Swal.fire({ icon: 'error', title: this.translate.instant('tesoreria.registrarPago.errorAlSubirElArchivo'), text: this.translate.instant('tesoreria.registrarPago.noSePudoProcesarEl') });
    }
  }

  /** Con la bandera, la referencia se guarda sin espacios al inicio ni al final (así el aviso de «referencia repetida» no se escapa). */
  private referenciaFinal(): string {
    const v = (this.form.get('numeroComprobante')?.value || '').toString();
    return this.comprobantePrimero ? v.trim() : v;
  }

  /**
   * Momento del registro, como siempre (Cartera y la antigüedad de los pagos ordenan por este campo). La fecha y la
   * hora del comprobante viajan aparte en `fecha` y `hora`.
   */
  private fechaTransaccion(): string {
    return new Date().toISOString();
  }

  /** Datos del comprobante que la persona confirmó (el servidor compara con la lectura firmada). */
  private datosDelComprobante(): { banco?: string; hora?: string; cuentaDestino?: { ultimos4: string } } {
    const banco = (this.form.get('banco')?.value || '').toString().trim();
    const hora = (this.form.get('hora')?.value || '').toString().trim();
    const u4 = (this.form.get('cuentaUltimos4')?.value || '').toString().trim();
    return {
      ...(banco ? { banco } : {}),
      ...(hora ? { hora } : {}),
      ...(/^\d{4}$/.test(u4) ? { cuentaDestino: { ultimos4: u4 } } : {}),
    };
  }

  /** SHA-256 hex del archivo (best-effort; si falla devuelve ""). */
  private async calcularHash(file: File): Promise<string> {
    try {
      const buffer = await this.leerArrayBuffer(file);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return '';
    }
  }

  private leerArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private subirArchivo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const path = `comprobatensPago/${this.pedido?.nroPedido}/${Date.now()}_${file.name}`;
      const ref = this.storage.ref(path);
      const task = this.storage.upload(path, file);
      task
        .snapshotChanges()
        .pipe(
          finalize(() => {
            ref.getDownloadURL().subscribe(
              (url) => resolve(url),
              (err) => reject(err),
            );
          }),
        )
        .subscribe({ error: (e) => reject(e) });
    });
  }
}
