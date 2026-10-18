import { Component, OnInit } from '@angular/core';
import { CampanaEmbudo, EmbudoPauta, EstadoPauta, FilaEmbudo, PautaService } from '../../services/pauta.service';

type Rango = '7d' | '30d' | '90d' | 'custom';

interface Etapa {
  etiqueta: string;
  valor: number;
  /** % que pasa desde la etapa anterior; null en la primera. */
  paso: string | null;
}

/** Texto humano de cada modo de las banderas del motor (D-485). */
const MODOS: Record<string, { texto: string; tono: 'apagado' | 'prueba' | 'encendido' }> = {
  apagado: { texto: 'Apagado', tono: 'apagado' },
  apagada: { texto: 'Apagado', tono: 'apagado' },
  sombra: { texto: 'En prueba sin enviar', tono: 'prueba' },
  hitos: { texto: 'Calculando etapas, sin enviar', tono: 'prueba' },
  prueba: { texto: 'Enviando a la pestaña de pruebas de Meta', tono: 'prueba' },
  envio: { texto: 'Encendido', tono: 'encendido' },
};

const MOTIVOS_GASTO: Record<string, string> = {
  sin_credencial: 'Falta conectar la cuenta publicitaria de Meta.',
  error_meta: 'Meta respondió con un error; intenta más tarde.',
};

/**
 * Embudo de la pauta hasta el pago (D-485): por campaña y anuncio, cuánto se
 * gastó en Meta y cuántos registros llegaron a producto, tienda, primer pedido
 * y pago. Solo para el equipo de Katuq; los números salen del servidor.
 */
@Component({
  selector: 'app-pauta-embudo',
  templateUrl: './pauta-embudo.component.html',
  styleUrls: ['./pauta-embudo.component.scss'],
})
export class PautaEmbudoComponent implements OnInit {
  readonly rangos: { id: Rango; label: string }[] = [
    { id: '7d', label: '7 días' },
    { id: '30d', label: '30 días' },
    { id: '90d', label: '90 días' },
    { id: 'custom', label: 'Otro rango' },
  ];

  rango: Rango = '30d';
  desde = '';
  hasta = '';

  embudo: EmbudoPauta | null = null;
  campanas: CampanaEmbudo[] = [];
  etapas: Etapa[] = [];
  cargando = false;
  error = '';
  prohibido = false;

  estado: EstadoPauta | null = null;
  errorEstado = false;

  constructor(private pauta: PautaService) {}

  ngOnInit(): void {
    this.setRango('30d');
    this.cargarEstado();
  }

  setRango(r: Rango): void {
    this.rango = r;
    if (r === 'custom') return; // la persona escoge las fechas y presiona Aplicar
    const dias = r === '7d' ? 7 : r === '30d' ? 30 : 90;
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - dias);
    this.hasta = this.dia(hoy);
    this.desde = this.dia(inicio);
    this.cargar();
  }

  cargar(): void {
    if (!this.desde || !this.hasta) return;
    this.cargando = true;
    this.error = '';
    this.prohibido = false;
    this.pauta.embudo(this.desde, this.hasta).subscribe({
      next: (r) => {
        this.embudo = r?.data || null;
        this.campanas = this.embudo?.campanas || [];
        this.etapas = this.armarEtapas(this.embudo?.total || null);
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.embudo = null;
        this.campanas = [];
        this.etapas = [];
        if (err?.status === 403) {
          this.prohibido = true;
          return;
        }
        this.error = 'No pudimos cargar el embudo. Intenta de nuevo en un momento.';
      },
    });
  }

  private cargarEstado(): void {
    this.errorEstado = false;
    this.pauta.estado().subscribe({
      next: (r) => (this.estado = r?.data || null),
      error: () => (this.errorEstado = true),
    });
  }

  private armarEtapas(total: FilaEmbudo | null): Etapa[] {
    if (!total) return [];
    const valores: [string, number][] = [
      ['Registros', total.registros],
      ['Con producto', total.producto],
      ['Con tienda', total.tienda],
      ['Primer pedido', total.primerPedido],
      ['Pagó', total.pago],
    ];
    return valores.map(([etiqueta, valor], i) => ({
      etiqueta,
      valor,
      paso: i === 0 ? null : this.porcentaje(valor, valores[i - 1][1]),
    }));
  }

  get sinRegistros(): boolean {
    return !!this.embudo && (this.embudo.total?.registros || 0) === 0;
  }

  get motivoGasto(): string {
    const m = this.embudo?.gasto?.motivo || '';
    return MOTIVOS_GASTO[m] || 'No sabemos cuánto se gastó en estas fechas.';
  }

  modo(valor: string | undefined | null): { texto: string; tono: string } {
    const clave = String(valor || 'apagado').toLowerCase();
    return MODOS[clave] || { texto: clave, tono: 'apagado' };
  }

  pesos(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return `$${Math.round(v).toLocaleString('es-CO')}`;
  }

  numero(v: number | null | undefined): string {
    return Math.round(Number(v) || 0).toLocaleString('es-CO');
  }

  porcentaje(valor: number, base: number): string {
    if (!base) return '—';
    const pct = (valor / base) * 100;
    return `${pct.toLocaleString('es-CO', { maximumFractionDigits: pct < 10 ? 1 : 0 })} %`;
  }

  private dia(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
}
