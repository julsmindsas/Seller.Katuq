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
  tipo: 'imagen' | 'video' | 'documento';
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

  isLoading = true;

  private currentUser: any = null;
  private avisoTimer: any = null;

  readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  readonly DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];

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
      c.archivos = adjuntos.filter(a => this.tipoAdjunto(a) !== 'imagen');
      c.esDelComercio = this.esDelComercio(c);
    });

    const adjuntos: string[] = ticket?.adjuntos || [];
    ticket.comentariosVista = comentarios;
    ticket.adjuntosImagenes = adjuntos.filter(a => this.tipoAdjunto(a) === 'imagen');
    ticket.adjuntosArchivos = adjuntos.filter(a => this.tipoAdjunto(a) !== 'imagen');
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
      this.selected = this.filteredTasks[0];
      this.newComment = '';
      this.limpiarArchivos();
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

  tipoAdjunto(url: string): 'imagen' | 'video' | 'documento' {
    if (!url) { return 'imagen'; }
    const ruta = decodeURIComponent(String(url).split('?')[0]).toLowerCase();
    if (/\.(mp4|mov|avi|webm|mkv|m4v)$/.test(ruta)) { return 'video'; }
    if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/.test(ruta)) { return 'documento'; }
    return 'imagen';
  }

  iconoAdjunto(url: string): string {
    const tipo = this.tipoAdjunto(url);
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
      const esImagen = file.type.startsWith('image/');
      const esVideo = file.type.startsWith('video/');
      const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
      const esDocumento = !esImagen && !esVideo && this.DOC_EXTENSIONS.includes(extension);

      if (!esImagen && !esVideo && !esDocumento) {
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
        tipo: esImagen ? 'imagen' : (esVideo ? 'video' : 'documento'),
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
    const task = this.storage.upload(`tickets/${fileName}`, file);

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
