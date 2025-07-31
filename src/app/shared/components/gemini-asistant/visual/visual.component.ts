import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Analyser } from '../analyser';

@Component({
  selector: 'app-visual',
  templateUrl: './visual.component.html',
  styleUrls: ['./visual.component.scss']
})
export class VisualComponent implements OnInit, OnChanges {
  @Input() inputNode!: AudioNode;
  @Input() outputNode!: AudioNode;

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvasCtx!: CanvasRenderingContext2D;

  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;

  constructor() { }

  ngOnInit(): void {
    this.canvasCtx = this.canvasRef.nativeElement.getContext('2d')!;
    this.visualize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputNode'] && changes['inputNode'].currentValue) {
      this.inputAnalyser = new Analyser(this.inputNode);
    }
    if (changes['outputNode'] && changes['outputNode'].currentValue) {
      this.outputAnalyser = new Analyser(this.outputNode);
    }
  }

  private visualize() {
    if (this.canvasRef.nativeElement && this.outputAnalyser) {
      const canvas = this.canvasRef.nativeElement;
      const canvasCtx = this.canvasCtx;

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.fillStyle = '#1f2937';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = WIDTH / this.outputAnalyser.data.length;
      let x = 0;

      const inputGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
      inputGradient.addColorStop(1, '#D16BA5');
      inputGradient.addColorStop(0.5, '#E78686');
      inputGradient.addColorStop(0, '#FB5F5F');
      canvasCtx.fillStyle = inputGradient;

      this.inputAnalyser.update();

      for (let i = 0; i < this.inputAnalyser.data.length; i++) {
        const barHeight = this.inputAnalyser.data[i] * (HEIGHT / 255);
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth;
      }

      canvasCtx.globalCompositeOperation = 'lighter';

      const outputGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
      outputGradient.addColorStop(1, '#3b82f6');
      outputGradient.addColorStop(0.5, '#10b981');
      outputGradient.addColorStop(0, '#ef4444');
      canvasCtx.fillStyle = outputGradient;

      x = 0;
      this.outputAnalyser.update();

      for (let i = 0; i < this.outputAnalyser.data.length; i++) {
        const barHeight = this.outputAnalyser.data[i] * (HEIGHT / 255);
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth;
      }
    }
    requestAnimationFrame(() => this.visualize());
  }
}
