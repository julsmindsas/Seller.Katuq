import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { SubmitPaymentPayload } from '../../../../shared/services/treasury/treasury.models';

/**
 * Spec 013 — Tesorería MVP. Modal "Registrar Pago" del tesorero (T-17, CA-08).
 * Pago desde cero, aprobado directo (origen "tesorero"). Calcula SHA-256 del
 * archivo (WebCrypto) antes de subirlo → POST /payments/direct.
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

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private storage: AngularFireStorage,
    private maestro: MaestroService,
    private treasury: TreasuryService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      formaPago: ['', Validators.required],
      valor: ['', [Validators.required, Validators.min(1)]],
      numeroComprobante: ['', Validators.required],
      notas: [''],
    });

    this.form.get('valor')?.valueChanges.subscribe((v) => this.validarValor(v));

    this.maestro.consultarFormaPago().subscribe({
      next: (fp) => (this.formasPago = Array.isArray(fp) ? fp : []),
      error: () => (this.formasPago = []),
    });
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
    if (file) this.selectedFile = file;
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
    if (file) this.selectedFile = file;
  }
  removeFile(): void {
    this.selectedFile = null;
    const input = document.getElementById('tk-reg-archivo') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  // ── Registro ───────────────────────────────────────────────────────────────
  async registrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    try {
      let archivoUrl = '';
      let archivoHash = '';
      if (this.selectedFile) {
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
          numeroComprobante: this.form.get('numeroComprobante')?.value || '',
          fechaTransaccion: new Date().toISOString(),
          archivo: archivoUrl,
          archivoEvidencia: '',
          archivoHash,
          notas: this.form.get('notas')?.value || '',
          fecha: this.form.get('fecha')?.value,
          usuarioRegistro: user?.name || user?.email || '',
        },
      };

      this.treasury.directPayment(payload).subscribe({
        next: () => {
          this.submitting = false;
          this.toastr.success('Pago registrado y aprobado.');
          this.activeModal.close({ changed: true });
        },
        error: () => {
          this.submitting = false;
          Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: 'Ocurrió un error al registrar el pago.' });
        },
      });
    } catch (e) {
      this.submitting = false;
      Swal.fire({ icon: 'error', title: 'Error al subir el archivo', text: 'No se pudo procesar el comprobante. Inténtalo de nuevo.' });
    }
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
