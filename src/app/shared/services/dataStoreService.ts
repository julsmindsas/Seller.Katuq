
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataStoreService {
  private store: { [key: string]: any } = {};

  // Guarda un valor con un nombre de clave
  set(key: string, value: any): void {
    this.store[key] = value;
  }

  // Recupera el valor por su clave
  get<T>(key: string): T | null {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }

  // Elimina un valor por su clave
  remove(key: string): void {
    delete this.store[key];
  }

  // Limpia todo
  clear(): void {
    this.store = {};
  }
}
