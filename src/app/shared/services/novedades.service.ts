import { Injectable } from '@angular/core';

/**
 * Una novedad ("¿Qué hay de nuevo?"). Config estática — NO usa colecciones nuevas.
 * Para agregar una novedad: añade un item a `novedades` (más reciente arriba).
 */
export interface Novedad {
  id: string;                    // único y estable (define el "ya visto")
  tipo: 'video' | 'imagen' | 'texto';
  titulo: string;
  descripcion?: string;
  url?: string;                  // video/imagen (video: Firebase Storage recomendado)
  poster?: string;              // opcional, imagen de portada del video
  fecha: string;                 // 'YYYY-MM-DD'
  cta?: { label: string; link: string };
}

@Injectable({ providedIn: 'root' })
export class NovedadesService {
  /** Se marca "vista" por usuario/navegador (sin backend, sin colecciones nuevas). */
  private readonly STORAGE_KEY = 'katuq_novedades_seen';

  /**
   * Catálogo de novedades. Estático a propósito (regla: no colecciones nuevas).
   * El video se sirve desde S3 (bucket ultimamilla-uploads-prod, prefijo público
   * katuq/novedades/*). Es una recreación con datos DEMO (sin PII real).
   */
  private readonly novedades: Novedad[] = [
    {
      id: '2026-07-venta-asistida-rediseno',
      tipo: 'video',
      titulo: '¡Venta asistida estrena diseño! 🎉',
      descripcion:
        'Armas todo el pedido en una sola pantalla: cliente, catálogo, carrito, envío y pago quedan a la vista mientras avanzas. El resumen te acompaña todo el proceso, así ves el total sin perder el contexto.',
      url: 'https://ultimamilla-uploads-prod.s3.amazonaws.com/katuq/novedades/venta-asistida-novedad.mp4',
      fecha: '2026-07-27',
    },
  ];

  getSeen(): string[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  private setSeen(ids: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* almacenamiento no disponible: no bloquea la app */
    }
  }

  /** La novedad más reciente NO vista (o null si no hay pendientes). */
  getPendiente(): Novedad | null {
    const seen = this.getSeen();
    const pendientes = this.novedades
      .filter((n) => !seen.includes(n.id))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return pendientes[0] || null;
  }

  /** Marca una novedad como vista (no vuelve a mostrarse). */
  marcarVista(id: string): void {
    const seen = this.getSeen();
    if (!seen.includes(id)) {
      seen.push(id);
      this.setSeen(seen);
    }
  }

  /** Todas las novedades (para un futuro historial/panel "Novedades"). */
  getTodas(): Novedad[] {
    return [...this.novedades].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }

  /** Reabrir manualmente una novedad concreta (p. ej. desde un botón "Novedades"). */
  getPorId(id: string): Novedad | null {
    return this.novedades.find((n) => n.id === id) || null;
  }
}
