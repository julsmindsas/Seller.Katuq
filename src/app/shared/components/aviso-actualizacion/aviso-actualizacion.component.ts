import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  NotaVersion,
  VersionCheckService,
  VersionPublicada,
} from '../../services/version-check.service';
import { AuthService } from '../../services/firebase/auth.service';

/**
 * Aviso de versión nueva — píldora en la barra superior
 * (mockup "Banner Actualizacion", variante "En contexto · barra superior").
 *
 * No interrumpe: vive en el encabezado y solo aparece cuando
 * VersionCheckService detecta que el servidor publicó una versión distinta a la
 * que el usuario tiene cargada. Un clic en "Actualizar" limpia cachés y recarga.
 */
@Component({
  selector: 'app-aviso-actualizacion',
  templateUrl: './aviso-actualizacion.component.html',
  styleUrls: ['./aviso-actualizacion.component.scss'],
})
export class AvisoActualizacionComponent implements OnInit, OnDestroy {

  /** Clave para "recordar mañana": guarda hasta cuándo no molestar. */
  private readonly CLAVE_POSPUESTO = 'actualizacionPospuestaHasta';

  /** Cuánto se oculta la píldora al pulsar la X. */
  private readonly HORAS_POSPUESTO = 6;

  visible = false;
  aplicando = false;
  pasoTexto = '';
  notasAbiertas = false;

  versionNueva = '';
  publicada = '';
  notas: NotaVersion[] = [];

  private sub?: Subscription;

  constructor(
    private versionCheck: VersionCheckService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.sub = this.versionCheck.actualizacionDisponible$.subscribe((data) => {
      if (!data) return;
      this.recibirVersion(data);
    });

    // El aviso solo tiene sentido con sesión abierta: en el login la recarga
    // no aporta nada y estorba.
    if (this.authService.isLoggedIn) {
      this.versionCheck.iniciar();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private recibirVersion(data: VersionPublicada): void {
    this.versionNueva = this.soloNumero(data.version) || data.version;
    this.publicada = data.publicada || '';
    this.notas = Array.isArray(data.notas) ? data.notas : [];

    if (this.estaPospuesto()) return;

    this.visible = true;
  }

  /** "2026.07.28.9 - 28 de Julio 2026 (Beta)" → "2026.07.28.9" */
  private soloNumero(v: string): string {
    return ((v || '').match(/\d{4}\.\d{2}\.\d{2}\.\d+/) || [''])[0];
  }

  private estaPospuesto(): boolean {
    try {
      const hasta = localStorage.getItem(this.CLAVE_POSPUESTO);
      return !!hasta && Date.now() < parseInt(hasta, 10);
    } catch (e) {
      return false;
    }
  }

  /** Fecha de publicación en texto, para el bloque de notas. */
  get publicadaTexto(): string {
    if (!this.publicada) return '';
    try {
      const d = new Date(this.publicada);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return '';
    }
  }

  verNotas(): void {
    this.notasAbiertas = !this.notasAbiertas;
  }

  claseEtiqueta(tipo?: string): string {
    const t = (tipo || '').toUpperCase();
    if (t === 'MEJORA') return 'act-tag act-tag--mejora';
    if (t === 'CORRIGE') return 'act-tag act-tag--corrige';
    return 'act-tag act-tag--nuevo';
  }

  textoEtiqueta(tipo?: string): string {
    const t = (tipo || '').toUpperCase();
    return t === 'MEJORA' || t === 'CORRIGE' ? t : 'NUEVO';
  }

  /** Aplica la actualización. Los pasos son reales, no una barra simulada. */
  async actualizar(): Promise<void> {
    if (this.aplicando) return;
    this.aplicando = true;

    this.pasoTexto = 'Limpiando archivos guardados…';
    await this.versionCheck.aplicarActualizacion().catch(() => {
      // aplicarActualizacion ya recarga; si algo falla, se deja reintentar.
      this.aplicando = false;
      this.pasoTexto = 'No se pudo actualizar. Intenta de nuevo.';
    });
  }

  /** Cerrar por ahora: se guarda hasta cuándo no volver a mostrarla. */
  recordarLuego(): void {
    try {
      const hasta = Date.now() + this.HORAS_POSPUESTO * 60 * 60 * 1000;
      localStorage.setItem(this.CLAVE_POSPUESTO, String(hasta));
    } catch (e) {
      // Sin localStorage simplemente se oculta durante esta sesión.
    }
    this.visible = false;
  }
}
