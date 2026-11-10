import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessagingLinesService } from '../../services/messaging/messaging-lines.service';
import {
  MetaEmbeddedSignupService,
  RegistroMetaError,
} from '../../services/messaging/meta-embedded-signup.service';
import {
  DatosRegistroMeta,
  MessagingLine,
  MiembroEquipo,
  ModoConexionMeta,
} from '../../services/messaging/messaging.models';

const PROVEEDOR_META = 'meta';
/** Causa de que no terminara la ventana de Meta → clave de traducción (las mismas de las líneas de Integraciones). */
const CLAVES_ERROR_META: Record<string, string> = {
  cancelado: 'integrations.messagingLines.metaCancelado',
  sin_codigo: 'integrations.messagingLines.metaCancelado',
  sin_numero: 'integrations.messagingLines.metaSinNumero',
  error_meta: 'integrations.messagingLines.metaErrorMeta',
  sdk: 'integrations.messagingLines.metaSdk',
};

/**
 * Asistente de tres pasos para conectar un número de WhatsApp directo con Meta (D-704, D-707):
 *
 *  1. Escoger cómo conectar: el número del celular o uno nuevo.
 *  2. Completar la ventana de Meta. El código que devuelve vence en 30 s: va de una al servidor,
 *     que lo comprueba con Meta. Si la persona cierra la ventana no se crea nada y se puede reintentar.
 *  3. Escoger quién del equipo atiende el número (`PATCH lines/:id` con `sellers`, que el servidor
 *     valida contra los usuarios del comercio).
 *
 * Lo usan la consola de WhatsApp y Integraciones. No guarda nada en el navegador: el padre decide
 * cuándo mostrarlo y recibe la línea por `lineaCreada` (al confirmarse) y `terminado` (al cerrar).
 */
@Component({
  selector: 'app-asistente-conectar',
  templateUrl: './asistente-conectar.component.html',
  styleUrls: ['./asistente-conectar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenteConectarComponent implements OnDestroy {
  /** Si se ofrece compartir el número del celular (lo dice el servidor en `metaDirecto.modoCelular`). */
  @Input() modoCelular = false;
  /** Personas del comercio que se pueden asignar al número. */
  @Input() equipo: MiembroEquipo[] = [];

  /** Se confirmó el número con Meta: la línea ya existe (aunque falte el paso 3). */
  @Output() lineaCreada = new EventEmitter<MessagingLine>();
  /** El asistente terminó (con la línea) o se cerró sin conectar (`null`). */
  @Output() terminado = new EventEmitter<MessagingLine | null>();

  paso: 1 | 2 | 3 = 1;
  modo: ModoConexionMeta | null = null;
  /** Paso 2 en curso: pidiendo la conexión, abriendo la ventana o confirmando. */
  trabajando = false;
  /** Causa legible de por qué no terminó el paso 2. */
  error: string | null = null;

  linea: MessagingLine | null = null;
  asignados: string[] = [];
  guardando = false;
  errorAsignar: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private destruido = false;

  constructor(
    private readonly lineas: MessagingLinesService,
    private readonly registroMeta: MetaEmbeddedSignupService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destruido = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Paso 1: escoger el modo. */
  elegir(modo: ModoConexionMeta): void {
    if (this.trabajando) return;
    if (modo === 'celular' && !this.modoCelular) return;
    this.modo = modo;
  }

  /** Paso 1 → 2: arranca la conexión. */
  continuar(): void {
    if (!this.modo || this.trabajando) return;
    this.paso = 2;
    this.conectar();
  }

  /** Paso 2: pide los datos del registro de Meta, abre la ventana y confirma con el servidor. */
  conectar(): void {
    const modo = this.modo;
    if (!modo || this.trabajando) return;
    this.trabajando = true;
    this.error = null;
    this.cdr.markForCheck();
    this.lineas
      .conectar(PROVEEDOR_META, this.estadoAleatorio(), modo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (datos) => {
          if (!datos || (datos as DatosRegistroMeta).kind !== 'embedded_signup') {
            this.fallar(this.translate.instant('integrations.messagingLines.metaErrorMeta'));
            return;
          }
          this.abrirVentana(datos as DatosRegistroMeta, modo);
        },
        error: (err) => this.fallar(this.mensajeDe(err, this.translate.instant('integrations.messagingLines.metaErrorMeta'))),
      });
  }

  private abrirVentana(datos: DatosRegistroMeta, modo: ModoConexionMeta): void {
    this.registroMeta
      .iniciar(datos)
      .then((r) => {
        if (this.destruido) return;
        this.lineas
          .confirmar(PROVEEDOR_META, {
            code: r.code,
            wabaId: r.wabaId,
            modo,
            ...(r.phoneNumberId ? { phoneNumberId: r.phoneNumberId } : {}),
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (linea) => {
              this.linea = linea;
              this.asignados = (linea.sellers || []).map((s) => s.email);
              this.trabajando = false;
              this.paso = 3;
              this.lineaCreada.emit(linea);
              this.cdr.markForCheck();
            },
            error: (err) =>
              this.fallar(this.mensajeDe(err, this.translate.instant('integrations.messagingLines.metaNoConfirmado'))),
          });
      })
      .catch((e) => {
        if (this.destruido) return;
        const clave =
          e instanceof RegistroMetaError
            ? CLAVES_ERROR_META[e.motivo] || CLAVES_ERROR_META['error_meta']
            : CLAVES_ERROR_META['error_meta'];
        this.fallar(this.translate.instant(clave));
      });
  }

  private fallar(texto: string): void {
    this.trabajando = false;
    this.error = texto;
    this.cdr.markForCheck();
  }

  /** Paso 2 con error: volver a escoger cómo conectar. */
  volverAlPaso1(): void {
    if (this.trabajando) return;
    this.paso = 1;
    this.error = null;
  }

  /** Paso 3: guarda quién atiende el número y termina. */
  guardarEquipo(): void {
    const linea = this.linea;
    if (!linea || this.guardando) return;
    const actuales = (linea.sellers || []).map((s) => s.email).sort().join('|');
    if ([...this.asignados].sort().join('|') === actuales) {
      this.terminado.emit(linea);
      return;
    }
    this.guardando = true;
    this.errorAsignar = null;
    this.cdr.markForCheck();
    this.lineas
      .actualizar(linea.id, { sellers: [...this.asignados] })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nueva) => {
          this.guardando = false;
          this.terminado.emit(nueva || linea);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.guardando = false;
          this.errorAsignar = this.mensajeDe(err, this.translate.instant('asistenteConectar.errorAsignar'));
          this.cdr.markForCheck();
        },
      });
  }

  /** Paso 3: dejar el equipo para después (el número ya quedó conectado). */
  omitirEquipo(): void {
    if (this.guardando) return;
    this.terminado.emit(this.linea);
  }

  cerrar(): void {
    if (this.trabajando || this.guardando) return;
    this.terminado.emit(this.linea);
  }

  nombreLinea(): string {
    return this.linea ? this.linea.displayName || this.linea.displayPhone : '';
  }

  /** Código de un solo uso que el servidor exige al pedir la conexión (anti-CSRF). */
  private estadoAleatorio(): string {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }
}
