// servicios/imagen.service.ts

import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';

@Injectable({
    providedIn: 'root'
})
export class ImagenService {

    constructor(private angularFireStorage: AngularFireStorage) { }

    eliminarImagen(imagenPath: string) {
        // let path = imagenPath?.split('/')?.pop()?.split('?')[0];
        // path = path.replace(/%2f/g, '/');

        // if (!path) return;
        

        const storageRef = this.angularFireStorage.ref(imagenPath);

        storageRef.delete().subscribe({
            next(value) {
                console.log(`Imagen eliminada: ${imagenPath}`);
            },
            error(error) {
                console.log('Error al eliminar imagen', error);
            }
        });

    }
}
