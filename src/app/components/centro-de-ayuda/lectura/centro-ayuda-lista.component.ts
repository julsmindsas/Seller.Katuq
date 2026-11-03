import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CentroAyudaService } from '../centro-ayuda.service';
import { ArticuloAyuda, MODULOS_AYUDA, ModuloAyuda } from '../centro-ayuda.models';
import { NOMBRE_MODULO, NOMBRE_TIPO, esOperadorKatuq, fechaCorta, mensajeError } from '../centro-ayuda-comun';

/**
 * Centro de ayuda del comercio (D-628, fase 1): buscador y lista de artículos publicados (los de Katuq y
 * los de su propia empresa), con un filtro por módulo. La búsqueda es léxica y la hace el servidor.
 */
@Component({
  selector: 'app-centro-ayuda-lista',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './centro-ayuda-lista.component.html',
  styleUrls: ['./centro-ayuda-lista.component.scss'],
})
export class CentroAyudaListaComponent implements OnInit, OnDestroy {
  readonly MODULOS = MODULOS_AYUDA;
  readonly NOMBRE_MODULO = NOMBRE_MODULO;
  readonly NOMBRE_TIPO = NOMBRE_TIPO;
  readonly puedeAdministrar = esOperadorKatuq();

  articulos: ArticuloAyuda[] = [];
  texto = '';
  modulo: ModuloAyuda | '' = '';
  cargando = false;
  error: string | null = null;
  /** Hay una búsqueda activa (3 letras o más). */
  buscando = false;

  private readonly escribe$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly ayuda: CentroAyudaService, private readonly translate: TranslateService) {}

  ngOnInit(): void {
    this.escribe$.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => this.cargar());
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  alEscribir(valor: string): void {
    this.texto = valor;
    this.escribe$.next(valor.trim());
  }

  elegirModulo(modulo: ModuloAyuda | ''): void {
    this.modulo = modulo;
    this.cargar();
  }

  limpiar(): void {
    this.texto = '';
    this.cargar();
  }

  cargar(): void {
    const q = this.texto.trim();
    this.buscando = q.length >= 3;
    this.cargando = true;
    this.error = null;
    this.ayuda.articulos({ q: this.buscando ? q : '', module: this.modulo }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.articulos = r.data || []; this.cargando = false; },
      error: (e) => {
        this.cargando = false;
        this.articulos = [];
        this.error = mensajeError(e, this.translate.instant('centroAyuda.errorCargar'));
      },
    });
  }

  fecha(iso: string | null): string { return fechaCorta(iso); }
  porId(_: number, a: ArticuloAyuda): string { return a.id; }
}
