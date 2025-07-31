import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { GeminiAudioService, ConnectionStatus } from '../services/gemini-audio.service';
import { AudioProcessingService, AudioState } from '../services/audio-processing.service';
import { createBlob } from '../utils';

@Component({
  selector: 'app-live-audio',
  templateUrl: './live-audio.component.html',
  styleUrls: ['./live-audio.component.scss']
})
export class LiveAudioComponent implements OnInit, OnDestroy {
  isRecording = false;
  status = '';
  error = '';

  get inputNode() {
    return this.audioService.inputNode;
  }

  get outputNode() {
    return this.audioService.outputNode;
  }

  private subscriptions: Subscription[] = [];

  constructor(
    private geminiService: GeminiAudioService,
    private audioService: AudioProcessingService
  ) { }

  ngOnInit(): void {
    this.initSubscriptions();
    this.geminiService.initSession();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.geminiService.closeSession();
    this.audioService.stopRecording();
  }

  private initSubscriptions(): void {
    // Subscribe to connection status
    const connectionSub = this.geminiService.connectionStatus$.subscribe(
      (status: ConnectionStatus) => {
        this.status = status.message;
        if (status.status === 'error') {
          this.error = status.message;
        } else {
          this.error = '';
        }
      }
    );
    this.subscriptions.push(connectionSub);

    // Subscribe to audio state
    const audioSub = this.audioService.audioState$.subscribe(
      (audioState: AudioState) => {
        this.isRecording = audioState.isRecording;
        if (audioState.status) {
          this.status = audioState.status;
        }
        if (audioState.error) {
          this.error = audioState.error;
        }
      }
    );
    this.subscriptions.push(audioSub);

    // Subscribe to incoming audio data
    const audioDataSub = this.geminiService.audioData$.subscribe(
      (audioData) => {
        if (audioData) {
          if (audioData.interrupted) {
            this.audioService.stopAllAudio();
          } else if (audioData.data) {
            this.audioService.playAudioData(audioData);
          }
        }
      }
    );
    this.subscriptions.push(audioDataSub);
  }

  async startRecording(): Promise<void> {
    await this.audioService.startRecording((pcmData: Float32Array) => {
      this.geminiService.sendRealtimeInput(createBlob(pcmData));
    });
  }

  stopRecording(): void {
    this.audioService.stopRecording();
  }

  reset(): void {
    this.geminiService.resetSession();
    this.status = 'Session cleared.';
  }
}
