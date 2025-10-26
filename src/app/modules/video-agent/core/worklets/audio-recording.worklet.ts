/**
 * AudioWorklet para procesamiento de audio de entrada
 * Reemplaza ScriptProcessorNode (deprecated)
 *
 * Convierte Float32 a Int16 (PCM16) y lo envía al thread principal
 * Basado en el demo oficial de Google
 */

export const audioRecordingWorkletCode = `
class AudioRecordingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  /**
   * Procesa audio de entrada frame por frame
   * @param inputs - Array de inputs (normalmente 1)
   * @param outputs - Array de outputs (no usado aquí)
   * @param parameters - Parámetros del AudioWorklet
   * @returns true para mantener el processor activo
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (!input || input.length === 0) {
      return true;
    }

    // Procesar primer canal (mono)
    const inputChannel = input[0];

    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      // Cuando el buffer está lleno, convertir y enviar
      if (this.bufferIndex >= this.bufferSize) {
        this.flushBuffer();
      }
    }

    return true;
  }

  /**
   * Convierte Float32Array a Int16Array (PCM16) y envía al main thread
   */
  flushBuffer() {
    // Crear buffer Int16
    const int16Buffer = new Int16Array(this.bufferSize);

    for (let i = 0; i < this.bufferSize; i++) {
      // Clamp a rango [-1, 1]
      const sample = Math.max(-1, Math.min(1, this.buffer[i]));

      // Convertir a Int16 (rango -32768 a 32767)
      int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    // Enviar al main thread (transferir ownership del buffer)
    this.port.postMessage({
      data: {
        int16arrayBuffer: int16Buffer.buffer
      }
    }, [int16Buffer.buffer]);

    // Reset buffer index
    this.bufferIndex = 0;
  }
}

// Registrar el processor
registerProcessor('audio-recording-processor', AudioRecordingProcessor);
`;

export default audioRecordingWorkletCode;
