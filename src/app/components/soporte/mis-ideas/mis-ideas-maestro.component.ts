import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { SecurityService } from '../../../shared/services/security/security.service';
import { ServiciosService } from '../../../shared/services/servicios.service';
import {
  IDEA_ESTADOS, IdeaEstadoDescriptor, IdeaEstadoKey, apoyosDe, aFecha, contarPorEstado, diasDesde,
  esArchivoParaAbrir, esIdea, esVideoReproducible, ideaEstadoDe, inicialesDe, nombreAdjunto, tipoAdjunto, yaApoyo,
} from './idea-estado';
import { MisIdeasService } from './mis-ideas.service';

type FiltroEstado = '' | IdeaEstadoKey;

interface ArchivoNuevo {
  file: File;
  tipo: 'imagen' | 'video' | 'audio' | 'documento';
  url: string;
}

/**
 * Mis Ideas con el diseño de Mis tickets: maestro-detalle, píldoras con conteo por estado de idea,
 * conversación con avatar real, respuesta del equipo y «A mí también me sirve» (D-627, tickets 1442
 * y 1443). Solo presentación de lo que ya existía, más el estado propio de la idea y el apoyo.
 * Se muestra solo con la bandera `misIdeasV2` (lo decide `MisIdeasComponent`).
 */
@Component({
  selector: 'app-mis-ideas-maestro',
  templateUrl: './mis-ideas-maestro.component.html',
  styleUrls: ['./mis-ideas-maestro.component.scss']
})
export class MisIdeasMaestroComponent implements OnInit, OnDestroy {

  originalTasks: any[] = [];
  baseTasks: any[] = [];
  filteredTasks: any[] = [];
  selected: any = null;

  selectedStatus: FiltroEstado = '';
  searchText = '';
  dateFilter = 'all';
  conteos: { [key: string]: number } = { todas: 0 };

  newComment = '';
  archivos: ArchivoNuevo[] = [];
  enviandoComentario = false;
  showCommentSuccess = false;
  apoyando = false;

  isLoading = true;

  private currentUser: any = null;
  private avisoTimer: any = null;

  readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  readonly DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
  readonly AUDIO_EXTENSIONS = ['ogg', 'opus', 'oga', 'mp3', 'm4a', 'wav', 'aac'];
  readonly VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
  private readonly MIME_POR_EXTENSION: { [ext: string]: string } = {
    ogg: 'audio/ogg', opus: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mpeg',
    m4a: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm'
  };

  /** Pestañas: Todas y los seis estados de la hoja de ruta. */
  readonly tabs: { key: FiltroEstado; plural: string; dot: string }[] = [
    { key: '', plural: 'soporte.misIdeas.maestro.plural.todas', dot: '#9995B3' },
    ...(['recibida', 'en_evaluacion', 'planeada', 'en_desarrollo', 'implementada', 'no_viable'] as IdeaEstadoKey[])
      .map((key) => ({ key, plural: IDEA_ESTADOS[key].plural, dot: IDEA_ESTADOS[key].fg }))
  ];

  constructor(
    private ticketService: ServiciosService,
    private misIdeas: MisIdeasService,
    private securityService: SecurityService,
    private storage: AngularFireStorage,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.usuarioActual();
    this.cargarIdeas();
  }

  ngOnDestroy(): void {
    this.limpiarArchivos();
    if (this.avisoTimer) { clearTimeout(this.avisoTimer); }
  }

  // ===========================================================================
  // Carga
  // ===========================================================================

  cargarIdeas(): void {
    const empresa = this.securityService.getCompanyInformationLogged();
    const nombreComercio = empresa?.nombreComercio;
    this.isLoading = true;

    this.ticketService.getTickets().subscribe({
      next: (respuesta: any) => {
        this.originalTasks = (respuesta?.result || [])
          .filter((t: any) => nombreComercio && (t.tienda === nombreComercio || t.company === nombreComercio) && esIdea(t))
          .sort((a: any, b: any) => this.tiempoDe(b.fechaRegistro) - this.tiempoDe(a.fechaRegistro));
        this.originalTasks.forEach((t) => this.prepararIdea(t));
        this.filterIdeas();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('soporte.misIdeas.maestro.noPudimosCargarTusIdeas'),
          text: this.translate.instant('soporte.misTickets.vuelveAIntentarloEnUn'),
          confirmButtonText: this.translate.instant('comun.entendido')
        });
        console.error('Error al obtener ideas:', error);
      }
    });
  }

  recargar(): void {
    if (this.isLoading) { return; }
    this.cargarIdeas();
  }

  /** Deja listo en la idea lo que la vista usa seguido (comentarios visibles y adjuntos por tipo). */
  private prepararIdea(idea: any): void {
    const comentarios = (idea?.ticketComments || []).filter((c: any) => !c?.esNota);
    comentarios.forEach((c: any) => {
      const adjuntos: string[] = c?.adjuntos || [];
      c.imagenes = adjuntos.filter((a) => tipoAdjunto(a) === 'imagen');
      c.audios = adjuntos.filter((a) => tipoAdjunto(a) === 'audio');
      c.videos = adjuntos.filter((a) => esVideoReproducible(a));
      c.archivos = adjuntos.filter((a) => esArchivoParaAbrir(a));
      c.esDelComercio = this.esDelComercio(c);
    });

    const adjuntos: string[] = idea?.adjuntos || [];
    idea.comentariosVista = comentarios;
    idea.adjuntosImagenes = adjuntos.filter((a) => tipoAdjunto(a) === 'imagen');
    idea.adjuntosAudios = adjuntos.filter((a) => tipoAdjunto(a) === 'audio');
    idea.adjuntosVideos = adjuntos.filter((a) => esVideoReproducible(a));
    idea.adjuntosArchivos = adjuntos.filter((a) => esArchivoParaAbrir(a));
  }

  // ===========================================================================
  // Filtros
  // ===========================================================================

  filterIdeas(): void {
    let resultado = this.applyDateFilter([...this.originalTasks]);

    const buscado = (this.searchText || '').toLowerCase().trim();
    if (buscado) {
      resultado = resultado.filter((t) => (
        (t.asunto && t.asunto.toLowerCase().includes(buscado)) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(buscado)) ||
        (t.nombreUsuarioReporta && t.nombreUsuarioReporta.toLowerCase().includes(buscado)) ||
        String(t.nroTicket || '').includes(buscado.replace('#', '')) ||
        (t.comentariosVista || []).some((c: any) => c.contenido && c.contenido.toLowerCase().includes(buscado))
      ));
    }

    // Los conteos de las píldoras salen de lo filtrado por fecha y texto: si no, prometen ideas que la lista no muestra.
    this.baseTasks = resultado;
    const conteo = contarPorEstado(resultado);
    this.conteos = { ...conteo, '': conteo.todas };

    this.filteredTasks = this.selectedStatus
      ? resultado.filter((t) => ideaEstadoDe(t) === this.selectedStatus)
      : resultado;

    this.sincronizarSeleccion();
  }

  applyDateFilter(ideas: any[]): any[] {
    if (!this.dateFilter || this.dateFilter === 'all') { return ideas; }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    return ideas.filter((t) => {
      const fecha = aFecha(t.fechaRegistro);
      if (!fecha) { return false; }
      const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      switch (this.dateFilter) {
        case 'today': return dia.getTime() === hoy.getTime();
        case 'week':  return dia >= inicioSemana;
        case 'month': return dia >= inicioMes;
        default:      return true;
      }
    });
  }

  setTab(estado: FiltroEstado): void {
    this.selectedStatus = estado;
    this.filterIdeas();
  }

  clearSearch(): void {
    this.searchText = '';
    this.filterIdeas();
  }

  get listTitle(): string {
    const tab = this.tabs.find((t) => t.key === this.selectedStatus);
    return this.translate.instant(
      !this.selectedStatus || !tab ? 'soporte.misIdeas.maestro.todasLasIdeas' : tab.plural
    );
  }

  get hayFiltros(): boolean {
    return !!this.selectedStatus || !!this.searchText.trim() || this.dateFilter !== 'all';
  }

  limpiarFiltros(): void {
    this.selectedStatus = '';
    this.searchText = '';
    this.dateFilter = 'all';
    this.filterIdeas();
  }

  // ===========================================================================
  // Selección (maestro–detalle)
  // ===========================================================================

  seleccionar(idea: any): void {
    if (this.selected === idea) { return; }
    this.selected = idea;
    this.newComment = '';
    this.limpiarArchivos();

    // En pantalla angosta la lista y el detalle quedan apilados: sin esto el toque no muestra nada.
    if (typeof window !== 'undefined' && window.innerWidth < 980) {
      setTimeout(() => {
        document.getElementById('mt-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }

  private sincronizarSeleccion(): void {
    if (!this.filteredTasks.length) {
      this.selected = null;
      return;
    }
    if (!this.selected || this.filteredTasks.indexOf(this.selected) === -1) {
      // Tras recargar son objetos nuevos: se conserva la idea abierta si sigue en la lista.
      const misma = this.selected ? this.filteredTasks.find((t) => t.cd && t.cd === this.selected.cd) : null;
      if (misma) {
        this.selected = misma;
        return;
      }
      this.selected = this.filteredTasks[0];
      this.newComment = '';
      this.limpiarArchivos();
    }
  }

  trackIdea = (_: number, idea: any) => idea?.cd || idea?.nroTicket || _;

  // ===========================================================================
  // Presentación
  // ===========================================================================

  estadoDe(idea: any): IdeaEstadoDescriptor {
    return IDEA_ESTADOS[ideaEstadoDe(idea)];
  }

  /** 'Hoy' · 'Ayer' · 'Hace N días' */
  edad(valor: any): string {
    const dias = diasDesde(valor);
    if (dias === null) { return this.translate.instant('soporte.misTickets.sinFecha'); }
    if (dias <= 0) { return this.translate.instant('soporte.misTickets.hoy'); }
    if (dias === 1) { return this.translate.instant('soporte.misTickets.ayer'); }
    return this.translate.instant('soporte.misTickets.haceNDias', { n: dias });
  }

  ultimaRespuesta(idea: any): string {
    const comentarios = idea?.comentariosVista || [];
    if (!comentarios.length) { return this.translate.instant('soporte.misTickets.sinRespuestasAun'); }
    return this.edad(comentarios[comentarios.length - 1].fechaCreacion);
  }

  tieneRespuestas(idea: any): boolean {
    return (idea?.comentariosVista || []).length > 0;
  }

  descripcionDe(idea: any): string {
    return idea?.descripcion || idea?.asunto || '';
  }

  iniciales(nombre: string): string { return inicialesDe(nombre); }

  colorAutor(comment: any): string {
    return comment?.autor?.color || (comment?.esDelComercio ? '#4f5bd5' : '#6c4ce0');
  }

  private esDelComercio(comment: any): boolean {
    const mio = String(this.currentUser?.email || '').toLowerCase();
    const suyo = String(comment?.autor?.email || '').toLowerCase();
    return !!mio && mio === suyo;
  }

  nombreAdjunto(url: string): string { return nombreAdjunto(url); }

  iconoAdjunto(url: string): string {
    const tipo = tipoAdjunto(url);
    if (tipo === 'audio') { return 'pi-volume-up'; }
    if (tipo === 'video') { return 'pi-video'; }
    if (tipo === 'documento') { return 'pi-file'; }
    return 'pi-image';
  }

  openInNewTab(url: string): void { window.open(url, '_blank'); }

  handleImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/icons/image-placeholder.png';
  }

  // ===========================================================================
  // Respuesta del equipo y «A mí también me sirve»
  // ===========================================================================

  /** La respuesta oficial del equipo: la `resolucion` del ticket (texto y versión opcional). */
  respuestaEquipo(idea: any): { texto: string; version: string } | null {
    const texto = String(idea?.resolucion?.texto || '').trim();
    if (!texto) { return null; }
    return { texto, version: String(idea?.resolucion?.version || '').trim() };
  }

  apoyos(idea: any): number { return apoyosDe(idea); }

  yaApoye(idea: any): boolean { return yaApoyo(idea, this.currentUser?.email); }

  /**
   * Apoya o quita el apoyo. Se pinta de inmediato y, si el servidor responde con otra cuenta (otro
   * usuario apoyó al mismo tiempo), se queda con la suya; si falla, se deshace.
   */
  async alternarApoyo(idea: any): Promise<void> {
    const correo = String(this.currentUser?.email || '').toLowerCase();
    if (!idea || this.apoyando || !correo) { return; }
    this.apoyando = true;

    const previos = Array.isArray(idea.apoyosIdea) ? [...idea.apoyosIdea] : [];
    const previoTotal = idea.apoyosIdeaTotal;
    const quiere = !this.yaApoye(idea);
    idea.apoyosIdea = quiere
      ? [...previos, { usuario: correo, nombre: this.nombreActual(), fecha: new Date().toISOString() }]
      : previos.filter((a: any) => String(a?.usuario || '').toLowerCase() !== correo);
    idea.apoyosIdeaTotal = idea.apoyosIdea.length;

    try {
      const respuesta = await new Promise<any>((resolve, reject) => {
        this.misIdeas.apoyar(idea.cd, quiere).subscribe({ next: resolve, error: reject });
      });
      const total = Number(respuesta?.result?.apoyos);
      if (Number.isFinite(total)) { idea.apoyosIdeaTotal = total; }
    } catch (error: any) {
      idea.apoyosIdea = previos;
      idea.apoyosIdeaTotal = previoTotal;
      console.error('Error guardando el apoyo:', error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('soporte.misIdeas.maestro.apoyo.noPudimosGuardar'),
        text: error?.error?.message && error?.status === 403
          ? error.error.message
          : this.translate.instant('soporte.misIdeas.maestro.apoyo.revisaTuConexion'),
        confirmButtonText: this.translate.instant('comun.entendido')
      });
    } finally {
      this.apoyando = false;
    }
  }

  // ===========================================================================
  // Adjuntos de la respuesta que se está escribiendo
  // ===========================================================================

  onFileSelected(event: any): void {
    const files: FileList = event?.target?.files;
    if (!files || !files.length) { return; }

    const rechazados: string[] = [];

    for (const file of Array.from(files)) {
      const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
      const esImagen = file.type.startsWith('image/');
      const esAudio = !esImagen && (this.AUDIO_EXTENSIONS.includes(extension) || file.type.startsWith('audio/'));
      const esVideo = !esImagen && !esAudio && (file.type.startsWith('video/') || this.VIDEO_EXTENSIONS.includes(extension));
      const esDocumento = !esImagen && !esVideo && !esAudio && this.DOC_EXTENSIONS.includes(extension);

      if (!esImagen && !esVideo && !esAudio && !esDocumento) {
        rechazados.push(`${file.name} (formato no permitido)`);
        continue;
      }
      if (file.size > this.MAX_FILE_SIZE_BYTES) {
        rechazados.push(`${file.name} (supera 50MB)`);
        continue;
      }

      this.archivos.push({
        file,
        tipo: esImagen ? 'imagen' : (esVideo ? 'video' : (esAudio ? 'audio' : 'documento')),
        url: URL.createObjectURL(file)
      });
    }

    // Permite volver a elegir el mismo archivo después de quitarlo
    if (event?.target) { event.target.value = ''; }

    if (rechazados.length) {
      Swal.fire({
        icon: 'warning',
        title: this.translate.instant('soporte.misTickets.algunosArchivosNoSeAdjuntaron'),
        html: rechazados.map((r) => `<div>${r}</div>`).join(''),
        confirmButtonText: this.translate.instant('comun.entendido')
      });
    }
  }

  quitarArchivo(index: number): void {
    const [quitado] = this.archivos.splice(index, 1);
    if (quitado) { URL.revokeObjectURL(quitado.url); }
  }

  iconoArchivo(archivo: ArchivoNuevo): string {
    if (archivo.tipo === 'audio') { return 'pi-volume-up'; }
    if (archivo.tipo === 'video') { return 'pi-video'; }
    if (archivo.tipo === 'documento') { return 'pi-file'; }
    return 'pi-image';
  }

  private limpiarArchivos(): void {
    this.archivos.forEach((a) => URL.revokeObjectURL(a.url));
    this.archivos = [];
  }

  get misIniciales(): string { return this.iniciales(this.nombreActual()); }

  get puedeResponder(): boolean {
    return !this.enviandoComentario && (!!this.newComment.trim() || this.archivos.length > 0);
  }

  private nombreActual(): string {
    return this.currentUser?.nombreCompleto || this.currentUser?.name || this.currentUser?.nombres
      || this.currentUser?.email || 'Usuario';
  }

  // ===========================================================================
  // Enviar respuesta
  // ===========================================================================

  async addNewComment(idea: any): Promise<void> {
    if (!idea || !this.puedeResponder) { return; }

    this.enviandoComentario = true;

    const comentariosPrevios = idea.ticketComments || [];
    const maxId = comentariosPrevios.length
      ? Math.max(...comentariosPrevios.map((c: any) => Number(c.id) || 0))
      : 0;

    const nombre = this.nombreActual();
    // El autor sale de la sesión, con su nombre real.
    const autor = {
      id: this.currentUser?.id ? String(this.currentUser.id) : '0',
      nombreCompleto: nombre,
      iniciales: this.iniciales(nombre),
      color: '#4f5bd5',
      email: this.currentUser?.email || '',
      celular: this.currentUser?.celular || ''
    };

    try {
      const adjuntosUrls = await this.subirArchivos();
      const nuevo = {
        id: maxId + 1,
        contenido: this.newComment.trim(),
        fechaCreacion: new Date().toISOString(),
        autor,
        ticketId: idea.cd,
        estado: 1,
        respuestas: [],
        ultimaModificacion: new Date().toISOString(),
        version: 1,
        adjuntos: adjuntosUrls
      };

      idea.ticketComments = [...comentariosPrevios, nuevo];
      await this.saveChanges(idea);

      this.prepararIdea(idea);
      this.newComment = '';
      this.limpiarArchivos();

      this.showCommentSuccess = true;
      if (this.avisoTimer) { clearTimeout(this.avisoTimer); }
      this.avisoTimer = setTimeout(() => { this.showCommentSuccess = false; }, 3000);
    } catch (error) {
      // Si el guardado falló, el comentario no puede quedarse pintado como enviado
      idea.ticketComments = comentariosPrevios;
      this.prepararIdea(idea);
      console.error('Error guardando el comentario:', error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('soporte.misTickets.noPudimosEnviarTuRespuesta'),
        text: this.translate.instant('soporte.misTickets.revisaTuConexionEIntentalo'),
        confirmButtonText: this.translate.instant('comun.entendido')
      });
    } finally {
      this.enviandoComentario = false;
    }
  }

  private subirArchivos(): Promise<string[]> {
    return Promise.all(
      this.archivos.map((archivo, index) => {
        const nombreSeguro = String(archivo.file.name || 'adjunto').replace(/[^\w.\-]+/g, '_');
        return this.subirArchivo(archivo.file, `idea_${Date.now()}_${index + 1}_${nombreSeguro}`);
      })
    );
  }

  private subirArchivo(file: File, fileName: string): Promise<string> {
    const ref = this.storage.ref(`ideas/${fileName}`);
    const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    const contentType = file.type || this.MIME_POR_EXTENSION[extension] || undefined;
    const task = this.storage.upload(`ideas/${fileName}`, file, { contentType });

    return new Promise((resolve, reject) => {
      task.snapshotChanges()
        .pipe(
          finalize(() => {
            ref.getDownloadURL().subscribe({
              next: (url) => resolve(url),
              error: (err) => reject(err)
            });
          })
        )
        .subscribe({ error: (error) => reject(error) });
    });
  }

  private saveChanges(idea: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ticketService.editTicket(idea).subscribe({
        next: (response) => resolve(response),
        error: (err) => reject(err)
      });
    });
  }

  // ===========================================================================
  // Utilidades
  // ===========================================================================

  private usuarioActual(): any {
    try {
      const local = localStorage.getItem('user');
      if (local) { return JSON.parse(local); }
      const sesion = sessionStorage.getItem('user');
      return sesion ? JSON.parse(sesion) : null;
    } catch {
      return null;
    }
  }

  private tiempoDe(valor: any): number {
    const fecha = aFecha(valor);
    return fecha ? fecha.getTime() : 0;
  }
}
