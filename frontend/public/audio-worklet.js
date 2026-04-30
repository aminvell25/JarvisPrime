/**
 * AudioWorklet Processor per J.A.R.V.I.S. Prime
 * Riceve audio al sample rate nativo del dispositivo,
 * resample a 16kHz con interpolazione lineare,
 * converte Float32 → Int16 e invia al main thread.
 */
class ResampleProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetSize = 4096;   // campioni accumulati al sampleRate nativo
    this.outputRate = 16000;  // target sample rate
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    // Accumula campioni raw nel buffer
    for (let i = 0; i < channel.length; i++) {
      this.buffer.push(channel[i]);
    }

    // Quando abbiamo abbastanza campioni: resample + converti + invia
    if (this.buffer.length >= this.targetSize) {
      const ratio = this.outputRate / sampleRate;
      const outLen = Math.floor(this.buffer.length * ratio);
      const out = new Float32Array(outLen);

      for (let i = 0; i < outLen; i++) {
        const pos = i / ratio;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const a = this.buffer[idx] || 0;
        const b = this.buffer[idx + 1] || a;
        out[i] = a + (b - a) * frac;
      }

      // Float32 → Int16
      const i16 = new Int16Array(out.length);
      for (let i = 0; i < out.length; i++) {
        i16[i] = Math.max(-1, Math.min(1, out[i])) * 0x7FFF;
      }

      // Transfer ArrayBuffer al main thread (zero-copy)
      this.port.postMessage(i16.buffer, [i16.buffer]);

      // Svuota buffer
      this.buffer = [];
    }

    return true;
  }
}

registerProcessor('resample-processor', ResampleProcessor);
