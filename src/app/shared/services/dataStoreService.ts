import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataStoreService {
  private readonly DB_NAME = 'appDatabase';
  private readonly STORE_NAME = 'keyValueStore';

  /**
   * Una sola conexión compartida. Antes cada operación abría la base por su
   * cuenta, lo que provocaba carreras entre la creación del almacén y su uso.
   */
  private conexion: Promise<IDBDatabase> | null = null;

  /**
   * Abre la base. Sin `version` usa la que exista; con `version` mayor dispara
   * `onupgradeneeded`, que es el ÚNICO momento en que IndexedDB permite crear
   * un almacén.
   */
  private abrir(version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request =
        version === undefined
          ? indexedDB.open(this.DB_NAME)
          : indexedDB.open(this.DB_NAME, version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error('IndexedDB bloqueada por otra pestaña abierta de la aplicación'));
    });
  }

  /**
   * Devuelve una conexión que GARANTIZA que el almacén existe.
   *
   * El bug que esto corrige: la versión anterior creaba el almacén en el
   * constructor sin esperar, y luego reabría la base con la misma versión fija.
   * Si la base ya existía sin el almacén (por una carrera o por una versión
   * previa de la app), `onupgradeneeded` no se disparaba nunca y toda operación
   * moría con "One of the specified object stores was not found" — lo que a su
   * vez dejaba sin navegar a quien hiciera `set(...).then(() => router...)`,
   * porque la promesa se rechazaba en silencio.
   *
   * Ahora, si al abrir falta el almacén, se cierra y se reabre subiendo la
   * versión, que es lo que obliga a IndexedDB a crearlo.
   */
  private getDatabase(): Promise<IDBDatabase> {
    if (this.conexion) return this.conexion;

    this.conexion = (async () => {
      let db = await this.abrir();

      if (!db.objectStoreNames.contains(this.STORE_NAME)) {
        const siguiente = db.version + 1;
        db.close();
        db = await this.abrir(siguiente);
      }

      // Si otra pestaña sube la versión, esta conexión queda inservible:
      // se descarta para que la próxima operación abra una nueva.
      db.onversionchange = () => {
        db.close();
        this.conexion = null;
      };

      return db;
    })().catch((err) => {
      // No dejar cacheada una conexión fallida: el siguiente intento reintenta.
      this.conexion = null;
      throw err;
    });

    return this.conexion;
  }

  async set(key: string, value: any): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const db = await this.getDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}