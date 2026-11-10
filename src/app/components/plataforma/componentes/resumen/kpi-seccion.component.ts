import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Cifra, Definicion, MetaPlataforma, Overview } from '../../plataforma.tipos';
import { TEXTOS } from '../../plataforma.textos';
import { fechaCo, mesLegible, pintarCifra, CifraPintada } from '../../logica/formato';

interface LineaDesglose {
  rotulo: string;
  pintada: CifraPintada;
}

interface ItemCifra {
  clave: string;
  desglose: LineaDesglose[];
  notaDesglose: string | null;
  rotulo: string;
  pintada: CifraPintada;
  nota: string | null;
  definicionId: string | null;
}

/**
 * D-700 13.4b — Una sección del resumen: a lo sumo 6 cifras, universo, fecha de cálculo, versión, estado de carga
 * propio e ícono (i) con la definición. El front no suma ni recalcula: pinta lo que trae el servidor.
 */
@Component({
  selector: 'app-kpi-seccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kpi-seccion.component.html',
})
export class KpiSeccionComponent implements OnChanges {
  @Input() clave = '';
  @Input() overview: Overview | null = null;
  @Input() meta: MetaPlataforma | null = null;
  @Input() definiciones: Definicion[] | null = null;
  @Input() cargando = false;
  @Input() error: string | null = null;
  @Output() reintentar = new EventEmitter<void>();

  readonly textos = TEXTOS;
  items: ItemCifra[] = [];
  rotuloTipo: string | null = null;
  abierta: string | null = null;
  titulo = '';

  ngOnChanges(): void {
    this.titulo = TEXTOS.secciones[this.clave as keyof typeof TEXTOS.secciones] || this.clave;
    const datos = this.overview ? ((this.overview.secciones as unknown as Record<string, Record<string, unknown>>)[this.clave] || null) : null;
    const orden = TEXTOS.ordenSecciones[this.clave] || [];
    this.items = datos
      ? orden.filter((k) => k in datos).slice(0, 6).map((k) => {
          const c = datos[k] as Cifra & { motivo?: string; cohorte?: number; convertidos?: number; mes?: string };
          let nota: string | null = null;
          if (c && c.estado === 'no_disponible' && c.motivo) nota = String(c.motivo);
          if (k === 'conversionMesAnterior' && c && typeof c.cohorte === 'number') nota = `Cohorte de ${mesLegible(c.mes)}: ${c.convertidos ?? '—'} de ${c.cohorte} pagaron${c.estado === 'en_curso' ? ' hasta hoy (cohorte en curso)' : ''}`;
          const d = this.desgloseDe(k, datos);
          return { clave: k, desglose: d.lineas, notaDesglose: d.nota, rotulo: TEXTOS.cifras[k] || k, pintada: pintarCifra(c), nota, definicionId: TEXTOS.definiciones[k] || null };
        })
      : [];
    // La adopción por «uso» la manda el navegador de cada comercio: se rotula indicativa. La «configurada» se dice como tal.
    if (this.clave === 'adopcion' && datos) {
      this.rotuloTipo = datos['tipo'] === 'configurado' || !datos['tipo'] ? TEXTOS.configurado : TEXTOS.indicativa;
    } else {
      this.rotuloTipo = null;
    }
    this.abierta = null;
  }

  /**
   * D-700 28: De pago / Gratis dentro de Comercios, Pedidos y GMV. El servidor manda cada cifra (suman el total); aquí solo se pintan.
   */
  private desgloseDe(clave: string, datos: Record<string, unknown>): { lineas: LineaDesglose[]; nota: string | null } {
    const vacio = { lineas: [] as LineaDesglose[], nota: null };
    const T = TEXTOS.desglosePlan;
    const porPlan = datos['porPlan'] as Record<string, unknown> | undefined;
    if (!porPlan) return vacio;
    const linea = (rotulo: string, c: unknown): LineaDesglose => ({ rotulo, pintada: pintarCifra(c as Cifra) });
    if (clave === 'comercios') {
      const det = (porPlan['detalle'] || {}) as Record<string, number>;
      const des = typeof det['planDesconocido'] === 'number' ? det['planDesconocido'] : 0;
      return {
        lineas: [linea(T.dePago, porPlan['dePago']), linea(T.gratisUsan, porPlan['gratisUsan']), linea(T.gratisSinUso, porPlan['gratisSinUso'])],
        nota: [T.ayuda, des > 0 ? T.nota(des) : ''].filter(Boolean).join(' '),
      };
    }
    if (clave === 'pedidosMes' || clave === 'gmvMes') {
      const pago = (porPlan['pago'] || {}) as Record<string, unknown>;
      const gratis = (porPlan['gratis'] || {}) as Record<string, unknown>;
      return { lineas: [linea(T.pago, pago[clave]), linea(T.gratis, gratis[clave])], nota: null };
    }
    return vacio;
  }

  alternar(clave: string): void {
    this.abierta = this.abierta === clave ? null : clave;
  }

  definicionDe(id: string | null): Definicion | null {
    return id && this.definiciones ? this.definiciones.find((d) => d.id === id) || null : null;
  }

  get mesTexto(): string {
    return mesLegible(this.overview && this.overview.mes);
  }

  get fechaCalculo(): string {
    return this.meta && this.meta.corte ? fechaCo(this.meta.corte) : '—';
  }

  get universo(): string {
    return this.meta && this.meta.universo === 'comercios_reales' ? 'Comercios reales' : this.meta && this.meta.universo ? String(this.meta.universo) : '—';
  }

  get abiertaDef(): Definicion | null {
    const it = this.items.find((x) => x.clave === this.abierta);
    return it ? this.definicionDe(it.definicionId) : null;
  }
}
