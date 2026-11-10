import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';

import { MessagingLine } from '../../../../../../shared/services/messaging/messaging.models';
import {
  DireccionRegistro,
  EstadoRegistro,
  ItemRegistro,
  PaginaRegistro,
} from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { WhatsappConsolaService } from '../../../../../../shared/services/messaging/whatsapp-consola.service';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';
import { VarianteColor } from '../../utils/salud-numero';

/** Movimientos por página: el mismo tamaño que entrega el servidor (de a 50). */
const POR_PAGINA = 50;

interface Peticion {
  cursor: string | null;
}

/**
 * Sección «Registro» de la consola (D-707): bitácora técnica del número de los últimos 30 días, del más
 * reciente al más antiguo, de a 50 por cursor. Cada movimiento trae hora, si entró o salió, tipo, estado,
 * el teléfono ya enmascarado por el servidor y el error de Meta en palabras sencillas. El detalle técnico
 * completo (sin llaves ni tokens) se abre al expandir la fila y solo lo recibe un administrador.
 *
 * La paginación guarda los cursores de las páginas ya vistas: «Más recientes» vuelve sin pedir nada raro.
 */
@Component({
  selector: 'app-consola-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroComponent implements OnInit, OnDestroy {
  linea: MessagingLine | null = null;

  cargando = false;
  error: string | null = null;
  items: ItemRegistro[] = [];
  siguiente: string | null = null;

  direccion: DireccionRegistro | '' = '';
  estado: EstadoRegistro | '' = '';

  readonly direcciones: Array<{ valor: DireccionRegistro | ''; clave: string }> = [
    { valor: '', clave: 'consolaWhatsapp.registro.filtro.todas' },
    { valor: 'entrada', clave: 'consolaWhatsapp.registro.direccion.entrada' },
    { valor: 'salida', clave: 'consolaWhatsapp.registro.direccion.salida' },
  ];

  readonly estados: Array<{ valor: EstadoRegistro | ''; clave: string }> = [
    { valor: '', clave: 'consolaWhatsapp.registro.filtro.todos' },
    { valor: 'sent', clave: 'consolaWhatsapp.registro.estado.sent' },
    { valor: 'delivered', clave: 'consolaWhatsapp.registro.estado.delivered' },
    { valor: 'read', clave: 'consolaWhatsapp.registro.estado.read' },
    { valor: 'failed', clave: 'consolaWhatsapp.registro.estado.failed' },
    { valor: 'received', clave: 'consolaWhatsapp.registro.estado.received' },
  ];

  /** Filas expandidas por id (detalle técnico). */
  expandidas: Record<string, boolean> = {};

  /** Cursores de las páginas anteriores a la actual; el de la actual es `cursorActual`. */
  private anteriores: Array<string | null> = [];
  private cursorActual: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly pedir$ = new Subject<Peticion>();

  constructor(
    private readonly contexto: ConsolaContextoService,
    private readonly consola: WhatsappConsolaService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Cada petición cancela la anterior: una respuesta tardía de otro número o filtro no pisa la tabla.
    this.pedir$
      .pipe(
        switchMap((p) => {
          const l = this.linea;
          if (!l || l.status !== 'connected') return of({ pagina: null as PaginaRegistro | null, error: null as string | null });
          this.cargando = true;
          this.error = null;
          this.cdr.markForCheck();
          return this.consola.registro(l.id, { cursor: p.cursor, direccion: this.direccion, estado: this.estado }).pipe(
            map((pagina) => ({ pagina: pagina as PaginaRegistro | null, error: null as string | null })),
            catchError((err) => of({ pagina: null as PaginaRegistro | null, error: this.mensajeDe(err, '') })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        this.cargando = false;
        this.error = res.error;
        if (res.pagina) {
          this.items = res.pagina.items;
          this.siguiente = res.pagina.siguiente;
          this.expandidas = {};
        } else if (res.error === null) {
          this.items = [];
          this.siguiente = null;
        }
        this.cdr.markForCheck();
      });

    // Va al final: el `BehaviorSubject` del contexto emite de una vez y la carga ya debe estar escuchando.
    this.contexto.linea$.pipe(takeUntil(this.destroy$)).subscribe((linea) => {
      this.linea = linea;
      this.reiniciar();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Paginación por cursor ────────────────────────────────────────────

  /** Vuelve a la primera página (cambió el número o un filtro). */
  reiniciar(): void {
    this.anteriores = [];
    this.cursorActual = null;
    this.items = [];
    this.siguiente = null;
    this.error = null;
    this.cargando = !!this.linea && this.linea.status === 'connected';
    this.cdr.markForCheck();
    this.pedir$.next({ cursor: null });
  }

  cambiarDireccion(valor: DireccionRegistro | ''): void {
    this.direccion = valor;
    this.reiniciar();
  }

  cambiarEstado(valor: EstadoRegistro | ''): void {
    this.estado = valor;
    this.reiniciar();
  }

  get pagina(): number {
    return this.anteriores.length + 1;
  }

  get hayAnterior(): boolean {
    return this.anteriores.length > 0;
  }

  masAntiguos(): void {
    if (!this.siguiente || this.cargando) return;
    this.anteriores = [...this.anteriores, this.cursorActual];
    this.cursorActual = this.siguiente;
    this.pedir$.next({ cursor: this.cursorActual });
  }

  masRecientes(): void {
    if (!this.hayAnterior || this.cargando) return;
    const anterior = this.anteriores[this.anteriores.length - 1];
    this.anteriores = this.anteriores.slice(0, -1);
    this.cursorActual = anterior;
    this.pedir$.next({ cursor: anterior });
  }

  recargar(): void {
    this.pedir$.next({ cursor: this.cursorActual });
  }

  get desde(): number {
    return (this.pagina - 1) * POR_PAGINA + 1;
  }

  get hasta(): number {
    return (this.pagina - 1) * POR_PAGINA + this.items.length;
  }

  // ─── Presentación ─────────────────────────────────────────────────────

  entro(i: ItemRegistro): boolean {
    return /^(entrada|in|inbound|entrante)$/i.test(String(i.direccion || ''));
  }

  etiquetaEstado(i: ItemRegistro): { clave: string | null; texto: string; variante: VarianteColor } {
    const valor = String(i.estado || '').toLowerCase();
    switch (valor) {
      case 'sent':
        return { clave: 'consolaWhatsapp.registro.estado.sent', texto: '', variante: 'info' };
      case 'delivered':
        return { clave: 'consolaWhatsapp.registro.estado.delivered', texto: '', variante: 'ok' };
      case 'read':
        return { clave: 'consolaWhatsapp.registro.estado.read', texto: '', variante: 'ok' };
      case 'failed':
        return { clave: 'consolaWhatsapp.registro.estado.failed', texto: '', variante: 'error' };
      case 'received':
        return { clave: 'consolaWhatsapp.registro.estado.received', texto: '', variante: 'neutro' };
      case 'skipped':
        return { clave: 'consolaWhatsapp.registro.estado.skipped', texto: '', variante: 'warn' };
      default:
        return { clave: null, texto: i.estado || '—', variante: 'neutro' };
    }
  }

  tipo(i: ItemRegistro): string {
    const clave = this.claveTipo(String(i.tipo || '').toLowerCase());
    return clave ? this.translate.instant(clave) : i.tipo || '—';
  }

  /** Clave de traducción del tipo de mensaje; `null` si no se conoce (se muestra tal cual llega). */
  private claveTipo(valor: string): string | null {
    switch (valor) {
      case 'text':
        return 'consolaWhatsapp.registro.tipo.texto';
      case 'template':
        return 'consolaWhatsapp.registro.tipo.plantilla';
      case 'image':
        return 'consolaWhatsapp.registro.tipo.imagen';
      case 'document':
        return 'consolaWhatsapp.registro.tipo.documento';
      case 'audio':
        return 'consolaWhatsapp.registro.tipo.audio';
      case 'video':
        return 'consolaWhatsapp.registro.tipo.video';
      case 'interactive':
        return 'consolaWhatsapp.registro.tipo.interactivo';
      case 'button':
        return 'consolaWhatsapp.registro.tipo.boton';
      case 'status':
        return 'consolaWhatsapp.registro.tipo.estado';
      default:
        return null;
    }
  }

  hora(i: ItemRegistro): string {
    if (!i.hora) return '—';
    const f = new Date(i.hora);
    if (Number.isNaN(f.getTime())) return '—';
    return f.toLocaleString(this.translate.currentLang || 'es', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /** Detalle técnico en JSON legible; `null` si el servidor no lo mandó. */
  detalle(i: ItemRegistro): string | null {
    if (i.detalle === undefined || i.detalle === null || i.detalle === '') return null;
    try {
      return typeof i.detalle === 'string' ? i.detalle : JSON.stringify(i.detalle, null, 2);
    } catch {
      return null;
    }
  }

  alternarFila(i: ItemRegistro): void {
    this.expandidas = { ...this.expandidas, [i.id]: !this.expandidas[i.id] };
  }

  trackItem(_: number, i: ItemRegistro): string {
    return i.id;
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }
}
