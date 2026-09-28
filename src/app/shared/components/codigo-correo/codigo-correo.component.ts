import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { RegistroVerificacionService, SesionConfirmada } from '../../services/registro-verificacion.service';

/**
 * La pantalla del código que confirma el correo antes de entrar (D-323).
 * La misma en el registro y en el inicio de sesión: la persona escribe los
 * 6 dígitos que le llegaron y entra; si no le llegó, pide otro a los 60 s.
 *
 * Solo confirma y avisa (`entro`): abrir la sesión y el píxel son del padre.
 */
@Component({
  selector: 'app-codigo-correo',
  templateUrl: './codigo-correo.component.html',
  styleUrls: ['./codigo-correo.component.scss'],
})
export class CodigoCorreoComponent implements OnInit, OnDestroy {
  @Input() email = '';
  /** El código acaba de salir (registro o login): el reenvío espera 60 s. */
  @Input() recienEnviado = true;
  @Output() entro = new EventEmitter<SesionConfirmada>();

  codigo = '';
  confirmando = false;
  reenviando = false;
  error = '';
  aviso = '';
  segundos = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;

  constructor(private verificacion: RegistroVerificacionService) {}

  ngOnInit(): void {
    if (this.recienEnviado) this.esperar(60);
  }

  ngOnDestroy(): void {
    this.pararReloj();
  }

  get completo(): boolean {
    return /^\d{6}$/.test(this.codigo);
  }

  /** Solo dígitos, máximo 6 (pegar "123 456" o "Código: 123456" también sirve). */
  normalizar(valor: string): void {
    this.codigo = String(valor || '').replace(/\D/g, '').slice(0, 6);
    this.error = '';
  }

  confirmar(): void {
    if (!this.completo || this.confirmando) return;
    this.confirmando = true;
    this.error = '';
    this.aviso = '';
    this.verificacion.confirmar(this.email, this.codigo).subscribe({
      next: (sesion) => {
        this.confirmando = false;
        if (sesion && sesion.token) {
          this.entro.emit(sesion);
        } else {
          this.error = 'No pudimos abrir tu sesión. Entra con tu correo y tu contraseña.';
        }
      },
      error: (err) => {
        this.confirmando = false;
        this.codigo = '';
        this.error = (err && err.error && err.error.message) || 'No pudimos confirmar el código. Intenta de nuevo.';
      },
    });
  }

  reenviar(): void {
    if (this.segundos > 0 || this.reenviando) return;
    this.reenviando = true;
    this.error = '';
    this.verificacion.pedirCodigo(this.email).subscribe({
      next: () => {
        this.reenviando = false;
        this.aviso = 'Te enviamos un código nuevo. El anterior ya no sirve.';
        this.esperar(60);
      },
      error: (err) => {
        this.reenviando = false;
        this.error = (err && err.error && err.error.message) || 'No pudimos enviar el código. Intenta en un momento.';
      },
    });
  }

  private esperar(segundos: number): void {
    this.pararReloj();
    this.segundos = segundos;
    this.reloj = setInterval(() => {
      this.segundos = Math.max(0, this.segundos - 1);
      if (this.segundos === 0) this.pararReloj();
    }, 1000);
  }

  private pararReloj(): void {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
  }
}
