import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/compat/storage';
import { Pedido } from '../../../ventas/modelo/pedido';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { ImagenService } from '../../../../shared/utils/image.service';
import Swal from 'sweetalert2';

interface UploadFile {
  file: File;
  task: AngularFireUploadTask | null;
  progress: number;
  url: string | null;
  preview: string | null;
}

@Component({
  selector: 'app-evidencia-empacado-modal',
  templateUrl: './evidencia-empacado-modal.component.html',
  styleUrls: ['./evidencia-empacado-modal.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EvidenciaEmpacadoModalComponent implements OnInit {
  pedido: Pedido;
  companyId: string;
  files: UploadFile[] = [];
  existingPhotos: string[] = [];
  overallProgress: number = 0;
  uploading: boolean = false;
  processingFiles: boolean = false; // Nuevo: indica que se están procesando archivos seleccionados
  filesBeingProcessed: number = 0; // Nuevo: contador de archivos en proceso

  // Image viewer (lightbox)
  imageViewerVisible: boolean = false;
  selectedImageUrl: string = '';

  readonly MAX_FILES = 3;
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private storage: AngularFireStorage,
    private ventasService: VentasService,
    private imageService: ImagenService
  ) { }

  ngOnInit(): void {
    this.pedido = this.config.data.pedido;
    this.companyId = this.config.data.companyId;

    // Cargar fotos existentes si las hay
    if (this.pedido.fotoEvidenciaEmpacado && this.pedido.fotoEvidenciaEmpacado.length > 0) {
      this.existingPhotos = [...this.pedido.fotoEvidenciaEmpacado];
    }

    // Configurar z-index global para SweetAlert2 en este modal
    // Esto asegura que los popups de confirmación aparezcan ENCIMA del modal de PrimeNG
    this.configureSweetAlertZIndex();
  }

  /**
   * Configura el z-index de SweetAlert2 para que aparezca encima del modal de PrimeNG
   * FIX: Los modales de confirmación aparecían detrás del modal de evidencia
   */
  private configureSweetAlertZIndex(): void {
    // PrimeNG DynamicDialog usa z-index ~1100+
    // Configuramos SweetAlert2 para usar z-index más alto
    const style = document.createElement('style');
    style.innerHTML = `
      .swal2-container {
        z-index: 10000 !important;
      }
      .swal2-popup {
        z-index: 10001 !important;
      }
    `;
    document.head.appendChild(style);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = input.files;

    if (!selectedFiles || selectedFiles.length === 0) return;

    // Validar que no se excedan los 3 archivos totales
    const totalFiles = this.files.length + this.existingPhotos.length + selectedFiles.length;
    if (totalFiles > this.MAX_FILES) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite excedido',
        text: `Solo puedes subir un máximo de ${this.MAX_FILES} fotos en total. Ya tienes ${this.files.length + this.existingPhotos.length} foto(s).`,
        confirmButtonColor: '#3085d6'
      });
      input.value = '';
      return;
    }

    // Indicar que se están procesando archivos
    this.processingFiles = true;
    this.filesBeingProcessed = selectedFiles.length;
    console.log(`📸 Procesando ${selectedFiles.length} archivo(s) seleccionado(s)...`);

    let processedCount = 0;
    const filesToProcess = Array.from(selectedFiles);

    // Procesar archivos seleccionados
    filesToProcess.forEach((file, index) => {
      // Validar tipo de archivo
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        Swal.fire({
          icon: 'error',
          title: 'Tipo de archivo no permitido',
          text: `El archivo "${file.name}" no es una imagen válida. Solo se permiten: JPG, PNG, WEBP.`,
          confirmButtonColor: '#d33'
        });
        processedCount++;
        this.checkProcessingComplete(processedCount, filesToProcess.length);
        return;
      }

      // Validar tamaño de archivo
      if (file.size > this.MAX_FILE_SIZE) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo muy grande',
          text: `El archivo "${file.name}" excede el tamaño máximo de 5MB.`,
          confirmButtonColor: '#d33'
        });
        processedCount++;
        this.checkProcessingComplete(processedCount, filesToProcess.length);
        return;
      }

      // Crear preview
      const reader = new FileReader();

      reader.onloadstart = () => {
        console.log(`📂 Leyendo archivo ${index + 1}/${filesToProcess.length}: ${file.name}`);
      };

      reader.onload = (e: any) => {
        const uploadFile: UploadFile = {
          file: file,
          task: null,
          progress: 0,
          url: null,
          preview: e.target.result
        };
        this.files.push(uploadFile);
        console.log(`✅ Archivo procesado (${processedCount + 1}/${filesToProcess.length}): ${file.name}`);

        processedCount++;
        this.checkProcessingComplete(processedCount, filesToProcess.length);
      };

      reader.onerror = () => {
        console.error(`❌ Error al leer archivo: ${file.name}`);
        Swal.fire({
          icon: 'error',
          title: 'Error al leer archivo',
          text: `No se pudo procesar el archivo "${file.name}". Por favor intenta de nuevo.`,
          confirmButtonColor: '#d33'
        });

        processedCount++;
        this.checkProcessingComplete(processedCount, filesToProcess.length);
      };

      reader.readAsDataURL(file);
    });

    // Limpiar input
    input.value = '';
  }

  /**
   * Verifica si se terminaron de procesar todos los archivos
   */
  private checkProcessingComplete(processedCount: number, totalCount: number): void {
    if (processedCount >= totalCount) {
      this.processingFiles = false;
      this.filesBeingProcessed = 0;
      console.log('✅ Todos los archivos han sido procesados');
    }
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
  }

  /**
   * Extrae el path de almacenamiento de una URL de Firebase Storage
   * URL formato: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Ffile.jpg?alt=media...
   */
  getPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathEncoded = urlObj.pathname.split('/o/')[1];
      if (pathEncoded) {
        const decodedPath = decodeURIComponent(pathEncoded.split('?')[0]);
        console.log('📂 Path extraído de URL:', decodedPath);
        return decodedPath;
      }
      console.warn('⚠️ No se pudo extraer el path de la URL:', url);
      return '';
    } catch (error) {
      console.error('❌ Error extrayendo path de URL:', error);
      return '';
    }
  }

  /**
   * Elimina una foto existente tanto del Firebase Storage como del array local
   * Y actualiza el pedido en la base de datos para evitar enlaces rotos
   */
  deleteExistingPhotoFromStorage(url: string, index: number): void {
    Swal.fire({
      title: '¿Eliminar foto permanentemente?',
      text: 'Esta acción eliminará la foto del servidor y actualizará el pedido',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar',
      showCloseButton: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        const path = this.getPathFromUrl(url);

        if (!path) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo obtener la ruta de la imagen para eliminarla',
            confirmButtonColor: '#d33'
          });
          return;
        }

        // Mostrar loading
        Swal.fire({
          title: 'Eliminando...',
          text: 'Por favor espera mientras eliminamos la foto',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          // Eliminar de Firebase Storage
          console.log('🗑️ Eliminando imagen de Storage:', path);
          this.imageService.eliminarImagen(path);

          // Eliminar del array local
          this.existingPhotos.splice(index, 1);

          // Actualizar el pedido en la base de datos para evitar enlaces rotos
          console.log('💾 Actualizando pedido en la base de datos...');
          await this.updatePedidoAfterDeletion(this.existingPhotos);

          Swal.fire({
            icon: 'success',
            title: 'Eliminada',
            text: 'La foto ha sido eliminada correctamente y el pedido actualizado',
            timer: 2000,
            showConfirmButton: false
          });

        } catch (error) {
          console.error('❌ Error al eliminar foto:', error);

          // Revertir cambio local si falló la actualización
          this.existingPhotos.splice(index, 0, url);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar la foto. Por favor intenta de nuevo.',
            confirmButtonColor: '#d33'
          });
        }
      } else if (result.isDismissed) {
        console.log('✖️ Eliminación cancelada por el usuario');
      }
    });
  }

  /**
   * @deprecated Usar deleteExistingPhotoFromStorage para eliminación real
   * Mantener por compatibilidad temporal
   */
  removeExistingPhoto(index: number): void {
    this.deleteExistingPhotoFromStorage(this.existingPhotos[index], index);
  }

  /**
   * Verifica si hubo cambios en las fotos existentes
   */
  hasChanges(): boolean {
    const original = this.pedido.fotoEvidenciaEmpacado || [];
    return this.existingPhotos.length !== original.length ||
           !this.existingPhotos.every((url, index) => url === original[index]);
  }

  async guardar(): Promise<void> {
    if (this.files.length === 0 && this.existingPhotos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin fotos',
        text: 'Debes tener al menos una foto guardada',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Si no hay archivos nuevos pero hubo cambios (eliminaciones)
    // NOTA: Este caso normalmente no se alcanza porque las eliminaciones
    // se guardan inmediatamente en deleteExistingPhotoFromStorage
    if (this.files.length === 0 && this.hasChanges()) {
      console.log('💾 Guardando solo cambios en fotos existentes (eliminaciones)');
      try {
        await this.updatePedidoAfterDeletion(this.existingPhotos);
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Los cambios se guardaron correctamente',
          confirmButtonColor: '#3085d6',
          timer: 2000
        });
        this.ref.close({ updated: true });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron guardar los cambios. Por favor intenta de nuevo.',
          confirmButtonColor: '#d33'
        });
      }
      return;
    }

    // Si no hay archivos nuevos y no hubo cambios, cerrar sin actualizar
    if (this.files.length === 0) {
      console.log('✖️ No hay cambios que guardar');
      this.ref.close();
      return;
    }

    // Confirmar subida
    const result = await Swal.fire({
      title: 'Confirmar subida',
      text: `¿Deseas subir ${this.files.length} foto(s) de evidencia de empacado?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, subir',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.uploading = true;

    try {
      // Subir todos los archivos
      const uploadPromises = this.files.map((uploadFile, index) =>
        this.uploadFile(uploadFile, index)
      );

      await Promise.all(uploadPromises);

      // Obtener todas las URLs
      const newUrls = this.files
        .filter(f => f.url !== null)
        .map(f => f.url as string);

      // Combinar con URLs existentes
      const allUrls = [...this.existingPhotos, ...newUrls];

      // Actualizar pedido
      await this.updatePedido(allUrls);

    } catch (error) {
      console.error('Error al subir archivos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al subir las fotos. Por favor intenta de nuevo.',
        confirmButtonColor: '#d33'
      });
      this.uploading = false;
    }
  }

  private async uploadFile(uploadFile: UploadFile, index: number): Promise<void> {
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${uploadFile.file.name}`;
    const filePath = `evidencias-empacado/${this.companyId}/${this.pedido.nroPedido}/${fileName}`;

    const task = this.storage.upload(filePath, uploadFile.file);
    uploadFile.task = task;

    // Monitorear progreso
    task.percentageChanges().subscribe({
      next: (percentage) => {
        if (percentage != null) {
          uploadFile.progress = percentage;
          this.updateOverallProgress();
        }
      },
      error: (error) => {
        console.error(`Error al subir ${uploadFile.file.name}:`, error);
      }
    });

    // Esperar a que termine la subida y obtener URL
    await task;
    uploadFile.url = await this.storage.ref(filePath).getDownloadURL().toPromise();
  }

  private updateOverallProgress(): void {
    const totalProgress = this.files.reduce((sum, file) => sum + file.progress, 0);
    this.overallProgress = this.files.length > 0 ? totalProgress / this.files.length : 0;
  }

  /**
   * Actualiza el pedido después de eliminar una foto existente
   * Retorna una Promise para manejar el flujo async correctamente
   */
  private updatePedidoAfterDeletion(urls: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const pedidoActualizado = {
        ...this.pedido,
        fotoEvidenciaEmpacado: urls
      };

      console.log('📝 Actualizando pedido con fotos restantes:', urls.length);

      this.ventasService.editOrder(pedidoActualizado).subscribe({
        next: (response) => {
          // El servidor puede responder con {success: true} o {msg: 'updated order'}
          const isSuccess = response && (response.success === true || response.msg === 'updated order');

          if (isSuccess) {
            console.log('✅ Pedido actualizado correctamente en la base de datos', response);
            // Actualizar el pedido local para reflejar los cambios
            this.pedido.fotoEvidenciaEmpacado = urls;
            resolve();
          } else {
            console.error('❌ Error en la respuesta del servidor:', response);
            reject(new Error('Error en la respuesta del servidor'));
          }
        },
        error: (error) => {
          console.error('❌ Error al actualizar pedido:', error);
          reject(error);
        }
      });
    });
  }

  private async updatePedido(urls: string[]): Promise<void> {
    const pedidoActualizado = {
      ...this.pedido,
      fotoEvidenciaEmpacado: urls
    };

    this.ventasService.editOrder(pedidoActualizado).subscribe({
      next: (response) => {
        // El servidor puede responder con {success: true} o {msg: 'updated order'}
        const isSuccess = response && (response.success === true || response.msg === 'updated order');

        if (isSuccess) {
          console.log('✅ Fotos de evidencia guardadas correctamente', response);
          Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Las fotos de evidencia se guardaron correctamente',
            confirmButtonColor: '#3085d6',
            timer: 2000
          });
          this.uploading = false;
          this.ref.close({ updated: true });
        } else {
          console.error('❌ Respuesta inesperada del servidor:', response);
          throw new Error('Error en la respuesta del servidor');
        }
      },
      error: (error) => {
        console.error('❌ Error al actualizar pedido:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el pedido. Por favor intenta de nuevo.',
          confirmButtonColor: '#d33'
        });
        this.uploading = false;
      }
    });
  }

  cancelar(): void {
    if (this.uploading) {
      Swal.fire({
        icon: 'warning',
        title: 'Subida en proceso',
        text: 'Espera a que termine la subida o cierra forzosamente',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    this.ref.close();
  }

  getTotalPhotos(): number {
    return this.existingPhotos.length + this.files.length;
  }

  canAddMore(): boolean {
    return this.getTotalPhotos() < this.MAX_FILES;
  }

  /**
   * Muestra el visor de imágenes (lightbox) con la imagen seleccionada
   */
  showImageViewer(imageUrl: string): void {
    if (!imageUrl) {
      console.warn('⚠️ No se proporcionó URL de imagen');
      return;
    }

    console.log('🖼️ Mostrando imagen en lightbox');
    this.selectedImageUrl = imageUrl;
    this.imageViewerVisible = true;
  }

  /**
   * Oculta el visor de imágenes (lightbox)
   */
  hideImageViewer(): void {
    this.imageViewerVisible = false;
    this.selectedImageUrl = '';
  }
}
