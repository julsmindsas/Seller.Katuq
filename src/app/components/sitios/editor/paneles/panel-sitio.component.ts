import { Component, ComponentRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ViewContainerRef } from "@angular/core";
import { Subscription } from "rxjs";
import { BloqueSitio } from "../../../sitio-render/sitio-render.component";
import { ContenidoSitio } from "../../sitios.service";
import { PanelSitio, PanelSitioBase } from "./registro";

/**
 * Anfitrión de un panel del diseño nuevo (PLAN-V2 T03): crea el componente que dice el registro
 * (`paneles/registro.ts`), le pasa el bloque y el sitio, y reenvía su aviso de cambio al editor. Así el editor no
 * conoce cada panel: solo pone `<app-panel-sitio>` donde va.
 */
@Component({
  selector: "app-panel-sitio",
  template: "<ng-container #ancla></ng-container>",
})
export class PanelSitioComponent implements OnChanges, OnDestroy {
  @Input() panel: PanelSitio | null = null;
  @Input() bloque: BloqueSitio | null = null;
  @Input() contenido: ContenidoSitio | null = null;
  @Output() cambio = new EventEmitter<void>();

  @ViewChild("ancla", { read: ViewContainerRef, static: true }) ancla!: ViewContainerRef;

  private ref: ComponentRef<PanelSitioBase> | null = null;
  private suscripcion: Subscription | null = null;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["panel"]) this.montar();
    if (this.ref) {
      this.ref.setInput("bloque", this.bloque);
      this.ref.setInput("contenido", this.contenido);
    }
  }

  ngOnDestroy(): void {
    this.desmontar();
  }

  private montar(): void {
    this.desmontar();
    if (!this.panel || !this.panel.componente) return;
    this.ref = this.ancla.createComponent(this.panel.componente);
    this.suscripcion = this.ref.instance.cambio.subscribe(() => this.cambio.emit());
  }

  private desmontar(): void {
    if (this.suscripcion) this.suscripcion.unsubscribe();
    this.suscripcion = null;
    if (this.ref) this.ref.destroy();
    this.ref = null;
    if (this.ancla) this.ancla.clear();
  }
}
