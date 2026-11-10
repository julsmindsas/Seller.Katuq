import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, skip, takeUntil } from 'rxjs/operators';

import { LoaderService } from '../../../../../../shared/services/loader.service';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';

interface SeccionConsola {
  ruta: string;
  icono: string;
  clave: string;
}

/**
 * Marco de la consola de WhatsApp (D-707): encabezado, pestañas de las cuatro secciones (cada una es
 * un módulo lazy) y la carga única de los números del comercio. El número escogido viaja en la
 * dirección (`?linea=`), así un enlace abre la consola en el mismo número.
 *
 * Cada sección muestra su propio «Cargando…», así que se suprime el overlay global de carga mientras
 * la consola está abierta (igual que el buzón).
 */
@Component({
  selector: 'app-consola-shell',
  templateUrl: './consola-shell.component.html',
  styleUrls: ['./consola-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolaShellComponent implements OnInit, OnDestroy {
  readonly secciones: SeccionConsola[] = [
    { ruta: 'numeros', icono: 'fa-whatsapp', clave: 'consolaWhatsapp.secciones.numeros' },
    { ruta: 'plantillas', icono: 'fa-file-text-o', clave: 'consolaWhatsapp.secciones.plantillas' },
    { ruta: 'envios', icono: 'fa-paper-plane', clave: 'consolaWhatsapp.secciones.envios' },
    { ruta: 'registro', icono: 'fa-list-alt', clave: 'consolaWhatsapp.secciones.registro' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly loader: LoaderService,
    private readonly contexto: ConsolaContextoService,
  ) {}

  ngOnInit(): void {
    this.loader.suppressGlobalLoader();
    this.contexto.cargar(this.route.snapshot.queryParamMap.get('linea'));
    // El número escogido queda en la dirección para poder compartirla o recargar.
    this.contexto.estado$
      .pipe(
        map((e) => e.lineaId),
        distinctUntilChanged(),
        skip(1),
        takeUntil(this.destroy$),
      )
      .subscribe((lineaId) => {
        if (!lineaId) return;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { linea: lineaId },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loader.releaseGlobalLoader();
    this.contexto.limpiar();
  }

  trackSeccion(_: number, s: SeccionConsola): string {
    return s.ruta;
  }
}
