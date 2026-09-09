import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiciosService } from '../../shared/services/servicios.service';
import { SecurityService } from '../../shared/services/security/security.service';
import { TicketNotificacionesSellerService } from '../../shared/services/ticket-notificaciones-seller.service';
import Swal from 'sweetalert2';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-soporte',
  templateUrl: './soporte.component.html',
  styleUrls: ['./soporte.component.scss']
})
export class SoporteComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  ticketForm: FormGroup;
  users: any[] = [];
  categories: any[] = [];
  subcategories: any[] = [];
  canales: any;
  fileBase64String: any;
  // Una sola lista para toda la evidencia: archivo y su miniatura viajan juntos,
  // así el orden y la eliminación son siempre consistentes
  archivos: { file: File; tipo: 'imagen' | 'video' | 'documento'; url: string }[] = [];
  clasOpen = false;
  // Límite prometido en la interfaz ("Máximo 50MB por archivo")
  readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  readonly DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
  readonly MIN_ASUNTO = 8;
  readonly MIN_DESC = 30;

  // Qué necesita el comercio; define a qué equipo llega el ticket
  readonly tiposSolicitud = [
    {
      key: 'bug', motivo: 'soporte', label: 'Algo no funciona',
      hint: 'Un error o algo que dejó de andar', iconBg: '#FCE9E8', iconColor: '#C0392F'
    },
    {
      key: 'ayuda', motivo: 'soporte', label: 'Necesito ayuda',
      hint: 'Una duda de cómo usar Katuq', iconBg: '#EEE9FD', iconColor: '#6C4CE0'
    },
    {
      key: 'idea', motivo: 'idea', label: 'Tengo una idea',
      hint: 'Propón una mejora o función nueva', iconBg: '#E3F6EC', iconColor: '#15803D'
    }
  ];

  readonly categorias = [
    { valor: 'funcionalidad katuq', label: 'Funcionalidad Katuq' },
    { valor: 'facturación electrónica', label: 'Facturación electrónica' },
    { valor: 'inventarios', label: 'Inventarios' },
    { valor: 'pagos y cartera', label: 'Pagos y cartera' }
  ];

  readonly subcategorias = [
    { valor: 'general', label: 'General' },
    { valor: 'ventas pos', label: 'Ventas POS' },
    { valor: 'pedidos', label: 'Pedidos' },
    { valor: 'reportes', label: 'Reportes' }
  ];

  readonly prioridades = [
    { valor: 'baja', label: 'Baja' },
    { valor: 'media', label: 'Media' },
    { valor: 'alta', label: 'Alta' }
  ];

  // Pistas de redacción: marcan lo que ya cubre la descripción
  private readonly pistas = [
    { label: 'Qué hiciste antes', re: /pas|clic|entr|abr|intent|cuando|al /i },
    { label: 'Qué esperabas', re: /esper|deber|suponí|correcto/i },
    { label: 'Qué ocurrió', re: /error|no |falló|salió|apareci|mostr/i }
  ];
  isSubmitting: boolean = false;
  isDragging: boolean = false;
  selectedPriority: string = 'media'; // Default priority
  currentUser: any;
  selectedPreviewImage: string = ''; // Added for image preview modal
  selectedPreviewVideo: any = { url: '', type: '' }; // Added for video preview modal

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private ticketService: ServiciosService,
    private securityService: SecurityService,
    private ticketNotificaciones: TicketNotificacionesSellerService,
    private storage: AngularFireStorage
  ) {
    // Get currently logged in user
    this.currentUser = this.getCurrentUser();
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    this.ticketForm = this.fb.group({
      adjuntos: [''],
      ticketComments: [''],
      canal: ['web', Validators.required],
      tienda: ['tienda web', Validators.required],
      categoria: ['funcionalidad katuq', Validators.required],
      subcategoria: ['general', Validators.required],
      // motivo conserva los valores que ya entiende Support ('soporte' | 'idea');
      // tipoSolicitud guarda el matiz que elige el comercio (bug | ayuda | idea)
      motivo: ['soporte', Validators.required],
      tipoSolicitud: ['', Validators.required],
      nombreUsuarioReporta: [this.currentUser?.name || this.currentUser?.email || '', Validators.required], // Nombre o correo del usuario logueado; editable
      fechaRegistro: [today, Validators.required],
      fechaEvento: [today, Validators.required], // Set default to today's date
      asunto: ['', [Validators.required, Validators.minLength(this.MIN_ASUNTO)]],
      descripcion: ['', [Validators.required, Validators.minLength(this.MIN_DESC)]],
      usuarioMesaAyuda: ['Pendiente', Validators.required],
      status: ['Pendiente'],
      prioridad: ['media'] // Add priority field
    });
  }

  // Get current user from localStorage/sessionStorage
  getCurrentUser(): any {
    try {
      // First try localStorage (common storage location for user data)
      const userFromLocal = localStorage.getItem('user');
      if (userFromLocal) {
        return JSON.parse(userFromLocal);
      }
      
      // If not in localStorage, try sessionStorage
      const userFromSession = sessionStorage.getItem('user');
      if (userFromSession) {
        return JSON.parse(userFromSession);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  ngOnInit(): void {
    // Existing code remains...
    this.users = [{
      "id": "5",
      "nombreCompleto": "Jairo Arango",
      "iniciales": "JA",
      "color": "#e11919",
      "email": "jarango@almara.com",
      "celular": "3015380656",
      "fechaCreacion": "2024-11-06T13:16:04.0316182+00:00"
    }];

    this.categories = [
      {
        "id": "6",
        "nombre": "funcionalidad katuq",
        "fechaCreacion": "2024-10-11T00:00:00",
        "descripcion": "todo lo relacionado con funcionalidad katuq",
        "subCategorias": [
          // ...existing code...
          {
            "id": "1",
            "nombre": "general",
            "fechaCreacion": "2024-10-11T00:00:00",
            "descripcion": "todo lo relacionado con el diseño y funcionalidad fisica del pos 4"
          }
        ]
      }
    ];

    this.canales = [
      // ...existing code...
    ];

    this.ticketForm.get('categoria')?.valueChanges.subscribe((selectedCategory) => {
      this.onCategoryChange(selectedCategory);
    });
  }

  // Calculate form completion percentage
  getFormProgress(): number {
    if (!this.ticketForm) return 0;
    
    const controls = this.ticketForm.controls;
    const totalControls = Object.keys(controls).length;
    let filledControls = 0;
    
    // Count filled controls
    Object.keys(controls).forEach(key => {
      const control = this.ticketForm.get(key);
      if (control && control.value !== null && control.value !== '') {
        filledControls++;
      }
    });
    
    return Math.round((filledControls / totalControls) * 100);
  }

  // Check if a field is invalid and touched
  isFieldInvalid(fieldName: string): boolean {
    const field = this.ticketForm.get(fieldName);
    return field ? (field.invalid && field.touched) : false;
  }

  // Set priority and update form value
  setPriority(priority: string): void {
    this.selectedPriority = priority;
    this.ticketForm.get('prioridad')?.setValue(priority);
  }

  onCategoryChange(selectedCategory: string) {
    // ...existing code...
  }

  // Drag and drop functionality
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  // File drop handler method
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  // Todo lo que se subirá a Storage al enviar, en el orden en que se eligió
  get selectedFiles(): File[] {
    return this.archivos.map(a => a.file);
  }

  private extensionDe(file: File): string {
    const partes = file.name.split('.');
    return partes.length > 1 ? partes.pop()!.toLowerCase() : '';
  }

  private esDocumentoPermitido(file: File): boolean {
    return this.DOC_EXTENSIONS.includes(this.extensionDe(file));
  }

  handleFiles(files: FileList): void {
    if (!files || files.length === 0) {
      return;
    }

    const rechazados: string[] = [];

    for (const file of Array.from(files)) {
      const esImagen = file.type.startsWith('image/');
      const esVideo = file.type.startsWith('video/');
      const esDocumento = !esImagen && !esVideo && this.esDocumentoPermitido(file);

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

    if (rechazados.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Algunos archivos no se adjuntaron',
        html: rechazados.map(r => `<div>${r}</div>`).join(''),
        confirmButtonText: 'Entendido'
      });
    }
  }

  onFileChange(event: any): void {
    if (event.target.files) {
      this.handleFiles(event.target.files);
      // Permite volver a elegir el mismo archivo tras quitarlo
      event.target.value = '';
    }
  }

  quitarArchivo(index: number): void {
    const [quitado] = this.archivos.splice(index, 1);
    if (quitado) {
      URL.revokeObjectURL(quitado.url);
    }
  }

  abrirArchivo(archivo: any): void {
    if (archivo?.url) {
      window.open(archivo.url, '_blank');
    }
  }

  private liberarVistasPrevias(): void {
    this.archivos.forEach(a => URL.revokeObjectURL(a.url));
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ===== Estado del formulario para la maqueta =====
  private valor(campo: string): string {
    return (this.ticketForm?.get(campo)?.value || '').toString().trim();
  }

  get tipoElegido(): string {
    return this.valor('tipoSolicitud');
  }

  get motivoOk(): boolean {
    return !!this.tipoElegido;
  }

  get asuntoOk(): boolean {
    return this.valor('asunto').length >= this.MIN_ASUNTO;
  }

  get descOk(): boolean {
    return this.valor('descripcion').length >= this.MIN_DESC;
  }

  get largoDesc(): number {
    return (this.ticketForm?.get('descripcion')?.value || '').length;
  }

  get hayArchivos(): boolean {
    return this.archivos.length > 0;
  }

  get listoParaEnviar(): boolean {
    return this.motivoOk && this.asuntoOk && this.descOk;
  }

  // El avance refleja lo que falta de verdad, no un porcentaje arbitrario
  get progreso(): number {
    const hechos = [this.motivoOk, this.asuntoOk, this.descOk, this.hayArchivos];
    return Math.round(hechos.filter(Boolean).length / hechos.length * 100);
  }

  get anilloFondo(): string {
    const parte = this.progreso / 100;
    const color = this.progreso >= 100 ? '#15803D' : '#6C4CE0';
    return this.progreso >= 100
      ? `conic-gradient(${color} 0turn, ${color} 1turn)`
      : `conic-gradient(${color} 0turn, ${color} ${parte}turn, #ECEDF3 ${parte}turn)`;
  }

  get progresoTitulo(): string {
    return this.listoParaEnviar ? 'Listo para enviar' : 'Falta poco';
  }

  get progresoPista(): string {
    if (this.listoParaEnviar) {
      return 'Puedes enviarlo cuando quieras';
    }
    if (!this.motivoOk) {
      return 'Elige qué necesitas';
    }
    return this.asuntoOk ? 'Amplía la descripción' : 'Escribe el asunto';
  }

  get placeholderDescripcion(): string {
    if (this.tipoElegido === 'bug') {
      return 'Qué hiciste, qué esperabas y qué salió en cambio. Si hay un mensaje de error, cópialo aquí.';
    }
    if (this.tipoElegido === 'idea') {
      return 'Qué te gustaría poder hacer y en qué te ayudaría en tu día a día.';
    }
    return 'Describe con detalle lo que necesitas resolver.';
  }

  get pistasRedaccion(): { label: string; ok: boolean }[] {
    const texto = this.valor('descripcion');
    return this.pistas.map(p => ({ label: p.label, ok: p.re.test(texto) }));
  }

  get verificaciones(): { label: string; ok: boolean }[] {
    return [
      { ok: this.motivoOk, label: this.motivoOk ? 'Tipo de solicitud elegido' : 'Elige qué necesitas' },
      { ok: this.asuntoOk, label: this.asuntoOk ? 'Asunto claro' : `Escribe un asunto de al menos ${this.MIN_ASUNTO} caracteres` },
      { ok: this.descOk, label: this.descOk ? 'Descripción con detalle' : `La descripción necesita ${this.MIN_DESC} caracteres o más` },
      { ok: this.hayArchivos, label: this.hayArchivos ? 'Con evidencia adjunta' : 'Adjunta evidencia (opcional, pero ayuda)' }
    ];
  }

  get resumenClasificacion(): string {
    const cat = this.categorias.find(c => c.valor === this.valor('categoria'))?.label || 'Sin categoría';
    const sub = this.subcategorias.find(s => s.valor === this.valor('subcategoria'))?.label || 'General';
    return `${cat} · ${sub} · ${this.eventoEsHoy ? 'hoy' : this.valor('fechaEvento')}`;
  }

  get eventoEsHoy(): boolean {
    return this.valor('fechaEvento') === new Date().toISOString().split('T')[0];
  }

  get nombreComercio(): string {
    return this.securityService.getCompanyInformationLogged()?.nombreComercio || '';
  }

  get inicialReporta(): string {
    const nombre = this.valor('nombreUsuarioReporta');
    return nombre ? nombre.trim()[0].toUpperCase() : 'U';
  }

  elegirTipo(tipo: any): void {
    this.ticketForm.patchValue({ tipoSolicitud: tipo.key, motivo: tipo.motivo });
  }

  toggleClasificacion(): void {
    this.clasOpen = !this.clasOpen;
  }

  // Reset form to initial state
  resetForm(): void {
    Swal.fire({
      title: '¿Reiniciar el formulario?',
      text: 'Se perderán todos los datos ingresados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, reiniciar',
      cancelButtonText: 'No, continuar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Reset form state
        this.ticketForm.reset();
        this.liberarVistasPrevias();
        this.archivos = [];

        // Reset to defaults
        const today = new Date().toISOString().split('T')[0];
        this.ticketForm.patchValue({
          canal: 'web',
          tienda: 'tienda web',
          categoria: 'funcionalidad katuq',
          subcategoria: 'general',
          motivo: 'soporte',
          tipoSolicitud: '',
          nombreUsuarioReporta: this.currentUser?.name || this.currentUser?.email || '',
          fechaRegistro: today,
          fechaEvento: today,
          status: 'Pendiente',
          prioridad: 'media'
        });
      }
    });
  }

  // Cancel button functionality
  cancelForm(): void {
    Swal.fire({
      title: '¿Cancelar la creación del ticket?',
      text: 'Perderá toda la información ingresada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, continuar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/misTickets']);
      }
    });
  }

  // Existing methods
  // Sube imágenes, videos y documentos a Storage conservando nombre y extensión originales,
  // para que Support pueda distinguir el tipo y mostrar el nombre del archivo
  async subirImagenesAFirebase(): Promise<string[]> {
    const urls: string[] = [];

    for (const file of this.selectedFiles) {
      if (file instanceof File) {
        const nombreSeguro = file.name.replace(/[^\w.\-]+/g, '_');
        const url = await this.subirArchivoFirebase(file, `tickets/${Date.now()}_${nombreSeguro}`);
        urls.push(url);
      }
    }

    return urls;
  }

  subirArchivoFirebase(file: File, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileRef = this.storage.ref(fileName);
      const task = this.storage.upload(fileName, file, { contentType: file.type || undefined });

      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe({
            next: (url) => resolve(url),
            error: (error) => reject(error)
          });
        })
      ).subscribe({
        error: (error) => reject(error)
      });
    });
  }

  async onSubmit() {
    if (this.isSubmitting) {
      return;
    }

    if (!this.ticketForm.valid) {
      // Hacer visibles los errores de todos los campos obligatorios
      this.ticketForm.markAllAsTouched();
      return;
    }

    // Empresa activa desde la fuente canónica; sin ella no se crea un ticket huérfano
    const empresa = this.securityService.getCompanyInformationLogged();
    if (!empresa?.nombreComercio) {
      Swal.fire(
        'Sesión incompleta',
        'No pudimos identificar tu comercio. Cierra sesión y vuelve a ingresar para crear el ticket.',
        'warning'
      );
      return;
    }

    this.isSubmitting = true;

    try {
      const formData = this.ticketForm.getRawValue();
      
      // Add additional fields
      formData.prioridad = this.selectedPriority;
      formData.usuarioMesaAyuda = {
        id: '0',
        nombreCompleto: 'Desconocido',
        iniciales: 'UD',
        color: '#808080',
        email: 'anonimo@anonimo.com',
        celular: '0000',
        fechaCreacion: "2024-11-06T13:16:04.0316182+00:00"
      };
      formData.base64String = this.fileBase64String ?? '';
      // Identidad mínima trazable del comercio; no se envía la configuración completa de la empresa
      formData.tienda = empresa.nombreComercio;
      formData.company = empresa.nombreComercio;
      formData.nit = this.currentUser?.nit || '';
      formData.emailUsuarioReporta = this.currentUser?.email || '';
      // Número visible consecutivo (contador compartido con Support); el cd queda como clave técnica
      formData.nroTicket = await this.ticketNotificaciones.siguienteNumero();

      // Show processing indicator with progress steps
      let loadingStep = 'Preparando información...';
      let currentStep = 1;
      let totalSteps = this.selectedFiles.length > 0 ? 3 : 2;
      
      const loadingSwal = Swal.fire({
        title: 'Procesando ticket...',
        html: `Paso ${currentStep}/${totalSteps}: ${loadingStep}`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Process images if any
      if (this.selectedFiles && this.selectedFiles.length > 0) {
        currentStep = 2;
        loadingStep = 'Subiendo archivos adjuntos...';
        Swal.update({
          html: `Paso ${currentStep}/${totalSteps}: ${loadingStep}`
        });
        
        const imageUrls = await this.subirImagenesAFirebase();
        formData.adjuntos = imageUrls;
      } else {
        formData.adjuntos = []; // Empty array when no images
      }
      
      // Final step - sending data
      currentStep = this.selectedFiles.length > 0 ? 3 : 2;
      loadingStep = 'Enviando información...';
      Swal.update({
        html: `Paso ${currentStep}/${totalSteps}: ${loadingStep}`
      });

      // Send ticket data
      this.ticketService.addTicket(formData).subscribe({
        next: (response) => {
          const ticketId = response?.result?.cd || '';
          const numeroVisible = formData.nroTicket || ticketId;
          this.isSubmitting = false;

          // Notificar al equipo de soporte (ticketId como string, no el objeto)
          this.ticketService.addNotification(`Nuevo ticket #${numeroVisible} creado`, ticketId);
          // Campana del comercio (payload tipado y accionable), idempotente ante
          // reintentos. El correo al equipo de soporte NO sale de aquí: lo manda el
          // backend al crear el ticket (services/notifications/supportTicketNotifier.js).
          this.ticketNotificaciones.notificarCreacion({
            ticketCd: ticketId,
            numero: formData.nroTicket,
            asunto: formData.asunto,
            nomComercial: empresa.nombreComercio,
            emailComercio: this.currentUser?.email,
            autor: formData.nombreUsuarioReporta
          });

          Swal.fire({
            title: '¡Ticket creado con éxito!',
            html: `<div class="success-ticket">
                     <div class="ticket-number">#${numeroVisible}</div>
                     <p>Estado inicial: <strong>Pendiente</strong></p>
                     <p>Su ticket ha sido registrado correctamente</p>
                   </div>`,
            icon: 'success',
            confirmButtonText: 'Ver mis tickets'
          }).then(() => {
            this.router.navigate(['/misTickets']);
          });
        },
        error: (error) => {
          // El formulario conserva los datos; el botón queda disponible para reintentar
          this.isSubmitting = false;
          Swal.fire('Error', 'No se pudo crear el ticket. Verifica tu conexión e intenta de nuevo.', 'error');
          console.error('Error al crear el ticket:', error);
        }
      });
    } catch (error) {
      this.isSubmitting = false;
      Swal.fire('Error', 'Ocurrió un error al procesar su solicitud', 'error');
      console.error('Error al procesar el ticket:', error);
    }
  }
}
