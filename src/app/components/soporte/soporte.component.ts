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
  // Cada imagen elegida viaja con su miniatura (objectURL) en el mismo objeto,
  // así el orden y la eliminación son siempre consistentes
  imagePreviews: { file: File; url: string }[] = [];
  videoPreviews: any[] = [];
  // Documentos (PDF, Office, texto, comprimidos)
  documentFiles: File[] = [];
  // Límite prometido en la interfaz ("Máximo 50MB por archivo")
  readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  readonly DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'];
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
      categoria: [{ value: 'funcionalidad katuq', disabled: true }, Validators.required],
      subcategoria: [{ value: 'general', disabled: true }, Validators.required],
      motivo: ['soporte', Validators.required],
      nombreUsuarioReporta: [this.currentUser?.name || this.currentUser?.email || '', Validators.required], // Nombre o correo del usuario logueado; editable
      fechaRegistro: [today, Validators.required],
      fechaEvento: [today, Validators.required], // Set default to today's date
      asunto: ['', Validators.required],
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

  // Todo lo que se subirá a Storage al enviar: imágenes y videos, en ese orden
  get selectedFiles(): File[] {
    return [
      ...this.imagePreviews.map(p => p.file),
      ...this.videoPreviews.map(v => v.file as File),
      ...this.documentFiles
    ];
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

      if (esImagen) {
        // objectURL es síncrono: la miniatura queda en la misma posición que el archivo
        this.imagePreviews.push({ file, url: URL.createObjectURL(file) });
      } else if (esVideo) {
        this.generateVideoThumbnail(file).then(thumbnail => {
          this.videoPreviews.push({
            url: URL.createObjectURL(file),
            type: file.type,
            file: file,
            thumbnail
          });
        });
      } else {
        this.documentFiles.push(file);
      }
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

  // Captura un fotograma real: se salta a 0.1s tras cargar metadatos y se dibuja en 'seeked'.
  // Si el navegador no puede decodificar el video, resuelve '' y la plantilla muestra un ícono.
  generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      let resuelto = false;

      const terminar = (thumbnail: string) => {
        if (resuelto) return;
        resuelto = true;
        URL.revokeObjectURL(objectUrl);
        resolve(thumbnail);
      };

      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      video.addEventListener('loadedmetadata', () => {
        // Algunos videos muy cortos no permiten 0.1s; usar la mitad si hace falta
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        if (!ctx || !video.videoWidth || !video.videoHeight) {
          terminar('');
          return;
        }
        // Recorte centrado para no deformar el fotograma
        const lado = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - lado) / 2;
        const sy = (video.videoHeight - lado) / 2;
        ctx.drawImage(video, sx, sy, lado, lado, 0, 0, 150, 150);
        try {
          terminar(canvas.toDataURL('image/jpeg', 0.8));
        } catch {
          terminar('');
        }
      });

      video.addEventListener('error', () => terminar(''));
      // Red de seguridad si nunca llega 'seeked'
      setTimeout(() => terminar(''), 8000);

      video.src = objectUrl;
    });
  }

  onFileChange(event: any): void {
    if (event.target.files) {
      this.handleFiles(event.target.files);
      // Permite volver a elegir el mismo archivo tras quitarlo
      event.target.value = '';
    }
  }

  removeImage(index: number): void {
    const [quitada] = this.imagePreviews.splice(index, 1);
    if (quitada) {
      URL.revokeObjectURL(quitada.url);
    }
  }

  removeVideo(preview: any): void {
    const index = this.videoPreviews.indexOf(preview);
    if (index !== -1) {
      this.videoPreviews.splice(index, 1);
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    }
  }

  private liberarVistasPrevias(): void {
    this.imagePreviews.forEach(p => URL.revokeObjectURL(p.url));
    this.videoPreviews.forEach(v => v?.url && URL.revokeObjectURL(v.url));
  }

  removeDocument(index: number): void {
    this.documentFiles.splice(index, 1);
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Open image preview modal (mismo mecanismo que el de video); si no hay Bootstrap, pestaña nueva
  openImagePreview(imageUrl: string): void {
    this.selectedPreviewImage = imageUrl;
    const modalElement = document.getElementById('imagePreviewModal');
    if (modalElement && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    } else {
      window.open(imageUrl, '_blank');
    }
  }

  // Open video preview modal
  openVideoPreview(video: any): void {
    this.selectedPreviewVideo = video;
    // This assumes you have a Bootstrap modal with id 'videoPreviewModal'
    // You might need to trigger it differently if not using jQuery
    const modalElement = document.getElementById('videoPreviewModal');
    if (modalElement && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
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
        this.imagePreviews = [];
        this.videoPreviews = [];
        this.documentFiles = [];
        
        // Reset to defaults
        const today = new Date().toISOString().split('T')[0];
        this.ticketForm.patchValue({
          canal: 'web',
          tienda: 'tienda web',
          categoria: 'funcionalidad katuq',
          subcategoria: 'general',
          motivo: 'soporte',
          nombreUsuarioReporta: this.currentUser?.name || '',
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
          // Campana del comercio (payload tipado y accionable) + correos encolados
          // (comercio + equipo operativo), todo idempotente ante reintentos
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
