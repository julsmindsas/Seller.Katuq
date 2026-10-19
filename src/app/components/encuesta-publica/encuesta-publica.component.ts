import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { EMPTY, Observable, Subject, combineLatest, defer } from 'rxjs';
import { catchError, concatMap, take, takeUntil, tap } from 'rxjs/operators';
import { PublicaModule } from '../../shared/components/publica/publica.module';
import { EscalaNpsComponent } from '../../shared/components/escala-nps/escala-nps.component';
import { NpsService } from '../../shared/services/nps/nps.service';
import { segmentoDeNota } from '../../shared/services/feedback/feedback.models';
import { EncuestaPublica, MAX_COMENTARIO, MAX_TEXTO_ADICIONAL, OpinionProducto, PreguntaAdicional } from '../../shared/services/nps/nps.models';

type Paso = 'cargando' | 'error' | 'nota' | 'comentario' | 'gracias';

interface ErrorPagina {
  titulo: string;
  texto: string;
  icono: string;
}

const ERRORES: Record<string, ErrorPagina> = {
  INVALIDO: {
    titulo: 'Este enlace no es válido',
    texto: 'Puede que esté incompleto. Ábrelo de nuevo desde el correo o vuelve a escanear el QR.',
    icono: 'pi-link',
  },
  VENCIDO: {
    titulo: 'Este enlace ya venció',
    texto: 'Las encuestas se pueden responder durante 30 días después de recibirlas. Gracias por tu interés.',
    icono: 'pi-clock',
  },
  YA_RESPONDIDA: {
    titulo: 'Ya respondiste esta encuesta',
    texto: 'Tu opinión ya quedó guardada. ¡Gracias!',
    icono: 'pi-check-circle',
  },
  NO_DISPONIBLE: {
    titulo: 'Esta encuesta no está recibiendo respuestas',
    texto: 'La tienda la pausó por ahora. Gracias por querer darnos tu opinión.',
    icono: 'pi-pause',
  },
  GENERAL: {
    titulo: 'No pudimos abrir la encuesta',
    texto: 'Revisa tu conexión e inténtalo de nuevo en unos minutos.',
    icono: 'pi-exclamation-triangle',
  },
};

/** Una nota válida del parámetro `?n=` del correo (0 a 10), o null. */
function notaDeParametro(valor: string | null): number | null {
  if (valor === null || !/^\d{1,2}$/.test(valor)) return null;
  const n = Number(valor);
  return n >= 0 && n <= 10 ? n : null;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Página pública de la encuesta NPS (D-490): la abre el comprador desde el correo
 * (`/encuesta/<token>?n=<nota>`) o desde el enlace y QR (`/encuesta/e-<publicId>`), sin
 * iniciar sesión. La nota se registra con un POST al cargar la página (un GET nunca
 * registra, así el antivirus del correo no cuenta respuestas falsas); luego la pregunta
 * abierta, las adicionales y, solo en el enlace, el contacto opcional.
 */
@Component({
  selector: 'app-encuesta-publica',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicaModule, EscalaNpsComponent],
  templateUrl: './encuesta-publica.component.html',
  styleUrls: ['./encuesta-publica.component.scss'],
})
export class EncuestaPublicaComponent implements OnInit, OnDestroy {
  readonly MAX_COMENTARIO = MAX_COMENTARIO;
  readonly MAX_TEXTO_ADICIONAL = MAX_TEXTO_ADICIONAL;

  paso: Paso = 'cargando';
  error: ErrorPagina = ERRORES['GENERAL'];
  encuesta: EncuestaPublica | null = null;
  nota: number | null = null;
  comentario = '';
  adicionales: Record<string, string> = {};
  quiereContacto = false;
  contacto = { nombre: '', email: '', telefono: '' };
  intento = false;
  enviando = false;
  /** La nota se está guardando (el paso 2 espera la sesión). */
  guardandoNota = false;
  avisoNota: string | null = null;
  avisoEnvio: string | null = null;
  /** Un enlace por producto para calificar lo que compró (un solo correo por pedido, D-483). */
  opinionesProducto: OpinionProducto[] = [];

  private ref = '';
  private sesion: string | null = null;
  private destroy$ = new Subject<void>();
  /** Las notas van en fila: si la persona cambia de nota rápido, gana la última. */
  private cola = new Subject<Observable<unknown>>();

  constructor(private route: ActivatedRoute, private nps: NpsService, private title: Title) {}

  get comercio(): string {
    return this.encuesta?.comercio || 'la tienda';
  }

  get preguntaNps(): string {
    return this.conComercio(this.encuesta?.preguntas?.nps || 'Del 0 al 10, ¿qué tan probable es que le recomiendes {comercio} a un amigo?');
  }

  get preguntaAbierta(): string {
    if (this.nota === null || !this.encuesta) return '';
    return this.conComercio(this.encuesta.preguntas?.abiertas?.[segmentoDeNota(this.nota)] || '');
  }

  get preguntasAdicionales(): PreguntaAdicional[] {
    return (this.encuesta?.preguntas?.adicionales || []).slice(0, 3);
  }

  get correoInvalido(): boolean {
    const v = this.contacto.email.trim();
    return !!v && !CORREO.test(v);
  }

  ngOnInit(): void {
    this.cola.pipe(concatMap((op$) => op$), takeUntil(this.destroy$)).subscribe();

    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(take(1), takeUntil(this.destroy$)).subscribe(([p, q]) => {
      this.ref = p.get('ref') || '';
      this.cargar(notaDeParametro(q.get('n')));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargar(notaInicial: number | null): void {
    if (!this.ref) {
      this.mostrarError('INVALIDO');
      return;
    }
    this.nps.encuestaPublica(this.ref).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.encuesta = r?.encuesta || null;
        if (!this.encuesta) {
          this.mostrarError('GENERAL');
          return;
        }
        this.title.setTitle(`${this.comercio} · Tu opinión`);
        // La del correo; si volvió sin ella, la que ya había dado (vale la última).
        const nota = notaInicial ?? r?.respuesta?.nota ?? null;
        if (nota !== null && nota !== undefined) this.escogerNota(nota);
        else this.paso = 'nota';
      },
      error: (e) => this.mostrarError(this.codigo(e)),
    });
  }

  escogerNota(n: number): void {
    this.nota = n;
    this.avisoNota = null;
    this.guardandoNota = true;
    if (this.paso !== 'comentario') this.paso = 'comentario';
    this.cola.next(defer(() => this.nps.responderPublica(this.ref, n, this.sesion)).pipe(
      tap((r) => {
        if (r?.sesion) this.sesion = r.sesion;
        this.guardandoNota = false;
      }),
      catchError((e) => {
        this.guardandoNota = false;
        const codigo = this.codigo(e);
        if (codigo !== 'GENERAL') {
          this.mostrarError(codigo);
        } else if (e?.status === 429) {
          this.avisoNota = 'Recibimos varias respuestas desde este dispositivo. Inténtalo de nuevo más tarde.';
          if (!this.sesion) this.paso = 'nota';
        } else {
          this.avisoNota = 'No pudimos guardar tu nota. Revisa tu conexión y vuelve a tocarla.';
          if (!this.sesion) this.paso = 'nota';
        }
        return EMPTY;
      }),
    ));
  }

  escogerAdicional(id: string, valor: string): void {
    this.adicionales = { ...this.adicionales, [id]: valor };
  }

  enviar(): void {
    if (this.enviando || this.guardandoNota || !this.sesion) return;
    this.intento = true;
    if (this.quiereContacto && this.correoInvalido) return;

    const adicionales: Record<string, string> = {};
    for (const a of this.preguntasAdicionales) {
      const v = String(this.adicionales[a.id] || '').trim();
      if (v) adicionales[a.id] = v.slice(0, MAX_TEXTO_ADICIONAL);
    }
    const contacto = this.quiereContacto && this.encuesta?.canal === 'enlace'
      ? Object.fromEntries(Object.entries({
        nombre: this.contacto.nombre.trim(),
        email: this.contacto.email.trim(),
        telefono: this.contacto.telefono.trim(),
      }).filter(([, v]) => !!v))
      : null;
    const comentario = this.comentario.trim().slice(0, MAX_COMENTARIO);

    this.enviando = true;
    this.avisoEnvio = null;
    this.nps.comentarPublica({
      ref: this.ref,
      sesion: this.sesion,
      ...(comentario ? { comentario } : {}),
      ...(Object.keys(adicionales).length ? { adicionales } : {}),
      ...(contacto && Object.keys(contacto).length ? { contacto } : {}),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.enviando = false;
        this.opinionesProducto = (r?.opinionesProducto || []).filter((o) => !!o?.url);
        this.paso = 'gracias';
      },
      error: (e) => {
        this.enviando = false;
        const codigo = this.codigo(e);
        if (codigo !== 'GENERAL') this.mostrarError(codigo);
        else this.avisoEnvio = 'No pudimos enviar tu opinión. Tu nota ya quedó guardada; revisa tu conexión e inténtalo de nuevo.';
      },
    });
  }

  conComercio(texto: string): string {
    return String(texto || '').replace(/\{comercio\}/g, this.comercio);
  }

  private codigo(e: any): string {
    const c = e?.error?.code;
    if (c) return ERRORES[c] ? c : 'GENERAL';
    if (e?.status === 410) return 'VENCIDO';
    if (e?.status === 404) return 'NO_DISPONIBLE';
    if (e?.status === 400) return 'INVALIDO';
    return 'GENERAL';
  }

  private mostrarError(codigo: string): void {
    this.error = ERRORES[codigo] || ERRORES['GENERAL'];
    this.paso = 'error';
  }
}
