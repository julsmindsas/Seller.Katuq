import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import * as XLSX from 'xlsx';
import { ToastrService } from 'ngx-toastr';
import { KatuqIntelligenceService } from '../../../shared/katuqintelligence/katuq-intelligence.service';

@Component({
  selector: 'app-carga-ventas',
  templateUrl: './carga-ventas.component.html',
  styleUrls: ['./carga-ventas.component.scss']
})
export class CargaVentasComponent implements OnInit {
  selectedFileType: 'json' | 'excel' = 'json';
  selectedFile: File | null = null;
  fileData: any[] = [];
  dataHeaders: string[] = [];
  processingResult: string = '';
  processingSuccess: boolean = false;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private katuqService: KatuqIntelligenceService
  ) { }

  ngOnInit(): void {
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
      this.fileData = [];
      this.dataHeaders = [];
      this.processingResult = '';
      this.processingSuccess = false;

      // Vista previa automática
      this.readFile();
    }
  }

  readFile(): void {
    if (!this.selectedFile) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (this.selectedFileType === 'json') {
          this.processJsonFile(e.target?.result as string);
        } else {
          // Verificar que el resultado es un ArrayBuffer antes de procesarlo
          if (e.target?.result instanceof ArrayBuffer) {
            this.processExcelFile(e.target.result);
          } else {
            this.toastr.error('Error al leer el archivo Excel', 'Error');
          }
        }
      } catch (error) {
        this.toastr.error(`Error al leer el archivo: ${error}`, 'Error');
      }
    };

    if (this.selectedFileType === 'json') {
      reader.readAsText(this.selectedFile);
    } else {
      reader.readAsArrayBuffer(this.selectedFile);
    }
  }

  processJsonFile(content: string): void {
    try {
      this.fileData = JSON.parse(content);
      if (this.fileData.length > 0) {
        this.dataHeaders = Object.keys(this.fileData[0]);
      }
      this.toastr.success('Archivo JSON cargado correctamente', 'Éxito');
    } catch (error) {
      this.toastr.error('El archivo JSON no tiene el formato correcto', 'Error');
    }
  }


  processExcelFile(content: ArrayBuffer): void {
    try {
      const workbook = XLSX.read(new Uint8Array(content), {
        type: 'array',
        cellDates: true,      // Convierte celdas con formato de fecha a objetos Date
        raw: false,           // Aplica el formateo de las celdas
        dateNF: 'dd/mm/yyyy'  // Formato de fecha deseado
      });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      this.fileData = XLSX.utils.sheet_to_json(worksheet);

      if (this.fileData.length > 0) {
        this.dataHeaders = Object.keys(this.fileData[0]);
      }

      this.toastr.success('Archivo Excel cargado correctamente', 'Éxito');
    } catch (error) {
      this.toastr.error('El archivo Excel no tiene el formato correcto', 'Error');
    }
  }


  processFile(): void {
    if (!this.fileData.length) {
      this.toastr.warning('No hay datos para procesar', 'Advertencia');
      return;
    }

    this.katuqService.processFile(this.fileData, this.selectedFileType).subscribe({
      next: (response: any) => {
        this.processingSuccess = true;
        this.processingResult = `Se procesaron ${response.orders.length} registros correctamente.`;
        this.toastr.success('Datos procesados correctamente', 'Éxito');
      },
      error: (error) => {
        this.processingSuccess = false;
        this.processingResult = `Error al procesar los datos: ${error.message}`;
        this.toastr.error('Error al procesar los datos', 'Error');
      }
    });
  }

  processWithKAI(): void {
    if (!this.fileData.length) {
      this.toastr.warning('No hay datos para procesar con KAI', 'Advertencia');
      return;
    }

    this.katuqService.processWithKAI(this.fileData, this.selectedFileType).subscribe({
      next: (response: any) => {
        this.processingSuccess = true;
        this.processingResult = `KAI ha procesado ${response.processed} registros correctamente.`;
        this.toastr.success('Datos procesados por KAI correctamente', 'Éxito');
      },
      error: (error) => {
        this.processingSuccess = false;
        this.processingResult = `Error al procesar los datos con KAI: ${error.message}`;
        this.toastr.error('Error al procesar con KAI', 'Error');
      }
    });
  }
}
