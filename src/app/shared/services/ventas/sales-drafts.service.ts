import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../base.service';
import { aplicarPrecioDeLista } from '../../utils/precio-por-tipo-cliente';

/**
 * Borradores de venta asistida (ticket 1169, D-466,
 * openspec/changes/borrador-venta-asistida). El servidor decide la empresa y el
 * dueño con la sesión; la lista no trae la venta, solo su resumen.
 */
export interface ResumenBorrador {
  clienteNombre: string;
  documento: string;
  lineas: number;
  totalEstimado: number;
}

export interface EstadoBorrador {
  items: any[];
  bodega: any | null;
  ciudad: string;
  cliente: any | null;
  envio: any | null;
  facturacion: any | null;
  notasPedido: any | null;
}

export interface BorradorVenta {
  id: string;
  nombre: string;
  resumen: ResumenBorrador;
  ownerEmail: string;
  ownerName: string;
  createdAt: string | null;
  updatedAt: string | null;
  venceEnDias: number;
  estado?: EstadoBorrador;
}

export interface EntradaBorrador {
  nombre: string;
  estado: EstadoBorrador;
  resumen: ResumenBorrador;
}

/** Contexto que la venta asistida aplica al abrir (como el de "Convertir a pedido"). */
export const CLAVE_CONTEXTO_BORRADOR = 'borradorVentaCtx';

@Injectable({ providedIn: 'root' })
export class SalesDraftsService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  listar(): Observable<BorradorVenta[]> {
    return this.get<{ data: BorradorVenta[] }>('/v1/sales-drafts').pipe(map((r) => r?.data || []));
  }

  obtener(id: string): Observable<BorradorVenta> {
    return this.get<{ data: BorradorVenta }>(`/v1/sales-drafts/${encodeURIComponent(id)}`).pipe(map((r) => r.data));
  }

  crear(entrada: EntradaBorrador): Observable<BorradorVenta> {
    return this.post<{ data: BorradorVenta }>('/v1/sales-drafts', entrada).pipe(map((r) => r.data));
  }

  actualizar(id: string, entrada: EntradaBorrador): Observable<BorradorVenta> {
    return this.put<{ data: BorradorVenta }>(`/v1/sales-drafts/${encodeURIComponent(id)}`, entrada).pipe(map((r) => r.data));
  }

  eliminar(id: string): Observable<unknown> {
    return this.delete(`/v1/sales-drafts/${encodeURIComponent(id)}`);
  }
}

const tituloDe = (item: any) => item?.producto?.crearProducto?.titulo || 'Un producto';
const precioDe = (producto: any) => Number(producto?.precio?.precioUnitarioConIva) || 0;
const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

/**
 * Pone al día las líneas de un borrador con los productos vigentes (D3).
 * - El producto que ya no existe o está inactivo sale y se avisa.
 * - El vigente reemplaza al guardado, con el precio de la lista del cliente
 *   (lo mismo que hace el catálogo al agregarlo); configuración, cantidad,
 *   precio manual y descuento de la línea se conservan.
 * - Cambio de precio (sin precio manual) y existencias que no alcanzan en la
 *   bodega se avisan; la línea se queda y decide el vendedor.
 */
export function refrescarLineas(
  items: any[],
  vigentes: any[],
  opciones: { tipoClienteId?: string | null; idBodega?: string | null },
): { items: any[]; avisos: string[] } {
  const porId = new Map<string, any>((vigentes || []).map((p: any) => [p?.cd, p]));
  const avisos: string[] = [];
  const resultado: any[] = [];

  (items || []).forEach((item) => {
    const cd = item?.producto?.cd;
    const vigente = cd ? porId.get(cd) : null;
    if (!vigente || vigente?.exposicion?.activar === false) {
      avisos.push(`${tituloDe(item)} ya no está disponible y se quitó.`);
      return;
    }
    const producto = opciones.tipoClienteId ? aplicarPrecioDeLista(vigente, opciones.tipoClienteId) : vigente;
    const antes = precioDe(item.producto);
    const ahora = precioDe(producto);
    if (!item._precioManualOverride && antes && ahora && Math.round(antes) !== Math.round(ahora)) {
      avisos.push(`${tituloDe(item)} pasó de ${pesos(antes)} a ${pesos(ahora)}.`);
    }
    const inventariable = producto?.disponibilidad?.inventariable !== false;
    const cantidad = Number(item.cantidad) || 0;
    if (inventariable && opciones.idBodega && producto?.stockPorBodega) {
      const hay = Number(producto.stockPorBodega[opciones.idBodega]) || 0;
      if (hay < cantidad) {
        avisos.push(`${tituloDe(item)}: hay ${hay} en la bodega y el borrador tiene ${cantidad}.`);
      }
    }
    resultado.push({
      ...item,
      producto,
      configuracion: item.configuracion ? { ...item.configuracion, producto } : item.configuracion,
    });
  });

  return { items: resultado, avisos };
}
