import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { ExplicacionIA, InventoryInsights } from './insights.modelos';

/**
 * Central de Abastecimiento: la IA de inventarios (openspec/changes/inventario-ia-util, D-400).
 *
 * Al abrir trae lo calculado (sin IA ni cupo). "Explicar con Opttia" pide las frases;
 * si Opttia no responde, la pantalla sigue con las cifras y lo dice. Toda cifra viene
 * del servidor, con la misma medida de demanda que "Qué comprar".
 */
@Component({
  selector: 'app-central-abastecimiento',
  templateUrl: './central-abastecimiento.component.html',
  styleUrls: ['./central-abastecimiento.component.scss']
})
export class CentralAbastecimientoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly opcionesDias = [30, 60, 90];
  dias = 30;

  cargando = false;
  error: string | null = null;
  insights: InventoryInsights | null = null;

  explicando = false;
  ia: ExplicacionIA | null = null;
  avisoIA: string | null = null;

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarDias(dias: number): void {
    if (dias === this.dias || this.cargando) return;
    this.dias = dias;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.ia = null;
    this.avisoIA = null;
    this.inventarioService.getInventoryInsights(this.dias)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.insights = res.insights;
          this.cargando = false;
        },
        error: (err) => {
          this.error = err?.error?.error || 'No pudimos calcular el inventario en este momento. Intente de nuevo en unos minutos.';
          this.cargando = false;
        }
      });
  }

  explicar(): void {
    if (this.explicando || !this.insights) return;
    this.explicando = true;
    this.avisoIA = null;
    this.inventarioService.explicarInventoryInsights(this.dias)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // La explicación trae su propio cálculo: se muestra junto con él para que
          // frase y cifras sean del mismo momento.
          this.insights = res.insights;
          this.ia = res.ia || null;
          this.avisoIA = res.aviso || null;
          this.explicando = false;
        },
        error: (err) => {
          this.avisoIA = err?.status === 429 || err?.status === 403
            ? (err?.error?.message || 'Se acabaron los mensajes de Opttia de su plan por hoy. Las cifras de abajo siguen siendo correctas.')
            : 'Opttia no está disponible ahora; las cifras de abajo son las calculadas.';
          this.explicando = false;
        }
      });
  }

  get hayAlgo(): boolean {
    const i = this.insights;
    return !!i && (i.comprar.total > 0 || i.capital.total > 0 || i.avisos.total > 0);
  }

  dinero(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
  }
}
