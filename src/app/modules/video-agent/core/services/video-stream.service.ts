import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DEFAULT_STREAM_CONFIG } from '../models/agent-config.interface';

/**
 * Service para captura y streaming de video a 1 fps
 * Optimizado según Gemini Live API specs: 768x768 @ 1fps JPEG
 */
@Injectable({
  providedIn: 'root'
})
export class VideoStreamService {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private captureInterval: any = null;

  // Configuración de captura
  private readonly config = DEFAULT_STREAM_CONFIG.video;
  private readonly fps = DEFAULT_STREAM_CONFIG.video.fps;

  // Observables
  private isStreamingSubject = new BehaviorSubject<boolean>(false);
  public isStreaming$ = this.isStreamingSubject.asObservable();

  private frameSubject = new Subject<string>(); // Base64 JPEG
  public frame$ = this.frameSubject.asObservable();

  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  constructor() {
    console.log('📹 VideoStreamService initialized');
  }

  /**
   * Inicia captura de video desde la cámara
   */
  async startCapture(facingMode: 'user' | 'environment' = 'environment'): Promise<void> {
    try {
      // Solicitar acceso a la cámara
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode, // 'environment' = cámara trasera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false // Audio se maneja en audio-stream.service
      });

      // Crear elementos para procesamiento
      this.setupVideoProcessing();

      // Asignar stream al video element
      if (this.videoElement) {
        this.videoElement.srcObject = this.mediaStream;
        await this.videoElement.play();
      }

      // Iniciar captura a 1 fps
      this.startFrameCapture();

      this.isStreamingSubject.next(true);
      console.log('✅ Video capture started at', this.fps, 'fps');

    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      this.errorSubject.next(`Camera access error: ${error}`);
      throw error;
    }
  }

  /**
   * Configura elementos HTML para procesamiento de video
   */
  private setupVideoProcessing(): void {
    // Video element (hidden)
    this.videoElement = document.createElement('video');
    this.videoElement.setAttribute('playsinline', 'true');
    this.videoElement.muted = true;

    // Canvas para captura y resize
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    if (!this.ctx) {
      throw new Error('Could not get canvas context');
    }
  }

  /**
   * Inicia captura de frames a 1 fps
   */
  private startFrameCapture(): void {
    const interval = 1000 / this.fps; // 1000ms para 1fps

    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, interval);

    console.log(`📸 Frame capture started: ${this.fps} fps (${interval}ms interval)`);
  }

  /**
   * Captura un frame, lo procesa y lo emite
   */
  private captureFrame(): void {
    if (!this.videoElement || !this.canvas || !this.ctx) {
      return;
    }

    try {
      // Obtener dimensiones del video
      const videoWidth = this.videoElement.videoWidth;
      const videoHeight = this.videoElement.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        return; // Video aún no está listo
      }

      // Calcular crop para mantener aspect ratio y hacer cuadrado
      const size = Math.min(videoWidth, videoHeight);
      const x = (videoWidth - size) / 2;
      const y = (videoHeight - size) / 2;

      // Limpiar canvas
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.config.width, this.config.height);

      // Dibujar video recortado y escalado a 768x768
      this.ctx.drawImage(
        this.videoElement,
        x, y, size, size, // source rectangle (crop cuadrado)
        0, 0, this.config.width, this.config.height // destination (768x768)
      );

      // Convertir a JPEG base64
      const base64Image = this.canvas.toDataURL('image/jpeg', 0.8);

      // Remover prefijo "data:image/jpeg;base64,"
      const base64Data = base64Image.split(',')[1];

      // Emitir frame
      this.frameSubject.next(base64Data);

    } catch (error) {
      console.error('❌ Error capturing frame:', error);
      this.errorSubject.next(`Frame capture error: ${error}`);
    }
  }

  /**
   * Detiene la captura de video
   */
  stopCapture(): void {
    // Detener interval
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // Detener video element
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }

    // Detener tracks del stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isStreamingSubject.next(false);
    console.log('🛑 Video capture stopped');
  }

  /**
   * Cambia entre cámara frontal y trasera
   */
  async switchCamera(): Promise<void> {
    const currentFacingMode = this.getCurrentFacingMode();
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    this.stopCapture();
    await this.startCapture(newFacingMode);

    console.log(`🔄 Camera switched to: ${newFacingMode}`);
  }

  /**
   * Obtiene el facing mode actual
   */
  private getCurrentFacingMode(): 'user' | 'environment' {
    if (!this.mediaStream) {
      return 'environment';
    }

    const videoTrack = this.mediaStream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();

    return (settings.facingMode as 'user' | 'environment') || 'environment';
  }

  /**
   * Captura un frame único (para testing)
   */
  captureSnapshot(): string | null {
    if (!this.canvas) {
      return null;
    }

    const base64Image = this.canvas.toDataURL('image/jpeg', 0.8);
    return base64Image.split(',')[1];
  }

  /**
   * Obtiene el video element para preview en UI
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  /**
   * Verifica si el dispositivo tiene cámara
   */
  async hasCamera(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  /**
   * Obtiene lista de cámaras disponibles
   */
  async getCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('❌ Error listing cameras:', error);
      return [];
    }
  }

  /**
   * Getters
   */
  get isStreaming(): boolean {
    return this.isStreamingSubject.value;
  }
}
