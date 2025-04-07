import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiciosService } from '../../shared/services/servicios.service';
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
  selectedFiles: unknown[] = [];
  imagePreviews: any[] = [];
  isSubmitting: boolean = false;
  isDragging: boolean = false;
  selectedPriority: string = 'media'; // Default priority
  currentUser: any;
  selectedPreviewImage: string = ''; // Added for image preview modal

  constructor(
    private fb: FormBuilder, 
    private router: Router, 
    private ticketService: ServiciosService,
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
      nombreUsuarioReporta: [this.currentUser?.name || '', Validators.required], // Set default to current user's name
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

  handleFiles(files: FileList): void {
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (imageFiles.length === 0) {
        Swal.fire('Formato no válido', 'Por favor, adjunte solo archivos de imagen (.jpg, .png, .gif)', 'warning');
        return;
      }
      
      // Add new files to existing selection
      this.selectedFiles = [...this.selectedFiles, ...imageFiles];
      
      // Process previews
      for (const file of imageFiles) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  onFileChange(event: any): void {
    if (event.target.files) {
      this.handleFiles(event.target.files);
    }
  }

  removeImage(preview: string): void {
    const index = this.imagePreviews.indexOf(preview);
    if (index !== -1) {
      this.imagePreviews.splice(index, 1);
      
      // Also remove from selectedFiles array
      if (this.selectedFiles && this.selectedFiles.length > index) {
        this.selectedFiles = Array.from(this.selectedFiles);
        this.selectedFiles.splice(index, 1);
      }
    }
  }

  // Open image preview modal
  openImagePreview(imageUrl: string): void {
    this.selectedPreviewImage = imageUrl;
    // If using jQuery with Bootstrap modal:
    // $('#imagePreviewModal').modal('show');
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
        this.selectedFiles = [];
        this.imagePreviews = [];
        
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
  async subirImagenesAFirebase(): Promise<string[]> {
    if (!this.selectedFiles || this.selectedFiles.length === 0) {
      return []; // Return empty array if no files selected
    }
    
    const urls = await Promise.all(
      this.selectedFiles.map(async (file:any, index) => {
        const fileName = `ticket_${Date.now()}_${index + 1}.jpg`;
        return this.subirImagenFirebase(file, fileName);
      })
    );
    return urls;
  }

  subirImagenFirebase(file: File, fileName: string): Promise<string> {
    // ...existing code...
    const ref = this.storage.ref(`tickets/${fileName}`);
    const task = this.storage.upload(`tickets/${fileName}`, file);
  
    return new Promise((resolve, reject) => {
      task.snapshotChanges().pipe(
        finalize(() => {
          ref.getDownloadURL().subscribe({
            next: (url) => resolve(url),
            error: (err) => reject(err),
          });
        })
      ).subscribe({
        error: (error) => reject(error),
      });
    });
  }

  async onSubmit() {
    if (this.isSubmitting || !this.ticketForm.valid) {
      return;
    }
    
    this.isSubmitting = true;
    const currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    
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
      formData.tienda = currentCompany.nomComercial;
      formData.company = currentCompany;

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
        loadingStep = 'Subiendo imágenes...';
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
          Swal.fire({
            title: '¡Ticket creado con éxito!',
            html: `<div class="success-ticket">
                     <div class="ticket-number">${response.result.cd}</div>
                     <p>Su ticket ha sido registrado correctamente</p>
                   </div>`,
            icon: 'success',
            confirmButtonText: 'Ver mis tickets'
          });
          
          formData.cd = response.result.cd;
          this.ticketService.addNotification('Nuevo ticket creado', formData);
          this.router.navigate(['/misTickets']);
        },
        error: (error) => {
          this.isSubmitting = false;
          Swal.fire('Error', 'No se pudo guardar el ticket. Por favor intente de nuevo.', 'error');
          console.error('Error al actualizar el ticket:', error);
        }
      });
    } catch (error) {
      this.isSubmitting = false;
      Swal.fire('Error', 'Ocurrió un error al procesar su solicitud', 'error');
      console.error('Error al procesar el ticket:', error);
    }
  }
}
