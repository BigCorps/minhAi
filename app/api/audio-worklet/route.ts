// app/api/audio-worklet/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const workletCode = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options?.processorOptions || {};
    this._volumeThreshold = opts.volumeThreshold ?? 0.015;
    this._silenceThreshold = opts.silenceThreshold ?? 120;
    this._isVoiceDetected = false;
    this._silenceCounter = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channelData = input[0];

    // Cálculo de RMS
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    // Envia RMS para a main thread (indicador de volume na UI)
    this.port.postMessage({ type: 'rms', rms });

    // Conversão Float32 → Int16
    const int16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const buffer = int16.buffer;

    // VAD
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

    // Envia chunk de áudio (transferable — zero-copy)
    this.port.postMessage({ type: 'audio', data: buffer }, [buffer]);
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
  `.trim();

  return new NextResponse(workletCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
