import { Directive, ElementRef, OnDestroy, OnInit } from "@angular/core";

/**
 * Cuelga el elemento del `<body>` en vez de dejarlo donde Angular lo declaró.
 *
 * Existe por un problema concreto del layout, no por gusto: `.page-body` —el
 * contenedor donde el router mete cada pantalla— tiene `position: relative` con
 * `z-index: 1`, así que abre un contexto de apilamiento. Todo lo que se dibuje
 * adentro queda encerrado en ese nivel 1, por debajo del sidebar (z-index 9) y
 * de la barra superior (1025). Un velo de modal declarado dentro de una
 * pantalla solo alcanza a oscurecer el área de contenido: el menú y el header
 * se quedan a plena luz encima, y no hay z-index que lo arregle desde adentro.
 *
 * Al mover el nodo al body el modal comparte contexto con el resto del chrome y
 * el velo sí tapa la pantalla completa. Angular sigue mandando sobre la vista:
 * lo único que cambia es dónde vive el nodo, no quién lo dibuja ni cuándo.
 */
@Directive({ selector: "[appAlBody]" })
export class AlBodyDirective implements OnInit, OnDestroy {
  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    // Angular ya no sabe dónde quedó el nodo, así que lo retira este mismo
    // directivo. Sin esto el velo sobreviviría al *ngIf que lo creó.
    const el = this.host.nativeElement;
    if (el.parentNode) el.parentNode.removeChild(el);
  }
}
