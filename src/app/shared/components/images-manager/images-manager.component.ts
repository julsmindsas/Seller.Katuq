import { Component, Output, EventEmitter, Input } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/compat/storage';
import Swal from 'sweetalert2';

interface UploadFile {
  file: File;
  task: AngularFireUploadTask;
  progress: number;
  url: string | null;
}

@Component({
  selector: 'app-images-manager',
  templateUrl: './images-manager.component.html',
  styleUrls: ['./images-manager.component.scss']
})
export class ImagesManagerComponent {
  files: UploadFile[] = [];
  overallProgress: number = 0;

  @Output() filesUploaded = new EventEmitter<{ name: string; url: string }[]>();
  @Input() initialFiles: { name: string; url: string }[] = []; // Archivos iniciales
  @Output() fileDeleted = new EventEmitter<string>();

  constructor(private storage: AngularFireStorage) { }

  uploadFiles(event: Event): void {
    const target = event.target as HTMLInputElement;
    const selectedFiles = target.files;

    if (selectedFiles) {
      const nombresArchivos = Array.from(selectedFiles).map((file) => file.name).join(', ');
      Swal.fire({
        title: 'Confirmar subida de archivos',
        text: `¿Estás seguro de que deseas subir los siguientes archivos: ${nombresArchivos}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, subir archivos',
        cancelButtonText: 'No, cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
      }).then((result) => {
        if (result.isConfirmed) {
          Array.from(selectedFiles).forEach((file) => this.startUpload(file));
          this.monitorOverallProgress();
        }
      });
    }
  }

  private startUpload(file: File): void {
    const filePath = `files/${new Date().getTime()}_${file.name}`;
    const task = this.storage.upload(filePath, file);
    const uploadFile: UploadFile = { file, task, progress: 0, url: null };

    task.percentageChanges().subscribe({
      next: (percentage) => {
        if (percentage != null) {
          uploadFile.progress = percentage;
        }
      },
      error: (error) => {
        Swal.fire('Error', `Error al subir el archivo ${file.name}: ${error.message}`, 'error');
      },
    });

    task.then(async () => {
      uploadFile.url = await this.storage.ref(filePath).getDownloadURL().toPromise();
      Swal.fire('Éxito', `Archivo ${file.name} subido con éxito`, 'success');
      this.emitUrls();
    });

    this.files.push(uploadFile);
  }

  private emitUrls(): void {
    const uploadedFiles = this.files
      .filter(file => file.url !== null)
      .map(file => ({ name: file.file.name, url: file.url as string }));
    this.filesUploaded.emit(uploadedFiles);
  }

  private monitorOverallProgress(): void {
    const updateProgress = () => {
      const totalProgress = this.files.reduce((sum, file) => sum + file.progress, 0);
      this.overallProgress = totalProgress / this.files.length;
    };

    const interval = setInterval(() => {
      updateProgress();

      if (this.files.every(file => file.progress === 100)) {
        clearInterval(interval);
      }
    }, 500);
  }
}
