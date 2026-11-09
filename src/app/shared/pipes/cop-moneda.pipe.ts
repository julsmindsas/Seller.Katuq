import { Pipe, PipeTransform } from '@angular/core';

/**
 * Ticket 1532: un solo formato de dinero para toda la app, en pesos colombianos
 * ($1.528.602, punto de miles y sin decimales), sin depender del LOCALE_ID de
 * Angular (que es en-US y pintaba $764,825).
 *
 * - `valor | copMoneda`            → $1.528.602
 * - `valor | copMoneda:'compacto'` → $24,7 M (para KPIs grandes)
 * Sin valor numérico devuelve «—».
 */
const COMPLETO = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const COMPACTO = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

@Pipe({ name: 'copMoneda', standalone: true })
export class CopMonedaPipe implements PipeTransform {
  transform(valor: number | string | null | undefined, modo?: 'compacto' | string): string {
    if (valor === null || valor === undefined || valor === '') {
      return '—';
    }
    const n = Number(valor);
    if (!Number.isFinite(n)) {
      return '—';
    }
    if (modo === 'compacto' && Math.abs(n) >= 1_000_000) {
      const signo = n < 0 ? '-' : '';
      return `${signo}$${COMPACTO.format(Math.abs(n))}`;
    }
    // El espacio que Intl pone tras el símbolo ("$ 0") se quita: "$0".
    return COMPLETO.format(n).replace(/\s/g, '');
  }
}
