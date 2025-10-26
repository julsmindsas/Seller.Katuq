/**
 * AudioWorklet para medición de volumen (VU Meter)
 * Calcula RMS (Root Mean Square) del audio
 *
 * Basado en el demo oficial de Google
 */

export const volMeterWorkletCode = `
class VolMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.volume = 0;
    this.updateIntervalInMS = 25; // Actualizar cada 25ms
    this.nextUpdateFrame = this.updateIntervalInMS;
  }

  /**
   * Calcula el volumen RMS del audio
   * @param inputs - Array de inputs
   * @returns true para mantener el processor activo
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (!input || input.length === 0) {
      return true;
    }

    const inputChannel = input[0];
    let sum = 0;

    // Calcular suma de cuadrados
    for (let i = 0; i < inputChannel.length; i++) {
      sum += inputChannel[i] * inputChannel[i];
    }

    // Calcular RMS (Root Mean Square)
    const rms = Math.sqrt(sum / inputChannel.length);

    // Normalizar a rango [0, 1]
    this.volume = Math.max(0, Math.min(1, rms));

    // Actualizar a intervalos regulares (throttling)
    this.nextUpdateFrame -= inputChannel.length;
    if (this.nextUpdateFrame < 0) {
      this.nextUpdateFrame += this.updateIntervalInMS * sampleRate / 1000;

      // Enviar volumen al main thread
      this.port.postMessage({
        volume: this.volume
      });
    }

    return true;
  }
}

// Registrar el processor
registerProcessor('vol-meter', VolMeterProcessor);
`;

export default volMeterWorkletCode;
