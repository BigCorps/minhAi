/**
 * audio-processor.worklet.js
 * 
 * Processador de áudio rodando em AudioWorklet (thread separada da main thread).
 * Substitui o ScriptProcessorNode depreciado do google-speech-websocket.ts
 * 
 * Responsabilidades:
 * - Cálculo de RMS para detecção de volume
 * - Conversão Float32 → Int16
 * - VAD (Voice Activity Detection): detecta início de fala e silêncio prolongado
 * - Pre-roll buffer: mantém contexto de áudio anterior à fala
 * 
 * Comunica com a main thread via postMessage:
 * - { type: 'rms', rms: number }           — nível de volume a cada frame
 * - { type: 'audio', data: ArrayBuffer }   — chunk de áudio Int16 (transferível)
 * - { type: 'voice_start' }                — VAD: início de fala detectado
 * - { type: 'silence' }                    — VAD: silêncio prolongado detectado
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const opts = options?.processorOptions || {};

    this._volumeThreshold = opts.volumeThreshold ?? 0.015;
    this._silenceThreshold = opts.silenceThreshold ?? 120; // nº de frames silenciosos

    // VAD state
    this._isVoiceDetected = false;
    this._silenceCounter = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0]; // Float32Array

    // --- Cálculo de RMS ---
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    // Envia RMS para a main thread (indicador de volume na UI)
    this.port.postMessage({ type: 'rms', rms });

    // --- Conversão Float32 → Int16 ---
    const int16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Transfere o buffer (zero-copy — mais eficiente que copiar)
    const buffer = int16.buffer;

    // --- VAD ---
    if (rms > this._volumeThreshold) {
      this._silenceCounter = 0;

      if (!this._isVoiceDetected) {
        this._isVoiceDetected = true;
        this.port.postMessage({ type: 'voice_start' });
      }
    } else {
      this._silenceCounter++;

      if (this._isVoiceDetected && this._silenceCounter > this._silenceThreshold) {
        this._isVoiceDetected = false;
        this._silenceCounter = 0;
        this.port.postMessage({ type: 'silence' });
      }
    }

    // Envia chunk de áudio para a main thread
    // Transferable: o buffer é movido (não copiado) para a main thread
    this.port.postMessage({ type: 'audio', data: buffer }, [buffer]);

    return true; // mantém o processor vivo
  }
}

registerProcessor('audio-processor', AudioProcessor);
