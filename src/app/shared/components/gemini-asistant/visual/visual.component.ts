import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, OnDestroy } from '@angular/core';
import { Analyser } from '../analyser';

interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  icon: string;
  message: string;
  details?: string;
}

@Component({
  selector: 'app-visual',
  templateUrl: './visual.component.html',
  styleUrls: ['./visual.component.scss']
})
export class VisualComponent implements OnInit, OnChanges, OnDestroy {
  @Input() inputNode!: AudioNode;
  @Input() outputNode!: AudioNode;

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logsContainer', { static: false }) private logsContainer!: ElementRef<HTMLDivElement>;

  private canvasCtx!: CanvasRenderingContext2D;
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private animationFrameId: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 0;

  // Estado del componente
  public isActive: boolean = false;
  public isPaused: boolean = false;
  public logs: LogEntry[] = [];
  public inputLevel: number = 0;
  public outputLevel: number = 0;
  public currentFPS: number = 0;

  // Configuración de logs
  private maxLogs: number = 100;
  private logColors = {
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    system: '#8b5cf6'
  };

  constructor() { }

  ngOnInit(): void {
    this.canvasCtx = this.canvasRef.nativeElement.getContext('2d')!;
    this.startVisualization();
    this.startFPSMonitoring();
    this.addSystemLog('🚀 Componente visual inicializado', 'system');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputNode'] && changes['inputNode'].currentValue) {
      this.inputAnalyser = new Analyser(this.inputNode);
      this.addSystemLog('🎤 Nodo de entrada conectado', 'success');
    }
    if (changes['outputNode'] && changes['outputNode'].currentValue) {
      this.outputAnalyser = new Analyser(this.outputNode);
      this.addSystemLog('🔊 Nodo de salida conectado', 'success');
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.fpsUpdateInterval) {
      clearInterval(this.fpsUpdateInterval);
    }
  }

  /**
   * Agrega un log al sistema
   */
  public addLog(message: string, type: LogEntry['type'] = 'info', details?: string): void {
    if (this.isPaused) return;

    const logEntry: LogEntry = {
      timestamp: new Date(),
      type,
      icon: this.getIconForType(type),
      message,
      details
    };

    this.logs.unshift(logEntry);
    
    // Mantener solo los últimos maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Auto-scroll al contenedor de logs
    setTimeout(() => {
      if (this.logsContainer) {
        this.logsContainer.nativeElement.scrollTop = 0;
      }
    }, 100);
  }

  /**
   * Agrega un log del sistema
   */
  public addSystemLog(message: string, type: LogEntry['type'] = 'system', details?: string): void {
    this.addLog(message, type, details);
  }

  /**
   * Limpia todos los logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.addSystemLog('🗑️ Logs limpiados', 'info');
  }

  /**
   * Pausa/Reanuda la visualización
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.addSystemLog('⏸️ Visualización pausada', 'warning');
    } else {
      this.addSystemLog('▶️ Visualización reanudada', 'success');
    }
  }

  /**
   * Obtiene el icono para el tipo de log
   */
  private getIconForType(type: LogEntry['type']): string {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      system: '🔧'
    };
    return icons[type] || 'ℹ️';
  }

  /**
   * Inicia la visualización
   */
  private startVisualization(): void {
    this.isActive = true;
    this.visualize();
  }

  /**
   * Inicia el monitoreo de FPS
   */
  private startFPSMonitoring(): void {
    this.fpsUpdateInterval = setInterval(() => {
      this.currentFPS = Math.round(this.frameCount);
      this.frameCount = 0;
    }, 1000) as any;
  }

  /**
   * Función principal de visualización
   */
  private visualize(): void {
    if (this.isPaused) {
      this.animationFrameId = requestAnimationFrame(() => this.visualize());
      return;
    }

    if (this.canvasRef.nativeElement && this.outputAnalyser) {
      const canvas = this.canvasRef.nativeElement;
      const canvasCtx = this.canvasCtx;

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      // Limpiar canvas
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      
      // Fondo con gradiente
      const bgGradient = canvasCtx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#1e293b');
      canvasCtx.fillStyle = bgGradient;
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      // Actualizar analizadores
      if (this.inputAnalyser) {
        this.inputAnalyser.update();
        this.inputLevel = this.calculateAverageLevel(this.inputAnalyser.data);
      }
      
      if (this.outputAnalyser) {
        this.outputAnalyser.update();
        this.outputLevel = this.calculateAverageLevel(this.outputAnalyser.data);
      }

      // Dibujar barras de entrada
      if (this.inputAnalyser) {
        this.drawAudioBars(this.inputAnalyser.data, WIDTH, HEIGHT, canvasCtx, true);
      }

      // Dibujar barras de salida
      if (this.outputAnalyser) {
        this.drawAudioBars(this.outputAnalyser.data, WIDTH, HEIGHT, canvasCtx, false);
      }

      // Dibujar efectos adicionales
      this.drawParticleEffects(canvasCtx, WIDTH, HEIGHT);
    }

    // Contar frames para FPS
    this.frameCount++;
    
    // Continuar animación
    this.animationFrameId = requestAnimationFrame(() => this.visualize());
  }

  /**
   * Dibuja las barras de audio
   */
  private drawAudioBars(data: Uint8Array, width: number, height: number, ctx: CanvasRenderingContext2D, isInput: boolean): void {
    const barWidth = width / data.length;
    let x = 0;

    // Gradiente para las barras
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isInput) {
      gradient.addColorStop(1, '#D16BA5');
      gradient.addColorStop(0.5, '#E78686');
      gradient.addColorStop(0, '#FB5F5F');
    } else {
      gradient.addColorStop(1, '#3b82f6');
      gradient.addColorStop(0.5, '#10b981');
      gradient.addColorStop(0, '#ef4444');
    }
    
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = isInput ? 'source-over' : 'lighter';

    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * (height * 0.8);
      const y = height - barHeight;
      
      // Barras con esquinas redondeadas
      this.drawRoundedRect(ctx, x, y, barWidth - 1, barHeight, 2);
      
      x += barWidth;
    }
  }

  /**
   * Dibuja un rectángulo con esquinas redondeadas
   */
  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Dibuja efectos de partículas
   */
  private drawParticleEffects(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const time = Date.now() * 0.001;
    
    // Partículas flotantes
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * width;
      const y = (Math.cos(time + i * 0.3) * 0.5 + 0.5) * height;
      const size = Math.sin(time + i) * 2 + 3;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(time + i) * 0.2})`;
      ctx.fill();
    }
  }

  /**
   * Calcula el nivel promedio de audio
   */
  private calculateAverageLevel(data: Uint8Array): number {
    if (!data || data.length === 0) return 0;
    
    const sum = data.reduce((acc, val) => acc + val, 0);
    const average = sum / data.length;
    return Math.round((average / 255) * 100);
  }

  /**
   * Método público para agregar logs desde el servicio principal
   */
  public addLogFromService(message: string, type: LogEntry['type'] = 'info', details?: string): void {
    this.addLog(message, type, details);
  }
}
