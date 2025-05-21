import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { ImagenService } from 'src/app/shared/utils/image.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-adiciones',
  templateUrl: './adiciones.component.html',
  styleUrls: ['./adiciones.component.scss']
})
export class AdicionesComponent implements OnInit, OnDestroy {

  additionForm: FormGroup;
  name: any;
  namestorage: any;
  email: any;
  cargando: Boolean = false;
  files: any;
  filesNames: string[] = [];
  filesPaths: any[] = [];
  fileImg: any[] = [];
  result: any;
  flag: string[] = [];
  images: any[] = [];
  croppedImage: any = '';
  carrouselImg: any[] = [];
  fileUrls: any[] = [];
  isEditing: boolean = false;
  private subscriptions: Subscription[] = [];
  tipoEntrega: any;
  
  // Maneja posible error si no existe currentCompany
  ciudadesOrigen: any[] = [];
  ciudadesEntrega: any[] = [];
  
  // Respaldo de datos originales para edición
  originalAdicionData: any = null;

  constructor(
    private formBuilder: FormBuilder, 
    private service: MaestroService,
    public activeModal: NgbActiveModal, 
    public storage: AngularFireStorage, 
    private router: Router, 
    private imageService: ImagenService
  ) {}

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones para evitar fugas de memoria
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnInit() {
    this.initializeForm();
    this.loadTipoEntrega();
    this.loadCiudades();
    this.setupFormValueChanges();
  }

  private initializeForm(): void {
    this.additionForm = this.formBuilder.group({
      tipoEntrega: ['', Validators.required],
      unitsAvailable: ['', Validators.required],
      highlighted: ['', Validators.required],
      position: ['', Validators.required],
      inventario: [''],
      referencia: ['', Validators.required],
      availableForPurchase: [''],
      availableFrom: [''],
      availableUntil: [''],
      recommended: [false],
      tiempoEntrega: ['', Validators.required],
      active: ['', Validators.required],
      precioTotal: [''],
      onlyPos: [''],
      precioIva: [''],
      porcentajeIVA: [''],
      precioUnitario: ['', Validators.required],
      imagenSecundaria: [[]],
      imagenPrincipal: [[]],
      descripcion: ['', Validators.required],
      titulo: ['', Validators.required],
      originCities: [[]],
      deliveryCities: [[]],
      esAdicion: [true],
      esPreferencia: [false],
    });
  }

  private loadTipoEntrega(): void {
    const sub = this.service.getTipoEntrega().subscribe((r: any) => {
      this.tipoEntrega = r;
      this.checkForEditMode();
    });
    this.subscriptions.push(sub);
  }

  private loadCiudades(): void {
    try {
      const currentCompanyStr = sessionStorage.getItem('currentCompany');
      if (currentCompanyStr) {
        const currentCompany = JSON.parse(currentCompanyStr);
        if (currentCompany && currentCompany.ciudadess) {
          this.ciudadesOrigen = currentCompany.ciudadess.ciudadesOrigen || [];
          this.ciudadesEntrega = currentCompany.ciudadess.ciudadesEntrega || [];
        }
      }
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
    }
  }

  private checkForEditMode(): void {
    const savedData = sessionStorage.getItem("adictionForEdit");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData || "{}");
        if (parsedData) {
          // Guardar los datos originales para tener referencia
          this.originalAdicionData = { ...parsedData };
          
          // Cargar datos en el formulario
          this.additionForm.patchValue(parsedData);
          this.isEditing = true;
          
          console.log('Modo edición activado. ID:', parsedData._id);
          console.log('Datos originales:', this.originalAdicionData);
          
          // Mostrar mensaje de edición
          this.showEditingModeMessage();
        }
      } catch (error) {
        console.error('Error al cargar datos guardados:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los datos para editar. Por favor intente nuevamente.',
          icon: 'error'
        });
      }
    }
  }
  
  private showEditingModeMessage(): void {
    Swal.fire({
      title: 'Modo edición',
      text: 'Estás editando una adición existente. Los cambios se guardarán al presionar el botón "Guardar".',
      icon: 'info',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }

  private setupFormValueChanges(): void {
    const precioControl = this.additionForm.get('precioUnitario');
    const ivaControl = this.additionForm.get('porcentajeIVA');
    
    if (precioControl) {
      const subPrecio = precioControl.valueChanges.subscribe(() => {
        this.calcularPrecioTotal();
      });
      this.subscriptions.push(subPrecio);
    }
    
    if (ivaControl) {
      const subIVA = ivaControl.valueChanges.subscribe(() => {
        this.calcularPrecioTotal();
      });
      this.subscriptions.push(subIVA);
    }
  }

  private calcularPrecioTotal(): void {
    const unitPrice = this.additionForm.get('precioUnitario')?.value || 0;
    const valorIVA = this.additionForm.get('porcentajeIVA')?.value || 0;
    
    const precioIVA = unitPrice * (valorIVA / 100);
    const precioTotal = unitPrice + precioIVA;
    
    this.additionForm.get('precioIva')?.setValue(precioIVA);
    this.additionForm.get('precioTotal')?.setValue(precioTotal);
  }

  mostrarMensajeDeGuardado(): void {
    this.additionForm.reset();
    
    const title = this.isEditing ? '¡Actualizado exitosamente!' : '¡Guardado exitosamente!';
    const text = this.isEditing 
      ? 'La adición ha sido actualizada correctamente' 
      : 'Los datos se han guardado correctamente';
    
    Swal.fire({
      title: title,
      text: text,
      icon: 'success',
      showConfirmButton: false,
      timer: 3000
    });
    
    this.carrouselImg = [];
    this.fileImg = [];
    this.filesNames = [];
    this.filesPaths = [];
    this.originalAdicionData = null;
  }

  submitAdicion(): void {
    if (!this.additionForm.valid) {
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor, complete todos los campos requeridos antes de continuar.',
        icon: 'warning'
      });
      return;
    }

    this.cargando = true;

    // Si hay imágenes para subir, primero hacemos eso
    if (this.fileImg.length > 0) {
      this.uploadImagesAndSave();
    } else {
      // Si no hay imágenes, guardamos directamente
      this.prepareAndSaveAdicion();
    }
  }
  
  private prepareAndSaveAdicion(): void {
    const formData = this.additionForm.value;
    
    // Si estamos en modo edición, asegurarnos de incluir el ID
    if (this.isEditing && this.originalAdicionData && this.originalAdicionData._id) {
      formData._id = this.originalAdicionData._id;
    }
    
    this.guardarAdicion(formData);
  }

  private guardarAdicion(adicion: any): void {
    console.log('Guardando adición con datos:', adicion);
    let action;
    
    if (this.isEditing) {
      // Validar que tengamos un ID válido
      if (!adicion._id || typeof adicion._id !== 'string' || adicion._id.trim() === '') {
        console.error('ID para edición no válido:', adicion._id);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo identificar la adición a editar. Por favor, intente nuevamente.',
          icon: 'error'
        });
        this.cargando = false;
        return;
      }
      
      console.log('Editando adición existente con ID:', adicion._id);
      action = this.service.editAdiciones(adicion);
    } else {
      console.log('Creando nueva adición');
      action = this.service.createAdiciones(adicion);
    }

    const sub = action.subscribe({
      next: (res) => {
        console.log('Respuesta del servidor:', res);
        this.mostrarMensajeDeGuardado();
        sessionStorage.removeItem("adictionForEdit");
        this.router.navigateByUrl("ecommerce/adiciones/listar");
        this.isEditing = false;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error detallado al guardar la adición:', err);
        const operation = this.isEditing ? 'actualizar' : 'crear';
        Swal.fire({
          title: 'Error',
          text: `Ocurrió un error al ${operation} la adición. Por favor, intente nuevamente.`,
          icon: 'error'
        });
        this.cargando = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  fileChangeEvent(event: any, tipoImagen: string): void {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    // Añadir archivos a la colección en memoria
    for (let index = 0; index < event.target.files.length; index++) {
      const file = event.target.files[index];
      
      // Guardamos la referencia al archivo y su tipo
      this.fileImg.push({ img: file, tipo: tipoImagen });
      this.filesNames.push(file.name);
      
      // Preview de la imagen
      const fileReader = new FileReader();
      fileReader.onload = (e: any) => {
        this.carrouselImg.push({
          preview: e.target.result,
          tipo: tipoImagen,
          name: file.name
        });
      };
      fileReader.readAsDataURL(file);
    }
    
    // Mostrar mensaje de imágenes añadidas
    const count = event.target.files.length;
    const message = count === 1 
      ? `1 imagen ${tipoImagen} añadida. Presione guardar para confirmar.` 
      : `${count} imágenes ${tipoImagen} añadidas. Presione guardar para confirmar.`;
    
    Swal.fire({
      title: 'Imágenes añadidas',
      text: message,
      icon: 'info',
      timer: 3000,
      showConfirmButton: false
    });
  }

  private uploadImagesAndSave(): void {
    if (this.fileImg.length === 0) {
      this.prepareAndSaveAdicion();
      return;
    }

    Swal.fire({
      title: 'Subiendo...',
      html: `
        <h6>Por favor espere mientras se suben las imágenes</h6>
        <br>
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" id="progressbar" style="width:0%"></div>
        </div>`,
      showConfirmButton: false,
      allowOutsideClick: false
    });

    this.filesPaths = [];
    this.fileUrls = [];
    this.flag = [];

    // Contador para sincronizar múltiples uploads
    let completedUploads = 0;
    const totalUploads = this.fileImg.length;
    const baseProgress = 100 / totalUploads;

    for (let index = 0; index < this.fileImg.length; index++) {
      const file = this.fileImg[index];
      const filename = this.filesNames[index];
      // Añadir timestamp para evitar sobrescribir archivos con mismo nombre
      const timestamp = new Date().getTime();
      const path = `Adiciones/${timestamp}_${filename}`;
      
      const uploadTask = this.storage.upload(path, file.img);
      
      uploadTask.then(async snapshot => {
        // Actualizar progreso
        completedUploads++;
        const progressPercent = baseProgress * completedUploads;
        const progressBar = document.getElementById('progressbar');
        if (progressBar) {
          progressBar.style.width = `${progressPercent}%`;
        }
        
        // Guardar información sobre el archivo subido
        this.filesPaths.push({
          name: filename,
          pathName: path,
          tipo: file.tipo
        });
        
        this.flag.push('success');
        
        // Cuando todas las imágenes se han subido
        if (completedUploads === totalUploads) {
          // Cerrar modal de progreso
          Swal.close();
          // Obtener URLs de todas las imágenes subidas
          this.getDownloadURLsAndSave();
        }
      }).catch(error => {
        console.error('Error al subir imagen:', error);
        completedUploads++;
        this.flag.push('error');
        
        // Incluso con errores, continuamos con el flujo cuando se completan todos los uploads
        if (completedUploads === totalUploads) {
          Swal.close();
          if (this.flag.includes('error')) {
            Swal.fire({
              title: '¡Atención!',
              text: 'Ocurrió un error al subir una o más imágenes. Por favor, intente nuevamente.',
              icon: 'warning'
            });
          } else {
            this.getDownloadURLsAndSave();
          }
        }
      });
    }
  }

  private getDownloadURLsAndSave(): void {
    console.log('Obteniendo URLs de descarga...');
    
    if (this.filesPaths.length === 0) {
      console.log('No hay archivos para procesar, guardando directamente');
      this.prepareAndSaveAdicion();
      return;
    }

    let completedURLs = 0;
    const totalURLs = this.filesPaths.length;
    
    // Para cada ruta, obtener la URL de descarga
    this.filesPaths.forEach(img => {
      const sub = this.storage.ref(img.pathName).getDownloadURL().subscribe({
        next: (url) => {
          console.log(`URL obtenida para ${img.name}: ${url}`);
          const media = {
            urls: url,
            nombreImagen: img.name,
            path: img.pathName,
            tipo: img.tipo
          };
          
          this.fileUrls.push(media);
          completedURLs++;
          
          console.log(`Completado ${completedURLs} de ${totalURLs}`);
          
          // Cuando tenemos todas las URLs
          if (completedURLs === totalURLs) {
            console.log('Todas las URLs obtenidas, actualizando formulario');
            // Actualizar valores en el formulario
            this.updateFormWithNewImages();
            
            // Asegurar que los valores se hayan actualizado
            setTimeout(() => {
              console.log('Guardando adición...');
              // Guardar la adición con las imágenes incluidas
              this.prepareAndSaveAdicion();
            }, 100);
          }
        },
        error: (error) => {
          console.error('Error al obtener URL de descarga:', error);
          completedURLs++;
          
          if (completedURLs === totalURLs) {
            // Si hay errores pero tenemos algunas URLs, continuamos con lo que tenemos
            this.updateFormWithNewImages();
            
            // Asegurar que los valores se hayan actualizado
            setTimeout(() => {
              this.prepareAndSaveAdicion();
            }, 100);
          }
        }
      });
      
      this.subscriptions.push(sub);
    });
  }
  
  private updateFormWithNewImages(): void {
    const imagenPrincipalControl = this.additionForm.get('imagenPrincipal');
    const imagenSecundariaControl = this.additionForm.get('imagenSecundaria');
    
    const principalImages = this.fileUrls.filter(r => r.tipo === "principal");
    const secundariaImages = this.fileUrls.filter(r => r.tipo === "secundaria");
    
    console.log('Nuevas imágenes principales:', principalImages);
    console.log('Nuevas imágenes secundarias:', secundariaImages);
    
    if (imagenPrincipalControl) {
      // Si estamos en modo edición, conservar imágenes existentes
      if (this.isEditing) {
        const existingImages = imagenPrincipalControl.value || [];
        console.log('Imágenes principales existentes:', existingImages);
        imagenPrincipalControl.setValue([...existingImages, ...principalImages]);
      } else {
        imagenPrincipalControl.setValue(principalImages);
      }
    }
    
    if (imagenSecundariaControl) {
      // Si estamos en modo edición, conservar imágenes existentes
      if (this.isEditing) {
        const existingImages = imagenSecundariaControl.value || [];
        console.log('Imágenes secundarias existentes:', existingImages);
        imagenSecundariaControl.setValue([...existingImages, ...secundariaImages]);
      } else {
        imagenSecundariaControl.setValue(secundariaImages);
      }
    }
  }

  deleteImg(imgToDelete: string, index: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la imagen`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No, cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      showCloseButton: true
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          this.imageService.eliminarImagen(imgToDelete);
          
          // Actualizar el formulario correctamente
          const imagenPrincipalControl = this.additionForm.get('imagenPrincipal');
          if (imagenPrincipalControl) {
            const imagenesPrincipales = imagenPrincipalControl.value || [];
            const nuevasImagenes = imagenesPrincipales.filter((p: any) => p.path !== imgToDelete);
            imagenPrincipalControl.setValue(nuevasImagenes);
          }
          
          Swal.fire({
            title: 'Eliminada',
            text: 'La imagen ha sido eliminada correctamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (error) {
          console.error('Error al eliminar imagen:', error);
          Swal.fire('Error', 'No se pudo eliminar la imagen. Por favor intente nuevamente.', 'error');
        }
      } else if (result.isDismissed) {
        Swal.fire({
          title: 'Cancelado',
          text: 'La imagen no se eliminó',
          icon: 'info',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }
  
  // Método para cancelar la edición y volver a la lista
  cancelarEdicion(): void {
    Swal.fire({
      title: '¿Cancelar edición?',
      text: 'Los cambios no guardados se perderán',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, continuar editando'
    }).then((result) => {
      if (result.isConfirmed) {
        sessionStorage.removeItem("adictionForEdit");
        this.router.navigateByUrl("ecommerce/adiciones/listar");
      }
    });
  }
}

