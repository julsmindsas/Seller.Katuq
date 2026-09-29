import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ServiciosService } from '../../../shared/services/servicios.service';
import { SecurityService } from '../../../shared/services/security/security.service';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

type EstadoKey = 'pendiente' | 'haciendo' | 'resuelto';
type TipoKey = 'bug' | 'ayuda' | 'idea';

interface Descriptor {
  label: string;
  fg: string;
  bg: string;
  dot: string;
  icon: string;
}

interface ArchivoNuevo {
  file: File;
  tipo: 'imagen' | 'video' | 'audio' | 'documento';
  url: string;
}

@Component({
  selector: 'app-mis-tickets',
  templateUrl: './mis-tickets.component.html',
  styleUrls: ['./mis-tickets.component.scss']
})
export class MisTicketsComponent implements OnInit, OnDestroy {

  // ── Datos ────────────────────────────────────────────────────────────────
  originalTasks: any[] = [];   // todo lo que trajo el backend para esta empresa
  baseTasks: any[] = [];       // filtrado por fecha y texto (sirve para contar por estado)
  filteredTasks: any[] = [];   // lo que se pinta en la lista (agrega el filtro de estado)
  selected: any = null;        // ticket abierto en el panel de detalle

  // ── Filtros ──────────────────────────────────────────────────────────────
  selectedStatus: '' | EstadoKey = '';
  searchText = '';
  dateFilter = 'all';
  conteos: { [key: string]: number } = { todos: 0, pendiente: 0, haciendo: 0, resuelto: 0 };

  // ── Composición de respuesta ────────────────────────────────────────────
  newComment = '';
  archivos: ArchivoNuevo[] = [];
  enviandoComentario = false;
  showCommentSuccess = false;

  // ── ¿Se resolvió? (D-328) ───────────────────────────────────────────────
  confirmacionModo: '' | 'si' | 'no' = '';
  calificacion: number | null = null;
  calificacionHover = 0;
  comentarioConfirmacion = '';
  motivoRechazo = '';
  enviandoConfirmacion = false;
  readonly estrellas = [1, 2, 3, 4, 5];
  readonly MAX_TEXTO_CONFIRMACION = 1000;
  private guardandoTarea = false;

  isLoading = true;

  private currentUser: any = null;
  private avisoTimer: any = null;

  readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  readonly DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
  // Ticket 1068: audios de WhatsApp (.ogg/.opus) y otros formatos de audio.
  // Windows a veces no reporta el MIME de .opus/.ogg, por eso también se mira la extensión.
  readonly AUDIO_EXTENSIONS = ['ogg', 'opus', 'oga', 'mp3', 'm4a', 'wav', 'aac'];
  readonly VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
  private readonly MIME_POR_EXTENSION: { [ext: string]: string } = {
    ogg: 'audio/ogg', opus: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mpeg',
    m4a: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm'
  };

  // Los conteos y el color de cada estado viven en un solo mapa para que la
  // lista, las píldoras y las pestañas no se desincronicen entre sí.
  readonly estados: { [key: string]: Descriptor } = {
    pendiente: { label: 'Pendiente',   fg: '#b5700f', bg: '#fdf1dd', dot: '#e0891b', icon: 'pi-clock' },
    haciendo:  { label: 'En progreso', fg: '#1f5fbf', bg: '#e7f0fd', dot: '#2f6fe0', icon: 'pi-sync' },
    resuelto:  { label: 'Resuelto',    fg: '#15803d', bg: '#e3f6ec', dot: '#22c55e', icon: 'pi-check-circle' },
    archivado: { label: 'Archivado',   fg: '#5a6070', bg: '#f1f2f5', dot: '#b0b6c5', icon: 'pi-inbox' }
  };

  // Mismo lenguaje que la pantalla de creación (tiposSolicitud en soporte.component)
  readonly tipos: { [key: string]: Descriptor } = {
    bug:   { label: 'Error',      fg: '#c0392f', bg: '#fce9e8', dot: '#c0392f', icon: 'bug' },
    ayuda: { label: 'Consulta',   fg: '#6c4ce0', bg: '#eee9fd', dot: '#6c4ce0', icon: 'ayuda' },
    idea:  { label: 'Sugerencia', fg: '#15803d', bg: '#e3f6ec', dot: '#15803d', icon: 'idea' }
  };

  readonly tabs: { key: '' | EstadoKey; label: string; dot: string }[] = [
    { key: '',          label: 'Todos',       dot: '#b0b6c5' },
    { key: 'pendiente', label: 'Pendientes',  dot: '#e0891b' },
    { key: 'haciendo',  label: 'En progreso', dot: '#2f6fe0' },
    { key: 'resuelto',  label: 'Resueltos',   dot: '#22c55e' }
  ];

  constructor(
    private ticketService: ServiciosService,
    private securityService: SecurityService,
    private storage: AngularFireStorage
  ) {}

  ngOnInit(): void {
    this.currentUser = this.usuarioActual();
    this.cargarTickets();
  }

  ngOnDestroy(): void {
    this.limpiarArchivos();
    if (this.avisoTimer) {
      clearTimeout(this.avisoTimer);
    }
  }

  // ===========================================================================
  // Carga
  // ===========================================================================

  cargarTickets(): void {
    // Empresa activa desde la fuente canónica (mismo criterio que la creación de tickets)
    const empresa = this.securityService.getCompanyInformationLogged();
    const nombreComercio = empresa?.nombreComercio;
    this.isLoading = true;

    this.ticketService.getTickets().subscribe({
      next: (ticket: any) => {
        this.originalTasks = (ticket?.result || [])
          .filter((task: any) => (
            nombreComercio &&
            task.tienda === nombreComercio &&
            task.status !== 'Archivado'
          ))
          .sort((a: any, b: any) => this.tiempoDe(b.fechaRegistro) - this.tiempoDe(a.fechaRegistro));

        this.originalTasks.forEach(t => this.prepararTicket(t));
        this.filterTickets();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'No pudimos cargar tus tickets',
          text: 'Vuelve a intentarlo en un momento.',
          confirmButtonText: 'Entendido'
        });
        console.error('Error al obtener tickets:', error);
      }
    });
  }

  recargar(): void {
    if (this.isLoading) { return; }
    this.cargarTickets();
  }

  /**
   * Deja listo en el ticket todo lo que la vista necesita repetidamente
   * (comentarios visibles, adjuntos separados por tipo). Así el template no
   * recalcula arreglos en cada ciclo de detección de cambios.
   */
  private prepararTicket(ticket: any): void {
    const comentarios = (ticket?.ticketComments || []).filter((c: any) => !c?.esNota);
    comentarios.forEach((c: any) => {
      const adjuntos: string[] = c?.adjuntos || [];
      c.imagenes = adjuntos.filter(a => this.tipoAdjunto(a) === 'imagen');
      // Ticket 1068: audio y video se reproducen en línea; el resto queda como archivo
      c.audios = adjuntos.filter(a => this.tipoAdjunto(a) === 'audio');
      c.videos = adjuntos.filter(a => this.esVideoReproducible(a));
      c.archivos = adjuntos.filter(a => this.esArchivoParaAbrir(a));
      c.esDelComercio = this.esDelComercio(c);
    });

    const adjuntos: string[] = ticket?.adjuntos || [];
    ticket.comentariosVista = comentarios;
    ticket.adjuntosImagenes = adjuntos.filter(a => this.tipoAdjunto(a) === 'imagen');
    ticket.adjuntosAudios = adjuntos.filter(a => this.tipoAdjunto(a) === 'audio');
    ticket.adjuntosVideos = adjuntos.filter(a => this.esVideoReproducible(a));
    ticket.adjuntosArchivos = adjuntos.filter(a => this.esArchivoParaAbrir(a));
  }

  /** Ticket 1068: solo mp4/mov/webm/m4v se reproducen en línea; avi/mkv se abren aparte */
  private esVideoReproducible(url: string): boolean {
    return this.tipoAdjunto(url) === 'video' && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(this.rutaAdjunto(url));
  }

  private esArchivoParaAbrir(url: string): boolean {
    const tipo = this.tipoAdjunto(url);
    return tipo === 'documento' || (tipo === 'video' && !this.esVideoReproducible(url));
  }

  // ===========================================================================
  // Filtros
  // ===========================================================================

  filterTickets(): void {
    let resultado = this.applyDateFilter([...this.originalTasks]);

    const buscado = (this.searchText || '').toLowerCase().trim();
    if (buscado) {
      resultado = resultado.filter(task => (
        (task.asunto && task.asunto.toLowerCase().includes(buscado)) ||
        (task.descripcion && task.descripcion.toLowerCase().includes(buscado)) ||
        (task.nombreUsuarioReporta && task.nombreUsuarioReporta.toLowerCase().includes(buscado)) ||
        String(task.nroTicket || '').includes(buscado.replace('#', '')) ||
        (task.comentariosVista || []).some((c: any) =>
          c.contenido && c.contenido.toLowerCase().includes(buscado))
      ));
    }

    // Los conteos de las pestañas se calculan sobre lo filtrado por fecha y
    // texto, no sobre todo: si no, prometen tickets que la lista no muestra.
    this.baseTasks = resultado;
    this.conteos = {
      todos: resultado.length,
      pendiente: resultado.filter(t => this.estadoKey(t) === 'pendiente').length,
      haciendo: resultado.filter(t => this.estadoKey(t) === 'haciendo').length,
      resuelto: resultado.filter(t => this.estadoKey(t) === 'resuelto').length
    };

    this.filteredTasks = this.selectedStatus
      ? resultado.filter(t => this.estadoKey(t) === this.selectedStatus)
      : resultado;

    this.sincronizarSeleccion();
  }

  applyDateFilter(tasks: any[]): any[] {
    if (!this.dateFilter || this.dateFilter === 'all') {
      return tasks;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    return tasks.filter(task => {
      // Las fechas llegan como 'YYYY-MM-DD'; parsearlas con new Date() las
      // interpreta en UTC y en Colombia (UTC-5) corren un día hacia atrás.
      const fecha = this.aFecha(task.fechaRegistro);
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

  setTab(estado: '' | EstadoKey): void {
    this.selectedStatus = estado;
    this.filterTickets();
  }

  onSearchChange(event: any): void {
    this.searchText = event?.target?.value ?? '';
    this.filterTickets();
  }

  onDateFilterChange(event: any): void {
    this.dateFilter = event?.target?.value ?? 'all';
    this.filterTickets();
  }

  clearSearch(): void {
    this.searchText = '';
    this.filterTickets();
  }

  get listTitle(): string {
    if (!this.selectedStatus) { return 'Todos los tickets'; }
    const estado = this.estados[this.selectedStatus];
    return estado ? estado.label + 's' : 'Tickets';
  }

  get hayFiltros(): boolean {
    return !!this.selectedStatus || !!this.searchText.trim() || this.dateFilter !== 'all';
  }

  limpiarFiltros(): void {
    this.selectedStatus = '';
    this.searchText = '';
    this.dateFilter = 'all';
    this.filterTickets();
  }

  // ===========================================================================
  // Selección (maestro–detalle)
  // ===========================================================================

  seleccionar(ticket: any): void {
    if (this.selected === ticket) { return; }
    this.selected = ticket;
    this.newComment = '';
    this.limpiarArchivos();
    this.limpiarConfirmacion();

    // En pantalla angosta la lista y el detalle quedan apilados: sin esto el
    // toque en un ticket no muestra nada porque el detalle está más abajo.
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
      // Tras recargar los tickets son objetos nuevos: se conserva el que
      // estaba abierto si sigue en la lista
      const mismo = this.selected
        ? this.filteredTasks.find(t => t.cd && t.cd === this.selected.cd)
        : null;
      if (mismo) {
        this.selected = mismo;
        return;
      }
      this.selected = this.filteredTasks[0];
      this.newComment = '';
      this.limpiarArchivos();
      this.limpiarConfirmacion();
    }
  }

  trackTicket = (_: number, ticket: any) => ticket?.cd || ticket?.nroTicket || _;

  // ===========================================================================
  // Presentación
  // ===========================================================================

  estadoKey(ticket: any): string {
    return String(ticket?.status || '').toLowerCase();
  }

  estadoDe(ticket: any): Descriptor {
    return this.estados[this.estadoKey(ticket)] || this.estados['archivado'];
  }

  /** Los tickets viejos no traen tipoSolicitud: se deduce del motivo */
  tipoKey(ticket: any): string {
    const key: string = ticket?.tipoSolicitud || (ticket?.motivo === 'idea' ? 'idea' : 'ayuda');
    return this.tipos[key] ? key : 'ayuda';
  }

  tipoDe(ticket: any): Descriptor {
    return this.tipos[this.tipoKey(ticket)];
  }

  descripcionDe(ticket: any): string {
    return ticket?.descripcion || ticket?.asunto || '';
  }

  /** 'Hoy' · 'Ayer' · 'Hace N días' */
  edad(valor: any): string {
    const dias = this.diasDesde(valor);
    if (dias === null) { return 'Sin fecha'; }
    if (dias <= 0) { return 'Hoy'; }
    if (dias === 1) { return 'Ayer'; }
    return 'Hace ' + dias + ' días';
  }

  /** Un ticket abierto hace una semana o más se marca en ámbar */
  esViejo(ticket: any): boolean {
    const dias = this.diasDesde(ticket?.fechaRegistro);
    return dias !== null && dias >= 7 && this.estadoKey(ticket) !== 'resuelto';
  }

  ultimaRespuesta(ticket: any): string {
    const comentarios = ticket?.comentariosVista || [];
    if (!comentarios.length) { return 'Sin respuestas aún'; }
    return this.edad(comentarios[comentarios.length - 1].fechaCreacion);
  }

  tieneRespuestas(ticket: any): boolean {
    return (ticket?.comentariosVista || []).length > 0;
  }

  iniciales(nombre: string): string {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) { return 'US'; }
    return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
  }

  colorAutor(comment: any): string {
    return comment?.autor?.color || (comment?.esDelComercio ? '#4f5bd5' : '#6c4ce0');
  }

  private esDelComercio(comment: any): boolean {
    const mio = String(this.currentUser?.email || '').toLowerCase();
    const suyo = String(comment?.autor?.email || '').toLowerCase();
    return !!mio && mio === suyo;
  }

  // Mantiene la firma anterior por si otra vista la usa
  comentariosVisibles(ticket: any): any[] {
    return ticket?.comentariosVista || (ticket?.ticketComments || []).filter((c: any) => !c?.esNota);
  }

  // ===========================================================================
  // Adjuntos ya guardados
  // ===========================================================================

  /**
   * Las URL de Storage traen la ruta codificada (tickets%2F...) y ?alt=media&token=...:
   * se decodifica solo la ruta, antes del '?'
   */
  private rutaAdjunto(url: string): string {
    let ruta = String(url || '').split('?')[0];
    try { ruta = decodeURIComponent(ruta); } catch { /* ruta mal codificada: se usa tal cual */ }
    return ruta.toLowerCase();
  }

  tipoAdjunto(url: string): 'imagen' | 'video' | 'audio' | 'documento' {
    if (!url) { return 'imagen'; }
    const ruta = this.rutaAdjunto(url);
    // Ticket 1068: audios de WhatsApp y otros formatos de audio
    if (/\.(ogg|opus|oga|mp3|m4a|wav|aac)$/.test(ruta)) { return 'audio'; }
    if (/\.(mp4|mov|avi|webm|mkv|m4v)$/.test(ruta)) { return 'video'; }
    if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/.test(ruta)) { return 'documento'; }
    return 'imagen';
  }

  iconoAdjunto(url: string): string {
    const tipo = this.tipoAdjunto(url);
    if (tipo === 'audio') { return 'pi-volume-up'; }
    if (tipo === 'video') { return 'pi-video'; }
    if (tipo === 'documento') { return 'pi-file'; }
    return 'pi-image';
  }

  nombreAdjunto(url: string): string {
    if (!url) { return ''; }
    const ruta = decodeURIComponent(String(url).split('?')[0]);
    const archivo = ruta.substring(ruta.lastIndexOf('/') + 1);
    return archivo.replace(/^\d{10,}_/, '').replace(/^ticket_\d+_\d+_/, '');
  }

  isImage(url: string): boolean {
    return this.tipoAdjunto(url) === 'imagen';
  }

  isVideo(url: string): boolean {
    return this.tipoAdjunto(url) === 'video';
  }

  openInNewTab(url: string): void {
    window.open(url, '_blank');
  }

  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/icons/image-placeholder.png';
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
      // Ticket 1068: un .ogg puede llegar como video/ogg; si la extensión es de audio, es audio
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

      // objectURL es síncrono: la miniatura queda en la misma posición que el archivo
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
        title: 'Algunos archivos no se adjuntaron',
        html: rechazados.map(r => `<div>${r}</div>`).join(''),
        confirmButtonText: 'Entendido'
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
    this.archivos.forEach(a => URL.revokeObjectURL(a.url));
    this.archivos = [];
  }

  get misIniciales(): string {
    return this.iniciales(
      this.currentUser?.nombreCompleto || this.currentUser?.name || this.currentUser?.email || ''
    );
  }

  get puedeResponder(): boolean {
    return !this.enviandoComentario && (!!this.newComment.trim() || this.archivos.length > 0);
  }

  // ===========================================================================
  // Enviar respuesta
  // ===========================================================================

  async addNewComment(ticket: any): Promise<void> {
    if (!ticket || !this.puedeResponder) { return; }

    this.enviandoComentario = true;

    const comentariosPrevios = ticket.ticketComments || [];
    const maxId = comentariosPrevios.length
      ? Math.max(...comentariosPrevios.map((c: any) => Number(c.id) || 0))
      : 0;

    const nombre = this.currentUser?.nombreCompleto
      || this.currentUser?.name
      || this.currentUser?.nombres
      || this.currentUser?.email
      || 'Usuario';

    const autor = {
      id: this.currentUser?.id ? String(this.currentUser.id) : '0',
      nombreCompleto: nombre,
      iniciales: this.iniciales(nombre),
      color: '#4f5bd5',
      email: this.currentUser?.email || '',
      celular: this.currentUser?.celular || ''
    };

    try {
      const adjuntosUrls = await this.subirImagenesAFirebase();

      const nuevo = {
        id: maxId + 1,
        contenido: this.newComment.trim(),
        fechaCreacion: new Date().toISOString(),
        autor,
        ticketId: ticket.cd,
        estado: 1,
        respuestas: [],
        ultimaModificacion: new Date().toISOString(),
        version: 1,
        adjuntos: adjuntosUrls
      };

      ticket.ticketComments = [...comentariosPrevios, nuevo];

      await this.saveChanges(ticket);

      this.prepararTicket(ticket);
      this.newComment = '';
      this.limpiarArchivos();

      this.showCommentSuccess = true;
      if (this.avisoTimer) { clearTimeout(this.avisoTimer); }
      this.avisoTimer = setTimeout(() => { this.showCommentSuccess = false; }, 3000);
    } catch (error) {
      // Si el guardado falló, el comentario no puede quedarse pintado como enviado
      ticket.ticketComments = comentariosPrevios;
      this.prepararTicket(ticket);
      console.error('Error guardando el comentario:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos enviar tu respuesta',
        text: 'Revisa tu conexión e inténtalo de nuevo. Tu texto sigue escrito.',
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.enviandoComentario = false;
    }
  }

  async subirImagenesAFirebase(): Promise<string[]> {
    return Promise.all(
      this.archivos.map((archivo, index) => {
        // Conserva nombre y extensión para que se distinga imagen, video o documento
        const nombreSeguro = String(archivo.file.name || 'adjunto').replace(/[^\w.\-]+/g, '_');
        const fileName = `ticket_${Date.now()}_${index + 1}_${nombreSeguro}`;
        return this.subirImagenFirebase(archivo.file, fileName);
      })
    );
  }

  subirImagenFirebase(file: File, fileName: string): Promise<string> {
    const ref = this.storage.ref(`tickets/${fileName}`);
    // Ticket 1068: se guarda el tipo real para que audio y video se reproduzcan desde Storage;
    // si el navegador no lo reporta (.opus/.ogg en Windows) se deduce por la extensión
    const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    const contentType = file.type || this.MIME_POR_EXTENSION[extension] || undefined;
    const task = this.storage.upload(`tickets/${fileName}`, file, { contentType });

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

  saveChanges(ticket: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ticketService.editTicket(ticket).subscribe({
        next: (response) => resolve(response),
        error: (err) => reject(err)
      });
    });
  }

  // ===========================================================================
  // Resolución, tareas y "¿Se resolvió?" (D-328)
  // ===========================================================================

  resolucionDe(ticket: any): { texto: string; version: string } | null {
    const texto = String(ticket?.resolucion?.texto || '').trim();
    if (!texto) { return null; }
    return { texto, version: String(ticket?.resolucion?.version || '').trim() };
  }

  tareasDe(ticket: any): any[] {
    const tareas = Array.isArray(ticket?.tareasComercio) ? ticket.tareasComercio : [];
    return tareas.filter((t: any) => t && String(t.texto || '').trim());
  }

  tareasPendientes(ticket: any): number {
    return this.tareasDe(ticket).filter(t => !t.hecha).length;
  }

  /**
   * Marca o desmarca una tarea. Se manda solo `tareasComercio`: el ticket
   * completo podría devolver un estado viejo y deshacer lo que hizo el equipo.
   */
  async toggleTarea(ticket: any, tarea: any): Promise<void> {
    if (!ticket || !tarea || this.guardandoTarea) { return; }
    this.guardandoTarea = true;

    const previas = (ticket.tareasComercio || []).map((t: any) => ({ ...t }));
    const hecha = !tarea.hecha;
    ticket.tareasComercio = (ticket.tareasComercio || []).map((t: any) => {
      if (t.id !== tarea.id) { return t; }
      const cambiada = { ...t, hecha };
      if (hecha) {
        cambiada.completada = new Date().toISOString();
      } else {
        delete cambiada.completada;
      }
      return cambiada;
    });

    try {
      await this.saveChanges({ cd: ticket.cd, tareasComercio: ticket.tareasComercio });
    } catch (error) {
      ticket.tareasComercio = previas;
      console.error('Error guardando la tarea:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar la tarea',
        text: 'Revisa tu conexión e inténtalo de nuevo.',
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.guardandoTarea = false;
    }
  }

  /**
   * A qué cierre responde la confirmación: la última vez que pasó a Resuelto.
   * Es la misma regla del backend (services/soporte/confirmacionResolucion.js);
   * si no coinciden, el backend responde 409 y la pantalla se recarga.
   */
  private cierreVigente(ticket: any): string {
    const historial = Array.isArray(ticket?.historyStatus) ? ticket.historyStatus : [];
    for (let i = historial.length - 1; i >= 0; i--) {
      const entrada = historial[i];
      if (String(entrada?.Status || '').trim().toLowerCase() === 'resuelto' && String(entrada?.DateTime || '').trim()) {
        return String(entrada.DateTime).trim();
      }
    }
    return String(ticket?.resolucion?.fecha || '').trim() || 'sin-historial';
  }

  /** La respuesta del comercio para el cierre vigente, si ya la dio */
  confirmacionVigente(ticket: any): any {
    const lista = Array.isArray(ticket?.confirmacionesComercio) ? ticket.confirmacionesComercio : [];
    const cierre = this.cierreVigente(ticket);
    return lista.find((c: any) => c && String(c.cierre || '').trim() === cierre) || null;
  }

  preguntarConfirmacion(ticket: any): boolean {
    return this.estadoKey(ticket) === 'resuelto' && !this.confirmacionVigente(ticket);
  }

  elegirConfirmacion(modo: 'si' | 'no'): void {
    this.confirmacionModo = this.confirmacionModo === modo ? '' : modo;
  }

  elegirCalificacion(valor: number): void {
    this.calificacion = this.calificacion === valor ? null : valor;
  }

  get puedeEnviarConfirmacion(): boolean {
    if (this.enviandoConfirmacion) { return false; }
    if (this.confirmacionModo === 'si') {
      return this.comentarioConfirmacion.length <= this.MAX_TEXTO_CONFIRMACION;
    }
    if (this.confirmacionModo === 'no') {
      const motivo = this.motivoRechazo.trim();
      return !!motivo && motivo.length <= this.MAX_TEXTO_CONFIRMACION;
    }
    return false;
  }

  async enviarConfirmacion(ticket: any): Promise<void> {
    if (!ticket || !this.puedeEnviarConfirmacion) { return; }

    const resuelto = this.confirmacionModo === 'si';
    const cuerpo = resuelto
      ? { resuelto: true, calificacion: this.calificacion, comentario: this.comentarioConfirmacion.trim() }
      : { resuelto: false, motivo: this.motivoRechazo.trim() };

    this.enviandoConfirmacion = true;
    try {
      const respuesta: any = await new Promise((resolve, reject) => {
        this.ticketService.confirmarResolucionTicket(ticket.cd, cuerpo).subscribe({
          next: resolve,
          error: reject
        });
      });

      this.limpiarConfirmacion();

      if (resuelto) {
        const confirmacion = respuesta?.result?.confirmacion;
        if (confirmacion) {
          ticket.confirmacionesComercio = [...(ticket.confirmacionesComercio || []), confirmacion];
        }
        Swal.fire({
          icon: 'success',
          title: '¡Gracias por contarnos!',
          text: 'Tu respuesta le llega al equipo de soporte.',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        // El ticket cambió de estado, historial e hilo: se trae de nuevo
        // para no mostrar ni reenviar una copia vieja
        Swal.fire({
          icon: 'info',
          title: 'Reabrimos tu ticket',
          text: 'El equipo de soporte ya recibió lo que nos contaste y lo retoma.',
          confirmButtonText: 'Entendido'
        });
        this.cargarTickets();
      }
    } catch (error: any) {
      console.error('Error enviando la confirmación:', error);
      if (error?.status === 409) {
        Swal.fire({
          icon: 'info',
          title: 'Este ticket ya cambió',
          text: error?.error?.message || 'Lo actualizamos para que veas cómo quedó.',
          confirmButtonText: 'Entendido'
        });
        this.limpiarConfirmacion();
        this.cargarTickets();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No pudimos guardar tu respuesta',
          text: error?.status === 400 && error?.error?.message
            ? error.error.message
            : error?.status === 404
              ? 'Esta opción todavía no está disponible. Inténtalo más tarde o respóndenos en la conversación.'
              : 'Revisa tu conexión e inténtalo de nuevo. Lo que escribiste sigue ahí.',
          confirmButtonText: 'Entendido'
        });
      }
    } finally {
      this.enviandoConfirmacion = false;
    }
  }

  private limpiarConfirmacion(): void {
    this.confirmacionModo = '';
    this.calificacion = null;
    this.calificacionHover = 0;
    this.comentarioConfirmacion = '';
    this.motivoRechazo = '';
  }

  // ===========================================================================
  // Utilidades
  // ===========================================================================

  private usuarioActual(): any {
    try {
      const local = localStorage.getItem('user');
      if (local) { return JSON.parse(local); }
      const sesion = sessionStorage.getItem('user');
      if (sesion) { return JSON.parse(sesion); }
      return null;
    } catch {
      return null;
    }
  }

  /** Parsea 'YYYY-MM-DD' como fecha local (new Date() la leería en UTC) */
  private aFecha(valor: any): Date | null {
    if (!valor) { return null; }
    if (valor instanceof Date) { return isNaN(valor.getTime()) ? null : valor; }
    const texto = String(valor);
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (soloFecha) {
      return new Date(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3]);
    }
    const fecha = new Date(texto);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  private tiempoDe(valor: any): number {
    const fecha = this.aFecha(valor);
    return fecha ? fecha.getTime() : 0;
  }

  private diasDesde(valor: any): number | null {
    const fecha = this.aFecha(valor);
    if (!fecha) { return null; }
    const desde = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const hoy = new Date();
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.round((hasta.getTime() - desde.getTime()) / 86400000);
  }

  // Compatibilidad con llamadas previas
  getTicketsByStatus(status: string): any[] {
    return (this.filteredTasks || []).filter(t => this.estadoKey(t) === String(status).toLowerCase());
  }

  getTicketCountByStatus(status: string): number {
    return this.conteos[String(status).toLowerCase()] ?? 0;
  }
}
