import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Sitio, SitiosService } from '../../../../components/sitios/sitios.service';
import { LimitesPlanService } from '../../../../shared/services/limites-plan.service';
import {
  AudienciaCorreo,
  BloqueCorreo,
  CampanaCorreo,
  ContenidoCorreo,
  ConteoAudiencia,
  EstadoCampana,
  MarketingCorreoService,
  MetricasCampana,
  SegmentoCorreo,
} from '../../services/marketing-correo.service';

interface OpcionSegmento {
  segmento: SegmentoCorreo;
  nombre: string;
  desc: string;
  icono: string;
  pideDias?: boolean;
  pideProducto?: boolean;
}

/**
 * Campaña de correo de la tienda (D-318): a quién, qué dice, revisar y
 * enviar. Cuando la campaña ya salió, la misma pantalla muestra cómo le fue.
 *
 * Todo lo que protege al comprador y a la reputación (autorización, baja,
 * horario legal, cupo, pausa automática) lo decide el servidor: aquí solo se
 * arma y se explica.
 */
@Component({
  selector: 'app-campana-correo',
  templateUrl: './campana-correo.component.html',
  styleUrls: ['./campana-correo.component.scss'],
})
export class CampanaCorreoComponent implements OnInit, OnDestroy {
  readonly segmentos: OpcionSegmento[] = [
    { segmento: 'suscritos', nombre: 'Todos los suscritos', desc: 'Quienes autorizaron recibir tus novedades.', icono: 'fa-users' },
    { segmento: 'compraron', nombre: 'Compraron hace poco', desc: 'Compraron en los últimos días que elijas.', icono: 'fa-shopping-bag', pideDias: true },
    { segmento: 'dormidos', nombre: 'No volvieron', desc: 'Compraron antes, pero no en los últimos días que elijas.', icono: 'fa-moon-o', pideDias: true },
    { segmento: 'compraron_producto', nombre: 'Compraron un producto', desc: 'Para ofrecerles el complemento o la reposición.', icono: 'fa-tag', pideProducto: true },
    { segmento: 'carrito', nombre: 'Dejaron el carrito', desc: 'Llegaron al checkout y no compraron.', icono: 'fa-shopping-cart' },
    { segmento: 'pidieron_aviso', nombre: 'Pidieron aviso', desc: 'Dejaron su correo en "Avísame cuando llegue".', icono: 'fa-bell', pideProducto: true },
  ];

  /** Texto con llaves como propiedad: en la plantilla abriría un mensaje ICU. */
  readonly ejemploNombre = '{nombre}';

  paso: 1 | 2 | 3 = 1;
  cargando = true;
  noDisponible = false;
  guardando = false;
  enviando = false;

  sitios: Sitio[] = [];
  id: string | null = null;
  estado: EstadoCampana = 'borrador';
  siteId = '';
  nombre = '';
  audiencia: AudienciaCorreo = { segmento: 'suscritos', parametros: {} };
  contenido: ContenidoCorreo = { asunto: '', preheader: '', bloques: [] };

  conteo: ConteoAudiencia | null = null;
  contando = false;
  eligiendoProductoAudiencia = false;

  ideaOpttia = '';
  pensandoOpttia = false;

  vista: { asunto: string; html: string; problemas: string[] } | null = null;
  armandoVista = false;

  cuando: 'ya' | 'programar' = 'ya';
  fechaProgramada = '';

  metricas: MetricasCampana | null = null;

  private recontar = new Subject<void>();
  private subs: Subscription[] = [];

  constructor(
    private correo: MarketingCorreoService,
    private sitiosService: SitiosService,
    private route: ActivatedRoute,
    private router: Router,
    public plan: LimitesPlanService,
  ) {}

  ngOnInit(): void {
    this.subs.push(this.recontar.pipe(debounceTime(400)).subscribe(() => this.contar()));
    this.id = this.route.snapshot.paramMap.get('id');
    this.sitiosService.listar().subscribe({
      next: (r) => {
        this.sitios = (r.data || []).filter((s) => s.estado === 'publicado');
        if (!this.id && this.sitios.length) {
          this.siteId = this.sitios[0].id;
          this.recontar.next();
        }
        if (this.id) this.cargarCampana(this.id);
        else this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ── Estado de la campaña ────────────────────────────────────────────────

  get editable(): boolean {
    return ['borrador', 'programada', 'pausada'].includes(this.estado);
  }

  get sitio(): Sitio | undefined {
    return this.sitios.find((s) => s.id === this.siteId);
  }

  /** Cupones activos de la tienda, para el bloque de cupón. */
  get cupones(): string[] {
    const tienda: any = (this.sitio && (this.sitio.published || this.sitio.draft) && (this.sitio.published || this.sitio.draft).tienda) || {};
    return (tienda.cupones || []).filter((c: any) => c && c.activo !== false).map((c: any) => c.codigo);
  }

  get opcion(): OpcionSegmento {
    return this.segmentos.find((s) => s.segmento === this.audiencia.segmento) || this.segmentos[0];
  }

  private cargarCampana(id: string): void {
    this.correo.ver(id).subscribe({
      next: (r) => {
        this.aplicar(r.data);
        this.cargando = false;
        if (!this.editable) this.cargarMetricas();
        else this.recontar.next();
      },
      error: (e) => {
        this.cargando = false;
        if (e && e.status === 404) this.router.navigate(['/marketing/campanas']);
      },
    });
  }

  private aplicar(c: CampanaCorreo): void {
    this.id = c.id;
    this.estado = c.estado;
    this.siteId = c.siteId;
    this.nombre = c.nombre;
    this.audiencia = { segmento: c.audiencia?.segmento || 'suscritos', parametros: { ...(c.audiencia?.parametros || {}) } };
    this.contenido = {
      asunto: c.contenido?.asunto || '',
      preheader: c.contenido?.preheader || '',
      bloques: (c.contenido?.bloques || []).map((b) => ({ ...b })),
    };
  }

  cargarMetricas(): void {
    if (!this.id) return;
    this.correo.metricas(this.id).subscribe({
      next: (r) => (this.metricas = r.data),
      error: () => (this.metricas = null),
    });
  }

  // ── Paso 1: a quién ─────────────────────────────────────────────────────

  elegirSegmento(s: OpcionSegmento): void {
    const parametros: AudienciaCorreo['parametros'] = {};
    if (s.pideDias) parametros.dias = this.audiencia.parametros.dias || 60;
    if (s.pideProducto && this.audiencia.parametros.productoId) parametros.productoId = this.audiencia.parametros.productoId;
    this.audiencia = { segmento: s.segmento, parametros };
    if (s.segmento === 'compraron_producto' && !parametros.productoId) this.eligiendoProductoAudiencia = true;
    this.recontar.next();
  }

  cambioAudiencia(): void {
    this.recontar.next();
  }

  productoDeAudiencia(ids: string[]): void {
    this.eligiendoProductoAudiencia = false;
    if (ids.length) this.audiencia = { ...this.audiencia, parametros: { ...this.audiencia.parametros, productoId: ids[ids.length - 1] } };
    this.recontar.next();
  }

  contar(): void {
    if (!this.siteId) return;
    this.contando = true;
    this.correo.contarAudiencia(this.siteId, this.audiencia).subscribe({
      next: (r) => {
        this.conteo = r.data;
        this.contando = false;
      },
      error: (e) => {
        this.contando = false;
        // Sin el backend de campañas (front publicado antes que el servidor):
        // se dice claro en vez de mostrar una pantalla rota.
        if (e && e.status === 404) this.noDisponible = true;
      },
    });
  }

  // ── Paso 2: qué dice ────────────────────────────────────────────────────

  bloquesCambiados(bloques: BloqueCorreo[]): void {
    this.contenido = { ...this.contenido, bloques };
  }

  sugerirConOpttia(): void {
    const idea = this.ideaOpttia.trim();
    if (!idea || !this.siteId) return;
    this.pensandoOpttia = true;
    const productoIds = this.contenido.bloques.filter((b) => b.tipo === 'productos').flatMap((b) => b.productoIds || []);
    this.correo.sugerir(this.siteId, idea, productoIds).subscribe({
      next: (r) => {
        this.pensandoOpttia = false;
        const s = r.data;
        const bloques = [...this.contenido.bloques];
        // Reemplaza el primer título y el primer texto; si no hay, los pone arriba.
        const iTitulo = bloques.findIndex((b) => b.tipo === 'titulo');
        if (s.titulo) {
          if (iTitulo >= 0) bloques[iTitulo] = { ...bloques[iTitulo], texto: s.titulo };
          else bloques.unshift({ tipo: 'titulo', texto: s.titulo });
        }
        const iTexto = bloques.findIndex((b) => b.tipo === 'texto');
        if (s.texto) {
          if (iTexto >= 0) bloques[iTexto] = { ...bloques[iTexto], texto: s.texto };
          else bloques.splice(s.titulo ? 1 : 0, 0, { tipo: 'texto', texto: s.texto });
        }
        this.contenido = {
          asunto: s.asunto || this.contenido.asunto,
          preheader: s.preheader || this.contenido.preheader,
          bloques,
        };
      },
      error: (e) => {
        this.pensandoOpttia = false;
        Swal.fire({ icon: 'info', title: 'Opttia no respondió', text: e?.error?.message || 'Escríbelo tú; puedes intentar de nuevo en un momento.' });
      },
    });
  }

  // ── Navegación ─────────────────────────────────────────────────────────

  irAlPaso(p: 1 | 2 | 3): void {
    if (p === 2 && !this.puedeIrAContenido) return;
    if (p === 3 && !this.puedeIrARevisar) return;
    this.paso = p;
    if (p === 3) this.armarVista();
  }

  get puedeIrAContenido(): boolean {
    return !!this.siteId && !!this.conteo && this.conteo.destinatarios > 0;
  }

  get puedeIrARevisar(): boolean {
    return !!this.contenido.asunto.trim() && this.contenido.bloques.length > 0;
  }

  // ── Paso 3: revisar y enviar ────────────────────────────────────────────

  armarVista(): void {
    this.armandoVista = true;
    this.correo.vistaPrevia(this.siteId, this.contenido).subscribe({
      next: (r) => {
        this.vista = r.data;
        this.armandoVista = false;
      },
      error: () => {
        this.vista = null;
        this.armandoVista = false;
      },
    });
  }

  get remitente(): string {
    return this.sitio ? this.sitio.nombre : '';
  }

  /** Guarda (crea o edita) y devuelve el id por callback. */
  guardar(despues?: (id: string) => void): void {
    if (!this.siteId) return;
    this.guardando = true;
    const datos = { siteId: this.siteId, nombre: this.nombre.trim() || this.contenido.asunto || 'Campaña', audiencia: this.audiencia, contenido: this.contenido };
    const peticion = this.id ? this.correo.editar(this.id, datos) : this.correo.crear(datos);
    peticion.subscribe({
      next: (r) => {
        this.guardando = false;
        const nuevo = !this.id;
        this.aplicar({ ...r.data, contenido: r.data.contenido || this.contenido });
        if (nuevo) this.router.navigate(['/marketing/campanas/correo', r.data.id], { replaceUrl: true });
        if (despues) despues(r.data.id);
        else Swal.fire({ icon: 'success', title: 'Borrador guardado', timer: 1400, showConfirmButton: false });
      },
      error: (e) => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: e?.error?.message || 'Intenta de nuevo.' });
      },
    });
  }

  enviarPrueba(): void {
    this.guardar((id) => {
      this.correo.prueba(id).subscribe({
        next: (r) => Swal.fire({ icon: 'success', title: 'Prueba enviada', text: `Revisa ${r.data.enviadoA}. Llega con [Prueba] en el asunto.` }),
        error: (e) => Swal.fire({ icon: 'warning', title: 'No se envió la prueba', text: e?.error?.message || 'Intenta de nuevo.' }),
      });
    });
  }

  enviar(): void {
    const personas = this.conteo ? this.conteo.alcance.salen : 0;
    const cuandoTexto =
      this.cuando === 'ya'
        ? 'en el próximo horario permitido'
        : `el ${new Date(this.fechaProgramada).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })} (o el siguiente horario permitido)`;
    Swal.fire({
      icon: 'question',
      title: '¿Enviar la campaña?',
      html: `Le llegará a <b>${personas}</b> persona(s) ${cuandoTexto}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Revisar otra vez',
    }).then((r) => {
      if (r.isConfirmed) this.guardar((id) => this.programar(id, false));
    });
  }

  private programar(id: string, aceptoParcial: boolean): void {
    this.enviando = true;
    const cuando = this.cuando === 'programar' && this.fechaProgramada ? new Date(this.fechaProgramada).toISOString() : undefined;
    this.correo.programar(id, { cuando, aceptoParcial }).subscribe({
      next: (r) => {
        this.enviando = false;
        const fecha = new Date(r.data.programadaPara).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
        Swal.fire({ icon: 'success', title: 'Campaña programada', text: `Empieza a salir el ${fecha}.` }).then(() =>
          this.router.navigate(['/marketing/campanas'], { queryParams: { canal: 'correo' } }),
        );
      },
      error: (e) => {
        this.enviando = false;
        // Plan gratis (D-319): una campaña al mes; se explica con la opción de mejorar.
        if (this.plan.manejar(e)) return;
        if (e && e.status === 409 && e.error?.data?.alcance) {
          // El cupo del mes no alcanza para todos: se decide explícitamente.
          Swal.fire({
            icon: 'info',
            title: 'Tu cupo no alcanza para todos',
            text: e.error.message,
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar a esos',
            cancelButtonText: 'Mejor espero',
          }).then((r) => {
            if (r.isConfirmed) this.programar(id, true);
          });
          return;
        }
        Swal.fire({ icon: 'warning', title: 'No se pudo programar', text: e?.error?.message || 'Intenta de nuevo.' });
      },
    });
  }

  // ── Detalle (ya salió) ──────────────────────────────────────────────────

  pausar(): void {
    if (!this.id) return;
    this.correo.pausar(this.id).subscribe({
      next: () => {
        this.estado = 'pausada';
        this.cargarMetricas();
      },
      error: (e) => Swal.fire({ icon: 'warning', title: 'No se pudo pausar', text: e?.error?.message || '' }),
    });
  }

  cancelar(): void {
    if (!this.id) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Cancelar la campaña?',
      text: 'Lo que ya salió no se recupera; lo pendiente no se envía.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
    }).then((r) => {
      if (!r.isConfirmed || !this.id) return;
      this.correo.cancelar(this.id).subscribe({
        next: () => this.router.navigate(['/marketing/campanas'], { queryParams: { canal: 'correo' } }),
        error: (e) => Swal.fire({ icon: 'warning', title: 'No se pudo cancelar', text: e?.error?.message || '' }),
      });
    });
  }

  etiquetaEstado(e: EstadoCampana): string {
    return (
      {
        borrador: 'Borrador',
        programada: 'Programada',
        enviando: 'Enviando',
        pausada: 'Pausada',
        pausada_auto: 'Pausada por rebotes o quejas',
        terminada: 'Terminada',
        cancelada: 'Cancelada',
      } as Record<EstadoCampana, string>
    )[e];
  }

  porcentaje(n?: number, de?: number): number {
    return de ? Math.round(((n || 0) / de) * 1000) / 10 : 0;
  }
}
