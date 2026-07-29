// servicios/imagen.service.ts

import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ArchivoSubido {
    success: boolean;
    url: string;
    path: string;
    name: string;
}

/**
 * Subida y borrado de imágenes a través del backend (`/v1/media/*`).
 *
 * Antes se subía directo a Firebase Storage desde el navegador, pero la app no
 * abre sesión de Firebase Auth (el login es JWT contra el backend), así que las
 * Storage Rules respondían `403 Permission denied`. El backend usa el Admin SDK
 * y además garantiza que todas las empresas escriban en el mismo bucket.
 */
@Injectable({
    providedIn: 'root'
})
export class ImagenService {

    private readonly urlApi = environment.urlApi;
    /** Carpeta donde viven las imágenes de productos de todas las empresas. */
    static readonly CARPETA_PRODUCTOS = 'Productos';

    constructor(private http: HttpClient) { }

    /**
     * Sube un archivo y devuelve su URL pública.
     * @param nombre nombre final dentro de la carpeta (ya viene único desde el componente)
     */
    subirImagen(file: File, nombre?: string, carpeta: string = ImagenService.CARPETA_PRODUCTOS): Promise<ArchivoSubido> {
        return firstValueFrom(this.http.post<ArchivoSubido>(`${this.urlApi}/v1/media/upload`, this.buildForm(file, nombre, carpeta)));
    }

    /**
     * Igual que `subirImagen` pero emitiendo el porcentaje de avance (0-100).
     * El último valor emitido es la respuesta del backend.
     */
    subirImagenConProgreso(
        file: File,
        nombre?: string,
        carpeta: string = ImagenService.CARPETA_PRODUCTOS
    ): Observable<HttpEvent<ArchivoSubido>> {
        return this.http.post<ArchivoSubido>(
            `${this.urlApi}/v1/media/upload`,
            this.buildForm(file, nombre, carpeta),
            { observe: 'events', reportProgress: true }
        );
    }

    /** Porcentaje de avance de un evento de subida, o null si el evento no lo trae. */
    static porcentaje(event: HttpEvent<unknown>): number | null {
        if (event.type === HttpEventType.UploadProgress && event.total) {
            return (event.loaded / event.total) * 100;
        }
        return null;
    }

    /**
     * Elimina una imagen del bucket. Acepta el path (`Productos/x.webp`) o la URL
     * completa que quedó guardada en productos antiguos.
     */
    eliminarImagen(imagenPath: string) {
        if (!imagenPath) return;

        this.http.post(`${this.urlApi}/v1/media/delete-file`, { path: imagenPath }).subscribe({
            next: () => {
                console.log(`Imagen eliminada: ${imagenPath}`);
            },
            error: (error) => {
                console.log('Error al eliminar imagen', error);
            }
        });
    }

    private buildForm(file: File, nombre?: string, carpeta?: string): FormData {
        const formData = new FormData();
        formData.append('file', file, nombre || file.name);
        if (nombre) formData.append('nombre', nombre);
        if (carpeta) formData.append('carpeta', carpeta);
        return formData;
    }
}
