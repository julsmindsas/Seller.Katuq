import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SphereVisualService, SphereVisualEvent } from '../services/sphere-visual.service';
import { SphereVisualConfig } from '../sphere-visual/sphere-visual.component';

@Component({
  selector: 'app-sphere-visual-container',
  templateUrl: './sphere-visual-container.component.html',
  styleUrls: ['./sphere-visual-container.component.scss']
})
export class SphereVisualContainerComponent implements OnInit, OnDestroy {
  currentConfig: SphereVisualConfig | null = null;
  currentEvent: SphereVisualEvent | null = null;
  isCelebrationMode = false;
  isAudioReactive = false;

  private subscriptions: Subscription[] = [];

  constructor(private sphereVisualService: SphereVisualService) {}

  ngOnInit(): void {
    // Suscribirse a eventos de esfera visual
    this.subscriptions.push(
      this.sphereVisualService.sphereEvent$.subscribe(event => {
        this.currentEvent = event;
        if (event) {
          this.handleSphereEvent(event);
        }
      })
    );

    // Suscribirse a configuración actual
    this.subscriptions.push(
      this.sphereVisualService.currentSphereConfig$.subscribe(config => {
        this.currentConfig = config;
        if (config) {
          this.isCelebrationMode = config.celebrationMode || false;
          this.isAudioReactive = config.audioReactive || false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private handleSphereEvent(event: SphereVisualEvent): void {
    console.log('🎯 Evento de esfera visual recibido:', event);

    switch (event.type) {
      case 'create':
        console.log('✨ Creando nueva esfera visual:', event.config);
        break;
      
      case 'update':
        console.log('🔄 Actualizando esfera visual:', event.config);
        break;
      
      case 'celebrate':
        console.log('🎉 Activando modo celebración:', event.data);
        this.isCelebrationMode = true;
        break;
      
      case 'notification':
        console.log('🔔 Mostrando notificación esférica:', event.data);
        break;
    }
  }

  // Métodos para controlar la visualización esférica
  createSphereVisual(stepName: string): void {
    this.sphereVisualService.createSphereVisual(stepName);
  }

  activateCelebration(type: 'success' | 'milestone' | 'completion' = 'success'): void {
    this.sphereVisualService.activateCelebration(type);
  }

  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.sphereVisualService.showSphereNotification(message, type);
  }

  toggleAudioReactivity(enabled: boolean): void {
    this.sphereVisualService.toggleAudioReactivity(enabled);
  }

  toggleCelebrationMode(enabled: boolean): void {
    this.sphereVisualService.toggleCelebrationMode(enabled);
  }

  clearVisual(): void {
    this.sphereVisualService.clearCurrentConfig();
  }
} 