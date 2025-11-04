import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FileUpload } from 'primeng/fileupload';

export type FileUploadState = 'empty' | 'selected' | 'uploading' | 'uploaded' | 'error';

export interface FileDetails {
  name: string;
  size: number;
  type: string;
  extension: string;
}

@Component({
  selector: 'app-mobile-file-upload',
  templateUrl: './mobile-file-upload.component.html',
  styleUrls: ['./mobile-file-upload.component.scss']
})
export class MobileFileUploadComponent {
  @ViewChild('fileUpload') fileUpload: FileUpload;

  @Input() acceptedFormats = '.xlsx,.xls,.json';
  @Input() maxFileSize = 5000000; // 5MB
  @Input() uploadProgress = 0;
  @Input() disabled = false;
  @Input() placeholder = 'Selecciona un archivo para importar';

  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileCleared = new EventEmitter<void>();

  selectedFile: File | null = null;
  fileDetails: FileDetails | null = null;
  state: FileUploadState = 'empty';

  /**
   * Handles file selection
   */
  onFileSelect(event: any): void {
    const file = event.files[0];
    if (!file) return;

    this.selectedFile = file;
    this.fileDetails = this.extractFileDetails(file);
    this.state = 'selected';

    this.fileSelected.emit(file);
  }

  /**
   * Extracts file details for display
   */
  private extractFileDetails(file: File): FileDetails {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: extension
    };
  }

  /**
   * Clears the selected file
   */
  clearFile(): void {
    this.selectedFile = null;
    this.fileDetails = null;
    this.state = 'empty';

    // Clear PrimeNG file upload component
    if (this.fileUpload) {
      this.fileUpload.clear();
    }

    this.fileCleared.emit();
  }

  /**
   * Changes the selected file
   */
  changeFile(): void {
    this.clearFile();
    // Trigger file input click
    if (this.fileUpload) {
      const fileInput = this.fileUpload.basicFileInput?.nativeElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  }

  /**
   * Gets file icon based on extension
   */
  getFileIcon(): string {
    if (!this.fileDetails) return 'pi-file';

    const iconMap: { [key: string]: string } = {
      'xlsx': 'pi-file-excel',
      'xls': 'pi-file-excel',
      'json': 'pi-file',
      'csv': 'pi-file-excel',
      'txt': 'pi-file'
    };

    return iconMap[this.fileDetails.extension] || 'pi-file';
  }

  /**
   * Formats file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Formats accepted formats for display
   */
  getFormattedFormats(): string {
    return this.acceptedFormats.replace(/\./g, '').toUpperCase();
  }

  /**
   * Gets the formatted file size hint
   */
  getFileHint(): string {
    return `${this.getFormattedFormats()} - Max ${this.formatFileSize(this.maxFileSize)}`;
  }

  /**
   * Gets state-specific classes
   */
  getStateClass(): string {
    return `state-${this.state}`;
  }

  /**
   * Sets uploading state
   */
  setUploading(): void {
    this.state = 'uploading';
  }

  /**
   * Sets uploaded state
   */
  setUploaded(): void {
    this.state = 'uploaded';
  }

  /**
   * Sets error state
   */
  setError(): void {
    this.state = 'error';
  }
}
