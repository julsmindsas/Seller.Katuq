import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, forkJoin, of } from 'rxjs';
import { last, map, switchMap } from 'rxjs/operators';

import { MaestroService } from '../maestros/maestro.service';
import {
  CanalPago,
  FormaPagoRaw,
  MetodoPagoUnificado,
  fusionarMetodosPorCanal,
  validarImagenMetodoPago,
} from '../../util/metodo-pago.util';

/**
 * Orquesta la pantalla única de métodos de pago (Spec 012 — enfoque B).
 *
 * No hay colección nueva: lee las dos colecciones existentes vía `MaestroService`
 * (`/v1/pagos/all` e-commerce, `/v1/pagos/pos/all` POS), las fusiona por nombre, y
 * escribe en la colección del canal usando los endpoints actuales
 * (`create`/`edit` por canal). "Eliminar" = inhabilitar (`activo=false`).
 */
@Injectable({ providedIn: 'root' })
export class MetodosPagoService {
  constructor(
    private maestro: MaestroService,
    private storage: AngularFireStorage,
  ) {}

  /** Valida un archivo de imagen para el logo del método (delega en la lógica pura del util). */
  validarImagen(file: { name?: string; type?: string; size?: number } | null): string | null {
    return validarImagenMetodoPago(file);
  }

  /**
   * Sube una imagen a Firebase Storage en `metodosPago/{company}/{ts}_{nombre}` y
   * resuelve la URL de descarga. La empresa sale de `localStorage['user']` (multi-tenant).
   */
  subirImagen(file: File): Observable<string> {
    let company = 'sin-company';
    try {
      company = JSON.parse(localStorage.getItem('user') || '{}').company || company;
    } catch { /* usa el default */ }
    const safe = (file.name || 'imagen').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `metodosPago/${company}/${Date.now()}_${safe}`;
    const ref = this.storage.ref(path);
    const task = this.storage.upload(path, file);
    return task.snapshotChanges().pipe(
      last(), // espera a que termine la subida
      switchMap(() => ref.getDownloadURL() as Observable<string>),
    );
  }

  /** Lee ambos canales en paralelo y devuelve la lista fusionada (una fila por método). */
  getMetodosUnificados(): Observable<MetodoPagoUnificado[]> {
    return forkJoin({
      ecom: this.maestro.consultarFormaPago() as Observable<any>,
      pos: this.maestro.consultarFormaPagoPOS() as Observable<any>,
    }).pipe(
      map(({ ecom, pos }) =>
        fusionarMetodosPorCanal(ecom as FormaPagoRaw[], pos as FormaPagoRaw[]),
      ),
    );
  }

  /**
   * Activa/desactiva la disponibilidad de un método en un canal.
   * - disponible=true y el método NO existe en el canal → crea el doc con la config global.
   * - disponible=true y ya existe            → edita `activo=true`.
   * - disponible=false y existe              → edita `activo=false` (inhabilitar).
   * - disponible=false y no existe           → no-op.
   */
  setDisponibilidad(
    metodo: MetodoPagoUnificado,
    canal: CanalPago,
    disponible: boolean,
  ): Observable<any> {
    const estado = metodo[canal];
    if (estado.existe && estado.cd) {
      const payload = { ...(estado.raw || {}), cd: estado.cd, activo: disponible };
      return this.editEnCanal(canal, payload);
    }
    if (disponible) {
      return this.crearEnCanal(canal, this.buildCanalPayload(metodo, canal, true));
    }
    return of({ msg: 'noop' });
  }

  /** Inhabilita (borrado lógico) un método en un canal. */
  inhabilitar(metodo: MetodoPagoUnificado, canal: CanalPago): Observable<any> {
    return this.setDisponibilidad(metodo, canal, false);
  }

  /**
   * Inhabilita el método en TODOS los canales donde esté disponible ("eliminar" =
   * inhabilitar, Spec 012 D-055). No borra físicamente; conserva historial.
   */
  inhabilitarMetodo(metodo: MetodoPagoUnificado): Observable<any> {
    const ops: Observable<any>[] = [];
    (['ecommerce', 'pos'] as CanalPago[]).forEach((canal) => {
      if (metodo[canal].existe && metodo[canal].disponible) {
        ops.push(this.setDisponibilidad(metodo, canal, false));
      }
    });
    return ops.length ? forkJoin(ops) : of([]);
  }

  /**
   * Borra FÍSICAMENTE el método en los canales donde exista (docs `cd`). Solo debe
   * llamarse cuando el método está inhabilitado; el backend rechaza con 409
   * `{error:'metodo_activo'}` si algún doc sigue activo (borrado en 2 pasos, SC-012-01).
   */
  eliminarDefinitivo(metodo: MetodoPagoUnificado): Observable<any> {
    const ops: Observable<any>[] = [];
    if (metodo.ecommerce.existe && metodo.ecommerce.cd) {
      ops.push(this.maestro.deleteFormaPago({ cd: metodo.ecommerce.cd }));
    }
    if (metodo.pos.existe && metodo.pos.cd) {
      ops.push(this.maestro.deleteFormaPagoPOS({ cd: metodo.pos.cd }));
    }
    return ops.length ? forkJoin(ops) : of([]);
  }

  /** Rehabilita el método en todos los canales donde exista (pone `activo=true`). */
  rehabilitarMetodo(metodo: MetodoPagoUnificado): Observable<any> {
    const ops: Observable<any>[] = [];
    (['ecommerce', 'pos'] as CanalPago[]).forEach((canal) => {
      if (metodo[canal].existe && !metodo[canal].disponible) {
        ops.push(this.setDisponibilidad(metodo, canal, true));
      }
    });
    return ops.length ? forkJoin(ops) : of([]);
  }

  /** Cambia la posición (orden) de un método en un canal donde ya existe. */
  setPosicion(metodo: MetodoPagoUnificado, canal: CanalPago, posicion: number): Observable<any> {
    const estado = metodo[canal];
    if (!estado.existe || !estado.cd) return of({ msg: 'noop' });
    return this.editEnCanal(canal, { ...(estado.raw || {}), cd: estado.cd, posicion });
  }

  /**
   * Guarda la configuración GLOBAL del método (nombre, clasificación, integración,
   * descripciones) propagándola a los canales donde el método ya existe. La
   * disponibilidad y la posición por canal NO se tocan aquí.
   */
  guardarConfigGlobal(
    metodo: MetodoPagoUnificado,
    cambios: Partial<Pick<
      MetodoPagoUnificado,
      'nombre' | 'online' | 'integracion' | 'descripcionCorreoElectronico' | 'recordatorioCobro' | 'logo'
    >>,
  ): Observable<any> {
    const ops: Observable<any>[] = [];
    (['ecommerce', 'pos'] as CanalPago[]).forEach((canal) => {
      const estado = metodo[canal];
      if (estado.existe && estado.cd) {
        const payload = {
          ...(estado.raw || {}),
          cd: estado.cd,
          nombre: cambios.nombre ?? metodo.nombre,
          online: cambios.online ?? metodo.online,
          integracion: cambios.integracion ?? metodo.integracion,
          descripcionCorreoElectronico:
            cambios.descripcionCorreoElectronico ?? metodo.descripcionCorreoElectronico,
          recordatorioCobro: cambios.recordatorioCobro ?? metodo.recordatorioCobro,
          // `logo` se propaga solo si viene en cambios (incluye '' para quitarla); si no, conserva el actual.
          logo: cambios.logo !== undefined ? cambios.logo : metodo.logo,
        };
        ops.push(this.editEnCanal(canal, payload));
      }
    });
    return ops.length ? forkJoin(ops) : of([]);
  }

  /**
   * Crea un método nuevo en los canales indicados (config global compartida,
   * posición por canal). Devuelve la creación de cada canal en paralelo.
   * El backend responde 409 `{error:'nombre_duplicado'}` si el nombre ya existe en ese canal.
   */
  crearMetodo(
    base: {
      nombre: string;
      online: string;
      integracion: string;
      descripcionCorreoElectronico?: string;
      recordatorioCobro?: string;
      logo?: string;
    },
    canales: { ecommerce?: { posicion?: number }; pos?: { posicion?: number } },
  ): Observable<any> {
    const ops: Observable<any>[] = [];
    if (canales.ecommerce) {
      ops.push(
        this.crearEnCanal('ecommerce', this.buildCreatePayload(base, canales.ecommerce.posicion)),
      );
    }
    if (canales.pos) {
      ops.push(this.crearEnCanal('pos', this.buildCreatePayload(base, canales.pos.posicion)));
    }
    return ops.length ? forkJoin(ops) : of([]);
  }

  // --- helpers privados ---------------------------------------------------

  private editEnCanal(canal: CanalPago, payload: any): Observable<any> {
    return canal === 'ecommerce'
      ? this.maestro.editFormaPago(payload)
      : this.maestro.editFormaPagoPOS(payload);
  }

  private crearEnCanal(canal: CanalPago, payload: any): Observable<any> {
    return canal === 'ecommerce'
      ? this.maestro.crearFormaPago(payload)
      : this.maestro.crearFormaPagoPOS(payload);
  }

  /** Construye el payload de creación de un canal a partir de una fila unificada. */
  private buildCanalPayload(metodo: MetodoPagoUnificado, canal: CanalPago, activo: boolean): any {
    return {
      id: (metodo[canal].raw && (metodo[canal].raw as FormaPagoRaw).id) || metodo.nombre,
      online: metodo.online,
      nombre: metodo.nombre,
      posicion: metodo[canal].posicion ?? '',
      integracion: metodo.integracion,
      activo,
      descripcionCorreoElectronico: metodo.descripcionCorreoElectronico,
      recordatorioCobro: metodo.recordatorioCobro,
      logo: metodo.logo || '',
    };
  }

  /** Construye el payload de creación de un método nuevo (config global + posición del canal). */
  private buildCreatePayload(
    base: {
      nombre: string;
      online: string;
      integracion: string;
      descripcionCorreoElectronico?: string;
      recordatorioCobro?: string;
      logo?: string;
    },
    posicion?: number,
  ): any {
    return {
      id: base.nombre,
      online: base.online,
      nombre: base.nombre,
      posicion: posicion ?? '',
      integracion: base.integracion,
      activo: true,
      descripcionCorreoElectronico: base.descripcionCorreoElectronico ?? '',
      recordatorioCobro: base.recordatorioCobro ?? '',
      logo: base.logo ?? '',
    };
  }
}
